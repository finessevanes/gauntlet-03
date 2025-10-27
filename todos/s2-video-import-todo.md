# TODO — Video Import (Story 2)

**Branch**: `feat/video-import`
**Source**: User Story 2 (Video Import)
**PRD Reference**: `prds/s2-video-import-prd.md`
**Owner (Agent)**: Caleb

---

## 0. Pre-Implementation

- [ ] Read user story and acceptance criteria thoroughly
- [ ] Read relevant sections of PRD (Summary, Functional Requirements, Data Model, Service APIs, Testing & Acceptance Gates)
- [ ] Verify existing codebase structure (Story 1 should be complete: Application Launch)
- [ ] Identify FFmpeg integration points (bundled binary location, availability)
- [ ] Clarify any ambiguities before starting

---

## 1. Service/Command Layer (Rust/Tauri)

Implement deterministic backend commands for video file handling.

- [ ] **Command: `import_video_files`**
  - Input: `Vec<String>` (file paths)
  - Output: `Result<ImportResult, String>` with clips and errors
  - Error handling: File not found, unsupported format, corrupted files, FFmpeg missing
  - Acceptance: Accept MP4/MOV, reject HEVC/ProRes/AV1/WebM with error message

- [ ] **Command: `get_video_metadata`**
  - Input: `String` (file path)
  - Output: `Result<VideoMetadata, String>` (duration, resolution, frame rate, codec)
  - Error handling: Invalid file, FFmpeg errors
  - Acceptance: Extract correct duration and resolution from real video files

- [ ] **Command: `extract_thumbnail`**
  - Input: `String` (file path)
  - Output: `Result<String, String>` (base64 PNG/JPEG)
  - Error handling: File missing, FFmpeg fails, corrupted frame
  - Acceptance: First frame extracted and base64-encoded within 2 seconds

- [ ] **Command: `validate_video_format`**
  - Input: `String` (file path)
  - Output: `Result<String, String>` (format string: "mp4" or "mov")
  - Error handling: Unsupported extension, FFmpeg fails to read
  - Acceptance: Reject unsupported formats before processing

- [ ] Implement all commands in `src-tauri/src/commands/video.rs`
- [ ] Register commands in `src-tauri/src/lib.rs`
- [ ] Test: All commands return correct results for valid and invalid inputs

---

## 2. React Components & State

Create/modify React components and state management.

- [ ] **Data Model: `Clip` interface**
  - Define in `src/types/Clip.ts` or app state file
  - Fields: id, filePath, duration, thumbnail, resolution, frameRate, codec, importedAt
  - Test: Interface compiles and allows proper typing

- [ ] **State Management: AppState context/store**
  - Create `src/context/AppContext.tsx` or use Zustand (if preferred)
  - Manage: clips[], importQueue[], isImporting, currentImportFile, importProgress, lastImportDirectory, error
  - Test: State updates correctly from components

- [ ] **Component: `VideoImportButton.tsx`**
  - Purpose: Trigger file picker for MP4/MOV selection
  - Props: None (or optional onImportStart callback)
  - State: Managed by parent AppContext
  - Test: Button renders, click opens native file dialog

- [ ] **Component: `ImportProgress.tsx`**
  - Purpose: Show import queue progress (modal/toast)
  - Shows: Current file, progress bar (0-100%), queue info (e.g., "2/5"), cancel button
  - State: Receives isImporting, currentImportFile, importProgress from AppContext
  - Test: Modal shows/hides correctly, progress bar updates, cancel button works

- [ ] **Modify: `src/App.tsx`**
  - Add drag-and-drop event handlers (ondrop, ondragover, ondragleave)
  - Route drops to import handler
  - Show drop zone overlay when dragging files
  - Test: Drag files into window, import starts

- [ ] **Component: `VideoImportDropZone.tsx` (optional)**
  - Purpose: Visual feedback during drag-and-drop
  - Shows: "Drop files here" overlay when hovering with files
  - Test: Appears on dragover, disappears on dragleave/drop

---

## 3. Data Model & Persistence

- [ ] Define Rust struct: `Clip` in `src-tauri/src/models/` with Serialize/Deserialize
- [ ] Define Rust struct: `VideoMetadata` for metadata extraction
- [ ] Define Rust struct: `ImportResult` (success bool, clips vec, errors vec)
- [ ] Define TypeScript interfaces in React app for type safety
- [ ] Persistence: File paths + clip metadata stored by Session Persistence (Story 8)
  - For now: Store in React state and localStorage if needed for recovery
  - Test: State persists across component remounts (if using context)

---

## 4. Integration

- [ ] **Wire drag-and-drop**
  - Listen for ondrop in App.tsx
  - Extract file paths from DataTransfer event
  - Validate file extensions (.mp4, .mov)
  - Invoke `import_video_files` command
  - Test: Drag 3 MP4 files into window, all appear in library within 6 seconds

- [ ] **Wire file picker button**
  - Use Tauri `dialog::open()` with `.mp4, .mov` filter
  - Get selected file paths
  - Invoke `import_video_files` command
  - Test: Click Import → file dialog opens → select files → import starts

- [ ] **Wire import command to state**
  - On import start: Set isImporting=true, clear errors
  - On each file progress: Update currentImportFile, importProgress
  - On success: Add clips to state, close modal
  - On error: Show error toast, continue queue
  - Test: UI reflects all state changes

- [ ] **FFmpeg integration**
  - Verify bundled FFmpeg binary is accessible in Tauri
  - Commands: ffmpeg (thumbnails), ffprobe (metadata)
  - Test: Thumbnail extraction works, metadata accurate

---

## 5. Manual Testing

**Reference testing gates from PRD Section 9 (Testing & Acceptance Gates):**

- [x] **Happy Path: Single File Drag-and-Drop**
  - Drag single MP4 (5MB) into app window
  - Verify: Clip appears in Library within 2 seconds with thumbnail, filename, duration
  - Gate: Thumbnail visible, duration correct (e.g., "1:45"), no errors

- [x] **Happy Path: File Picker Import**
  - Click "Import" button → file picker opens filtered to .mp4/.mov → select 3 files → confirm
  - Verify: All 3 clips appear in Library, progress modal shows "[3/3]" then closes
  - Gate: All clips visible, no duplicates, thumbnails correct

- [x] **Happy Path: Multiple File Drag-and-Drop**
  - Drag 5 MP4 files at once into app
  - Verify: Progress modal shows "[1/5]" → each completes → all 5 appear in Library
  - Gate: Queue processed sequentially, no UI blocking, no crashes

- [x] **Happy Path: Large File Import**
  - Import 2GB MOV file
  - Verify: Progress modal shows real-time progress (0-100%), UI remains responsive
  - Gate: No crashes, import completes within 30 seconds, clip appears in Library

- [N/A] **Edge Case: Corrupted MP4** - unable to test
  - Try to import corrupted MP4 file
  - Verify: Error toast "Unable to read file: corrupted.mp4" → import continues if queued
  - Gate: No crash, app responsive, other files still imported

- [x] **Edge Case: Unsupported Format (HEVC)**
  - Drag HEVC file (H.265 codec) into app
  - Verify: File rejected with error "Unsupported video format: h265"
  - Gate: File not added to Library, user can try another

- [x] **Edge Case: Duplicate Import**
  - Import same MP4 file twice
  - Verify: Two separate clips appear in Library (duplicates allowed)
  - Gate: Both clips have same filename + duration but unique IDs

- [x] **Edge Case: Special Characters in Filename**
  - Import file named "Café_2024_日本.mp4"
  - Verify: File imported successfully, filename displays correctly in Library
  - Gate: Unicode support confirmed

- [N/A] **Error Handling: FFmpeg Missing**
  - (Setup: Temporarily remove or corrupt FFmpeg binary)
  - Try to import file
  - Verify: Error message "FFmpeg binary not found. Please reinstall the app."
  - Gate: User sees clear instructions, app doesn't crash

- [x] **Performance: 20+ Imports in Session**
  - Import 20 video files sequentially (30 seconds total)
  - Verify: Memory usage < 500MB, Library remains responsive, no crashes
  - Gate: All clips appear, no lag

- [x] **Performance: Thumbnail Generation**
  - Import 5-second clip
  - Verify: Thumbnail extracted and displayed within 2 seconds
  - Gate: Thumbnail visible before user starts next action

- [ ] No console errors during all test scenarios
- [ ] Feature feels responsive (no UI lag)

---

## 6. Definition of Done

- [ ] All Tauri commands implemented (`import_video_files`, `get_video_metadata`, `extract_thumbnail`, `validate_video_format`)
- [ ] Drag-and-drop handler added to app window
- [ ] File picker button implemented and connected to `import_video_files`
- [ ] Import progress modal renders queue, current file, progress bar, cancel button
- [ ] Error handling: Corrupted files, unsupported formats, missing FFmpeg → user-friendly messages
- [ ] Clip state stored in app (React context)
- [ ] Thumbnails generated and displayed correctly
- [ ] Metadata extraction (duration, resolution, codec) accurate
- [ ] Large files (2GB) import without crash or UI blocking
- [ ] All acceptance gates pass (happy path, edge cases, errors, performance)
- [ ] Code reviewed and merged to `develop` branch
- [ ] No console warnings or errors

---

## 7. PR & Merge

⚠️ **CRITICAL**: DO NOT COMMIT UNTIL USER CONFIRMS ALL TEST GATES PASS

- [ ] Create branch `feat/video-import` from develop
- [ ] Implement all tasks in Sections 1-6
- [ ] User confirms all test gates pass ← WAIT FOR THIS
- [ ] User says "ready to commit" or "looks good"
- [ ] THEN: Commit changes with clear messages
- [ ] THEN: Create PR with:
  - Link to Story 2 in USER_STORIES.md
  - Link to PRD: `prds/s2-video-import-prd.md`
  - Summary of changes
  - Manual test results (all gates pass)
- [ ] Merge to develop

---

## Notes

- PRD is the specification — Section 9 (Testing & Acceptance Gates) defines "done"
- FFmpeg must be bundled and accessible (Story 1 prerequisite)
- Test gates are NOT optional — all must pass before committing
- Break work into <1 hour chunks to stay focused
- Document any blockers immediately

