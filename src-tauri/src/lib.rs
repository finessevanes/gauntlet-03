mod commands;
mod models;
mod utils;

use commands::{get_ffmpeg_status, init_app, save_session};

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .invoke_handler(tauri::generate_handler![
            init_app,
            save_session,
            get_ffmpeg_status
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
