use std::fs;
use std::path::{Path, PathBuf};
use tauri::{AppHandle, Manager};

use crate::models::Session;

/// Gets the path to the session.json file
pub fn get_session_path(app_handle: &AppHandle) -> Result<PathBuf, String> {
    let app_data_dir = app_handle
        .path()
        .app_data_dir()
        .map_err(|e| format!("Failed to get app data directory: {}", e))?;

    Ok(app_data_dir.join("session.json"))
}

/// Ensures the app data directory exists, creating it if necessary
pub fn ensure_app_data_dir(app_handle: &AppHandle) -> Result<PathBuf, String> {
    let app_data_dir = app_handle
        .path()
        .app_data_dir()
        .map_err(|e| format!("Failed to get app data directory: {}", e))?;

    fs::create_dir_all(&app_data_dir)
        .map_err(|e| format!("Failed to create app data directory: {}", e))?;

    Ok(app_data_dir)
}

/// Loads session state from the session.json file
pub fn load_session_from_file(path: &Path) -> Result<Session, String> {
    let json_content = fs::read_to_string(path)
        .map_err(|e| format!("Failed to read session file: {}", e))?;

    let session: Session = serde_json::from_str(&json_content)
        .map_err(|e| format!("Failed to parse session JSON: {}", e))?;

    // Validate session schema
    session.validate()?;

    Ok(session)
}

/// Saves session state to the session.json file
pub fn save_session_to_file(path: &Path, session: &Session) -> Result<(), String> {
    // Validate session before saving
    session.validate()?;

    let json = serde_json::to_string_pretty(session)
        .map_err(|e| format!("Serialization error: {}", e))?;

    fs::write(path, json).map_err(|e| format!("File write error: {}", e))?;

    Ok(())
}
