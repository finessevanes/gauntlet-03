use tauri::AppHandle;

use crate::models::Session;
use crate::utils::{
    ensure_app_data_dir, ffmpeg, get_session_path, load_session_from_file, save_session_to_file,
};

/// Response type for init_app command
#[derive(serde::Serialize, serde::Deserialize, Debug)]
pub struct AppInitState {
    pub session: Session,
    pub ffmpegStatus: String,
}

/// Initializes the app on startup: checks FFmpeg, loads session state
#[tauri::command]
pub fn init_app(app_handle: AppHandle) -> Result<AppInitState, String> {
    // Ensure app data directory exists
    ensure_app_data_dir(&app_handle)?;

    // Check FFmpeg status
    let ffmpeg_status = ffmpeg::get_ffmpeg_status(&app_handle);

    // If FFmpeg is missing or corrupted, return error
    if ffmpeg_status != "ok" {
        return Err(format!(
            "FFmpeg binary not found. Please reinstall the app."
        ));
    }

    // Load session state
    let session_path = get_session_path(&app_handle)?;
    let session = if session_path.exists() {
        match load_session_from_file(&session_path) {
            Ok(s) => {
                eprintln!("Session loaded successfully");
                s
            }
            Err(e) => {
                eprintln!("Session file corrupted. Launching with blank slate. Error: {}", e);
                Session::default()
            }
        }
    } else {
        eprintln!("No prior session found. Starting with blank slate.");
        Session::default()
    };

    Ok(AppInitState {
        session,
        ffmpegStatus: ffmpeg_status,
    })
}

/// Persists the current session to disk
#[tauri::command]
pub fn save_session(session: Session, app_handle: AppHandle) -> Result<(), String> {
    let session_path = get_session_path(&app_handle)?;
    save_session_to_file(&session_path, &session)?;
    eprintln!("Session saved successfully");
    Ok(())
}

/// Returns current FFmpeg status: "ok" | "missing" | "corrupted"
#[tauri::command]
pub fn get_ffmpeg_status(app_handle: AppHandle) -> String {
    ffmpeg::get_ffmpeg_status(&app_handle)
}
