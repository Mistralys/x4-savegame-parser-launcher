# Plan: Stations View

## Plan Audit Cycles
- Audits: 5 — Plan Auditor v1.5.0
- Architectural Reviews: 1 (integrated) — Plan Architect Reviewer v1.6.0

## Prior Project Context

All six previous plan documents (`category-counts-labels.md`, `installation-improvement.md`, `detail-screens-navigation.md`, `logbook-screen.md`, `operation-indexing-progress.md`, `owned-ships-screen.md`) are fully implemented as of v2.1.0. The two most recent ledger projects (`2026-06-23-pending-features-completion` and its rework) closed with zero regressions across PHP, Rust, and TypeScript surfaces. Established patterns include: `DataTable` + `DataPagination` for paginated list screens, JMESPath filter construction in the hook layer, `useI18n` for all user-facing strings, and a single disabled tab in `SaveDataViewer` reserved for Stations.

## Summary

Implement the **Stations View** screen in the `SaveDataViewer`, replacing the existing disabled "Stations" tab placeholder. The screen displays player-owned stations (or all stations with a toggle), supports a debounced class search input and a debounced name/code search, and follows the same component, hook, and i18n patterns established by `OwnedShipsView`. Sector-based filtering is excluded from this plan: `StationType` has no `toArray()` override, so the `sector` field is absent from the serialized JSON output — a sector search input would silently return empty results. The predefined type dropdown is also replaced by a free-text class search because game `class` macro strings are opaque values that cannot be reliably matched with predefined substrings. No backend changes are required: the `stations` CLI command is already implemented and returns paginated, JMESPath-filterable data.

## Architectural Context

**Disabled placeholder** — `src/components/SaveDataViewer.tsx` line 65 (`activeScreen` union type includes `'stations'`) and lines 151–158 (a `<CategoryTab>` rendered with `disabled` prop and no corresponding view branch).

**Backend command** — `QueryHandler::COMMAND_STATIONS = 'stations'` (`src/X4/SaveViewer/CLI/QueryHandler.php:42`). Returns a paginated, flattened `StationsCollection` via `flattenCollectionArray`. Available fields from `StationType`: `componentId`, `connectionId`, `name`, `code`, `owner`, `class`, `macro`, `state` (`'normal'`|`'wreck'`), plus derived `sector` and `zone` from the zone→sector chain.

**Existing screens for reference** — `src/components/OwnedShipsView.tsx` (closest pattern: paginated list, JMESPath filter construction, role/size/faction dropdowns, debounced search, `DataTable` + `DataPagination`). `src/components/LogbookView.tsx` (category dropdown populated from backend metadata; different pattern — not applicable here).

**Shared infrastructure** — `src/hooks/useSaveData.ts` (`query<T>()` method), `src/components/DataTable.tsx`, `src/components/DataPagination.tsx`, `src/types/shared.ts` (shared type module).

**i18n** — `src/locales/en.json`, `de.json`, `fr.json`. Existing section keys: `ships.*`, `logbook.*`. New section `stations.*` follows identical shape.

**Manifest docs** — `docs/agents/project-manifest/detail-screens.md` (section 4 "Stations" placeholder says "Planned"), `docs/agents/project-manifest/file-tree.md` (no `StationsView.tsx` entry yet).

## Approach / Architecture

Create a single new component `src/components/StationsView.tsx` that mirrors `OwnedShipsView.tsx` in structure:

1. Fetches paginated station data via `useSaveData().query()` with a JMESPath base filter of `[?owner=='player']`.
2. Exposes a **"Show All" toggle** that drops the owner filter, allowing the user to see all universe stations.
3. Supports a **class search** (free-text, debounced, matches `class` field via JMESPath `contains_i(class, 'term')`). A predefined type dropdown is intentionally not used: game `class` macro strings are opaque values not guaranteed to match substrings such as `"production"` or `"defence"` (confirmed by architect review; no documented value set in `StationType::KEY_CLASS`).
4. Supports a **station name/code search** (debounced, matches `name` and `code` fields).
5. Renders `DataTable` + `DataPagination` at page size 20.
6. Wreck stations are visually distinguished with a badge (amber/red) on the name column.

`SaveDataViewer.tsx` is updated to: (a) remove the `disabled` prop from the Stations `CategoryTab`, (b) import and render `<StationsView saveId={selectedSaveId} />` in the active-screen switcher.

> **Schema verification note**: The exact JSON field names returned by the `stations` command must be confirmed at implementation time by running a live query (`bin/query.bat stations --save=<name> --pretty`). The plan above uses field names as documented in `StationType.php` and the CLI API reference; the Developer should adjust the `StationData` interface if the flattened output differs (e.g., `faction` vs `owner`, `type` vs `class`). The `sector` and `zone` fields are expected to be **absent** from the output — `StationType` inherits `BaseComponentType.toArray()` which returns only `$this->data` with no derived fields (unlike `ShipType`, which has an explicit `toArray()` override injecting `sector` and `zone`). If Step 2 reveals these fields are present, the Sector column and sector filter may be added; if absent (expected), proceed without them as planned.

## Rationale

- The disabled tab already declares the intent; removing `disabled` and shipping the view completes the tab row.
- No new backend surface is needed — avoids cross-repo coordination.
- Mirroring `OwnedShipsView` minimises design decisions and keeps the codebase consistent.
- A "Show All" toggle adds incremental value (universe-wide station map awareness) without complexity.

## Considered Alternatives

| Decision | Chosen Shape | Alternatives Considered | Trade-Off Summary |
|---|---|---|---|
| Scope of data | Player stations by default, "Show All" toggle | Show all stations always | Defaulting to player-owned keeps the view actionable for typical use; the toggle covers power users wanting the full picture. |
| Type filter shape | Free-text `class` search input (debounced) | (a) Predefined dropdown with `contains(class, 'production')` etc.; (b) No type filter at this stage | A predefined dropdown assumes game `class` macro strings contain recognizable substrings — unverified and confirmed risky by architect review (`KEY_CLASS` initialized to empty string; actual values set from game XML with no documented value set). A free-text input mirrors the name/code search pattern already in the plan, degrades gracefully with opaque macro strings, and leaves a dropdown as a future enhancement once actual class values are catalogued. |
| Wreck display | Show wrecks in the list with a visual badge | Filter out wrecks by default | Wrecks are relevant game data (territory loss, salvage opportunities); hiding them by default would require an additional toggle. A badge is a lower-friction approach. |
| Separate "Khaak Stations" tab | Out of scope (separate future plan) | Include in this view as a subtab | Khaa'k stations are a structurally different data source (`khaak-stations` command, different schema). Mixing them into this view adds complexity without a clear UX benefit. |

## Pattern Alignment

| Pattern | Followed? | File Reference |
|---|---|---|
| `DataTable` + `DataPagination` for paginated lists | ✅ Yes | `src/components/OwnedShipsView.tsx` |
| `useSaveData().query<T>()` for data fetching | ✅ Yes | `src/hooks/useSaveData.ts` |
| JMESPath filter built from inline conditions array in component | ✅ Yes | `src/components/OwnedShipsView.tsx` (filter constructed inline within `fetchShips()`; no named `buildFilter()` exists — the named helper in `StationsView` is a new refinement of this pattern) |
| `useI18n()` for all user-facing strings | ✅ Yes | `src/components/OwnedShipsView.tsx`, `LogbookView.tsx` |
| `saveId` prop passed from `SaveDataViewer` | ✅ Yes | `src/components/ShipLossesView.tsx`, `OwnedShipsView.tsx`, `LogbookView.tsx` |
| Debounced search with 300 ms timeout | ✅ Yes | `src/components/OwnedShipsView.tsx` |
| New locale key section (`stations.*`) | ✅ Yes | `src/locales/en.json` pattern |

## Detailed Steps

1. **Archive completed plan documents** — Move all six flat plan `.md` files from `docs/agents/plans/` into `docs/agents/implementation-history/` to keep the plans directory clean and the history traceable:
   - `docs/agents/plans/category-counts-labels.md` → `docs/agents/implementation-history/category-counts-labels.md`
   - `docs/agents/plans/detail-screens-navigation.md` → `docs/agents/implementation-history/detail-screens-navigation.md`
   - `docs/agents/plans/installation-improvement.md` → `docs/agents/implementation-history/installation-improvement.md`
   - `docs/agents/plans/logbook-screen.md` → `docs/agents/implementation-history/logbook-screen.md`
   - `docs/agents/plans/operation-indexing-progress.md` → `docs/agents/implementation-history/operation-indexing-progress.md`
   - `docs/agents/plans/owned-ships-screen.md` → `docs/agents/implementation-history/owned-ships-screen.md`

2. **Verify station JSON schema** — Run `bin/query.bat stations --save=<extracted-save> --limit=3 --pretty` and inspect the output. Confirm exact field names: `componentID` (capital D), `connectionID`, `name`, `code`, `owner`, `class`, `macro`, `state`. The `sector` and `zone` fields are expected to be absent (no `toArray()` override in `StationType`); if they appear, note it for a future plan. Adjust the `StationData` interface if any other names differ from the above.

3. **Create `src/components/StationsView.tsx`**:
   - Define `StationData` interface with fields identified in step 2 (no `sector` or `zone` fields expected — `StationType` has no `toArray()` override). Include `parentComponent: string` — this field is always present in the output (initialized in `BaseComponentType` constructor and set to the zone's unique ID via `setParentComponent()`), but it is not used for display.
   - Define `StationsViewProps { saveId: string }`.
   - Implement state: `data`, `pagination`, `offset`, `showAll`, `searchQuery`, `debouncedSearch`, `classSearch`, `debouncedClassSearch`.
   - Implement a `buildFilter()` helper that composes the JMESPath expression from active filters: owner guard removed when `showAll` is true; `contains_i(name, '...')` / `contains_i(code, '...')` conditions for name/code search; `contains_i(class, '...')` condition for class search.
   - `useEffect` on `[saveId, offset, showAll, debouncedSearch, debouncedClassSearch]` calls `query<StationData>('stations', ...)` and writes `data` + `pagination`.
   - Render: header section (title, subtitle, refresh button), filter bar (Show All toggle, name/code search input, class search input), `DataTable` with columns (Code, Name, Type, State), `DataPagination`.
   - Wreck badge: if `row.state === 'wreck'`, render an amber pill next to the name.

4. **Update `src/components/SaveDataViewer.tsx`**:
   - Add `import { StationsView } from './StationsView';`.
   - Remove `disabled` prop from the Stations `CategoryTab`.
   - In the active-screen render block, add a branch: `activeScreen === 'stations' && selectedSaveId && <StationsView saveId={selectedSaveId} />` (the `selectedSaveId &&` null guard matches the established pattern used by all three existing view branches at lines 246–254).

5. **Add i18n keys to `src/locales/en.json`** (new top-level `stations` section):
   ```json
   "stations": {
     "title": "Stations",
     "subtitle": "Overview of your station assets",
     "empty": "You do not own any stations in this savegame yet.",
     "empty_all": "No stations found in this savegame.",
     "code": "Code",
     "name": "Station Name",
     "type": "Type",
     "state": "State",
     "state_normal": "Normal",
     "state_wreck": "Wreck",
     "show_all": "Show All Stations",
     "player_only": "Player Stations",
     "search_placeholder": "Search by name or code...",
     "class_search_placeholder": "Filter by class..."
   }
   ```

6. **Add i18n keys to `src/locales/de.json`** — German translations for all keys in step 5.

7. **Add i18n keys to `src/locales/fr.json`** — French translations for all keys in step 5.

8. **Update `docs/agents/project-manifest/detail-screens.md`** — Replace the "Stations: (Planned)" placeholder in the Navigation Categories list and add a new section "4. Stations View (`StationsView.tsx`)" documenting the data schema, filters, and API source.

9. **Update `docs/agents/project-manifest/data-flows.md`** — Add a new section **"Paginated Query Flow (List Screens)"** documenting the `useSaveData().query()` → JMESPath filter → `DataTable` + `DataPagination` pattern that is shared by all list screens (`OwnedShipsView`, `ShipLossesView`, `StationsView`). The section should cover: (a) trigger (user navigates to a list screen), (b) filter composition via `buildFilter()` / inline conditions array, (c) `query<T>()` call with JMESPath expression and pagination offset, (d) response written to `data` + `pagination` state, (e) `DataTable` + `DataPagination` render. This satisfies the `AGENTS.md` mandate for "Implement New Screen/Flow → data-flows.md".

10. **Update `docs/agents/project-manifest/file-tree.md`** — Add `StationsView.tsx` under `src/components/`; reflect the relocation of the six archived plan files from `plans/` to `implementation-history/`.

11. **Verify** — Run `npx tsc --noEmit` (no type errors) and `npx vitest run` (existing tests still pass). No new unit tests are required for this component as it contains no business logic beyond what `OwnedShipsView` already validates; integration-level verification is via manual smoke test.

## Dependencies

- Backend `stations` CLI command: already implemented in `QueryHandler.php`.
- `DataTable`, `DataPagination`: already implemented.
- `useSaveData` hook: already implemented.
- `useI18n` context: already implemented.

## Required Components

- **New**: `src/components/StationsView.tsx`
- **Modified**: `src/components/SaveDataViewer.tsx` (remove `disabled`, add import + render branch)
- **Modified**: `src/locales/en.json`, `de.json`, `fr.json` (add `stations.*` section)
- **Modified**: `docs/agents/project-manifest/detail-screens.md`
- **Modified**: `docs/agents/project-manifest/data-flows.md` (new "Paginated Query Flow (List Screens)" section)
- **Modified**: `docs/agents/project-manifest/file-tree.md`
- **Moved** (archived): `docs/agents/plans/category-counts-labels.md` → `docs/agents/implementation-history/`
- **Moved** (archived): `docs/agents/plans/detail-screens-navigation.md` → `docs/agents/implementation-history/`
- **Moved** (archived): `docs/agents/plans/installation-improvement.md` → `docs/agents/implementation-history/`
- **Moved** (archived): `docs/agents/plans/logbook-screen.md` → `docs/agents/implementation-history/`
- **Moved** (archived): `docs/agents/plans/operation-indexing-progress.md` → `docs/agents/implementation-history/`
- **Moved** (archived): `docs/agents/plans/owned-ships-screen.md` → `docs/agents/implementation-history/`

## Assumptions

- The `stations` command's JSON output fields match `StationType`'s property names (`name`, `code`, `owner`, `class`, `state`). The `sector` and `zone` fields are expected to be absent — `StationType` has no `toArray()` override (confirmed by architect review). If Step 2 reveals them present, the Sector column and sector filter may be added in a follow-up plan.
- The `products` field mentioned in the CLI API reference (`detail-screens.md` section) may not be present in the flattened output from `StationType`. The plan omits a "Products" column and this should be verified in Step 2; it can be added as a future enhancement if the field exists.

## Constraints

- No new PHP or Rust code. This is a pure frontend implementation.
- All user-visible strings go through `useI18n()` — no hardcoded English in JSX.
- Page size of 20 items (consistent with `OwnedShipsView`).
- `cargo check` / `tsc --noEmit` must remain clean after changes.

## Out of Scope

- Khaa'k Stations view (separate `khaak-stations` command, different schema — future plan).
- Construction Plans view.
- Station detail drill-down (clicking a row for more info).
- "Products" column (deferred until field availability is confirmed).
- New backend commands or PHP changes.
- Sector-based filtering (requires a `StationType::toArray()` override in the PHP backend to derive `sector`/`zone` from the component chain — deferred to a future plan; the pattern to follow is `ShipType.php` lines 209–219).

## Acceptance Criteria

- The "Stations" tab in `SaveDataViewer` is enabled and navigable.
- Opening the Stations tab for an extracted save that has player stations shows a populated `DataTable`.
- The "Show All Stations" toggle switches between `[?owner=='player']` and no owner filter; the count and rows update accordingly.
- The class search input narrows results to stations whose `class` field contains the search term (debounced, case-insensitive).
- The name/code search field filters by station name or code (debounced, case-insensitive).
- Stations with `state === 'wreck'` display a visual amber badge.
- All column headers and filter labels use i18n strings (no hardcoded English).
- `npx tsc --noEmit` reports zero errors after implementation.
- `npx vitest run` reports no regressions.

## Testing Strategy

Manual smoke test: open the app against an extracted save, navigate to the Stations tab, exercise each filter and the Show All toggle. Automated: TypeScript compilation check and existing Vitest suite (no regressions).

## Test Plan

- (Manual) Navigate to Stations tab → player-owned stations load. **Covers**: tab enabled + default filter AC.
- (Manual) Toggle "Show All Stations" → row count increases to include non-player stations. **Covers**: Show All toggle AC.
- (Manual) Enter a class term in the class search field → only matching stations shown after 300 ms debounce. **Covers**: class search AC.
- (Manual) Type a name substring in the search field → results narrow after 300 ms. **Covers**: search AC.
- (Manual) Identify a wreck station and confirm amber badge renders. **Covers**: wreck badge AC.
- `npx tsc --noEmit` — zero errors. **Covers**: TypeScript clean AC.
- `npx vitest run` — all existing tests pass. **Covers**: no-regression AC.

## Documentation Updates

- `docs/agents/project-manifest/detail-screens.md` — Add section "4. Stations View (`StationsView.tsx`)" with data schema, filters, and API source; update Navigation Categories list.
- `docs/agents/project-manifest/data-flows.md` — Add new "Paginated Query Flow (List Screens)" section documenting the `useSaveData().query()` → JMESPath filter → `DataTable` + `DataPagination` pattern shared by all list screens. See Step 9 for full content specification.
- `docs/agents/project-manifest/file-tree.md` — Add `StationsView.tsx` under `src/components/`; reflect the relocation of the six archived plan files from `plans/` to `implementation-history/`.
- `docs/agents/implementation-history/` — Receives the six moved plan files (no content changes, location only).

## Risks & Mitigations

| Risk | Mitigation |
|---|---|
| **Station JSON field names differ from StationType source** | Step 2 (live query verification) surfaces this before any code is written; `StationData` interface is adjusted accordingly. |
| **`class` values are opaque macros** | Mitigated by design: the free-text class search input degrades gracefully regardless of macro naming conventions. |
| **`sector`/`zone` fields absent from station JSON** | Confirmed by architect review (`StationType` has no `toArray()` override). Sector filtering is excluded from this plan scope; no Sector column is rendered. |
| **Large number of stations causes slow JMESPath filtering** | Existing `useSaveData` caching via `cache-key` parameter can be applied (same pattern as `OwnedShipsView`). |
| **`products` field is unavailable** | Column simply excluded; noted in Assumptions; deferred to a future iteration. |
