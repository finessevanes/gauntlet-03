use serde::{Deserialize, Serialize};

/// Video metadata extracted from file
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct VideoMetadata {
    /// Duration in seconds
    pub duration: f64,
    /// Resolution (e.g., "1920x1080")
    pub resolution: String,
    /// Frame rate (e.g., 29.97)
    pub frame_rate: f64,
    /// Codec (e.g., "h264")
    pub codec: String,
}

/// Result of import operation
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ImportResult {
    /// Whether the import was successful
    pub success: bool,
    /// Successfully imported clips
    pub clips: Vec<ImportedClip>,
    /// Error messages for failed files
    pub errors: Vec<String>,
}

/// Extended clip data from import (includes thumbnail and metadata)
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ImportedClip {
    /// Unique identifier (UUID v4)
    pub id: String,
    /// Absolute file path
    pub filePath: String,
    /// Duration in seconds
    pub duration: f64,
    /// Base64-encoded thumbnail image
    pub thumbnail: String,
    /// Resolution (e.g., "1920x1080")
    pub resolution: String,
    /// Frame rate (e.g., 29.97)
    pub frameRate: f64,
    /// Codec (e.g., "h264")
    pub codec: String,
    /// Import timestamp (milliseconds since epoch)
    pub importedAt: i64,
}
