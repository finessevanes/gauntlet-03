# Gauntlet-03 Agent System

**Project:** Klippy - Desktop Video Editor (Tauri + React)

This document describes how to use the three agent system: Brenda → Pam → Caleb.

---

## Agent Workflow

```
Brenda (User Stories) → Pam (PRD + TODO) → Caleb (Implementation)
```

### Brenda — Creates User Stories

**File:** `agents/brenda-agent.md`
**Usage:** `/brenda prd-mvp.md` or `/brenda [feature-name]`

**Output:**
- User stories in "As a... I want... So that..." format
- Acceptance criteria (testable conditions)
- Dependencies between features
- Complexity: Simple/Medium/Complex
- Phase: 1, 2, 3, or 4

**Reference:** `prd-mvp.md` (8 features in 4 phases)

---

### Pam — Creates PRD & TODO

**File:** `agents/pam-agent.md`
**Usage:** `/pam [user-story]` or `/pam [feature-name]`

**Input:**
- User story from Brenda

**Output:**
1. **PRD**: `prds/[feature-name]-prd.md`
   - Preflight questionnaire (11 questions)
   - Summary, scope, UX flow
   - Functional requirements with acceptance gates
   - Data model (TypeScript + Rust)
   - Service/Command APIs (Tauri)
   - Components to create/modify
   - Testing & acceptance gates
   - Definition of done

2. **TODO**: `todos/[feature-name]-todo.md`
   - Pre-implementation checklist
   - Service/Command layer tasks
   - React components & state
   - Data model & persistence
   - Integration tasks
   - Manual testing
   - Definition of done

**Reference:** `prd-template.md`, `todo-template.md`, `prd-mvp.md`

---

### Caleb — Implements Features

**File:** `agents/caleb-agent.md`
**Usage:** `/caleb [feature-name]`

**Process:**
1. Read user story + PRD + TODO
2. Create branch: `feat/{feature-slug}`
3. Implement tasks in TODO order
4. Check off each task immediately after completion
5. Verify acceptance gates pass
6. Wait for user testing
7. Commit changes (after user approval)
8. Create PR to `develop` branch

**Output:**
- Rust backend (Tauri commands in `src-tauri/src/commands/`)
- React frontend (components in `src/components/`)
- Updated TODO with all tasks checked off
- PR to `develop` branch

---

## Quick Start

### Single Feature Workflow

```bash
# 1. Brenda creates user story from feature
/brenda [feature-name]
# Output: User story with acceptance criteria

# 2. Pam creates PRD and TODO
/pam [feature-name]
# Output: prds/[feature-name]-prd.md + todos/[feature-name]-todo.md

# 3. Caleb implements
/caleb [feature-name]
# Output: Code + PR to develop
```

### Build All Features

```bash
# 1. Brenda breaks down prd-mvp.md into user stories
/brenda prd-mvp.md
# Output: 8 user stories (1 per feature)

# 2. For each story, Pam creates PRD + TODO
/pam [feature-1]
/pam [feature-2]
... (repeat for all 8)

# 3. Parallel build with Caleb (implement features)
/caleb [feature-1]
/caleb [feature-2]
... (can run in parallel)
```

---

## Key Files

### Templates

- **`agents/prd-template.md`** — PRD format with 12 sections (Preflight → Risks)
- **`agents/todo-template.md`** — TODO format with 8 sections (Pre-Implementation → PR & Merge)
- **`agents/brenda-agent.md`** — Brenda's instructions (creates user stories)
- **`agents/pam-agent.md`** — Pam's instructions (creates PRD + TODO)
- **`agents/caleb-agent.md`** — Caleb's instructions (implements features)

### Reference Documents

- **`prd-mvp.md`** — Product requirements: 8 features in 4 phases
  - Phase 1: App Launch + Video Import
  - Phase 2: Library View + Timeline View
  - Phase 3: Trim + Preview Player
  - Phase 4: Export + Session Persistence

### Generated Documents

```
prds/
├── video-import-prd.md
├── library-view-prd.md
├── timeline-view-prd.md
├── trim-functionality-prd.md
├── preview-player-prd.md
├── export-prd.md
└── session-persistence-prd.md

todos/
├── video-import-todo.md
├── library-view-todo.md
├── timeline-view-todo.md
├── trim-functionality-todo.md
├── preview-player-todo.md
├── export-todo.md
└── session-persistence-todo.md
```

---

## Tech Stack

- **Desktop Framework**: Tauri (Rust backend)
- **Frontend**: React (TypeScript)
- **Video Processing**: FFmpeg (bundled)
- **Build**: Vite + npm
- **Platform**: macOS (primary), Windows (secondary)

---

## Development Workflow

### Branch Strategy

- **Base branch**: `develop` (never `main`)
- **Branch naming**: `feat/{feature-slug}` (e.g., `feat/video-import`)
- **PR target**: Always `develop`

### Key Points

1. **TODO is the specification** — Follow it step-by-step
2. **Check off tasks immediately** — After completing each task
3. **Test gates from PRD** — Verify happy path, edge cases, error handling
4. **Wait for user testing** — Before committing code
5. **Commit logically** — Group related changes
6. **Create PR with summary** — Link to user story + PRD

---

## 8 Features (prd-mvp.md)

| # | Feature | Phase | Status |
|----|---------|-------|--------|
| 1 | Application Launch | 1 | Pending |
| 2 | Video Import | 1 | Pending |
| 3 | Library View | 2 | Pending |
| 4 | Timeline View | 2 | Pending |
| 5 | Trim Functionality | 3 | Pending |
| 6 | Preview Player | 3 | Pending |
| 7 | Export | 4 | Pending |
| 8 | Session Persistence | 4 | Pending |

---

## Dependencies

Feature dependencies (build in this order):

1. **Phase 1** (Foundation)
   - REQ-1: Application Launch
   - REQ-2: Video Import

2. **Phase 2** (Core Editing)
   - REQ-3: Library View
   - REQ-4: Timeline View

3. **Phase 3** (Edit & Preview)
   - REQ-5: Trim Functionality
   - REQ-6: Preview Player

4. **Phase 4** (Export & Polish)
   - REQ-7: Export
   - REQ-8: Session Persistence

---

**See individual PRD files for detailed requirements, test gates, and acceptance criteria.**
