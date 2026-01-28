# Current Constraints & Guidelines

## General Rules
- **Tauri Version:** Must use **Tauri v2** syntax and features.
- **Source of Truth:** The Project Manifest in `/Docs/Agents/ProjectManifest/` is the authoritative guide for AI agents.
- **Persistence:** Use `tauri-plugin-store` for application settings and `localStorage` for UI-only preferences (like theme).

## Backend (Rust)
- **Error Handling:** All `#[tauri::command]` functions must return `Result<T, E>`.
- **Project Structure:** `main.rs` must remain minimal; all business logic, command definitions, and state setup belong in `lib.rs` or specialized modules like `process.rs`.
- **Process Management:** External processes must be managed via the `ProcessManager` to ensure lifecycle tracking and cleanup.
- **Async:** Use `tokio` for non-blocking I/O and process reading.

## Frontend (React/TypeScript)
- **Component Pattern:** Use functional components exclusively.
- **State:** Use specialized Contexts for global state. Avoid prop-drilling.
- **Type Safety:** All props, state, and IPC payloads must have explicit TypeScript interfaces.
- **Logging:** Use the `logger` service (`src/services/logger.ts`) for consistent log reporting to both console and file.
- **I18n:** All user-facing strings must be localized via the `t()` function from `I18nContext`.
- **Styling:** 
  - Prefer **Tailwind CSS** utility classes.
  - Interactive elements must support both light and dark modes.

## UI/UX
- **Native Feel:** Utilize `data-tauri-drag-region` on elements that should allow window dragging.
- **Validation:** Always provide visual feedback if paths or prerequisites are missing.
- **Responsiveness:** Layouts must adapt to window resizing.
