# Analysis Detail Screens

This document describes the implementation and data schemas for the savegame analysis screens within the `SaveDataViewer`.

## 1. SaveDataViewer Architecture

The `SaveDataViewer` implements a **Master-Detail** pattern:
- **Master Mode**: Displays the `SaveSelector` for choosing a savegame.
- **Detail Mode**: Displays a sub-navigation bar with analysis categories and the active screen.

### Navigation Categories
- 📊 **Overview**: Basic savegame metadata (Player name, credits, date).
- 👻 **Ship Losses**: History of destroyed ships in the universe.
- 🚢 **Owned Ships**: Detailed list of player fleet assets.
- 🏭 **Stations**: Station and factory overview.
- 📜 **Logbook**: Historical game event log.

---

## 2. Ship Losses View (`ShipLossesView.tsx`)

Displays universe-wide attrition history.

- **Source API**: `query_save_data` with command `ship-losses`.
- **Primary Filter**: `reverse(sort_by([*], &time))` (Latest first).
- **Categorization**: Combat vs. Accident (filter based on the `category` field).

### Data Schema
```typescript
interface ShipLoss {
  time: number;           // Game time in seconds
  timeFormatted: string;  // User-friendly game time (e.g. 10d 04h 22m)
  shipName: string;       // Name of the lost ship
  location: string;       // Sector/Zone where loss occurred
  commander: string;      // Assigned commander (if any)
  destroyedBy: string;    // Faction/Ship responsible for destruction
  category: string;       // "combat" | "accident"
}
```

---

## 3. Owned Ships View (`OwnedShipsView.tsx`)

Displays player-owned fleet assets with advanced filtering.

- **Source API**: `query_save_data` with command `ships`.
- **Base Filter**: `[?owner=='player']`.
- **Search**: Case-insensitive substring match on `name` or `code`. Input is debounced at 300 ms via `useDebounce`.

### Data Schema
```typescript
interface ShipData {
  componentID: string;    // Unique game ID
  connectionID: string;
  name: string;           // User-defined ship name
  owner: string;          // Usually 'player'
  sector: string;         // Current sector location
  zone: string;           // Current zone location
  class: string;          // Internal macro/class ID
  size: string;           // Ship size: 's', 'm', 'l', 'xl'
  hull: string;           // Ship role/purpose (e.g., 'fighter', 'trans', 'miner')
  'hull-type': string;    // Specific hull variation
  'build-faction': string; // Original building faction (e.g., 'arg', 'ter')
  macro: string;          // Internal asset macro
  code: string;           // Short registration code (e.g., ABC-123)
}
```

### Filtering Logic
The view implements dynamic JMESPath generation based on UI filters:
- **Role Filters**: Mapped from `hull` field (e.g. `combat` includes `fighter`, `heavyfighter`, `corvette`, etc.).
- **Size Filters**: Matches `size` field directly.
- **Faction Filters**: Matches `build-faction` field.

---

## 4. Stations View (`StationsView.tsx`)

Displays player-owned (or all universe) stations with search and class filtering.

- **Source API**: `query_save_data` with command `stations`.
- **Base Filter**: `[?owner=='player']` (default); drops owner guard when "Show All" toggle is active.
- **Search**: Case-insensitive substring match on `name` or `code` via `contains_i`. Input is debounced at 300 ms via `useDebounce`.
- **Class Filter**: Case-insensitive substring match on `class` via `contains_i` (free-text input; `class` is always an empty string in current game data — filter degrades gracefully). Input is debounced at 300 ms via `useDebounce`.
- **Wreck Badge**: Stations with `state === 'wreck'` display an amber pill badge in the Name column.

### Data Schema
```typescript
interface StationData {
  componentID: string;      // Unique hex component reference (e.g., '[0x7cb78]')
  connectionID: string;     // Always 'stations'
  parentComponent: string;  // Zone reference encoding station location (e.g., 'zone:[0x7c45f]')
  class: string;            // Station class macro — always empty string in current game data
  code: string;             // Faction-prefixed station code (e.g., 'VYD-141')
  name: string;             // User-visible station name; empty for NPC stations
  owner: string;            // Faction/owner identifier (e.g., 'player', 'court', 'arg')
  macro: string;            // Station type macro (e.g., 'station_gen_factory_base_01_macro')
  state: string;            // Operational state: 'normal' | 'wreck'
  ships?: string[];         // Optional: component IDs of assigned/docked ships
}
```

### Absent Fields
The `sector` and `zone` fields are **not returned** by the CLI. Location is encoded only via `parentComponent` as a zone reference. No Sector column or sector filter is implemented.

### Columns
| Column | Field | Notes |
|--------|-------|-------|
| Code | `code` | Faction-prefixed short code |
| Station Name | `name` | Falls back to `code` when empty (NPC stations) |
| Type | `macro` | Display value has the `_macro` game-engine suffix stripped (e.g. `station_gen_factory_base_01_macro` renders as `station_gen_factory_base_01`). The raw macro string is preserved in the cell's `title` tooltip. |
| State | `state` | Badge: green for normal, amber for wreck |

---

## 5. Logbook View (`LogbookView.tsx`)

Displays historical game event log.

- **Source API**: `query_save_data` with command `logbook`.
- **Primary Filter**: `reverse(sort_by([*], &time))` (Latest first).
- **Search**: Substring match on `title` or `text`.

### Data Schema
```typescript
interface LogbookEntry {
  time: number;           // Game time in seconds
  timeFormatted: string;  // User-friendly game time (e.g. 10d 04h 22m)
  category: string;       // Entry category (e.g., 'general', 'missions', 'alerts', 'upkeep')
  title: string;          // Short summary
  text: string;           // Detailed description
  money: number | null;   // Transaction amount (if applicable)
}
```

---

## 6. Setup Wizard (`SetupWizard.tsx`)

Modal overlay for automated PHP and Savegame Monitor installation.

- **Purpose:** Guide users through a one-click download and installation of PHP NTS and the monitor tool, removing the need for manual path configuration.
- **Trigger Condition:** Rendered by `SettingsView` when `config.installPath` is empty or `config.phpPath` is unset/default (`'php'`). Button labelled `t('setup.button')` appears in the "Environment & Tools" section header.
- **Props:**
  - `onComplete: (paths: InstalledPaths) => void` — called with `{ php_path, install_path }` on successful installation; parent updates `ConfigContext`.
  - `onClose: () => void` — called on cancel or close; parent sets `showSetupWizard: false`.
- **State:**
  - `isRunning: boolean` — true while `download_and_install_tools` is in flight.
  - `progress: SetupProgress | null` — latest `setup-progress` event payload (`step`, `message`, `percent`).
  - `error: string | null` — error message on failure.
  - `isCheckingUpdates: boolean` — true while `check_for_updates` is in flight.
  - `updateInfo: UpdateInfo | null` — result of the update check.
- **Behaviour:**
  - Registers a `setup-progress` Tauri event listener before invoking the command on mount.
  - Shows real-time progress bar driven by `percent` (0–100).
  - On error: displays error text with a **Retry** button (re-invokes `download_and_install_tools`) and a **Cancel** button.
  - Secondary **Check for Updates** button invokes `check_for_updates` with inline result display.
  - Close (×) button is hidden while installation is in progress.
- **Exported types:** `SetupProgress`, `InstalledPaths`, `SetupWizardProps`.

---

## 7. Shared UI Components

- **`DataTable`**: Generic table wrapper with dark-mode support and standard cell styling.
- **`DataPagination`**: Sticky footer navigation with "Jump to Page" capability.
- **`useSaveData` Hook**: Manages API calls, JMESPath filtering, and data caching.
