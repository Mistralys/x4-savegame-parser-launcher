# Current Constraints & Guidelines

## General Rules
- **Tauri Version:** Must use **Tauri v2** syntax and features.
- **Source of Truth:** The Project Manifest in `/docs/agents/project-manifest/` is the authoritative guide for AI agents.
- **Persistence:** Use `tauri-plugin-store` for application settings and `localStorage` for UI-only preferences (like theme).

## Backend (Rust)
- **Error Handling:** All `#[tauri::command]` functions must return `Result<T, E>`.
- **Project Structure:** `main.rs` must remain minimal; all business logic, command definitions, and state setup belong in `lib.rs` or specialized modules like `process.rs` and `setup.rs`.
- **Process Management:** External processes must be managed via the `ProcessManager` to ensure lifecycle tracking and cleanup.
- **Async:** Use `tokio` for non-blocking I/O and process reading.

## Frontend (React/TypeScript)
- **Component Pattern:** Use functional components exclusively.
- **State:** Use specialized Contexts for global state. Avoid prop-drilling.
- **Type Safety:** All props, state, and IPC payloads must have explicit TypeScript interfaces.
- **Logging:** Use the `logger` service (`src/services/logger.ts`) for consistent log reporting to both console and file.
- **I18n:** All user-facing strings must be localized via the `t()` function from `I18nContext`.
- **Testing:**
  - Use **Vitest** for unit and integration testing.
  - Use **React Testing Library** for component testing.
- **Styling:**
  - Prefer **Tailwind CSS** utility classes.
  - Interactive elements must support both light and dark modes.

## UI/UX
- **Native Feel:** Utilize `data-tauri-drag-region` on elements that should allow window dragging.
- **Validation:** Always provide visual feedback if paths or prerequisites are missing.
- **Responsiveness:** Layouts must adapt to window resizing.

## Known i18n Gaps

The following user-visible strings are not yet wired to `t()` calls and are tracked for a follow-up WP.

### `SaveDataViewer.tsx`

| String | Location | Suggested key |
|--------|----------|---------------|
| `'Back to list'` | `title` attribute on back-navigation button | `viewer.header.back_to_list` |
| `'Active Analysis'` | Breadcrumb label | `viewer.header.active_analysis` |
| `'Refresh Data'` | Overview refresh button text | `viewer.overview.refresh` |

### `ShipLossesView.tsx`

| String | Location | Suggested key |
|--------|----------|---------------|
| `'All'`, `'Combat'`, `'Accident'` | FilterButton labels (lines ~113, 118, 123) | `ship_losses.filter.all`, `ship_losses.filter.combat`, `ship_losses.filter.accident` |
| Universe-wide info banner text | Info banner (line ~155) | `ship_losses.info_banner` |
| Raw `item.category` value | Category cell (`'combat'`/`'accident'` rendered untranslated) | `ship_losses.category_combat`, `ship_losses.category_accident` |
| `'Unknown'` | `destroyedBy` fallback (line ~78) | `ship_losses.unknown` |

None of these locale keys exist yet in `src/locales/en.json`.

### `OwnedShipsView.tsx`

| String | Location | Suggested key |
|--------|----------|---------------|
| `'Argon Federation'` | `availableFactions` filter list | `ships.factions.arg` |
| `'Antigone Republic'` | `availableFactions` filter list | `ships.factions.ant` |
| `'Teladi Company'` | `availableFactions` filter list | `ships.factions.tel` |
| `'Godrealm of the Paranid'` | `availableFactions` filter list | `ships.factions.par` |
| `'Holy Order of the Pontifex'` | `availableFactions` filter list | `ships.factions.hop` |
| `'Split'` | `availableFactions` filter list | `ships.factions.spl` |
| `'Terran Protectorate'` | `availableFactions` filter list | `ships.factions.ter` |
| `'Segaris Pioneers'` | `availableFactions` filter list | `ships.factions.pio` |
| `'Boron'` | `availableFactions` filter list | `ships.factions.bor` |
| `'Xenon (Captured)'` | `availableFactions` filter list | `ships.factions.xen` |
| `'Yaki'` | `availableFactions` filter list | `ships.factions.yak` |

None of these locale keys exist yet in `src/locales/en.json`.