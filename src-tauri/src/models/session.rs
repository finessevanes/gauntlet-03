use serde::{Deserialize, Serialize};

/// Represents a single video clip in the session
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Clip {
    /// Unique identifier for the clip (UUID v4)
    pub id: String,
    /// Absolute file path to the video file
    pub filePath: String,
    /// Duration of the clip in seconds
    pub duration: f64,
    /// Trim start point in seconds (default 0)
    pub inPoint: f64,
    /// Trim end point in seconds (default duration)
    pub outPoint: f64,
}

impl Clip {
    /// Creates a new clip with default trim points (full clip)
    pub fn new(id: String, filePath: String, duration: f64) -> Self {
        Self {
            id,
            filePath,
            duration,
            inPoint: 0.0,
            outPoint: duration,
        }
    }
}

/// Represents the complete session state (clips, timeline order, viewport settings)
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Session {
    /// Schema version for future migrations (currently 1)
    pub version: u32,
    /// List of all imported clips
    pub clips: Vec<Clip>,
    /// Timeline order: list of clip IDs in sequence
    pub timelineOrder: Vec<String>,
    /// Zoom level percentage (100-1000)
    pub zoomLevel: u32,
    /// Timeline horizontal scroll position in pixels
    pub scrollPosition: i32,
}

impl Session {
    /// Creates a new empty session
    pub fn default() -> Self {
        Self {
            version: 1,
            clips: vec![],
            timelineOrder: vec![],
            zoomLevel: 100,
            scrollPosition: 0,
        }
    }

    /// Validates the session state
    pub fn validate(&self) -> Result<(), String> {
        // Check version
        if self.version != 1 {
            return Err(format!("Unsupported session version: {}", self.version));
        }

        // Check zoom level
        if self.zoomLevel < 100 || self.zoomLevel > 1000 {
            return Err(format!(
                "Invalid zoom level: {} (must be 100-1000)",
                self.zoomLevel
            ));
        }

        // Check scroll position
        if self.scrollPosition < 0 {
            return Err(format!(
                "Invalid scroll position: {} (must be non-negative)",
                self.scrollPosition
            ));
        }

        // Check clips have valid IDs
        for clip in &self.clips {
            if clip.id.is_empty() {
                return Err("Clip ID cannot be empty".to_string());
            }
            if clip.inPoint < 0.0 || clip.outPoint < 0.0 {
                return Err(format!(
                    "Invalid trim points for clip {}: in={}, out={}",
                    clip.id, clip.inPoint, clip.outPoint
                ));
            }
            if clip.inPoint >= clip.outPoint {
                return Err(format!(
                    "Invalid trim range for clip {}: in >= out",
                    clip.id
                ));
            }
        }

        // Check timelineOrder references valid clip IDs
        let clip_ids: Vec<&String> = self.clips.iter().map(|c| &c.id).collect();
        for timeline_id in &self.timelineOrder {
            if !clip_ids.contains(&timeline_id) {
                return Err(format!(
                    "Timeline references non-existent clip ID: {}",
                    timeline_id
                ));
            }
        }

        Ok(())
    }
}

impl Default for Session {
    fn default() -> Self {
        Self::default()
    }
}
