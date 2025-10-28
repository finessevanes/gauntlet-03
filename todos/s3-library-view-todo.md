# TODO — Library View (Story 3)

**Branch**: `feat/library-view`
**Source**: User Story 3 (Library View)
**PRD Reference**: `prds/s3-library-view-prd.md`
**Owner (Agent)**: Caleb

---

## 0. Pre-Implementation

- [ ] Read user story and acceptance criteria thoroughly
- [ ] Read relevant sections of PRD (Summary, Functional Requirements, Data Model, Service APIs, Testing & Acceptance Gates)
- [ ] Verify existing codebase structure (Story 1 and Story 2 should be complete)
- [ ] Clarify any ambiguities before starting

---

## 1. Service/Command Layer (Rust/Tauri)

Implement backend command for file existence checking.

- [ ] **Command: `check_file_exists`** (optional helper)
  - Input: `String` (file path)
  - Output: `Result<bool, String>` (returns whether file exists)
  - Error handling: Invalid path format → returns false
  - Acceptance: Correctly identifies missing/deleted files
  - Location: `src-tauri/src/commands/video.rs`

- [ ] Register command in `src-tauri/src/lib.rs`
- [ ] Test: Valid file returns true, deleted file returns false

---

## 2. React Components & State

Create React components for Library display and clip cards.

- [ ] **Component: `Library.tsx`**
  - Purpose: Main library container (sidebar, ~20% width); displays scrollable list of clip cards
  - Props: None (uses SessionContext for clips data)
  - State: selectedClipId (tracks which clip is selected for preview)
  - Features:
    - Scrollable container for 20+ clips
    - Empty state display when no clips imported
    - Handle drag-drop initiation for timeline
  - Test: Renders with clips, shows empty state, scrollable
  - Location: `src/components/Library.tsx`

- [ ] **Component: `ClipCard.tsx`**
  - Purpose: Individual clip card; displays thumbnail, filename, duration
  - Props: clip (ClipWithMetadata), isSelected (boolean), onSelect (callback), onDragStart (callback)
  - Features:
    - Display thumbnail (first frame from import)
    - Display filename (truncate if >50 chars with ellipsis)
    - Display duration in MM:SS format
    - Handle click → select clip (visual highlight)
    - Handle drag start → initiate HTML5 drag with clip data
    - Detect missing file → show broken file icon + tooltip
    - Hover effect (subtle scale up, shadow)
  - Test: Displays clip data correctly, click selects, drag works
  - Location: `src/components/ClipCard.tsx`

- [ ] **State Management: Add selectedClipId**
  - Update SessionContext or create LibraryContext
  - Field: selectedClipId (string | null)
  - Methods: setSelectedClipId
  - Test: State updates when clip is clicked

---

## 3. Data Model & Persistence

No new data model required. Uses existing structures:

- [ ] Verify `ClipWithMetadata` interface in `src/types/session.ts` has:
  - id, filePath, duration, inPoint, outPoint (from Clip)
  - thumbnail, resolution, frameRate, codec, importedAt (metadata)

- [ ] Verify Session structure includes clips array (already in place from Story 1)

- [ ] No additional persistence logic needed (clips persisted by Story 1)

---

## 4. Integration

- [ ] **Wire Library to SessionContext**
  - Library component reads `session.clips` from SessionContext
  - Maps clips to ClipCard components
  - Test: Clips from session appear in Library

- [ ] **Wire clip selection**
  - ClipCard onClick → update selectedClipId in state
  - ClipCard receives isSelected prop based on selectedClipId
  - Visual highlight applied to selected card
  - Test: Click clip → highlight appears, state updates

- [ ] **Wire drag-drop initiation**
  - ClipCard draggable attribute set to true
  - onDragStart sets DataTransfer with clip ID or full clip object
  - Use HTML5 drag-drop API (event.dataTransfer.setData)
  - Test: Drag clip → drag ghost appears, data is set

- [ ] **Wire file existence check**
  - For each clip, invoke `check_file_exists` command
  - If file missing: show broken file icon on ClipCard
  - If file missing: prevent drag (draggable=false)
  - Tooltip shows: "File not found: [filename]"
  - Test: Delete source file → Library shows broken icon, no drag

- [ ] **Empty state handling**
  - If session.clips is empty, show EmptyState component
  - Message: "Drag & drop video files or click Import to get started"
  - Test: Launch with no clips → empty state displays

---

## 5. Manual Testing

**Reference testing gates from PRD Section 9 (Testing & Acceptance Gates):**

- [x] **Happy Path: Display Clips**
  - Import 5 clips via Story 2
  - Verify: Library displays all 5 clips with thumbnails, filenames, durations
  - Gate: All clips appear within 500ms of load

- [x] **Happy Path: Click Clip → Preview**
  - Click clip #2 in Library
  - Verify: Clip highlights (border or background color change)
  - Verify: selectedClipId updates in state
  - Note: Preview player update depends on Story 6 (not in scope for Story 3)
  - Gate: Clicked clip shows selected state within 100ms

- [x] **Happy Path: Drag Clip to Timeline**
  - Drag clip #1 from Library
  - Verify: Drag gesture initiates (drag ghost visible)
  - Verify: DataTransfer contains clip ID
  - Note: Drop target (Timeline) is Story 4 (not in scope for Story 3)
  - Gate: Drag initiates successfully, data is set

- [x] **Edge Case: Empty Library**
  - Launch app with no clips imported
  - Verify: Empty state message displays: "Drag & drop video files or click Import to get started"
  - Gate: No crash, message centered with icon

- [x] **Edge Case: 20+ Clips Performance**
  - Import 20 clips (can use duplicates from same file)
  - Verify: Library scrolls smoothly (min 30fps, ideally 60fps)
  - Verify: No visible lag or stuttering during scroll
  - Gate: Performance remains smooth with 20 clips

- [x] **Edge Case: Missing File After Import**
  - Import 3 clips → manually delete source file for clip #2
  - Relaunch app or trigger file check
  - Verify: Clip #2 shows broken file icon
  - Verify: Tooltip shows "File not found: [filename]"
  - Verify: Clip #2 is not draggable (visual feedback)
  - Gate: Missing file detected, icon shown, no crash

- [x] **Edge Case: Very Long Filename**
  - Import file with name >100 characters
  - Verify: Filename truncated with ellipsis in UI
  - Verify: Full filename visible in tooltip on hover
  - Gate: UI remains clean, no overflow

- [x] **Edge Case: Concurrent Import + View**
  - While browsing Library, import new clip via Story 2
  - Verify: Library updates immediately to show new clip
  - Gate: No need to refresh, clip appears automatically

- [x] **Edge Case: Click Missing File Clip**
  - Click on clip with missing source file
  - Verify: Clip can be selected (highlight appears)
  - Note: Preview error handling is Story 6 scope
  - Gate: No crash on selection

- [x] **Performance: Library Render Time**
  - Import 20 clips
  - Measure render time from component mount to display
  - Verify: Renders within 500ms
  - Gate: Initial load is fast

- [x] **Performance: Scroll Performance**
  - Scroll through 20-clip library
  - Verify: Minimum 30fps (no visible stutter)
  - Gate: Smooth scrolling experience

- [ ] No console errors during all test scenarios
- [ ] Feature feels responsive (no UI lag)

---

## 6. Definition of Done

- [ ] `Library.tsx` component created with scrollable clip list layout (sidebar, ~20% width)
- [ ] `ClipCard.tsx` component created with thumbnail, filename, duration display
- [ ] Click clip → clip highlights and selectedClipId updated in state
- [ ] Drag clip from Library → initiates HTML5 drag with clip data (DataTransfer)
- [ ] Missing file detection: `check_file_exists()` command implemented and integrated
- [ ] Missing file UI: broken icon shown, tooltip displays filename, clip not draggable
- [ ] Empty state displays when no clips in library
- [ ] 20-clip library tested; scrolling smooth (30fps+)
- [ ] Hover effects on clip cards (subtle scale, shadow)
- [ ] All acceptance gates pass (happy path, edge cases, performance)
- [ ] Code has comments for complex logic
- [ ] No console warnings or errors

---

## 7. PR & Merge

⚠️ **CRITICAL**: DO NOT COMMIT UNTIL USER CONFIRMS ALL TEST GATES PASS

- [ ] Create branch `feat/library-view` from develop
- [ ] Implement all tasks in Sections 1-6
- [ ] User confirms all test gates pass ← WAIT FOR THIS
- [ ] User says "ready to commit" or "looks good"
- [ ] THEN: Commit changes with clear messages
- [ ] THEN: Create PR with:
  - Link to Story 3 in USER_STORIES.md
  - Link to PRD: `prds/s3-library-view-prd.md`
  - Summary of changes
  - Manual test results (all gates pass)
- [ ] Merge to develop

---

## Notes

- PRD is the specification — Section 9 (Testing & Acceptance Gates) defines "done"
- Library View is **read-only display** of imported clips; no modification happens here
- **Vertical slice:** Import → View in Library → Select → Preview → Drag to Timeline
- **Drag-drop data contract:** Keep simple (just clipId or full clip object); Timeline (Story 4) defines drop zone
- **Performance:** With cached thumbnails from Story 2, Library should be fast
- **Error resilience:** Missing files are expected (user may delete video after import); handle gracefully
- Test gates are NOT optional — all must pass before committing
- Break work into <1 hour chunks to stay focused
- Document any blockers immediately
