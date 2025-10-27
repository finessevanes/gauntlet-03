use std::path::{Path, PathBuf};
use tauri::{AppHandle, Manager};

/// Gets the path to the FFmpeg binary based on the platform
pub fn get_ffmpeg_path(app_handle: &AppHandle) -> Result<PathBuf, String> {
    // Platform-specific FFmpeg binary name
    #[cfg(target_os = "macos")]
    let ffmpeg_name = "ffmpeg";

    #[cfg(target_os = "windows")]
    let ffmpeg_name = "ffmpeg.exe";

    #[cfg(target_os = "linux")]
    let ffmpeg_name = "ffmpeg";

    // Try Resource directory first (for production builds)
    if let Ok(resource_dir) = app_handle
        .path()
        .resolve("resources/ffmpeg", tauri::path::BaseDirectory::Resource)
    {
        let ffmpeg_path = resource_dir.join(ffmpeg_name);
        if ffmpeg_path.exists() {
            return Ok(ffmpeg_path);
        }
    }

    // Fallback to src-tauri directory for dev mode
    let manifest_dir = std::env::var("CARGO_MANIFEST_DIR")
        .unwrap_or_else(|_| ".".to_string());
    let dev_ffmpeg_path = PathBuf::from(manifest_dir)
        .join("resources")
        .join("ffmpeg")
        .join(ffmpeg_name);

    if dev_ffmpeg_path.exists() {
        return Ok(dev_ffmpeg_path);
    }

    Err("Could not resolve FFmpeg path".to_string())
}

/// Verifies that the FFmpeg binary is executable
pub fn verify_ffmpeg_executable(path: &Path) -> Result<(), String> {
    if !path.exists() {
        return Err("FFmpeg binary not found".to_string());
    }

    #[cfg(unix)]
    {
        use std::os::unix::fs::PermissionsExt;
        let metadata = std::fs::metadata(path)
            .map_err(|e| format!("Failed to read FFmpeg metadata: {}", e))?;
        let permissions = metadata.permissions();
        let mode = permissions.mode();

        // Check if executable bit is set (mask 0o111)
        if mode & 0o111 == 0 {
            return Err("FFmpeg binary is not executable".to_string());
        }
    }

    #[cfg(windows)]
    {
        // On Windows, executability is assumed if the file exists and has .exe extension
        if !path.to_string_lossy().ends_with(".exe") {
            return Err("FFmpeg binary must have .exe extension on Windows".to_string());
        }
    }

    Ok(())
}

/// Gets the FFmpeg status: "ok", "missing", or "corrupted"
pub fn get_ffmpeg_status(app_handle: &AppHandle) -> String {
    match get_ffmpeg_path(app_handle) {
        Ok(path) => match verify_ffmpeg_executable(&path) {
            Ok(_) => "ok".to_string(),
            Err(_) => "corrupted".to_string(),
        },
        Err(_) => "missing".to_string(),
    }
}
