# Work Package 1: Testing Infrastructure

## Goals
Establish a testing environment for both the frontend (React/Vite) and the backend (Rust/Tauri) to ensure stability before each release.

## Tasks
- [ ] **Frontend Setup**:
    - [ ] Install `vitest`, `@testing-library/react`, `@testing-library/jest-dom`, and `jsdom`.
    - [ ] Create `vitest.config.ts` (or update `vite.config.ts`).
    - [ ] Add `"test": "vitest run"` to `package.json`.
- [ ] **Frontend Initial Tests**:
    - [ ] Create unit tests for `src/services/logger.ts`.
    - [ ] Create component tests for `src/components/ThemeToggle.tsx`.
    - [ ] Create tests for `src/hooks/useTheme.ts`.
- [ ] **Backend Initial Tests**:
    - [ ] Add unit tests in `src-tauri/src/process.rs` (if logic allows) or `src-tauri/src/lib.rs`.
    - [ ] Verify `cargo test` runs correctly.
