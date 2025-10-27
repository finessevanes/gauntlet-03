# PRD: Application Launch

**Feature**: Application Launch | **Status**: Ready | **Agent**: Pam

---

## Preflight

1. **Smallest end-to-end user outcome?**
   - App launches in <5 seconds, FFmpeg binary bundled and functional, empty state UI displays on first launch, previous session restores on subsequent launches.

2. **Primary user + critical action?**
   - User: Content creator launching Klippy
   - Critical action: Quick startup + restore previous work or show empty state

3. **Must-have vs nice-to-have?**
   - Must: Launch speed <5s, FFmpeg bundled, empty state on first launch, session restoration
   - Nice: Splash screen with version info (out of scope for MVP)

4. **Offline/persistence needs?**
   - Yes: Session state file (imported clips, timeline order, zoom level, scroll position) persisted to disk; restored on relaunch

5. **Performance targets?**
   - App launch: <5 seconds
   - FFmpeg check: <1 second
   - State file I/O: <500ms

6. **Error/edge cases critical to handle?**
   - FFmpeg binary missing/corrupted → clear error dialog with reinstall instructions
   - Session state file corrupted → launch with blank slate, log error
   - Session state file missing (first launch) → show empty state, no error

7. **Data model changes?**
   - Session state object:
     ```typescript
     interface Session {
       clips: Array<{ id: string; filePath: string; duration: number; inPoint: number; outPoint: number }>;
       timelineOrder: string[]; // clip IDs in timeline sequence
       zoomLevel: number;
       scrollPosition: number;
     }
     ```
   - Storage: JSON file in user's app data directory (e.g., `~/.config/klippy/session.json` on Mac)

8. **Service/command APIs needed?**
   - `init_app()` → loads session state, validates FFmpeg, returns initialized app state
   - `save_session(session: Session)` → persists session to disk
   - `get_ffmpeg_status()` → checks if FFmpeg binary exists and is executable

9. **React components to create/modify?**
   - `App.tsx` → modify to call init_app on mount, handle session restoration
   - `EmptyState.tsx` (new) → display when no clips are imported
   - `AppShell.tsx` (new) → main layout container with Library, Preview, Timeline panels

10. **Desktop-specific needs?**
    - App lifecycle: Handle window close events to trigger session save
    - File system: Read/write session state to user config directory
    - FFmpeg: Verify binary at app startup, handle missing binary gracefully

11. **What's explicitly out of scope?**
    - Splash screen animation
    - Crash recovery (corrupted state = blank slate, not recovery)
    - Project file format (only ephemeral session state)
    - Auto-update checks

---

## 1. Summary

Klippy launches quickly with FFmpeg bundled and ready to use. On first launch, users see an empty state. On subsequent launches, the app restores their previous session (imported clips, timeline arrangement, zoom level, and scroll position). If session state is corrupted, the app launches with a blank slate and logs the error.

---

## 2. Non-Goals / Scope Boundaries

- **Splash screen**: No animated splash (user will see loading indicator in title bar)
- **Project files**: No manual save/load feature (state is ephemeral; Session 1 → close app → Session 1 restored next launch)
- **Crash recovery**: Corrupted session state results in blank slate (not automatic recovery)
- **Undo/redo**: Out of scope for MVP
- **Multi-user profiles**: Single user per machine (no login/profiles)
- **Auto-update**: Version checking and updates out of scope

---

## 3. Experience (UX)

### Entry Points
- **User action**: Click app icon on desktop / Applications folder
- **Result**: App window opens, loading indicator shows briefly

### User Flow (Happy Path)

**First Launch**:
1. User clicks Klippy icon
2. Window opens (title: "Klippy")
3. Loading indicator spins for 1-2 seconds
4. Main UI renders with:
   - Empty Library panel: "Drag & drop video files or click Import to get started"
   - Empty Timeline: "Drag clips here to start editing"
   - Empty Preview: Placeholder (no video loaded)
5. User can now drag in videos or click Import button

**Subsequent Launch (With Previous Session)**:
1. User clicks Klippy icon
2. Window opens
3. Loading indicator spins for 1-2 seconds
4. Main UI renders with:
   - Library panel: All previously imported clips displayed with thumbnails
   - Timeline: Clips in same order as before, zoom level restored, scroll position restored
   - Preview: Empty (no playhead position saved; starts at 0)
5. User can continue editing

### States

- **Loading**: App window visible, loading spinner in center, "Initializing..." text
- **Error**: Error dialog with title "Cannot Start", message (e.g., "FFmpeg binary not found"), action button "Reinstall" or "Close"
- **Success**: Main UI with Library, Timeline, Preview panels populated (or empty if first launch)

### Desktop Considerations
- **Window size**: Minimum 1280x720; user can resize freely
- **Window close**: On window close event, save current session state
- **Multi-monitor**: App opens on primary monitor (Tauri default)
- **App focus**: When app regains focus after minimize/restore, no action needed (state already restored on launch)

---

## 4. Functional Requirements

### MUST

- **REQ-1.1**: App must launch in under 5 seconds on macOS (measured from click to main UI visible)
- **REQ-1.2**: FFmpeg binary must be bundled with app (no external download/installation required)
- **REQ-1.3**: FFmpeg binary must be extracted to a writable location on first run (e.g., temp directory or app data directory)
- **REQ-1.4**: On first launch (no prior session state), show empty state UI with no error message
- **REQ-1.5**: On subsequent launch, automatically restore:
  - All previously imported clips in Library
  - Timeline clip order and positions
  - Zoom level and scroll position
- **REQ-1.6**: If session state file is corrupted or unreadable, launch with blank slate and log error to console
- **REQ-1.7**: If FFmpeg binary is missing or corrupted (unexecutable), show error dialog: "Cannot start Klippy. FFmpeg not found. Please reinstall the app."
- **REQ-1.8**: App window title displays "Klippy"
- **REQ-1.9**: Window size on launch: 1280x720 (or larger if previously resized and saved)

### SHOULD

- **REQ-1.10**: Display version number in about dialog or title bar (e.g., "Klippy v1.0")
- **REQ-1.11**: Log startup timing and FFmpeg status to console (debug info)

---

## 5. Data Model

### Session State (TypeScript + JSON)

```typescript
interface Clip {
  id: string;           // UUID v4, e.g., "550e8400-e29b-41d4-a716-446655440000"
  filePath: string;     // Absolute path to video file, e.g., "/Users/john/Videos/clip1.mp4"
  duration: number;     // Duration in seconds, e.g., 60.5
  inPoint: number;      // Trim start in seconds, e.g., 0
  outPoint: number;     // Trim end in seconds, e.g., 60.5
}

interface Session {
  version: number;      // Schema version, currently 1 (for future migrations)
  clips: Clip[];        // All imported clips
  timelineOrder: string[]; // Clip IDs in timeline sequence, e.g., ["id1", "id2", "id3"]
  zoomLevel: number;    // Zoom percentage, 100-1000, e.g., 100
  scrollPosition: number; // Timeline horizontal scroll in pixels, e.g., 0
}
```

### Storage

- **Location**: `~/.config/klippy/session.json` (Linux/Mac) or `%APPDATA%/klippy/session.json` (Windows)
- **Tauri API**: Use `tauri::path::app_data_dir()` to locate correct directory
- **Format**: Plain JSON (human-readable, version-controlled schema for future upgrades)
- **Permissions**: App must have read/write access to this directory

### Validation

- Session file must be valid JSON; if not, treat as corrupted (launch with blank slate)
- All clip file paths must be absolute paths
- Clip IDs must be non-empty strings
- `zoomLevel` must be between 100-1000
- `scrollPosition` must be non-negative

---

## 6. Service/Command APIs

### Tauri Commands (Rust backend)

#### `init_app()`
Initializes the app on startup.

**Pre-conditions**:
- FFmpeg binary has been extracted to writable location
- App data directory exists or can be created

**Post-conditions**:
- FFmpeg availability confirmed
- Session state loaded or initialized to empty
- Return: `{ session: Session, ffmpegStatus: "ok" | "missing" | "corrupted" }`

**Implementation**:
```rust
#[tauri::command]
fn init_app(app_handle: tauri::AppHandle) -> Result<AppState, String> {
  // 1. Check FFmpeg binary
  let ffmpeg_path = get_ffmpeg_path(&app_handle)?;
  if !Path::new(&ffmpeg_path).exists() {
    return Err("FFmpeg binary not found".to_string());
  }

  // 2. Load session state
  let session_path = get_session_path(&app_handle)?;
  let session = if session_path.exists() {
    load_session_from_file(&session_path)
      .unwrap_or_else(|_| Session::default()) // Corrupted = blank slate
  } else {
    Session::default() // First launch
  };

  Ok(AppState { session })
}
```

**Error codes**:
- "FFmpeg binary not found" → Show error dialog, prevent app from proceeding
- "Failed to load session" → Log error, launch with blank slate (no user-facing error)

---

#### `save_session(session: Session)`
Persists the current session to disk.

**Pre-conditions**:
- Session object is valid (required fields present)

**Post-conditions**:
- Session saved to `~/.config/klippy/session.json`

**Implementation**:
```rust
#[tauri::command]
fn save_session(session: Session, app_handle: tauri::AppHandle) -> Result<(), String> {
  let session_path = get_session_path(&app_handle)?;
  let json = serde_json::to_string_pretty(&session)
    .map_err(|e| format!("Serialization error: {}", e))?;
  std::fs::write(&session_path, json)
    .map_err(|e| format!("File write error: {}", e))?;
  Ok(())
}
```

**Error handling**:
- File I/O errors: Log to console, show toast notification to user (optional: "Session not saved. Retry?")

---

#### `get_ffmpeg_status()`
Returns current FFmpeg status.

**Pre-conditions**: None

**Post-conditions**: Returns status string

**Implementation**:
```rust
#[tauri::command]
fn get_ffmpeg_status(app_handle: tauri::AppHandle) -> String {
  let ffmpeg_path = get_ffmpeg_path(&app_handle).ok();
  match ffmpeg_path {
    Some(path) if Path::new(&path).exists() => "ok".to_string(),
    Some(_) => "missing".to_string(),
    None => "error".to_string(),
  }
}
```

**Return**: "ok" | "missing" | "error"

---

## 7. Components to Create/Modify

### React Components

- **`src/App.tsx`** — Modify main App component:
  - Call `init_app()` on mount
  - Handle loading, error, and success states
  - Dispatch session state to context/store
  - Render AppShell on success

- **`src/components/AppShell.tsx`** (new) — Main layout container:
  - Three-panel layout: Library (left), Preview (center), Timeline (bottom)
  - Props: `session: Session, onSessionChange: (session: Session) => void`
  - Renders child panels with session state

- **`src/components/EmptyState.tsx`** (new) — Empty state UI:
  - Displays when Library is empty
  - Message: "Drag & drop video files or click Import to get started"
  - Icon/placeholder image

- **`src/components/ErrorDialog.tsx`** (new) — Error modal:
  - Props: `title: string, message: string, action?: string, onClose: () => void`
  - Displays FFmpeg errors and other initialization failures

### Tauri/Rust Components

- **`src-tauri/src/commands/app.rs`** (new) — App initialization commands:
  - `init_app()` — Load FFmpeg status, restore session
  - `save_session()` — Persist session to disk
  - `get_ffmpeg_status()` — Check FFmpeg availability

- **`src-tauri/src/utils/ffmpeg.rs`** (new) — FFmpeg utilities:
  - `get_ffmpeg_path()` — Locate FFmpeg binary
  - `extract_ffmpeg_binary()` — Extract bundled binary on first run
  - `verify_ffmpeg()` — Test that binary is executable

- **`src-tauri/src/utils/session.rs`** (new) — Session persistence:
  - `load_session_from_file()` — Read and deserialize session JSON
  - `get_session_path()` — Return path to session.json

---

## 8. Integration Points

- **File system access**: Read/write `~/.config/klippy/session.json` using Tauri `fs` module
- **FFmpeg binary**: Bundled in `src-tauri/resources/ffmpeg` (macOS binary); extracted on first run
- **App lifecycle**: Hook into window close event (`tauri::window::Window::on_window_event`) to call `save_session()`
- **State management**: Use React Context (or Zustand) to share Session state across App, Library, Timeline, Preview components
- **Desktop event**: Listen to app "close-requested" event in Tauri to save session before exit

---

## 9. Testing & Acceptance Gates

### Happy Path 1: First Launch

**Flow**:
1. Fresh install, no prior session state
2. Double-click Klippy icon
3. App window opens
4. Wait for loading to complete (1-2 seconds)

**Gate**:
- Main UI visible within 5 seconds
- Library shows empty state message: "Drag & drop video files or click Import to get started"
- Timeline shows empty state: "Drag clips here to start editing"
- No error dialogs
- Console has no errors

**Pass**: All gates met.

---

### Happy Path 2: Subsequent Launch (Session Restore)

**Setup**:
1. First launch complete (from Happy Path 1)
2. User imports 3 MP4 clips via drag & drop (covered in Story 2, but assume this works)
3. User arranges clips on timeline in custom order
4. User zooms timeline to 300%
5. User scrolls timeline to show middle section
6. User closes app (Cmd+Q)

**Flow**:
1. User waits 2 seconds
2. User re-opens Klippy

**Gate**:
- App launches in <5 seconds
- Library displays all 3 clips (with thumbnails, filenames, durations)
- Timeline shows clips in same order as before
- Zoom level is 300%
- Timeline scroll position matches previous session
- No error dialogs
- Console has no errors

**Pass**: All gates met.

---

### Edge Case 1: First Launch (Empty State)

**Flow**: Same as Happy Path 1

**Gate**: Empty Library and Timeline show placeholder text and no error

**Pass**: Verified.

---

### Edge Case 2: Session State File Corrupted

**Setup**:
1. Session state file exists but contains invalid JSON (e.g., truncated file)
2. User relaunches app

**Flow**:
1. User opens Klippy

**Gate**:
- App launches (does not crash)
- Main UI shows empty state (no clips in Library or Timeline)
- Error is logged to console: "Session file corrupted. Launching with blank slate."
- No error dialog shown to user (graceful recovery)

**Pass**: All gates met.

---

### Error Case 1: FFmpeg Binary Missing

**Setup**:
1. Fresh install where FFmpeg binary failed to bundle or is missing
2. User opens Klippy

**Flow**:
1. User clicks Klippy icon
2. Window opens
3. Error dialog appears

**Gate**:
- Error dialog title: "Cannot Start"
- Error message: "FFmpeg binary not found. Please reinstall the app."
- Button: "Close" or "Download"
- Clicking button closes the app gracefully (no crash)
- No main UI rendered behind error

**Pass**: All gates met.

---

### Error Case 2: FFmpeg Binary Corrupted (Not Executable)

**Setup**:
1. FFmpeg binary exists but is not executable (permissions issue or corrupted binary)
2. User opens Klippy

**Flow**:
1. User clicks Klippy icon
2. Window opens
3. Verification fails

**Gate**:
- Same error dialog as Error Case 1
- App closes gracefully

**Pass**: Verified.

---

## 10. Definition of Done

- [ ] Tauri command `init_app()` implemented, tested with mock FFmpeg path
- [ ] Tauri command `save_session()` implemented and tested
- [ ] Tauri command `get_ffmpeg_status()` implemented
- [ ] Session JSON schema defined and validated
- [ ] FFmpeg binary bundled in Tauri resources; extraction logic works
- [ ] `App.tsx` modified to call `init_app()` on mount, handle loading/error/success states
- [ ] `AppShell.tsx` component created with three-panel layout
- [ ] `EmptyState.tsx` component created with placeholder UI
- [ ] `ErrorDialog.tsx` component created for error messages
- [ ] React Context created to share Session state across components
- [ ] Window close event hooked to `save_session()` call
- [ ] All Happy Path acceptance gates pass
- [ ] All Edge Case gates pass
- [ ] All Error Case gates pass
- [ ] No console errors or warnings during testing
- [ ] App launch time <5 seconds measured with stopwatch (macOS)
- [ ] Code reviewed and merged to `develop` branch

---

## 11. Risks & Mitigations

| Risk | Mitigation |
|------|-----------|
| FFmpeg binary compatibility (macOS Intel vs Apple Silicon) | Bundle both architectures in universal binary; Tauri handles architecture-specific extraction |
| Session file corruption leads to data loss | Graceful fallback to blank slate; log error for debugging; consider backup strategy post-MVP |
| Window close event fires after app already quit | Use Tauri's "close-requested" event instead of generic close; save state before allowing window to close |
| File permissions prevent session.json write | Request necessary permissions on first run; graceful error handling if write fails |
| FFmpeg binary extracted to temp directory is cleaned by OS | Extract to app data directory instead (persistent); verify on each launch |

---

**Document Status**: Ready for Implementation
**Reference**: Story 1 (USER_STORIES.md), prd-mvp.md (REQ-1)

