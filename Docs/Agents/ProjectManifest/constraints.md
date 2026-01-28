# Current Constraints & Guidelines

## General Rules
- **Tauri Version:** Must use **Tauri v2** syntax and features.
- **Source of Truth:** The Project Manifest in `/Docs/Agents/ProjectManifest/` is the authoritative guide for AI agents.

## Backend (Rust)
- **Error Handling:** All `#[tauri::command]` functions must return `Result<T, E>`.
- **Project Structure:** `main.rs` must remain minimal; all business logic, command definitions, and state setup belong in `lib.rs`.
- **Performance:** Heavy operations or file I/O should be `async` and offloaded from the main thread if necessary.

## Frontend (React/TypeScript)
- **Component Pattern:** Use functional components exclusively.
- **Type Safety:** All props, state, and IPC payloads must have explicit TypeScript interfaces.
- **Styling:** 
  - Prefer **Tailwind CSS** utility classes.
  - Avoid custom CSS unless Tailwind cannot achieve the desired result.
  - Interactive elements must support both light and dark modes with `:hover` and `:active` states.
- **State:** Use React Context API for global state (like Theme) and `useState`/`useReducer` for local component state.

## UI/UX
- **Native Feel:** Utilize `data-tauri-drag-region` on elements that should allow window dragging.
- **Responsiveness:** Layouts must be responsive and adapt to window resizing.
- **Accessibility:** Ensure basic accessibility by using semantic HTML and ARIA labels where appropriate.
