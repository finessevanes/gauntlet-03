# Klippy Backlog

Feature requests and enhancements to be prioritized in future stories.

---

## Library Management

**Priority**: Medium
**Suggested Story**: Post-MVP or Story 3 Enhancement
**Description**: Add clip management features to the Library panel

### Features:
- **Delete individual clip**: Remove a single clip from the library (with confirmation dialog)
- **Clear all clips**: Remove all clips from the library (with confirmation dialog)
- **Bulk selection**: Select multiple clips for batch operations
- **Sort clips**: By name, duration, date imported
- **Filter clips**: By duration range, date range
- **Search clips**: Filter by filename

### User Stories:
- As a user, I want to remove clips I no longer need so I can keep my library organized
- As a user, I want to clear all clips so I can start fresh on a new project
- As a user, I want to select multiple clips at once so I can delete them in bulk

### Technical Notes:
- Add delete icon/button to clip cards in Library
- Add "Clear All" button to Library panel header
- Confirmation dialogs to prevent accidental deletion
- Remove from session state and localStorage metadata
- No file system deletion (clips are linked references only)

### Dependencies:
- Story 2 (Video Import) - ✅ Complete
- Story 3 (Library View) - Pending

---

## Additional Ideas

*(Add more backlog items here as they come up)*
