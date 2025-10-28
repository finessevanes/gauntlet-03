# PRD: Library View

**Feature**: Story 3: Library View | **Status**: Ready | **Agent**: Pam

---

## Preflight (Answer before writing PRD)

1. **Smallest end-to-end user outcome?** Display imported clips in a sidebar with metadata so users can select and preview clips before adding to timeline.
2. **Primary user + critical action?** Video editor; selects a clip to preview and drags it to timeline.
3. **Must-have vs nice-to-have?**
   - MUST: Display clips with thumbnail, filename, duration
   - MUST: Click clip → preview in player
   - MUST: Drag clip to timeline
   - MUST: Scrollable for 20+ clips, performant
   - MUST: Handle missing/deleted files gracefully
   - SHOULD: Search/filter clips (future)
4. **Offline/persistence needs?** No real-time sync; clips persisted by Story 1 (session state).
5. **Performance targets?** 20+ clips without lag; thumbnail generation <1sec per clip; scrolling 60fps.
6. **Error/edge cases?** Missing files, deleted files, corrupted metadata, empty library.
7. **Data model changes?** None; uses existing Clip structure from Story 2 (filePath, duration, id).
8. **Service/command APIs needed?** No new APIs; uses existing `get_imported_clips()` from Story 2.
9. **React components to create/modify?** Create `Library.tsx` (clip list/grid), `ClipCard.tsx` (individual clip).
10. **Desktop-specific needs?** Sidebar layout (20% width); resize behavior with main window.
11. **What's explicitly out of scope?** Clip renaming, tagging, search, multi-select, drag reorder within library.

---

## 1. Summary

The Library View displays a scrollable list of all imported clips with thumbnails, filenames, and durations. Users can click clips to preview and drag them to the timeline for editing. The Library is the primary source for adding clips to the timeline.

---

## 2. Non-Goals / Scope Boundaries

- **Not in scope:** Clip renaming, tagging, search/filter, favorites, multi-select, clip reordering within library
- **Not in scope:** Contextual menu (copy, delete from library, etc.)
- **Not in scope:** Keyboard shortcuts for library navigation

---

## 3. Experience (UX)

**Entry points:**
- Library appears as left sidebar when app launches (always visible)
- Populated automatically from Story 1 session restoration or Story 2 video import

**User flow (happy path):**
1. App launches → Library displays imported clips (or empty state if first launch)
2. User clicks clip → preview player shows that clip only
3. User drags clip from Library → drops on timeline → clip appears in timeline
4. User can repeat steps 2-3 for multiple clips

**States:**
- **Empty state:** "Drag & drop video files or click Import to get started" (centered message with icon)
- **Loading state:** Spinner while clips load (typically instant from localStorage)
- **Success state:** Grid/list of clip cards with thumbnails, names, durations
- **Error state:** Broken file icon + tooltip on clip card if source file missing/deleted

**Desktop considerations:**
- Sidebar is 20% of window width, adjustable if window resized
- Clips remain scrollable if window height is small (<600px)
- Dragging clips should work even if Library is partially scrolled

---

## 4. Functional Requirements

### MUST
- **Display all imported clips** in a scrollable container (left sidebar, ~20% width)
  - Each clip shows: thumbnail (first frame), filename, duration in MM:SS format
  - Acceptance gate: 5 clips appear correctly within 500ms of load

- **Click clip → preview in player** (if Story 6 available; Story 3 only supports single clip preview)
  - When user clicks a clip, it becomes "selected" (visual highlight)
  - Preview player displays that clip only (not entire timeline)
  - Acceptance gate: Clicked clip shows selected state; preview updates within 100ms

- **Drag clip from Library to Timeline**
  - Drag gesture initiates from clip card
  - Drop target is Timeline (Story 4 defines drop zone)
  - Clip appears on timeline after drop
  - Acceptance gate: Dragged clip appears on timeline in dropped position

- **Handle 20+ clips performantly**
  - Library remains scrollable and responsive with 20 clips
  - No lag during scrolling (60fps ideal, min 30fps)
  - Acceptance gate: Scroll through 20-clip library without visible stuttering

- **Graceful handling of missing/deleted source files**
  - If source file path no longer exists, show broken file icon on clip card
  - Tooltip shows: "File not found: [filename]"
  - Clip is not draggable (visual feedback)
  - Acceptance gate: Missing file detected, icon shown, no crash

### SHOULD
- Clip cards have subtle hover effect (slight scale up, shadow)
- Keyboard focus support (Tab through clips)
- Right-click on clip → disabled state (feature for future, not implemented now)

---

## 5. Data Model

No new data model required. Uses existing **Clip** interface from Story 2:

```typescript
interface Clip {
  id: string;              // UUID or unique identifier
  filePath: string;        // Absolute path to video file
  duration: number;        // Duration in seconds
  inPoint: number;         // Start trim point (seconds), default 0
  outPoint: number;        // End trim point (seconds), default duration
  thumbnail?: string;      // Base64 thumbnail data or file path (generated in Story 2)
}
```

**Storage:** Clips are stored in app state (managed by Story 1 session persistence via localStorage or equivalent).

**Validation:**
- `filePath` must be non-empty and point to existing file
- `duration` must be > 0
- `inPoint` must be >= 0 and < `outPoint`

---

## 6. Service/Command APIs

**No new APIs required.** Library View uses existing commands from Story 2:

### `get_imported_clips()` (from Story 2)
- **Pre-condition:** App has imported at least one clip (or zero clips for empty state)
- **Post-condition:** Returns array of Clip objects
- **Returns:** `{ clips: Clip[] }`
- **Error:** None expected; returns empty array if no clips

### `check_file_exists(filePath: string)` (new, optional helper)
- **Pre-condition:** `filePath` is non-empty string
- **Post-condition:** Returns whether file exists at that path
- **Returns:** `{ exists: boolean }`
- **Error:** Invalid path format → returns `false`
- **Usage:** Library can verify file existence when rendering clip cards

---

## 7. Components to Create/Modify

**React Components:**
- `src/components/Library.tsx` — Main library container (sidebar); manages clip list and drag-drop initiation
- `src/components/ClipCard.tsx` — Individual clip card; displays thumbnail, name, duration; handles selection and drag

**Tauri Commands:**
- `src-tauri/src/commands/file.rs` — Add `check_file_exists(filePath: String)` helper

**State Management:**
- Update existing context/state to include `selectedClipId` (tracks which clip is selected for preview)

---

## 8. Integration Points

- **File system:** Check file existence using Tauri `fs::metadata()` for missing file detection
- **State management:** Maintain `selectedClipId` in app context (shared with preview player)
- **Drag & drop:** HTML5 drag-drop API; Library initiates drag, Timeline (Story 4) handles drop
- **Session persistence:** Clips list restored from Story 1 (no new persistence logic)

---

## 9. Testing & Acceptance Gates

### Happy Path
**Flow:**
1. App launches with 3 imported clips
2. User clicks clip #2 → clip highlights and preview updates
3. User drags clip #1 to timeline → clip appears on timeline

**Gate:** Clip selection works, preview updates, drag-drop succeeds

**Pass:**
- Clicked clip shows selected state (highlight/border)
- Preview player shows selected clip within 100ms
- Dragged clip appears on timeline in correct position

### Edge Cases & Errors

- **Empty library:** No clips imported → Display empty state message; no crash
- **Library with 20+ clips:** Scroll smoothly without lag (min 30fps)
- **Missing file after import:** Source file deleted after import → Show broken file icon; tooltip shows filename; clip not draggable
- **Very long filename:** >100 chars → Truncate with ellipsis in UI; full name in tooltip
- **Concurrent import + view:** While user browses library, new clip imported → Library updates immediately
- **Click missing file clip:** Attempt to preview missing clip → Show error message: "File not found"
- **Drag missing file clip:** Attempt to drag missing clip → Disabled (visual feedback); no timeline update

### Performance
- Library with 20 clips renders within 500ms
- Scrolling 20-clip library at 30fps minimum (no visible stutter)
- Thumbnail generation already done in Story 2; Library only displays cached thumbnails
- Click → preview update latency < 100ms

---

## 10. Definition of Done

- [ ] Preflight questionnaire answered and approved
- [ ] `Library.tsx` component created with clip list/grid layout
- [ ] `ClipCard.tsx` component created with thumbnail, name, duration display
- [ ] Click clip → clip highlights and `selectedClipId` updated in state
- [ ] Drag clip from Library → initiates HTML5 drag with clip data
- [ ] Missing file detection: `check_file_exists()` returns false, broken icon shown
- [ ] Empty state displays when no clips in library
- [ ] 20-clip library tested; scrolling smooth (30fps+)
- [ ] Clip preview integration: click clip → preview player updates (depends on Story 6)
- [ ] All acceptance gates pass (happy path, edge cases, performance)
- [ ] Code reviewed and merged to `develop` branch
- [ ] Manual testing: Import 5 clips, click each, drag to timeline, verify preview works

---

## 11. Risks & Mitigations

- **Risk:** Thumbnails are large; loading 20 thumbnails causes lag
  - **Mitigation:** Thumbnails generated in Story 2 and cached; Library only displays cached data. Monitor memory usage.

- **Risk:** File deleted after import; user expects clip to still work
  - **Mitigation:** Show clear broken file icon + tooltip; prevent drag/preview of missing clips. Document in UI.

- **Risk:** Drag-drop data format incompatible with Timeline (Story 4)
  - **Mitigation:** Define drag-drop data contract in Story 4 spec; test integration early in Caleb phase.

- **Risk:** Large library (50+ clips) causes scrolling lag
  - **Mitigation:** Implement virtual scrolling (only render visible clips) if performance test fails at 20+ clips.

- **Risk:** Sidebar width not responsive to window resize
  - **Mitigation:** Use CSS flexbox with dynamic percentage width; test window resize behavior.

---

## Authoring Notes

- Library View is a **read-only display** of imported clips; no modification of clips happens here
- **Vertical slice:** Complete workflow = Import → View in Library → Select → Preview → Drag to Timeline
- **Drag-drop:** Keep data contract simple (just `clipId` or full Clip object); Timeline (Story 4) defines drop zone
- **Performance:** With cached thumbnails, Library should be fast; validate with 20+ clips
- **Error resilience:** Missing files are expected (user may delete video after import); handle gracefully with visual feedback
- **Next phase:** Story 4 (Timeline) builds on this; ensure drag-drop is well-defined and testable

---

## References

- **User Story:** Story 3 (Library View) in USER_STORIES.md
- **Dependency:** Story 2 (Video Import) — must have imported clips to display
- **Next Feature:** Story 4 (Timeline View) — accepts drag-drop from Library
- **Related:** Story 6 (Preview Player) — optional dependency for clip preview
