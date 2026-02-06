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
- 🏭 **Stations**: (Planned) Station and factory overview.
- 📜 **Logbook**: (Planned) Historical game event log.

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
- **Search**: Case-insensitive substring match on `name` or `code`.

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

## 4. Shared UI Components

- **`DataTable`**: Generic table wrapper with dark-mode support and standard cell styling.
- **`DataPagination`**: Sticky footer navigation with "Jump to Page" capability.
- **`useSaveData` Hook**: Manages API calls, JMESPath filtering, and data caching.
