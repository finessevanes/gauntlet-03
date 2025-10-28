mod commands;
mod models;
mod utils;

use commands::{
    check_file_exists, extract_thumbnail, get_ffmpeg_status, get_video_metadata,
    import_video_files, init_app, save_session, validate_video_format,
};

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_dialog::init())
        .invoke_handler(tauri::generate_handler![
            init_app,
            save_session,
            get_ffmpeg_status,
            import_video_files,
            get_video_metadata,
            extract_thumbnail,
            validate_video_format,
            check_file_exists
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
