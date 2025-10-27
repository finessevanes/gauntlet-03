use std::path::Path;
use std::process::Command;
use tauri::AppHandle;
use uuid::Uuid;

use crate::models::{ImportResult, ImportedClip, VideoMetadata};
use crate::utils::ffmpeg::get_ffmpeg_path;

/// Validates if a video file format is supported (MP4 or MOV with H.264)
#[tauri::command]
pub fn validate_video_format(file_path: String, app_handle: AppHandle) -> Result<String, String> {
    let path = Path::new(&file_path);

    // Check file exists
    if !path.exists() {
        return Err(format!("File not found: {}", file_path));
    }

    // Check extension
    let extension = path
        .extension()
        .and_then(|ext| ext.to_str())
        .map(|s| s.to_lowercase());

    match extension.as_deref() {
        Some("mp4") => Ok("mp4".to_string()),
        Some("mov") => Ok("mov".to_string()),
        Some(ext) => Err(format!("Unsupported format: {}", ext)),
        None => Err("File has no extension".to_string()),
    }
}

/// Extracts video metadata using ffprobe
#[tauri::command]
pub fn get_video_metadata(
    file_path: String,
    app_handle: AppHandle,
) -> Result<VideoMetadata, String> {
    // Get ffprobe path (same directory as ffmpeg)
    let ffmpeg_path = get_ffmpeg_path(&app_handle)?;
    let ffprobe_path = ffmpeg_path
        .parent()
        .ok_or("Invalid FFmpeg path")?
        .join(if cfg!(target_os = "windows") {
            "ffprobe.exe"
        } else {
            "ffprobe"
        });

    if !ffprobe_path.exists() {
        return Err("FFprobe binary not found".to_string());
    }

    // Run ffprobe to get metadata
    let output = Command::new(&ffprobe_path)
        .args([
            "-v",
            "error",
            "-select_streams",
            "v:0",
            "-show_entries",
            "stream=duration,width,height,r_frame_rate,codec_name",
            "-of",
            "json",
            &file_path,
        ])
        .output()
        .map_err(|e| format!("Failed to run ffprobe: {}", e))?;

    if !output.status.success() {
        let stderr = String::from_utf8_lossy(&output.stderr);
        return Err(format!("FFprobe failed: {}", stderr));
    }

    // Parse JSON output
    let stdout = String::from_utf8_lossy(&output.stdout);
    let json: serde_json::Value =
        serde_json::from_str(&stdout).map_err(|e| format!("Failed to parse ffprobe output: {}", e))?;

    // Extract metadata from JSON
    let stream = json
        .get("streams")
        .and_then(|s| s.as_array())
        .and_then(|arr| arr.first())
        .ok_or("No video stream found")?;

    // Duration
    let duration = stream
        .get("duration")
        .and_then(|d| d.as_str())
        .and_then(|s| s.parse::<f64>().ok())
        .unwrap_or_else(|| {
            // Fallback: try getting duration from format
            get_duration_from_format(&file_path, &ffprobe_path).unwrap_or(0.0)
        });

    // Resolution
    let width = stream
        .get("width")
        .and_then(|w| w.as_i64())
        .ok_or("Missing width")?;
    let height = stream
        .get("height")
        .and_then(|h| h.as_i64())
        .ok_or("Missing height")?;
    let resolution = format!("{}x{}", width, height);

    // Frame rate
    let r_frame_rate = stream
        .get("r_frame_rate")
        .and_then(|r| r.as_str())
        .ok_or("Missing frame rate")?;
    let frame_rate = parse_frame_rate(r_frame_rate)?;

    // Codec
    let codec = stream
        .get("codec_name")
        .and_then(|c| c.as_str())
        .ok_or("Missing codec")?
        .to_string();

    // Validate codec (reject unsupported formats)
    if codec == "hevc" || codec == "h265" {
        return Err(format!("Unsupported video format: {}", codec));
    }

    Ok(VideoMetadata {
        duration,
        resolution,
        frame_rate,
        codec,
    })
}

/// Helper: Get duration from format instead of stream
fn get_duration_from_format(file_path: &str, ffprobe_path: &Path) -> Result<f64, String> {
    let output = Command::new(ffprobe_path)
        .args([
            "-v",
            "error",
            "-show_entries",
            "format=duration",
            "-of",
            "json",
            file_path,
        ])
        .output()
        .map_err(|e| format!("Failed to run ffprobe: {}", e))?;

    let stdout = String::from_utf8_lossy(&output.stdout);
    let json: serde_json::Value =
        serde_json::from_str(&stdout).map_err(|e| format!("Failed to parse JSON: {}", e))?;

    let duration = json
        .get("format")
        .and_then(|f| f.get("duration"))
        .and_then(|d| d.as_str())
        .and_then(|s| s.parse::<f64>().ok())
        .ok_or("Missing format duration")?;

    Ok(duration)
}

/// Helper: Parse frame rate from "30000/1001" format
fn parse_frame_rate(r_frame_rate: &str) -> Result<f64, String> {
    let parts: Vec<&str> = r_frame_rate.split('/').collect();
    if parts.len() != 2 {
        return Err(format!("Invalid frame rate format: {}", r_frame_rate));
    }

    let numerator = parts[0]
        .parse::<f64>()
        .map_err(|_| format!("Invalid frame rate numerator: {}", parts[0]))?;
    let denominator = parts[1]
        .parse::<f64>()
        .map_err(|_| format!("Invalid frame rate denominator: {}", parts[1]))?;

    if denominator == 0.0 {
        return Err("Frame rate denominator is zero".to_string());
    }

    Ok(numerator / denominator)
}

/// Extracts thumbnail from video file (first frame as base64)
#[tauri::command]
pub fn extract_thumbnail(file_path: String, app_handle: AppHandle) -> Result<String, String> {
    use base64::Engine;

    let ffmpeg_path = get_ffmpeg_path(&app_handle)?;

    // Create temp directory for thumbnail
    let temp_dir = std::env::temp_dir();
    let thumbnail_filename = format!("klippy_thumb_{}.jpg", Uuid::new_v4());
    let thumbnail_path = temp_dir.join(&thumbnail_filename);

    // Extract first frame as JPEG
    let output = Command::new(&ffmpeg_path)
        .args([
            "-i",
            &file_path,
            "-ss",
            "0",
            "-vframes",
            "1",
            "-q:v",
            "2",
            thumbnail_path.to_str().ok_or("Invalid thumbnail path")?,
        ])
        .output()
        .map_err(|e| format!("Failed to run ffmpeg: {}", e))?;

    if !output.status.success() {
        let stderr = String::from_utf8_lossy(&output.stderr);
        // Clean up temp file if it was created
        let _ = std::fs::remove_file(&thumbnail_path);
        return Err(format!("FFmpeg thumbnail extraction failed: {}", stderr));
    }

    // Read thumbnail file
    let thumbnail_bytes = std::fs::read(&thumbnail_path)
        .map_err(|e| format!("Failed to read thumbnail: {}", e))?;

    // Clean up temp file
    std::fs::remove_file(&thumbnail_path)
        .map_err(|e| format!("Failed to delete temp thumbnail: {}", e))?;

    // Encode as base64
    let base64_engine = base64::engine::general_purpose::STANDARD;
    let base64_string = base64_engine.encode(&thumbnail_bytes);

    Ok(format!("data:image/jpeg;base64,{}", base64_string))
}

/// Imports multiple video files and returns ImportResult
#[tauri::command]
pub async fn import_video_files(
    file_paths: Vec<String>,
    app_handle: AppHandle,
) -> Result<ImportResult, String> {
    let mut clips = Vec::new();
    let mut errors = Vec::new();

    for file_path in file_paths {
        // Validate format
        match validate_video_format(file_path.clone(), app_handle.clone()) {
            Ok(_format) => {
                // Get metadata
                match get_video_metadata(file_path.clone(), app_handle.clone()) {
                    Ok(metadata) => {
                        // Extract thumbnail
                        match extract_thumbnail(file_path.clone(), app_handle.clone()) {
                            Ok(thumbnail) => {
                                // Create imported clip
                                let clip = ImportedClip {
                                    id: Uuid::new_v4().to_string(),
                                    filePath: file_path,
                                    duration: metadata.duration,
                                    thumbnail,
                                    resolution: metadata.resolution,
                                    frameRate: metadata.frame_rate,
                                    codec: metadata.codec,
                                    importedAt: chrono::Utc::now().timestamp_millis(),
                                };
                                clips.push(clip);
                            }
                            Err(e) => {
                                errors.push(format!("Unable to extract thumbnail: {} - {}", file_path, e));
                            }
                        }
                    }
                    Err(e) => {
                        errors.push(format!("Unable to read metadata: {} - {}", file_path, e));
                    }
                }
            }
            Err(e) => {
                errors.push(format!("Invalid format: {} - {}", file_path, e));
            }
        }
    }

    let success = errors.is_empty();

    Ok(ImportResult {
        success,
        clips,
        errors,
    })
}
