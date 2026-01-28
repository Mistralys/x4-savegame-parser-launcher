# Incremental Work Packages - X4 Savegame Parser Launcher

This document breaks down the implementation into logical, independent work packages. Each package results in a stable, testable state.

## WP 1: Core Infrastructure & Localization
*Focus: Foundation for settings and multi-language support.*
- [ ] Implement `SettingsContext` and persistent storage for app configuration.
- [ ] Create a robust Localization (i18n) service/hook.
- [ ] Add translation files for EN, DE, FR.
- [ ] **Logging & Error Handling**:
    - [ ] Implement a session-based debug logger (writes to a temporary file, reset on startup).
    - [ ] Create a global error handling system for the frontend (Error Boundary/Context).
    - [ ] Implement a standard "Error Dialog" component for user notifications.
- [ ] **Deliverable**: A functional foundation with persistent settings, multi-language support, and a unified logging/error reporting system.

## WP 2: Settings UI & Path Management
*Focus: Giving the user control over the environment.*
- [ ] Build the **Settings** view UI.
- [ ] Implement a **Validation Service**:
    - [ ] Check if PHP executable exists and is runnable.
    - [ ] Check if all configured tool paths and game folders exist.
    - [ ] Implement a **Periodic Validation Loop** (every 5 seconds) to handle external FS changes.
- [ ] Create a **Global Notification Banner** to alert the user if settings are invalid.
- [ ] Implement native folder/file pickers for:
    - PHP Executable
    - X4 Game Folder
    - X4 Savegame Folder
    - Parser & Viewer Script paths
- [ ] **Deliverable**: Users can configure all necessary paths via the UI and have them persist.

## WP 3: Process Execution Engine (Rust Backend)
*Focus: The "engine" that runs the PHP scripts.*
- [ ] Create Rust commands to spawn, track, and kill child processes.
- [ ] **State Restoration**: Implement a way for the UI to know if a process is already running (e.g., after a window reload).
- [ ] Implement log streaming from stdout/stderr to the frontend via events.
- [ ] Add global cleanup logic to ensure no "ghost" PHP processes remain after app exit.
- [ ] **Deliverable**: Backend capability to run PHP scripts and stream output.

## WP 4: Parser & Viewer UI Components
*Focus: The main user interface for the tools.*
- [ ] Implement a reusable `LogViewer` component (terminal-style).
- [ ] Implement a **Blocking Modal Overlay** for tool tabs when configuration is invalid.
- [ ] Build the **Parser** tab with Start/Stop controls and status indicators.
- [ ] Build the **Viewer** tab with Start/Stop controls and an "Open in Browser" button.
- [ ] **Deliverable**: Fully functional UI for starting/stopping tools and viewing their logs.

## WP 5: UX Refinement & Polish
*Focus: Making the app feel "finished".*
- [ ] Add auto-scroll and "Clear Logs" functionality to the `LogViewer`.
- [ ] Integrate detailed error logging into all major processes (Path picking, Process spawning, Config saving).
- [ ] Add a "View Debug Log" button in the Settings tab to easily access the session log.
- [ ] Final UI/UX pass for dark/light mode consistency.
- [ ] **Deliverable**: A polished, user-friendly application with comprehensive debugging and error reporting.
