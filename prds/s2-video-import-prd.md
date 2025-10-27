# PRD: Video Import

**Feature**: Story 2 - Video Import | **Status**: Ready | **Agent**: Pam

---

## Preflight (Answer before writing PRD)

1. **Smallest end-to-end user outcome?** (vertical slice)
   - User imports a single MP4 file via drag-and-drop or file picker, sees it appear in Library with thumbnail, filename, and duration.

2. **Primary user + critical action?**
   - Video editor importing clips into their project library.

3. **Must-have vs nice-to-have?**
   - MUST: Drag-and-drop, file picker, thumbnail generation, duration extraction, error handling for corrupted files.
   - SHOULD: Progress indicator, last-opened directory memory.

4. **Offline/persistence needs?**
   - Offline: Import works locally without network.
   - Persistence: File paths stored in session state (persisted by Story 8).

5. **Performance targets?** (responsiveness, memory, file size)
   - Single MP4 import: Thumbnail + metadata within 2 seconds.
   - Large files (up to 2GB): No app crash, queue multiple imports.
   - Memory: < 500MB during import of single 2GB file.

6. **Error/edge cases critical to handle?**
   - Corrupted MP4: Show error message, don't add to library.
   - Unsupported format (HEVC, ProRes, AV1, WebM): Reject before processing.
   - File deleted after import: Mark in Library view (Story 3 handles display).
   - Large files: Prevent UI blocking, show progress.

7. **Data model changes?**
   - Add `Clip` interface with id, filePath, duration, thumbnail.
   - Store clips in app state (React context or Zustand).

8. **Service/command APIs needed?**
   - `import_video_files(paths: Vec<String>) -> Vec<Clip>` — Import multiple files, queue if needed.
   - `get_video_metadata(path: String) -> Metadata` — Extract duration, codec, resolution.
   - `extract_thumbnail(path: String) -> Result<Base64Image>` — Generate thumbnail from first frame.
   - `validate_video_format(path: String) -> Result<String>` — Check if file is MP4/MOV.

9. **React components to create/modify?**
   - `src/components/VideoImportButton.tsx` — File picker trigger.
   - `src/components/ImportProgress.tsx` — Queue progress modal.
   - Modify `src/App.tsx` or main component to handle drag-and-drop.
   - Update app state/context to manage clips.

10. **Desktop-specific needs?** (window, multi-monitor, app lifecycle)
    - Drag-and-drop into main window (Tauri: enable drag-drop on window).
    - File picker respects system file dialogs (Tauri fs module).
    - Last opened directory persisted in app state or settings.

11. **What's explicitly out of scope?**
    - Video preview playback (Story 6 covers this).
    - Thumbnail caching to disk (thumbnails stored as base64 in memory/state).
    - Video conversion or re-encoding (only MP4/MOV, no transcoding).
    - Folder import (only individual files).
    - Video metadata editing (read-only extraction).

---

## 1. Summary

Enable users to import video files (MP4, MOV) into Klippy via drag-and-drop or file picker, with automatic thumbnail generation and metadata extraction. The app queues multiple imports and displays progress, storing file paths as linked references without embedding video data.

---

## 2. Non-Goals / Scope Boundaries

- **Excluded:** Video transcoding, folder imports, metadata editing, thumbnail caching to disk, codec conversion.
- **Supported formats only:** MP4, MOV (H.264/H.265 codec video, AAC audio).
- **Unsupported formats:** HEVC (H.265 with specific profiles), ProRes, AV1, WebM, FLV, WMV.
- **No external services:** All processing is local via FFmpeg.

---

## 3. Experience (UX)

### Entry Points
1. **Drag-and-drop**: User drags one or more MP4/MOV files into the app window.
2. **File picker button**: "Import" button in toolbar opens system file dialog, filtered to .mp4 and .mov.

### User Flow (Happy Path)
1. User clicks "Import" button or drags files into app.
2. File picker / drop zone accepts multiple files.
3. Files are validated (format check) and added to import queue.
4. For each file:
   - Metadata is extracted (duration, resolution, codec).
   - Thumbnail (first frame) is generated via FFmpeg.
   - File path is stored as a linked reference.
   - Clip appears in Library with thumbnail, filename, duration.
5. Progress modal shows: "Importing [filename]... [1/3]" with visual progress bar.
6. Once all imports complete, modal closes and clips appear in Library.

### States
- **Idle**: No import in progress. "Import" button visible, drop zone ready.
- **Importing**: One or more files processing. Progress modal visible with queue info.
- **Error**: Single file fails (corrupted, unsupported). Error toast shows filename + reason. Queue continues.
- **Complete**: All files imported. Modal closes, new clips appear in Library.
- **Empty Library**: If no files have been imported, Library shows empty state (Story 3).

### Desktop Considerations
- Window drag-and-drop: Entire app window accepts drops.
- File picker: System native dialog (Tauri).
- Last opened directory: Remembered in app state for convenience.
- Multi-file drops: All files in drop queued together.

---

## 4. Functional Requirements

### MUST
- **Drag-and-drop multiple files**: User drags 1+ MP4/MOV files into app window → all files are added to import queue.
- **File picker with format filter**: "Import" button opens system file picker filtered to `.mp4` and `.mov` only → user selects files → start import.
- **Format validation before import**: Before processing, check file extension and FFmpeg codec detection → reject unsupported formats (HEVC, ProRes, AV1, WebM, etc.) with error message.
- **Metadata extraction**: For each imported file, extract duration (in seconds), resolution, frame rate, codec via FFmpeg.
- **Thumbnail generation**: Extract first frame of video as JPEG/PNG and convert to base64 for display in Library.
- **Clip storage in memory**: Store clips in app state (TypeScript `Clip[]` array) with id, filePath, duration, thumbnail, resolution.
- **Error handling for corrupted files**: If FFmpeg fails to read a file, catch error and show toast: "Unable to read file: [filename]" → continue to next file in queue.
- **Large file support**: App remains responsive while importing files up to 2GB (no UI blocking).
- **Linked file references**: Store only file paths, not embedded video data (reduce app state size).
- **Allow duplicate imports**: Same file path can be imported multiple times (separate entries in Library).

### SHOULD
- **Progress feedback**: Display import progress modal showing "[Importing filename.mp4... (2/5)]" with progress bar (0-100%).
- **Remember last directory**: File picker starts at the last directory user imported from (persisted in app state or localStorage).
- **Graceful queue handling**: Multiple files dropped together are queued and imported sequentially.
- **Performance optimization**: Thumbnail generation and metadata extraction run in background threads to prevent UI freezing.

### Acceptance Gates
- ✅ Drag-and-drop 3 MP4 files → all appear in Library within 6 seconds (2 sec per file).
- ✅ File picker opens with `.mp4` and `.mov` filter → unsupported formats not visible.
- ✅ Import corrupted MP4 → error toast "Unable to read file: [filename]" → app continues.
- ✅ Import 2GB MOV file → no crash, progress modal shows real-time progress.
- ✅ Import same file twice → two separate clips appear in Library.
- ✅ Each clip shows thumbnail, filename, duration (MM:SS format).
- ✅ No memory leaks after importing 20+ files in a session.

---

## 5. Data Model

### TypeScript (React State)

```typescript
interface Clip {
  id: string;                    // UUID, unique per clip
  filePath: string;              // Absolute path to video file (linked reference)
  duration: number;              // Duration in seconds (e.g., 125.5)
  thumbnail: string;             // Base64-encoded JPEG image (first frame)
  resolution: string;            // e.g., "1920x1080"
  frameRate: number;             // e.g., 29.97
  codec: string;                 // e.g., "h264"
  importedAt: number;            // Timestamp (milliseconds since epoch)
}

interface AppState {
  clips: Clip[];                 // All imported clips
  importQueue: string[];         // File paths waiting to be imported
  isImporting: boolean;          // True if import in progress
  currentImportFile?: string;    // Current file being imported
  importProgress: number;        // 0-100 for current file
  lastImportDirectory?: string;  // Last opened directory (for file picker)
  error?: string;                // Last error message (if any)
}
```

### Rust (Tauri)

```rust
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Clip {
    pub id: String,
    pub file_path: String,
    pub duration: f64,
    pub thumbnail: String,        // Base64 PNG/JPEG
    pub resolution: String,
    pub frame_rate: f64,
    pub codec: String,
    pub imported_at: i64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct VideoMetadata {
    pub duration: f64,
    pub resolution: String,
    pub frame_rate: f64,
    pub codec: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ImportResult {
    pub success: bool,
    pub clips: Vec<Clip>,
    pub errors: Vec<String>,     // Files that failed
}
```

### Storage
- **Temporary**: Clips stored in React app state (Zustand or Context).
- **Persistent**: File paths + clip metadata saved to session file by Story 8 (Session Persistence).
- **Thumbnails**: Base64-encoded in memory (stored in session state, persisted as part of clip data).

### Validation
- **File path**: Must exist and be readable.
- **File extension**: Must be `.mp4` or `.mov` (case-insensitive).
- **Format**: FFmpeg must recognize as valid video.
- **Size**: File up to 2GB (no hard limit, but tested to 2GB).

---

## 6. Service/Command APIs

### Command: `import_video_files`

Imports a list of video files, extracting metadata and thumbnails.

**Signature (Rust):**
```rust
#[tauri::command]
pub async fn import_video_files(
    file_paths: Vec<String>,
) -> Result<ImportResult, String>
```

**Input:**
- `file_paths`: Array of absolute file paths (e.g., `["/Users/john/video1.mp4", "/Users/john/video2.mov"]`)

**Output:**
- Success: `ImportResult { success: true, clips: Vec<Clip>, errors: [] }`
- Partial failure: `ImportResult { success: false, clips: [valid_clips], errors: ["file2.mp4: Unsupported codec"] }`
- Full failure: `ImportResult { success: false, clips: [], errors: ["All files failed to import"] }`

**Pre-conditions:**
- File paths must be absolute and readable.
- App must have file system permissions (granted at app startup).

**Post-conditions:**
- Valid files → `Clip` objects created with metadata + thumbnail.
- Invalid files → error message logged, clip skipped, queue continues.
- Thumbnails → base64-encoded and ready for React rendering.

**Error Handling:**
- File not found: `Err("File not found: /path/to/file.mp4")`
- Unsupported format: `Err("Unsupported video format: /path/to/file.heic")`
- Corrupted file: `Err("Unable to read file: video.mp4")`
- FFmpeg missing: `Err("FFmpeg binary not found")`
- Permission denied: `Err("Permission denied: /path/to/file.mp4")`

---

### Command: `get_video_metadata`

Extracts metadata from a single video file.

**Signature (Rust):**
```rust
#[tauri::command]
pub fn get_video_metadata(file_path: String) -> Result<VideoMetadata, String>
```

**Input:**
- `file_path`: Absolute path to video file.

**Output:**
- Success: `{ duration: 125.5, resolution: "1920x1080", frame_rate: 29.97, codec: "h264" }`
- Failure: `Err("Unable to read metadata: [reason]")`

**Error Handling:**
- File doesn't exist, can't read, or unsupported format → return `Err` with descriptive message.

---

### Command: `extract_thumbnail`

Extracts the first frame of a video and returns it as base64.

**Signature (Rust):**
```rust
#[tauri::command]
pub fn extract_thumbnail(file_path: String) -> Result<String, String>
```

**Input:**
- `file_path`: Absolute path to video file.

**Output:**
- Success: `"data:image/png;base64,iVBORw0KGgoAAAANSUhEUg..."`
- Failure: `Err("Unable to extract thumbnail: [reason]")`

**Error Handling:**
- FFmpeg fails → `Err` with reason.
- File missing/unreadable → `Err`.

---

### Command: `validate_video_format`

Quick validation: checks file extension and FFmpeg compatibility.

**Signature (Rust):**
```rust
#[tauri::command]
pub fn validate_video_format(file_path: String) -> Result<String, String>
```

**Input:**
- `file_path`: Absolute path to video file.

**Output:**
- Success: `Ok("mp4")` or `Ok("mov")`
- Failure: `Err("Unsupported format: heic")`

**Error Handling:**
- Unsupported extension → `Err`.
- FFmpeg fails to read → `Err`.

---

## 7. Components to Create/Modify

### React Components

- **`src/components/VideoImportButton.tsx`** — File picker trigger button. Handles click → open native file dialog → return selected paths → invoke `import_video_files`.
- **`src/components/ImportProgress.tsx`** — Progress modal during import. Shows current file, progress bar (0-100%), queue info (e.g., "2/5"), cancel button.
- **`src/App.tsx` (modify)** — Add drag-and-drop event handlers (`ondrop`, `ondragover`) to main window. Route drops to `import_video_files`.
- **`src/components/VideoImportDropZone.tsx`** (optional) — Visual drop zone overlay (or just hook into window-level drop).
- **`src/hooks/useImport.ts`** (optional) — Custom hook to manage import state, queue, and invoke commands.

### Tauri Commands (Rust)

- **`src-tauri/src/commands/video.rs`** — `import_video_files`, `get_video_metadata`, `extract_thumbnail`, `validate_video_format`.
- **`src-tauri/src/lib.rs` (modify)** — Register all video commands.

### State Management

- **`src/store.ts`** or **`src/context/AppContext.tsx`** — Manage `AppState` (clips, importQueue, isImporting, etc.).

---

## 8. Integration Points

### File System Access (Tauri)
- **`tauri::fs`**: Read file paths, validate file existence.
- **`tauri::dialog`**: Native file picker for MP4/MOV selection.

### FFmpeg Integration
- **Bundled binary**: `/src-tauri/ffmpeg` (already bundled per Story 1).
- **Commands used**:
  - `ffmpeg -i [file] -ss 0 -vframes 1 -q:v 2 [output.jpg]` — Extract first frame.
  - `ffprobe [file] -show_format -show_streams -of json` — Extract metadata.

### React State Management
- Import state (clips, queue, progress) managed centrally.
- Components subscribe to state changes and re-render.

### Desktop Lifecycle
- App window must accept drag-and-drop events (Tauri configuration).
- On app close, session state saved (handled by Story 8).

---

## 9. Testing & Acceptance Gates

### Happy Path: Single File Drag-and-Drop
- **Flow**: User drags single MP4 (5MB) into app window.
- **Gate**: Clip appears in Library within 2 seconds with thumbnail, filename, duration.
- **Pass**: Thumbnail visible, duration correct (e.g., "1:45"), no errors.

### Happy Path: File Picker Import
- **Flow**: User clicks "Import" button → file picker opens filtered to .mp4/.mov → selects 3 files → confirms.
- **Gate**: All 3 clips appear in Library in sequence, progress modal shows "[3/3] Importing..." then closes.
- **Pass**: All clips visible, no duplicates, thumbnails correct.

### Happy Path: Multiple File Drag-and-Drop
- **Flow**: User drags 5 MP4 files at once into app.
- **Gate**: Progress modal shows "[1/5] Importing..." → each completes in order → all 5 appear in Library.
- **Pass**: Queue processed sequentially, no UI blocking, no crashes.

### Happy Path: Large File Import
- **Flow**: User imports 2GB MOV file.
- **Gate**: Progress modal shows real-time progress (0-100%), UI remains responsive.
- **Pass**: No crashes, import completes within 30 seconds, clip appears in Library.

### Edge Case: Corrupted MP4
- **Flow**: User tries to import corrupted MP4 file.
- **Gate**: Error toast appears: "Unable to read file: corrupted.mp4" → import continues with next file if queued.
- **Pass**: No crash, app remains responsive, other files still imported.

### Edge Case: Unsupported Format (HEVC)
- **Flow**: User drags HEVC file (H.265 codec) into app.
- **Gate**: File rejected before processing. Error message: "Unsupported video format: h265".
- **Pass**: File not added to Library, user can try another file.

### Edge Case: Duplicate Import
- **Flow**: User imports same MP4 file twice.
- **Gate**: Two separate clips appear in Library (duplicates allowed per spec).
- **Pass**: Both clips have same filename + duration but unique IDs.

### Edge Case: File Not Found (Moved/Deleted)
- **Flow**: User imports file.mp4, then moves file to different directory, then launches app.
- **Gate**: (Handled by Story 3 Library View) Clip still exists in session but marked as missing.
- **Pass**: Library shows broken-file indicator (Story 3 detail).

### Edge Case: Special Characters in Filename
- **Flow**: User imports file named "Café_2024_日本.mp4".
- **Gate**: File imported successfully with correct filename displayed in Library.
- **Pass**: Filename renders correctly (Unicode support).

### Edge Case: Empty Directory (File Picker)
- **Flow**: User opens file picker, no MP4/MOV files in current directory.
- **Gate**: File picker shows empty list, no files selectable.
- **Pass**: User can navigate to correct directory.

### Error Handling: FFmpeg Missing
- **Flow**: FFmpeg binary is missing or corrupted.
- **Gate**: On first import attempt, error message: "FFmpeg binary not found. Please reinstall the app."
- **Pass**: User sees clear instructions, app doesn't crash.

### Performance: 20+ Imports in Session
- **Flow**: User imports 20 video files sequentially (30 seconds total).
- **Gate**: Memory usage stays < 500MB, no memory leaks, Library remains responsive.
- **Pass**: All clips appear, no lag, no crashes.

### Performance: Thumbnail Generation
- **Flow**: User imports 5-second clip.
- **Gate**: Thumbnail extracted and displayed within 2 seconds of import.
- **Pass**: Thumbnail visible before user starts next action.

---

## 10. Definition of Done

- [ ] All Tauri commands implemented (`import_video_files`, `get_video_metadata`, `extract_thumbnail`, `validate_video_format`).
- [ ] Drag-and-drop handler added to app window (Tauri configuration).
- [ ] File picker button implemented and connected to `import_video_files`.
- [ ] Import progress modal renders queue, current file, progress bar, cancel button.
- [ ] Error handling: Corrupted files, unsupported formats, missing FFmpeg → show user-friendly error messages.
- [ ] Clip state stored in app (React context or Zustand).
- [ ] Thumbnails generated and displayed correctly.
- [ ] Metadata extraction (duration, resolution, codec) accurate.
- [ ] Large files (2GB) import without crash or UI blocking.
- [ ] All acceptance gates pass (happy path, edge cases, errors, performance).
- [ ] Manual testing completed: Drag-and-drop, file picker, errors, duplicates, large files.
- [ ] Code reviewed and merged to `develop` branch.
- [ ] No console warnings or errors.

---

## 11. Risks & Mitigations

| Risk | Mitigation |
|------|-----------|
| **FFmpeg compatibility** — FFmpeg may not read certain MP4 variants (e.g., HEVC, ProRes). | Validate codec before full import. Use `ffprobe` to detect unsupported codecs early. Test with real-world MP4/MOV files. |
| **Large file performance** — Importing 2GB file could freeze UI if done synchronously. | Run import in background thread (Tauri async). Show progress modal to give user feedback. Test with actual 2GB files. |
| **Thumbnail generation failure** — Some corrupted MP4s may have invalid first frame. | Catch FFmpeg errors and show fallback thumbnail (generic video icon). Continue import queue. |
| **File path encoding issues** — Unicode filenames or special characters may break import. | Use Rust `Path` APIs which handle Unicode correctly. Test with international filenames. |
| **Memory leaks with many imports** — Storing 100+ base64 thumbnails could consume excessive memory. | Implement thumbnail caching (optional Story 8 enhancement). Monitor memory during testing. Clear old clips if memory exceeds threshold. |
| **Drag-and-drop across platforms** — Tauri drag-and-drop behavior may differ on macOS vs Windows. | Test on both platforms. Tauri should handle cross-platform normalization. |

---

## Authoring Notes

- **Vertical slice**: User can import a single file and see it in Library. Multiple files/queue build on this.
- **Acceptance gates are the spec**: Implement to pass each gate exactly as written.
- **Test gates before coding**: Review all gates with user story acceptance criteria.
- **Break into <1 hour chunks**: Separate metadata extraction from thumbnail generation if needed.
- **Deterministic backend**: Tauri commands should return consistent results for same input.
- **Graceful errors**: All error cases must show user-friendly messages and prevent app crashes.
- **Performance matters**: Test with real 2GB files, monitor memory.

---

**PRD Ready for Implementation**

This PRD is ready for handoff to Caleb. The acceptance gates define what "done" means. Implement in order: commands → drag-and-drop → file picker → progress modal → manual testing.
