# Public API (Signatures Only)

## Backend (Rust)

### `src-tauri/src/lib.rs`

#### Commands
- `fn greet(name: &str) -> String`
  - *Returns a greeting string.*
- `async fn get_system_info() -> Result<SystemInfo, String>`
  - *Fetches current OS and Architecture.*

#### Models
```rust
#[derive(serde::Serialize)]
struct SystemInfo {
    os: String,
    arch: String,
}
```

#### Entry Point
- `pub fn run()`
  - *Initializes the Tauri application, registers handlers, and runs the builder.*

---

## Frontend (TypeScript/React)

### `src/context/ThemeContext.tsx`

#### Types
- `type Theme = "light" | "dark" | "system"`

#### Interfaces
- `interface ThemeContextType { theme: Theme; setTheme: (theme: Theme) => void; }`

#### Components
- `const ThemeProvider: React.FC<{ children: React.ReactNode }>`
  - *Context provider for theme state.*

#### Hooks
- `const useTheme: () => ThemeContextType`
  - *Returns the current theme context.*

### `src/hooks/useTheme.ts`
- `export { useTheme } from "../context/ThemeContext"`

### `src/components/ThemeToggle.tsx`
- `const ThemeToggle: () => JSX.Element`
  - *UI component to switch between Light, Dark, and System themes.*

### `src/App.tsx`

#### Interfaces
- `interface SystemInfo { os: string; arch: string; }`

#### Components
- `function App(): JSX.Element`
  - *Main application shell.*
- `const NavItem: ({ icon, label, active }: { icon: React.ReactNode; label: string; active?: boolean }) => JSX.Element`
  - *Sidebar navigation item component.*
