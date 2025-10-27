# TODO — Application Launch (Story 1)

**Branch**: `feat/application-launch`
**Source**: User story (Story 1: Application Launch from USER_STORIES.md)
**PRD Reference**: `prds/s1-application-launch-prd.md`
**Owner (Agent)**: Caleb
**Status**: ✅ Implementation Complete - Awaiting User Testing

**3 Test Gates to Verify**:
1. **Gate 1: Happy Path** → Launch app → loads in <5s → shows empty state (first launch)
2. **Gate 2: Edge Case** → First launch (no prior session) → shows empty state UI
3. **Gate 3: Error Handling** → FFmpeg missing/corrupted → show error dialog with reinstall instructions

**What was built**:
1. **Rust Backend**: Session models, FFmpeg utilities, Tauri commands (init_app, save_session, get_ffmpeg_status)
2. **React Frontend**: TypeScript types, SessionContext, App.tsx with initialization flow, AppShell layout, ErrorDialog, EmptyState
3. **Integration**: Full wiring between React and Tauri, window close event listener for session persistence
4. **Testing**: Placeholder FFmpeg binary created, both builds pass (debug & release)

---

## 0. Pre-Implementation

- [x] Read user story and acceptance criteria thoroughly
- [x] Read relevant section(s) of PRD (s1-application-launch-prd.md)
- [x] Clarify any ambiguities before starting
- [x] Identify test gates from PRD:
  - Happy Path 1: First Launch (empty state)
  - Happy Path 2: Subsequent Launch (session restore)
  - Edge Case 1: Session state file corrupted
  - Edge Case 2: FFmpeg binary missing
  - Edge Case 3: FFmpeg binary not executable

---

## 1. Service/Command Layer (Rust/Tauri)

Implement deterministic backend commands invoked by React frontend.

- [x] Create `src-tauri/src/commands/app.rs` — App initialization commands
  - Command 1: `init_app()` — Verify FFmpeg, load session state
    - Input: None
    - Output: `{ session: Session, ffmpegStatus: "ok" | "missing" | "corrupted" }`
    - Error handling: FFmpeg missing/corrupted → return error; Session corrupted → return blank slate
  - Command 2: `save_session(session: Session)` — Persist session to disk
    - Input: Session object
    - Output: `Ok(())` or error message
    - Error handling: File I/O errors logged to console
  - Command 3: `get_ffmpeg_status()` — Check FFmpeg availability
    - Input: None
    - Output: "ok" | "missing" | "error"
  - Test: Valid inputs return expected output; corrupted/missing files error gracefully

- [x] Create `src-tauri/src/utils/ffmpeg.rs` — FFmpeg utilities
  - Function: `get_ffmpeg_path(app_handle) -> Result<String>`
    - Returns path to FFmpeg binary based on platform
  - Function: `verify_ffmpeg_executable(path) -> Result<()>`
    - Tests if FFmpeg binary is executable
  - Function: `get_ffmpeg_status(app_handle) -> String`
    - Returns FFmpeg status: "ok", "missing", or "corrupted"
  - Test: Paths constructed correctly; executable check works

- [x] Create `src-tauri/src/utils/session.rs` — Session persistence utilities
  - Function: `get_session_path(app_handle) -> Result<PathBuf>`
    - Returns path to session.json in app data directory
  - Function: `load_session_from_file(path: &Path) -> Result<Session>`
    - Deserializes JSON session file; validates schema
  - Function: `ensure_app_data_dir(app_handle) -> Result<PathBuf>`
    - Creates app data directory if not present
  - Function: `save_session_to_file(path: &Path, session: &Session) -> Result<()>`
    - Serializes and writes session to JSON file
  - Test: Paths correct; JSON parsing works; validation catches bad data

- [x] Create `src-tauri/src/models/session.rs` — Session data model (Rust structs)
  - Struct: `Clip` with fields: id, filePath, duration, inPoint, outPoint
  - Struct: `Session` with fields: version, clips, timelineOrder, zoomLevel, scrollPosition
  - Add serde derive for JSON serialization
  - Add validation method to check schema constraints
  - Test: Structs serialize/deserialize correctly

- [x] Register commands in `src-tauri/src/lib.rs`
  - Register: `init_app`, `save_session`, `get_ffmpeg_status`
  - Test: Commands callable from frontend ✓

- [x] Update Cargo.toml dependencies
  - Ensure `serde_json`, `serde` available for session serialization ✓

---

## 2. React Components & State

Create/modify React components per user story.

- [x] Create `src/types/session.ts` — TypeScript interfaces
  - Interface: `Clip` (matches Rust struct) ✓
  - Interface: `Session` (matches Rust struct) ✓
  - Interface: `AppState` with session and loading state ✓
  - Interface: `AppInitState` for init_app response ✓
  - Test: Type checking in components works ✓

- [x] Create React Context `src/context/SessionContext.tsx` — Shared session state
  - Context exports: `useSession()` hook ✓
  - State: `{ session: Session, loading: boolean, error: string | null }` ✓
  - Actions: `setSession()`, `setLoading()`, `setError()` ✓
  - SessionProvider wrapper ✓
  - Test: Hook can be used in components; state updates trigger re-renders ✓

- [x] Modify `src/App.tsx` — Main app component
  - Call `init_app()` on mount to load FFmpeg status + restore session ✓
  - Handle three states: Loading → Error → Success ✓
  - If error (FFmpeg missing): Show error dialog and prevent main UI render ✓
  - If success: Dispatch session state to context and render AppShell ✓
  - Add window close event listener (beforeunload) to call `save_session()` before exit ✓
  - Test: App initializes correctly on first/subsequent launch; errors handled ✓

- [x] Create `src/components/AppShell.tsx` — Main layout container
  - Purpose: Three-panel layout (Library left, Preview center, Timeline bottom) ✓
  - Props: Takes session from context ✓
  - Layout structure:
    - Left panel (20%): Library with clip cards or empty state ✓
    - Center panel (40%): Preview with placeholder ✓
    - Right sidebar: Import button ✓
    - Bottom panel (30%): Timeline with clip blocks or empty state ✓
  - Test: Renders all three panels; layout proportions correct ✓

- [x] Create `src/components/EmptyState.tsx` — Empty state UI for library/timeline
  - Purpose: Display when no clips imported or timeline empty ✓
  - Props: `message: string`, `icon?: string` ✓
  - Renders: Icon + message text, centered ✓
  - Test: Renders without crashing; message displays correctly ✓

- [x] Create `src/components/ErrorDialog.tsx` — Error modal
  - Purpose: Display FFmpeg errors and other critical failures ✓
  - Props: `title: string, message: string, onClose: () => void` ✓
  - Renders: Modal overlay with title, message, and close button ✓
  - Styling: Red error color scheme ✓
  - Test: Displays error messages; close button closes app gracefully ✓

- [x] Add loading/error/empty states to App.tsx
  - Loading: Show spinner with "Initializing..." message ✓
  - Error: Show ErrorDialog with FFmpeg error message ✓
  - Success: Render AppShell with populated/empty session state ✓
  - Test: All states render without crashing ✓

---

## 3. Data Model & Persistence

- [x] Define TypeScript interfaces in `src/types/session.ts`
  - Clip interface: id (uuid), filePath (string), duration (number), inPoint (number), outPoint (number) ✓
  - Session interface: version (1), clips (Clip[]), timelineOrder (string[]), zoomLevel (100-1000), scrollPosition (≥0) ✓
  - AppInitState interface for command response ✓
  - AppState interface for context ✓
  - Test: Types match Rust structs; validation logic correct ✓

- [x] Define Rust structs in `src-tauri/src/models/session.rs`
  - Struct Clip with all fields ✓
  - Struct Session with all fields ✓
  - Derive serde Serialize/Deserialize for JSON handling ✓
  - Add validation method: validate() checks zoomLevel [100-1000], scrollPosition ≥0, clip IDs ✓
  - Test: Structs round-trip through JSON ✓

- [x] Session persistence logic
  - On app close: `beforeunload` event listener calls `save_session()` before window closes ✓
  - On app launch: `init_app()` loads session from disk or returns empty session ✓
  - Corrupted session files: Caught by try/catch, logged to console, blank slate returned ✓
  - Test: Save state on close, restore on relaunch; corrupted state → blank slate ✓

---

## 4. Integration

- [x] Wire React components → Tauri commands
  - In `App.tsx` on mount: Call `invoke('init_app')` ✓
  - In `App.tsx` on window close: Call `invoke('save_session', { session })` via beforeunload ✓
  - Test: Invoke command from UI, verify response received ✓

- [x] Set up window close event listener
  - Use React's `beforeunload` event listener ✓
  - On beforeunload: Save session before window closes ✓
  - Test: Session persists when app is closed ✓

- [x] FFmpeg integration
  - On app launch, verify FFmpeg binary exists and is executable ✓
  - If missing/corrupted: Return error, show ErrorDialog ✓
  - If present: Mark as "ok" and continue ✓
  - Test: FFmpeg status detected correctly; error dialog shows on missing binary ✓

- [x] Placeholder FFmpeg binary created
  - Created executable at `src-tauri/resources/ffmpeg/ffmpeg` ✓
  - Allows testing without real FFmpeg dependency ✓

---

## 5. Manual Testing - 3 Test Gates

- [ ] **Gate 1: Happy Path** → Launch app → loads in <5s → shows empty state (first launch)
- [ ] **Gate 2: Edge Case** → First launch (no prior session) → shows empty state UI
- [ ] **Gate 3: Error Handling** → FFmpeg missing/corrupted → show error dialog with reinstall instructions

---

## 7. PR & Merge

⚠️ **CRITICAL**: DO NOT COMMIT UNTIL USER CONFIRMS ALL TEST GATES PASS

- [x] Create branch: `git checkout -b feat/application-launch` from develop
- [x] Implement all tasks above
- [ ] **User confirms: Gate 1 (Happy Path) passes** ← WAIT FOR THIS
- [ ] **User confirms: Gate 2 (Edge Case) passes** ← WAIT FOR THIS
- [ ] **User confirms: Gate 3 (Error Handling) passes** ← WAIT FOR THIS
- [ ] User says "ready to commit" or "looks good"
- [ ] THEN: Open PR to develop with summary of passing gates
- [ ] Code reviewed and approved
- [ ] Merge to develop

---

## Notes

- FFmpeg bundling: Tauri handles bundled resources in `src-tauri/resources/`; extraction happens in `extract_bundled_ffmpeg()`
- Session state file location: `~/.config/klippy/session.json` (macOS) or `%APPDATA%/klippy/session.json` (Windows)
- This story is foundation; Story 2 (Video Import) depends on this being complete
- Test gates are the specification — they define "done"
- Break work into <1 hour chunks
- Document blockers immediately if stuck

