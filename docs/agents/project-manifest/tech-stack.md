# Tech Stack & Patterns

## Runtime & Frameworks
- **Backend:** [Rust](https://www.rust-lang.org/) with [Tauri v2](https://tauri.app/), [Tokio](https://tokio.rs/), and [Chrono](https://github.com/chronotope/chrono).
- **Frontend:** [React 19](https://react.dev/) with [TypeScript](https://www.typescriptlang.org/).
- **Build Tool:** [Vite](https://vitejs.dev/).

## Libraries
- **Styling:** [Tailwind CSS v4](https://tailwindcss.com/) with [@tailwindcss/vite](https://www.npmjs.com/package/@tailwindcss/vite).
- **Icons:** [Lucide React](https://lucide.dev/).
- **IPC:** [@tauri-apps/api](https://www.npmjs.com/package/@tauri-apps/api).
- **Plugins:**
  - `tauri-plugin-store`: Persistent configuration storage.
  - `tauri-plugin-fs`: File system access.
  - `tauri-plugin-dialog`: Native system dialogs.
  - `tauri-plugin-shell`: Command execution.
  - `tauri-plugin-process`: Process management.
  - `tauri-plugin-opener`: Opening files/URLs.
- **Serialization:** [Serde](https://serde.rs/) (Rust).
- **Utilities:** `clsx`, `tailwind-merge` for dynamic class management.

## Architectural Patterns
- **Separation of Concerns:** 
  - `main.rs`: Entry point and application setup.
  - `lib.rs`: Command registration and plugin initialization.
  - `process.rs`: Logic for managing external child processes (PHP tools).
  - `setup.rs`: Tool installation wizard — downloads PHP and the savegame monitor, extracts them under `<app_data_dir>/tools/`, and exposes `download_and_install_tools` / `check_for_updates` as Tauri commands.
- **Inter-Process Communication (IPC):** 
  - Frontend uses `invoke` to call Rust commands.
  - Backend uses `emit` to stream stdout/stderr from child processes back to the UI.
  - All Rust commands return `Result<T, E>` to ensure robust error handling.
- **State Management:**
  - **Global State:** Managed via specialized React Contexts:
    - `ConfigContext`: App settings and persistence via `tauri-plugin-store`.
    - `ProcessContext`: Monitoring and controlling background tool processes.
    - `I18nContext`: Multi-language support (English, German, French).
    - `ValidationContext`: Real-time path and environment validation.
    - `ThemeContext`: Appearance management (light, dark, system).
    - `ErrorContext`: Global error reporting UI.
- **Persistence:**
  - Configuration is stored in `settings.json` via Tauri's Store plugin.
  - Theme preference is stored in `localStorage`.
- **Component Design:**
  - Functional components with TypeScript interfaces for props.
  - Responsive design using Tailwind utility classes.
  - Native feel integration using `data-tauri-drag-region` for custom title bars.
- **Shared Type Module (`src/types/shared.ts`):**
  - TypeScript interfaces shared across more than one module (components, hooks) live in `src/types/shared.ts`.
  - This includes both direct Tauri IPC payload shapes (e.g. `SetupProgress`, `InstalledPaths`, `UpdateInfo`) and React state shapes derived from Tauri events (e.g. `QueryProgress`).
  - Files that were the original home of a moved type keep a re-export for backward compatibility.
