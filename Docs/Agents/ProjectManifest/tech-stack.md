# Tech Stack & Patterns

## Runtime & Frameworks
- **Backend:** [Rust](https://www.rust-lang.org/) with [Tauri v2](https://tauri.app/).
- **Frontend:** [React 19](https://react.dev/) with [TypeScript](https://www.typescriptlang.org/).
- **Build Tool:** [Vite](https://vitejs.dev/).

## Libraries
- **Styling:** [Tailwind CSS v4](https://tailwindcss.com/) with [@tailwindcss/vite](https://www.npmjs.com/package/@tailwindcss/vite).
- **Icons:** [Lucide React](https://lucide.dev/).
- **IPC:** [@tauri-apps/api](https://www.npmjs.com/package/@tauri-apps/api).
- **Serialization:** [Serde](https://serde.rs/) (Rust).

## Architectural Patterns
- **Separation of Concerns:** 
  - `main.rs` is kept minimal, serving only as the entry point.
  - `lib.rs` contains the core application logic and command handlers.
- **Inter-Process Communication (IPC):** 
  - Frontend uses `invoke` to call Rust commands.
  - All Rust commands return `Result<T, E>` to ensure robust error handling on the frontend.
- **Theme Management:** 
  - Managed via React Context API (`ThemeContext`).
  - Supports `light`, `dark`, and `system` preferences.
  - Persists preference in `localStorage`.
  - Syncs with system color scheme changes automatically.
- **Component Design:**
  - Functional components with TypeScript interfaces for props.
  - Responsive design using Tailwind utility classes.
  - Native feel integration using `data-tauri-drag-region` for custom title bars.
