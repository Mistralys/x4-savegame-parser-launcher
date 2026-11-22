# Plan

## Plan Audit Cycles
- Audits: 4 — Plan Auditor v1.5.0
- Architectural Reviews: 1 — Plan Architect Reviewer v1.6.0

## Prior Project Context

The `2026-06-24-stations-view-rework-1` project completed all 7 WPs with zero rework cycles. Its synthesis surfaced 3 deferred items (D1–D3: residual hardcoded i18n strings), 5 out-of-scope items (O1–O5: double-fetch race, offset-reset gap, `fr.json` gap, `useMemo` inconsistency), and a documentation suggestion (GN2: `useDebounce` non-primitive caveat). This rework addresses **all** of them for a clean slate. **Audit note (O2):** The offset-reset gap (O2) was already resolved in a prior implementation — all three filter handlers in `OwnedShipsView.tsx` already call `setOffset(0)`. No action required for O2.

## Summary

Close every open item from the `2026-06-24-stations-view-rework-1` synthesis: (1) complete the i18n pass by wiring the remaining ~18 hardcoded strings across `SaveDataViewer.tsx`, `ShipLossesView.tsx`, and `OwnedShipsView.tsx`; (2) fix the double-fetch stale-data race in `StationsView.tsx` and `OwnedShipsView.tsx` using a fetch-ID ref guard; (3) add the missing `fr.json` logbook keys; (4) wrap the `columns` arrays in both `OwnedShipsView.tsx` and `StationsView.tsx` in `useMemo` for full pattern consistency; (5) document the `useDebounce` non-primitive caveat; and (6) remove the "Known i18n Gaps" section from `constraints.md` once all gaps are closed. *(O2 — offset-reset — was already resolved in a prior implementation; no action needed.)*

## Architectural Context

**Fetch pattern** — Both `StationsView.tsx` and `OwnedShipsView.tsx` use a `useCallback(fetchFn, [deps]) + useEffect(fetchFn, [fetchFn])` pattern. When `debouncedSearch` changes, two effects fire in the same render cycle: the offset-reset effect (`setOffset(0)`) and the fetch effect (triggered by the `fetchFn` reference changing). This produces two IPC calls — one with the stale offset, one with offset=0. If the stale-offset response arrives second, it overwrites the correct data. This is the race condition identified as O1 (double-fetch race). **Note:** O2 (offset-reset gap for dropdown filters) is already resolved — all three filter button/select handlers in `OwnedShipsView.tsx` already call `setOffset(0)`. The fetch-ID guard (this plan) addresses only O1.

**IPC mechanism** — Data fetching uses Tauri's `invoke()` to call `query_save_data_with_progress`. This is local IPC, not HTTP `fetch`, so `AbortController` is not applicable. The correct React pattern is a **fetch-ID ref guard**: increment a counter before each fetch and discard results whose ID doesn't match the current counter value.

**i18n infrastructure** — `I18nContext` + `t()` is fully wired in all data views. The residual gaps are: 3 strings in `SaveDataViewer.tsx`, 4 string categories in `ShipLossesView.tsx`, and 11 faction names in `OwnedShipsView.tsx`. `constraints.md` § "Known i18n Gaps" catalogues them with suggested key names.

**Locale files** — `en.json`, `de.json`, `fr.json` under `src/locales/`. Existing sections: `viewer.*`, `ship_losses.*`, `ships.*`, `stations.*`, `logbook.*`. The `fr.json` file is missing `logbook.cacheBuildingTitle` and `logbook.cacheBuildingMessage` (present in `en.json` and `de.json`).

## Approach / Architecture

1. **Fetch-ID guard pattern**: Add a `useRef(0)` counter to both `StationsView.tsx` and `OwnedShipsView.tsx`. Increment it at the start of each fetch callback. Before calling any state setters in the response handler, check that the fetch ID still matches the current ref value. This prevents stale responses from overwriting correct data without requiring `AbortController` (which Tauri `invoke` doesn't support).

2. **Residual i18n pass**: Add the locale keys catalogued in `constraints.md` § "Known i18n Gaps" to all three locale files, wire `t()` calls in the three affected components, and remove the tracking section from `constraints.md`.

3. **`fr.json` logbook gap**: Add the two missing keys with French translations.

4. **`useMemo` for columns**: Wrap the `columns` array in both `OwnedShipsView.tsx` and `StationsView.tsx` in `useMemo([t])`. This achieves full pattern consistency across both data views — `OwnedShipsView.tsx` was flagged in the synthesis (O5) and `StationsView.tsx` has an identical unmemoized pattern (design-review Concern #1).

5. **`useDebounce` caveat**: Add a note to `tech-stack.md` § Hooks warning that object/array `T` arguments should be memoized at call sites.

## Rationale

- **Fetch-ID guard over AbortController**: Tauri `invoke` returns a `Promise<T>` with no `AbortSignal` support. A fetch-ID ref is the standard React pattern for discarding stale async results. It adds 3 lines per component with zero API changes.
- **Single i18n WP for all three components**: The gaps are small (3 + 8 + 11 = 22 strings), repetitive, and catalogued. Splitting into per-component WPs would create unnecessary overhead.
- **`useMemo` for columns**: The `columns` array is recreated every render because it references `t()`. Wrapping in `useMemo([t])` aligns with the existing `availableFactions` pattern directly above it and avoids passing a new array reference to `DataTable` on every render.

## Considered Alternatives

| Decision | Chosen Shape | Alternatives Considered | Trade-Off Summary |
|----------|--------------|-------------------------|-------------------|
| Stale-fetch guard | Fetch-ID ref counter (`useRef(0)`) | (a) `AbortController` on `fetch`; (b) `useEffect` restructure with inline `ignore` flag; (c) `useReducer` for atomic state | `AbortController` doesn't apply to Tauri `invoke`. An inline `ignore` flag would require restructuring `useCallback` → inline effect (breaking the refresh button pattern). `useReducer` is over-engineered for this. The ref counter is minimal, correct, and compatible with both effect-driven and manual-refresh flows. |
| `columns` memoization | `useMemo([t])` | Leave as-is (no `useMemo`) | The functional impact is negligible, but the inconsistency with `availableFactions` (memoized directly above) is a code-smell. Harmonising prevents future confusion. |

## Pattern Alignment

| Pattern | Followed? | File Reference |
|---------|-----------|----------------|
| `useI18n()` for all user-facing strings | ✅ Yes (closing remaining gaps) | [src/components/StationsView.tsx](src/components/StationsView.tsx) |
| Locale sections named after their screen | ✅ Yes (adding keys to existing sections) | [src/locales/en.json](src/locales/en.json) |
| `useCallback` + `useEffect` fetch pattern | ✅ Yes (adding guard, not restructuring) | [src/components/OwnedShipsView.tsx](src/components/OwnedShipsView.tsx) |
| `useMemo` for stable array references | ✅ Yes (aligning columns with availableFactions) | [src/components/OwnedShipsView.tsx](src/components/OwnedShipsView.tsx) |
| Manifest updates on public changes | ✅ Yes | [docs/agents/project-manifest/constraints.md](docs/agents/project-manifest/constraints.md), [docs/agents/project-manifest/tech-stack.md](docs/agents/project-manifest/tech-stack.md) |

## Detailed Steps

### Step 1 — Add fetch-ID guard to `StationsView.tsx`

Add a `fetchIdRef = useRef(0)` to the component. At the start of `fetchStations`, increment the ref and capture the current value. Before calling `setData` and `setPagination`, check that the captured value matches `fetchIdRef.current`. If not, discard the response silently.

```typescript
const fetchIdRef = useRef(0);

const fetchStations = useCallback(async () => {
  const fetchId = ++fetchIdRef.current;
  try {
    const filter = buildFilter();
    const response = await query<StationData[]>(saveId, 'stations', {
      filter, limit, offset,
    });
    if (fetchId !== fetchIdRef.current) return; // stale — discard
    setData(response.data);
    if (response.pagination) {
      setPagination(response.pagination);
    }
  } catch (err) {
    if (fetchId === fetchIdRef.current) {
      console.error('Failed to fetch stations', err);
    }
  }
}, [saveId, query, offset, buildFilter]);
```

Import `useRef` from React.

### Step 2 — Add fetch-ID guard to `OwnedShipsView.tsx`

Same pattern as Step 1: add `fetchIdRef = useRef(0)`, increment at the start of `fetchShips`, guard `setData`/`setPagination` behind the ID check.

Import `useRef` from React (already imported in this file: verify and add if missing).

### Step 3 — Add i18n locale keys for `SaveDataViewer.tsx` (D1)

Add three new keys to the `viewer` section in all three locale files:

**`en.json`:**
```json
"viewer": {
  ...,
  "header": {
    "back_to_list": "Back to list",
    "active_analysis": "Active Analysis"
  },
  "overview": {
    ...,
    "refresh": "Refresh Data"
  }
}
```

**`de.json`:**
```json
"viewer": {
  ...,
  "header": {
    "back_to_list": "Zurück zur Liste",
    "active_analysis": "Aktive Analyse"
  },
  "overview": {
    ...,
    "refresh": "Daten aktualisieren"
  }
}
```

**`fr.json`:**
```json
"viewer": {
  ...,
  "header": {
    "back_to_list": "Retour à la liste",
    "active_analysis": "Analyse active"
  },
  "overview": {
    ...,
    "refresh": "Actualiser les données"
  }
}
```

### Step 4 — Wire i18n in `SaveDataViewer.tsx`

Replace the three hardcoded strings:
- `title="Back to list"` → `title={t('viewer.header.back_to_list')}`
- `Active Analysis` → `{t('viewer.header.active_analysis')}`
- `Refresh Data` → `{t('viewer.overview.refresh')}`

### Step 5 — Add i18n locale keys for `ShipLossesView.tsx` (D2)

Add new keys to the `ship_losses` section in all three locale files:

**`en.json`:**
```json
"ship_losses": {
  ...,
  "filter": {
    "all": "All",
    "combat": "Combat",
    "accident": "Accident"
  },
  "info_banner": "Losses are recorded globally for all factions, helping you track universe-wide attrition.",
  "category_combat": "Combat",
  "category_accident": "Accident",
  "unknown": "Unknown"
}
```

**`de.json`:**
```json
"ship_losses": {
  ...,
  "filter": {
    "all": "Alle",
    "combat": "Kampf",
    "accident": "Unfall"
  },
  "info_banner": "Verluste werden für alle Fraktionen global erfasst, um die Abnutzung im Universum zu verfolgen.",
  "category_combat": "Kampf",
  "category_accident": "Unfall",
  "unknown": "Unbekannt"
}
```

**`fr.json`:**
```json
"ship_losses": {
  ...,
  "filter": {
    "all": "Tous",
    "combat": "Combat",
    "accident": "Accident"
  },
  "info_banner": "Les pertes sont enregistrées pour toutes les factions, pour suivre l'attrition dans l'univers.",
  "category_combat": "Combat",
  "category_accident": "Accident",
  "unknown": "Inconnu"
}
```

### Step 6 — Wire i18n in `ShipLossesView.tsx`

Replace the hardcoded strings:
- FilterButton labels: `label="All"` → `label={t('ship_losses.filter.all')}`, `label="Combat"` → `label={t('ship_losses.filter.combat')}`, `label="Accident"` → `label={t('ship_losses.filter.accident')}`
- `destroyedBy` fallback: `|| 'Unknown'` → `|| t('ship_losses.unknown')`
- `item.category` display: Replace raw `{item.category}` with `{item.category === 'combat' ? t('ship_losses.category_combat') : t('ship_losses.category_accident')}`
- Info banner text: Replace the hardcoded paragraph with `{t('ship_losses.info_banner')}`

### Step 7 — Add i18n locale keys for `OwnedShipsView.tsx` factions and unnamed fallback (D3)

Add a `ships.factions` subsection and an `unnamed_ship` key to all three locale files:

**`en.json`:**
```json
"ships": {
  ...,
  "unnamed_ship": "Unnamed Ship",
  "factions": {
    "arg": "Argon Federation",
    "ant": "Antigone Republic",
    "tel": "Teladi Company",
    "par": "Godrealm of the Paranid",
    "hop": "Holy Order of the Pontifex",
    "spl": "Split",
    "ter": "Terran Protectorate",
    "pio": "Segaris Pioneers",
    "bor": "Boron",
    "xen": "Xenon (Captured)",
    "yak": "Yaki"
  }
}
```

**`de.json`:** `"unnamed_ship": "Unbenanntes Schiff"` plus equivalent German faction translations.

**`fr.json`:** `"unnamed_ship": "Vaisseau sans nom"` plus equivalent French faction translations.

### Step 8 — Wire i18n faction names and unnamed fallback in `OwnedShipsView.tsx`

Replace the hardcoded `name` values in `availableFactions` with `t()` calls:
```typescript
{ id: 'arg', name: t('ships.factions.arg') },
{ id: 'ant', name: t('ships.factions.ant') },
// ... etc
```

Also replace the hardcoded ship-name fallback: `item.name || 'Unnamed Ship'` → `item.name || t('ships.unnamed_ship')`.

### Step 9 — Fix `fr.json` missing logbook keys (O4)

Add the two missing keys to `fr.json` under the `logbook` section:
```json
"cacheBuildingTitle": "Indexation en cours",
"cacheBuildingMessage": "Construction de l'index du journal pour le premier accès... Cela peut prendre un moment."
```

### Step 10 — Wrap `columns` in `useMemo` in `OwnedShipsView.tsx` (O5)

Wrap the `columns` array definition in `useMemo(() => [...], [t])` to match the `availableFactions` pattern directly above it.

### Step 11 — Wrap `columns` in `useMemo` in `StationsView.tsx`

Wrap the `columns` array definition in `StationsView.tsx` (L89–L142) in `useMemo(() => [...], [t])`, identical to Step 10. This closes the pattern inconsistency flagged in design-review Concern #1 and makes both data-view components consistent canonical models for the `columns + useMemo([t])` pattern.

### Step 12 — Document `useDebounce` non-primitive caveat (GN2)

Add a caveat note to `docs/agents/project-manifest/tech-stack.md` § Hooks after the `useDebounce` description:

> **Caveat:** The generic `<T>` parameter accepts any type, but callers passing object or array references will trigger spurious debounce resets on every render unless those references are memoized (e.g., via `useMemo`). All current consumers pass `string` values (safe). If a non-primitive consumer is introduced, ensure the input is memoized at the call site.

### Step 13 — Remove "Known i18n Gaps" from `constraints.md`

Delete the entire "Known i18n Gaps" section (heading and all three component tables) from `docs/agents/project-manifest/constraints.md`. All gaps will be resolved by Steps 3–8.

### Step 14 — Verify

- `npx tsc --noEmit` — zero errors.
- `npx vitest run` — all tests pass (existing 10 tests, no regressions).
- Manual: switch locale to German, verify all previously-hardcoded strings display in German.

## Dependencies

- `useI18n` context: already implemented.
- `useDebounce` hook: already implemented and tested.
- All affected components: already exist and are functional.
- No external dependencies required.

## Required Components

- **Modified**: `src/components/StationsView.tsx` (fetch-ID guard + `useMemo` columns)
- **Modified**: `src/components/OwnedShipsView.tsx` (fetch-ID guard + i18n factions + unnamed fallback + `useMemo` columns)
- **Modified**: `src/components/SaveDataViewer.tsx` (i18n: 3 strings)
- **Modified**: `src/components/ShipLossesView.tsx` (i18n: filter labels, banner, category, unknown fallback)
- **Modified**: `src/locales/en.json` (new keys: `viewer.header.*`, `viewer.overview.refresh`, `ship_losses.filter.*`, `ship_losses.info_banner`, `ship_losses.category_*`, `ship_losses.unknown`, `ships.unnamed_ship`, `ships.factions.*`)
- **Modified**: `src/locales/de.json` (same new keys with German translations)
- **Modified**: `src/locales/fr.json` (same new keys with French translations + 2 missing logbook keys)
- **Modified**: `docs/agents/project-manifest/constraints.md` (remove "Known i18n Gaps" section)
- **Modified**: `docs/agents/project-manifest/tech-stack.md` (add `useDebounce` non-primitive caveat)

## Assumptions

- The `query` function from `useSaveData` is safe to call concurrently — two overlapping `invoke` calls will not corrupt shared state. Only the result-handling needs guarding.
- The three locale files (`en.json`, `de.json`, `fr.json`) are the complete set of supported locales. No additional locale files exist.
- The fetch-ID guard is sufficient to prevent stale data display. The extra discarded IPC call is a negligible overhead given local Tauri IPC latency.

## Constraints

- No new external dependencies.
- The `useCallback + useEffect` fetch pattern must be preserved (not restructured to inline effect) to keep the manual refresh button working.
- All user-visible strings must use `t()` calls after this rework.
- `tsc --noEmit` and `vitest run` must remain clean.

## Out of Scope

- Macro-to-human-readable lookup table for station types.
- Structural refactoring of the fetch pattern (e.g., `useReducer` or custom `useFetchData` hook). The fetch-ID guard addresses the correctness issue within the existing pattern.
- Adding i18n for dynamically generated strings from backend data (e.g., sector names, ship hull type labels). These come from the game engine and are not translatable without a lookup table.
- Macro-to-human-readable lookup table for station types (unchanged from original scope).

## Acceptance Criteria

1. `StationsView.tsx` uses a fetch-ID ref guard: stale responses from overlapping fetches are discarded without setting state.
2. `OwnedShipsView.tsx` uses the same fetch-ID ref guard pattern.
3. *(Pre-existing — already satisfied)* Changing `purposeFilter`, `sizeFilter`, or `factionFilter` in `OwnedShipsView.tsx` resets `offset` to 0. All three filter handlers already call `setOffset(0)`. No implementation step required.
4. `SaveDataViewer.tsx` uses `t()` for the back-button title, breadcrumb label, and refresh button text.
5. `ShipLossesView.tsx` FilterButton labels, `destroyedBy` fallback, `item.category` display, and info banner text all use `t()` calls.
6. `OwnedShipsView.tsx` faction display names in `availableFactions` use `t('ships.factions.*')` calls.
6a. `OwnedShipsView.tsx` uses `t('ships.unnamed_ship')` as the fallback for ships with no name (replacing the hardcoded `'Unnamed Ship'` string).
7. All new locale keys exist in `en.json`, `de.json`, and `fr.json` with appropriate translations.
8. `fr.json` contains `logbook.cacheBuildingTitle` and `logbook.cacheBuildingMessage`.
9. The `columns` array in `OwnedShipsView.tsx` is wrapped in `useMemo([t])`.
10. The `columns` array in `StationsView.tsx` is wrapped in `useMemo([t])`.
11. `tech-stack.md` § Hooks contains a caveat about non-primitive `useDebounce<T>` arguments requiring memoization.
12. The "Known i18n Gaps" section is removed from `constraints.md`.
13. `npx tsc --noEmit` reports zero errors.
14. `npx vitest run` reports no regressions (all existing tests pass).

## Testing Strategy

No new tests are introduced. The fetch-ID guard is a runtime correctness fix verified by the existing test suite not regressing and by manual testing (rapid filter changes should not display stale data). The i18n changes are verified by manual locale switching. Note: `tsc --noEmit` validates that `t()` is called with string arguments and that `useRef` usage type-checks, but it does **not** validate that locale key strings exist in the locale files — `t()` accepts any `string` argument without compile-time key verification. Missing keys are caught only by the manual locale-switch tests.

## Test Plan

- `npx tsc --noEmit` — Zero errors validates `t()` call sites type-check (string arguments) and `useRef` usage is correct; does **not** validate that locale key strings exist in the locale files. — AC 13
- `npx vitest run` — All 10 existing tests pass with no regressions. — AC 14
- (Manual) Rapidly change search input while on page 2+ in StationsView; verify the displayed data matches the final search term and offset resets to page 1. — AC 1
- (Manual) Same rapid-change test in OwnedShipsView search. — AC 2
- *(Pre-existing — AC 3 already satisfied)* All three filter handlers in `OwnedShipsView.tsx` already call `setOffset(0)`. No action required; behaviour can be confirmed incidentally during other OwnedShipsView manual tests.
- (Manual) Switch locale to German; verify "Zurück zur Liste" tooltip on back button, "Aktive Analyse" breadcrumb, "Daten aktualisieren" refresh button. — AC 4
- (Manual) Switch locale to German; verify ShipLossesView filter buttons show "Alle"/"Kampf"/"Unfall", fallback shows "Unbekannt", category badges show "Kampf"/"Unfall", banner displays German text. — AC 5
- (Manual) Switch locale to German; verify OwnedShipsView faction dropdown shows German faction names. — AC 6
- (Manual) Switch locale to French; verify logbook shows "Indexation en cours" if cache-building banner is triggered. — AC 8
- (Manual) Switch locale to French; verify ShipLossesView filter buttons show "Tous"/"Combat"/"Accident", faction dropdown shows French faction names, and info banner displays French text. — AC 7 (fr.json)
- (Manual) Verify `StationsView.tsx` renders correctly with memoized `columns`; no visual regressions in column headers. — AC 10

## Documentation Updates

- `docs/agents/project-manifest/constraints.md` — Remove the entire "Known i18n Gaps" section (heading + 3 component tables). All gaps are resolved.
- `docs/agents/project-manifest/tech-stack.md` — Add a caveat paragraph under the `useDebounce` hook documentation noting that non-primitive `T` values must be memoized at call sites.

## Risks & Mitigations

| Risk | Mitigation |
|------|------------|
| **Fetch-ID guard does not prevent the extra IPC call** | Correct — it prevents stale *data display*, not the extra call. The extra call is a sub-millisecond local IPC round-trip, not a network request. Acceptable trade-off for pattern simplicity. |
| **Missing i18n keys cause runtime blank strings** | Manual locale-switch test catches missing keys before release. (`tsc --noEmit` does not validate locale key existence — see Testing Strategy.) |
| **French translations may be imprecise** | The existing `fr.json` translations follow a pattern of direct translation. The new keys follow the same pattern. A native speaker review is recommended but not blocking. |

