# Synthesis: Stations View

**Plan**: `docs/agents/plans/2026-06-24-stations-view/plan.md`  
**Date Completed**: 2026-06-24  
**Status**: COMPLETE  
**Work Packages**: 3 / 3 COMPLETE  

---

## Outcome Summary

The **Stations View** screen is fully implemented and shipped. The previously disabled "Stations" tab in `SaveDataViewer` is now active and renders `StationsView.tsx` — a paginated, filterable list of game stations following the established `OwnedShipsView` pattern. All twelve acceptance criteria for WP-003 were met without rework, and no regressions were introduced.

---

## What Was Done

### WP-001 — Implementation Archive Housekeeping (Documentation)

Six completed plan files were migrated from `docs/agents/plans/` to `docs/agents/implementation-history/` with no content changes:

- `category-counts-labels.md`
- `detail-screens-navigation.md`
- `installation-improvement.md`
- `logbook-screen.md`
- `operation-indexing-progress.md`
- `owned-ships-screen.md`

`file-tree.md` was updated to list all six files under `ImplementationArchive/` and the stale root-level `plans/` section was removed. This was a housekeeping prerequisite to reduce file-tree drift before WP-003 manifest updates landed.

### WP-002 — CLI Schema Verification (QA + Code Review)

The `stations` CLI command was executed against a live extracted savegame (ID: `125914ba`, 1609 total stations, 15 player-owned):

```
bin/query.bat stations --save=125914ba --limit=3 --pretty
```

**Key findings documented in `schema-verification.md`:**

| Finding | Detail |
|---------|--------|
| All 9 assumed field names confirmed | `componentID`, `connectionID`, `name`, `code`, `owner`, `class`, `macro`, `state`, `parentComponent` — exact camelCase match |
| No field-name corrections required | Zero deviations from plan assumptions |
| `sector`, `zone`, `products` confirmed absent | `StationType` has no `toArray()` override — location encoded only in `parentComponent` format `"zone:[hex]"` |
| Undiscovered field | `ships?: string[]` (optional; absent when no ships assigned) — e.g., `["ship:[0x7c9bf]"]` |
| `class` is always empty string | Across all 1609 stations observed |
| `name` is empty for NPC stations | Fall back to `code` required for meaningful display |

The two-sample approach (one NPC station + one player-owned station) proved essential: the optional `ships` field only appears on player stations, so a single generic sample would have missed it.

### WP-003 — StationsView Implementation (Implementation + QA + Code Review + Documentation)

**Files created:**

| File | Description |
|------|-------------|
| `src/components/StationsView.tsx` | New screen component (mirrors `OwnedShipsView.tsx` pattern) |

**Files modified:**

| File | Change |
|------|--------|
| `src/components/SaveDataViewer.tsx` | Removed `disabled` from Stations `CategoryTab`; added `StationsView` import and render branch with `selectedSaveId` null-guard |
| `src/locales/en.json` | Added 18 `stations.*` keys |
| `src/locales/de.json` | Added 18 `stations.*` keys (German) |
| `src/locales/fr.json` | Added 18 `stations.*` keys (French) |
| `docs/agents/project-manifest/detail-screens.md` | Added Section 4 "Stations View" (data schema, absent fields, column table, API source); removed "(Planned)" placeholder; renumbered sections 5–6 → 6–7 |
| `docs/agents/project-manifest/data-flows.md` | Added "Paginated Query Flow (List Screens)" section documenting the shared five-step trigger→filter→query→state→render pattern |
| `docs/agents/project-manifest/file-tree.md` | Listed `StationsView.tsx` under `src/components/`; added Plans/ directory entry; updated ImplementationArchive |
| `docs/agents/project-manifest/constraints.md` | Added "Known Limitations" section noting hardcoded `CategoryTab` label strings in `SaveDataViewer.tsx` (codebase-wide i18n gap) |

**StationsView.tsx design details:**

- `StationData` TypeScript interface includes all 9 confirmed fields plus `ships?: string[]`
- `buildFilter()` helper (memoized via `useCallback`) composes a JMESPath expression from `showAll`, `debouncedSearch`, and `debouncedClassSearch`
- Player-only default filter: `[?owner=='player']`
- Show All toggle: drops owner filter to show all universe stations
- Class search: `contains_i(class, '<term>')` — free-text, debounced 300 ms
- Name/code search: `contains(name, '<term>') || contains(code, '<term>')` — debounced 300 ms
- Single-quote JMESPath injection mitigated via `.replace(/'/g, "\\'")` on both inputs
- DataTable columns: **Code** | **Name** (with amber wreck badge when `state === 'wreck'`) | **Type** (renders `macro` field since `class` is always empty) | **State**
- Name column falls back to `code` when `name` is empty (NPC stations)
- `DataPagination` at page size 20
- All strings via `t()` from `useI18n()`

**Verification results:**

| Check | Result |
|-------|--------|
| `npx tsc --noEmit` | ✅ Zero errors |
| `npx vitest run` | ✅ 7/7 tests passed, 0 regressions |
| All 12 acceptance criteria | ✅ All met |

---

## Deviations from Plan

| Area | Plan Assumption | Reality | Resolution |
|------|-----------------|---------|------------|
| `class` field usability | Free-text search on `class` | `class` is always empty string in all 1609 observed stations | Type column uses `macro` field instead of `class`; class search input retained (works correctly if non-empty values appear in other saves) |
| `sector` / `zone` fields | Expected absent | Confirmed absent | No sector column or filter added — as planned |
| Field `ships` | Not in plan | Present as optional `string[]` on player stations | Added `ships?: string[]` to `StationData` interface; not displayed in UI (internal game reference only) |

---

## Non-Blocking Observations (Carried Forward)

These issues were identified during pipeline reviews but are pre-existing and out of scope for this plan:

1. **Inline debounce duplication** — `setTimeout`/`clearTimeout` pattern in `OwnedShipsView.tsx` and `StationsView.tsx` (and `ShipLossesView.tsx`). A shared `useDebounce(value, delay)` hook in `src/hooks/` would eliminate this duplication. Consistent 300 ms timing is correct today; the hook would only matter if the delay ever needs to change globally.

2. **Hardcoded `CategoryTab` labels** — All five tab labels in `SaveDataViewer.tsx` (`Overview`, `Ship Losses`, `Owned Ships`, `Stations`, `Logbook`) are hardcoded English strings rather than `t()` calls. This is a codebase-wide i18n gap now documented in `constraints.md` as a Known Limitation.

3. **Type column raw macro strings** — `StationsView.tsx` Type column renders raw `macro` strings (e.g., `station_gen_factory_base_01_macro`). A future enhancement could strip the `_macro` suffix or apply a lookup table. Title tooltip provides a reasonable UX fallback for now.

4. **OwnedShipsView i18n gap** — The `Role` column header in `OwnedShipsView.tsx` is hardcoded English. Pre-existing; not introduced by this WP.

---

## Insights

- **Schema verification before implementation pays off**: WP-002 discovered the optional `ships` field and confirmed `class` is always empty — both of which changed the WP-003 implementation (interface addition, `macro` used for Type column). Running the CLI live before writing UI code is the correct order.
- **Two-sample methodology**: Using both an NPC station and a player-owned station as raw JSON samples revealed the conditional `ships` field that a single sample would have missed. This pattern should be reused in future schema verification WPs.
- **`class` field unreliability**: The plan's free-text class search was architecturally correct as a fallback, but live data confirms `class` is always `""` in this game version. The search input is retained for forward compatibility but the Type column uses `macro` instead.
- **Pattern fidelity reduces review friction**: Mirroring `OwnedShipsView.tsx` exactly meant zero architecture debates in QA or code review — all findings were about pre-existing debt, not new design choices.
