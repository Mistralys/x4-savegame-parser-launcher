# Key Data Flows

## IPC: Frontend to Backend (Invoke)
1. **Trigger:** A React component (e.g., `App.tsx`) calls `invoke("command_name", { args })`.
2. **Backend Processing:** Tauri routes the call to the corresponding function in `lib.rs` marked with `#[tauri::command]`.
3. **Response:** The Rust function returns a value (wrapped in `Result<T, E>` for error handling).
4. **UI Update:** The frontend receives the response in a Promise (`.then()` / `.catch()`) and updates local state (via `useState`) to trigger a re-render.

## Theme Synchronization
1. **Initial Load:** `ThemeProvider` reads the theme from `localStorage` (defaulting to `system`).
2. **State Management:** Theme state is held in `ThemeContext`.
3. **DOM Manipulation:** An `useEffect` hook in `ThemeProvider` adds/removes `.dark` or `.light` classes on `document.documentElement`.
4. **Persistence:** Any change via `setTheme` updates the context state and `localStorage`.
5. **System Listening:** An `useEffect` hook sets up a `matchMedia` listener to detect and react to OS-level theme changes when the mode is set to `system`.

## Application Lifecycle
1. **Entry (Backend):** `main.rs` calls `lib::run()`.
2. **Initialization (Backend):** `tauri::Builder` sets up plugins, handlers, and the window context.
3. **Entry (Frontend):** `main.tsx` renders the `ThemeProvider` wrapping the `App`.
4. **Mounting:** `App.tsx` runs an `useEffect` hook to fetch initial `system_info` via IPC.
