/**
 * TypeScript interfaces for session management
 * Matches Rust struct definitions for JSON serialization
 */

export interface Clip {
  id: string;           // UUID v4
  filePath: string;     // Absolute file path to video
  duration: number;     // Duration in seconds
  inPoint: number;      // Trim start in seconds
  outPoint: number;     // Trim end in seconds
}

// Extended clip with import metadata (for display in Library)
export interface ClipWithMetadata extends Clip {
  thumbnail?: string;   // Base64-encoded thumbnail
  resolution?: string;  // e.g., "1920x1080"
  frameRate?: number;   // e.g., 29.97
  codec?: string;       // e.g., "h264"
  importedAt?: number;  // Timestamp in milliseconds
}

export interface Session {
  version: number;          // Schema version (currently 1)
  clips: Clip[];            // All imported clips
  timelineOrder: string[];  // Clip IDs in timeline sequence
  zoomLevel: number;        // Zoom percentage (100-1000)
  scrollPosition: number;   // Horizontal scroll in pixels
}

export interface AppInitState {
  session: Session;
  ffmpegStatus: "ok" | "missing" | "corrupted";
}

export interface AppState {
  session: Session;
  loading: boolean;
  error: string | null;
}
