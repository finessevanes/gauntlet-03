/**
 * TypeScript interfaces for video import
 * Matches Rust struct definitions for JSON serialization
 */

export interface VideoMetadata {
  duration: number;       // Duration in seconds
  resolution: string;     // e.g., "1920x1080"
  frame_rate: number;     // e.g., 29.97
  codec: string;          // e.g., "h264"
}

export interface ImportedClip {
  id: string;             // UUID v4
  filePath: string;       // Absolute file path
  duration: number;       // Duration in seconds
  thumbnail: string;      // Base64-encoded image (data:image/jpeg;base64,...)
  resolution: string;     // e.g., "1920x1080"
  frameRate: number;      // e.g., 29.97
  codec: string;          // e.g., "h264"
  importedAt: number;     // Timestamp in milliseconds
}

export interface ImportResult {
  success: boolean;
  clips: ImportedClip[];
  errors: string[];
}

export interface ImportState {
  isImporting: boolean;
  importQueue: string[];           // File paths waiting to import
  currentImportFile?: string;      // Current file being imported
  importProgress: number;          // 0-100 for current file
  lastImportDirectory?: string;    // Last directory user imported from
  error?: string;                  // Last error message
}
