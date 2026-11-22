# Plan

## Plan Audit Cycles
- Audits: 2 — Plan Auditor v1.5.0
- Architectural Reviews: none — Plan Architect Reviewer v1.6.0

## Prior Project Context

The `2026-06-24-stations-view` plan was completed with all 3 WPs passing and 12/12 acceptance criteria met. The synthesis identified four non-blocking observations. This rework addresses all four, expanding the i18n scope after codebase analysis revealed the gap is significantly wider than the synthesis reported.

**Ledger workflow mismatch note:** The original plan was mistakenly executed by the ledger developer (multi-stage pipeline with self-initialized ledger) instead of the standalone developer. Assessment: the implementation quality is sound — StationsView.tsx correctly mirrors the OwnedShipsView pattern, all schema findings were incorporated, and no regressions were introduced. The extra ledger artifacts (`.ledger/`, `work-packages-draft.md`, `dependency-analysis.md`, `pipeline-configuration.md`, `work.md`) are harmless overhead and require no cleanup. No follow-up work is needed as a result of the workflow mismatch itself.

## Summary

Address all four non-blocking observations from the `2026-06-24-stations-view` synthesis: (1) extract a shared `useDebounce` hook to eliminate inline debounce duplication across two components, (2) close the codebase-wide i18n gap by adding locale keys and wiring `t()` calls for all hardcoded English strings in `SaveDataViewer`, `ShipLossesView`, and `OwnedShipsView`, (3) improve the StationsView Type column display by stripping the `_macro` suffix, and (4) remove the "Known Limitations" entry from `constraints.md` once the CategoryTab i18n gap is resolved.

## Architectural Context

**Debounce pattern** — Two components independently implement the same `setTimeout`/`clearTimeout` pattern with 300 ms delay: `OwnedShipsView.tsx` (1 instance), `StationsView.tsx` (2 instances). `ShipLossesView.tsx` does not use debounce and is unaffected. Note: `SettingsView.tsx` contains a 3000 ms feedback auto-dismiss timer and `ToolView.tsx` contains a 300 ms pulse animation flasher — neither is a search debounce and both are correct as-is.

**Hooks directory** — `src/hooks/` contains `useSaveData.ts`, `useQueryProgress.ts`, `useTheme.ts`. A `useDebounce.ts` hook fits this location naturally.

**i18n infrastructure** — `src/context/I18nContext.tsx` provides `useI18n()` → `{ t }`. Locale files: `src/locales/en.json`, `de.json`, `fr.json`. Existing sections: `app`, `nav`, `settings`, `tools`, `ships`, `stations`, `logbook`, `pagination`, `errors`, `setup`. Missing sections: `viewer` (for `SaveDataViewer`), `ship_losses` (for `ShipLossesView`).

**Hardcoded English strings audit:**
- `SaveDataViewer.tsx`: 5 CategoryTab labels, 7 InfoCard labels, "Save not extracted" warning title + body, "Retrieving save information...", "Error Loading Save Data" + "Retry"
- `ShipLossesView.tsx`: 5 column headers (`Time`, `Ship Name`, `Location`, `Destroyed By`, `Category`) — no `useI18n` import at all
- `OwnedShipsView.tsx`: 2 column headers (`Role`, `Faction`), 2 fallback strings (`Unknown Sector`, `Unknown Zone`)

**constraints.md** — Contains a "Known Limitations → CategoryTab Labels Are Hardcoded English" section added during the stations-view plan. This entry should be removed once the fix lands.

## Approach / Architecture

1. Create a `useDebounce<T>(value: T, delay: number): T` hook in `src/hooks/useDebounce.ts` that returns the debounced value. Replace the inline `setTimeout`/`clearTimeout` search debounce patterns in `OwnedShipsView.tsx` and `StationsView.tsx` with this hook.

2. Add two new locale sections (`viewer.*`, `ship_losses.*`) and missing keys under `ships.*` to all three locale files. Wire `t()` calls throughout the three affected view components and `SaveDataViewer`.

3. Strip the `_macro` suffix from station Type column display using a simple `.replace(/_macro$/, '')` in `StationsView.tsx`.

4. Remove the "Known Limitations" section from `constraints.md` after the CategoryTab labels are fixed.

## Rationale

- **useDebounce hook**: Three instances of the same 6-line pattern across two files (`OwnedShipsView.tsx`, `StationsView.tsx`). A shared hook reduces duplication and ensures consistency if the delay ever needs global adjustment.
- **i18n comprehensive pass**: The synthesis identified only the CategoryTab labels and OwnedShipsView "Role" header, but codebase analysis reveals the gap extends to all ShipLossesView columns, OwnedShipsView fallbacks, and multiple SaveDataViewer strings. Fixing all of them in one pass avoids partial coverage.
- **Macro suffix stripping**: Low-effort UX improvement. The `_macro` suffix is a game engine artifact with no user value; stripping it produces cleaner display text (e.g., `station_gen_factory_base_01` instead of `station_gen_factory_base_01_macro`).

## Considered Alternatives

| Decision | Chosen Shape | Alternatives Considered | Trade-Off Summary |
|----------|--------------|-------------------------|-------------------|
| Debounce hook API | `useDebounce(value, delay)` returns debounced value | (a) `useDebounceCallback(fn, delay)` returning a debounced function; (b) lodash `debounce` | A value-based hook is the React-idiomatic pattern, eliminates the `useState` + `useEffect` boilerplate at call sites, and avoids adding a lodash dependency. |
| i18n scope | Fix all hardcoded English across all three affected views | Fix only CategoryTab labels (synthesis item #2) | Partial fixes leave documented debt and require a second pass. The incremental effort to cover all strings is modest since the pattern is repetitive. |
| Macro display | Simple `replace(/_macro$/, '')` | (a) Lookup table mapping macros to human names; (b) Leave as-is | A lookup table requires cataloguing all game macro values — out of scope. Suffix stripping is a zero-maintenance improvement; the title tooltip retains the original value. |

## Pattern Alignment

| Pattern | Followed? | File Reference |
|---------|-----------|----------------|
| Custom hooks in `src/hooks/` | ✅ Yes | [src/hooks/useSaveData.ts](src/hooks/useSaveData.ts) |
| `useI18n()` for all user-facing strings | ✅ Yes (closing remaining gaps) | [src/components/StationsView.tsx](src/components/StationsView.tsx), [src/components/LogbookView.tsx](src/components/LogbookView.tsx) |
| Locale sections named after their screen | ✅ Yes | `ships.*`, `stations.*`, `logbook.*` pattern |
| Unit tests for hooks | ⚠️ Departure: test added for new hook | [src/hooks/useTheme.ts](src/hooks/useTheme.ts) (no existing hook tests — `useDebounce` introduces the first) |

## Detailed Steps

### Step 1 — Create `useDebounce` hook

Create `src/hooks/useDebounce.ts`:

```typescript
import { useState, useEffect } from 'react';

export function useDebounce<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);
    return () => clearTimeout(timer);
  }, [value, delay]);

  return debouncedValue;
}
```

### Step 2 — Refactor `StationsView.tsx` to use `useDebounce`

Replace the two inline debounce `useEffect` blocks and their `debouncedSearch`/`debouncedClassSearch` state with:

```typescript
import { useDebounce } from '../hooks/useDebounce';

// Replace state + useEffect pairs with:
const debouncedSearch = useDebounce(searchQuery, 300);
const debouncedClassSearch = useDebounce(classSearch, 300);
```

Remove the `debouncedSearch` and `debouncedClassSearch` `useState` declarations. Add a `useEffect` on `[debouncedSearch, debouncedClassSearch]` to reset `offset` to 0 when they change.

Also apply the macro suffix stripping in the Type column accessor:

```typescript
{item.macro.replace(/_macro$/, '')}
```

### Step 3 — Refactor `OwnedShipsView.tsx` to use `useDebounce`

Replace the inline debounce `useEffect` block and `debouncedSearch` state with `useDebounce(searchQuery, 300)`. Add a `useEffect` on `[debouncedSearch]` to reset `offset` to 0.

### Step 4 — Add i18n locale keys

Add the following new sections and keys to `src/locales/en.json`, `de.json`, and `fr.json`:

**New `viewer` section** (for `SaveDataViewer.tsx`):
```json
"viewer": {
  "tabs": {
    "overview": "Overview",
    "ship_losses": "Ship Losses",
    "owned_ships": "Owned Ships",
    "stations": "Stations",
    "logbook": "Logbook"
  },
  "overview": {
    "player_name": "Player Name",
    "credits": "Credits",
    "save_date": "Save Date",
    "game_name": "Game Name",
    "game_guid": "Game GUID",
    "game_code": "Game Code",
    "extraction_time": "Extraction Time"
  },
  "not_extracted_title": "Save not extracted",
  "not_extracted_message": "This savegame has not been processed yet. Start the Monitor tool to begin extraction.",
  "loading": "Retrieving save information...",
  "error_title": "Error Loading Save Data",
  "retry": "Retry"
}
```

**New `ship_losses` section** (for `ShipLossesView.tsx`):
```json
"ship_losses": {
  "title": "Ship Losses",
  "subtitle": "Universe-wide attrition history",
  "empty": "No ships have been lost in this savegame yet.",
  "time": "Time",
  "ship_name": "Ship Name",
  "location": "Location",
  "destroyed_by": "Destroyed By",
  "category": "Category"
}
```

**Additional `ships.*` keys** (for `OwnedShipsView.tsx` hardcoded strings):
```json
"ships": {
  ...existing keys...,
  "role": "Role",
  "faction": "Faction",
  "unknown_sector": "Unknown Sector",
  "unknown_zone": "Unknown Zone"
}
```

Provide equivalent German and French translations in `de.json` and `fr.json`.

### Step 5 — Wire i18n in `SaveDataViewer.tsx`

- Add `import { useI18n } from '../context/I18nContext';` and `const { t } = useI18n();` to the component.
- Replace all 5 CategoryTab `label` props with `t()` calls: `t('viewer.tabs.overview')`, `t('viewer.tabs.ship_losses')`, `t('viewer.tabs.owned_ships')`, `t('viewer.tabs.stations')`, `t('viewer.tabs.logbook')`.
- Replace all 7 InfoCard `label` props with `t()` calls using `viewer.overview.*` keys.
- Replace the "Save not extracted" warning title and body with `t('viewer.not_extracted_title')` and `t('viewer.not_extracted_message')`.
- Replace "Retrieving save information..." with `t('viewer.loading')`.
- Replace "Error Loading Save Data" with `t('viewer.error_title')`.
- Replace "Retry" button text with `t('viewer.retry')`.

### Step 6 — Wire i18n in `ShipLossesView.tsx`

- Add `import { useI18n } from '../context/I18nContext';` and `const { t } = useI18n();`.
- Replace all 5 hardcoded column headers with `t()` calls: `t('ship_losses.time')`, `t('ship_losses.ship_name')`, `t('ship_losses.location')`, `t('ship_losses.destroyed_by')`, `t('ship_losses.category')`.
- Replace the hardcoded title `"Ship Losses"` with `t('ship_losses.title')`.
- Replace the hardcoded subtitle `"Universe-wide attrition history"` with `t('ship_losses.subtitle')`.
- Replace the `emptyMessage` prop value `"No ships have been lost in this savegame yet."` with `t('ship_losses.empty')`.

### Step 7 — Wire i18n in `OwnedShipsView.tsx`

- Replace `header: 'Role'` with `header: t('ships.role')`.
- Replace `header: 'Faction'` with `header: t('ships.faction')`.
- Replace `'Unknown Sector'` fallback with `t('ships.unknown_sector')`.
- Replace `'Unknown Zone'` fallback with `t('ships.unknown_zone')`.

### Step 8 — Update `constraints.md`

Remove the "Known Limitations" section (heading and the CategoryTab paragraph) from `docs/agents/project-manifest/constraints.md`, since the i18n gap is resolved.

### Step 9 — Update manifest documentation

- **`docs/agents/project-manifest/file-tree.md`** — Add `useDebounce.ts` and `useDebounce.test.ts` under `src/hooks/`.
- **`docs/agents/project-manifest/tech-stack.md`** — Add a `### Hooks` subsection documenting the `useDebounce` hook: signature (`useDebounce<T>(value: T, delay: number): T`), purpose (debounce search input), and usage in `OwnedShipsView.tsx` and `StationsView.tsx`.

### Step 10 — Create unit test for `useDebounce`

Create `src/hooks/useDebounce.test.ts` testing:
- Returns initial value synchronously.
- Returns debounced value after the specified delay.
- Resets the timer when value changes before delay elapses.

### Step 11 — Verify

- `npx tsc --noEmit` — zero errors.
- `npx vitest run` — all tests pass (existing 7 + new `useDebounce` tests).

## Dependencies

- `useI18n` context: already implemented.
- All affected components: already exist and are functional.
- No external dependencies required.

## Required Components

- **New**: `src/hooks/useDebounce.ts`
- **New**: `src/hooks/useDebounce.test.ts`
- **Modified**: `src/components/StationsView.tsx` (useDebounce + macro display)
- **Modified**: `src/components/OwnedShipsView.tsx` (useDebounce + i18n)
- **Modified**: `src/components/ShipLossesView.tsx` (i18n)
- **Modified**: `src/components/SaveDataViewer.tsx` (i18n)
- **Modified**: `src/locales/en.json` (new sections + keys)
- **Modified**: `src/locales/de.json` (new sections + keys)
- **Modified**: `src/locales/fr.json` (new sections + keys)
- **Modified**: `docs/agents/project-manifest/constraints.md` (remove Known Limitations)
- **Modified**: `docs/agents/project-manifest/file-tree.md` (add useDebounce.ts and useDebounce.test.ts)
- **Modified**: `docs/agents/project-manifest/tech-stack.md` (add Hooks subsection)

## Assumptions

- The `useDebounce` hook's generic `<T>` signature works for all current usage patterns (all are `string` values today).
- The `_macro` suffix is consistent across all station macro values in the game data.
- No other components beyond the two identified (`OwnedShipsView.tsx`, `StationsView.tsx`) use inline search debounce patterns.

## Constraints

- No new external dependencies.
- All user-visible strings must use `t()` calls after this rework — no new hardcoded English.
- `cargo check` / `tsc --noEmit` must remain clean.
- Existing test suite must not regress.

## Out of Scope

- Macro-to-human-readable lookup table for station types (would require game data cataloguing).
- i18n for the `InfoCard` component itself (it receives `label` as a prop from the parent; the i18n fix is in the parent).
- Faction name lookup table in `OwnedShipsView.tsx` (the hardcoded faction list in `availableFactions` is pre-existing and a separate concern).
- Adding debounce to `ShipLossesView.tsx` (it doesn't use search inputs today).

## Acceptance Criteria

1. A `useDebounce` hook exists at `src/hooks/useDebounce.ts` and is used by both components with inline search debounce logic (`OwnedShipsView.tsx` and `StationsView.tsx`).
2. No inline `setTimeout`/`clearTimeout` search debounce patterns remain in `OwnedShipsView.tsx` or `StationsView.tsx`.
3. All five CategoryTab labels in `SaveDataViewer.tsx` use `t()` calls.
4. All seven InfoCard labels and all warning/loading/error strings in `SaveDataViewer.tsx` use `t()` calls.
5. All five column headers, title, subtitle, and empty-state message in `ShipLossesView.tsx` use `t()` calls.
6. The "Role" and "Faction" headers and "Unknown Sector"/"Unknown Zone" fallbacks in `OwnedShipsView.tsx` use `t()` calls.
7. New locale sections (`viewer.*`, `ship_losses.*`) and keys (`ships.role`, `ships.faction`, `ships.unknown_sector`, `ships.unknown_zone`) exist in all three locale files with appropriate translations.
8. The StationsView Type column displays macro values with the `_macro` suffix stripped.
9. The "Known Limitations" section is removed from `constraints.md`.
10. `npx tsc --noEmit` reports zero errors.
11. `npx vitest run` reports no regressions and the new `useDebounce` test passes.
12. `file-tree.md` lists `useDebounce.ts` and `useDebounce.test.ts` under `src/hooks/`. `tech-stack.md` contains a `### Hooks` subsection documenting `useDebounce`.

## Testing Strategy

Unit test the `useDebounce` hook with `vitest` + `@testing-library/react` `renderHook`. Existing component tests exercise the i18n mock path and should continue passing. TypeScript compilation validates all `t()` key usage. Manual verification: switch locale and confirm all previously-hardcoded strings change.

## Test Plan

- `src/hooks/useDebounce.test.ts` — Renders hook with initial value, asserts it returns initial value synchronously. — AC 1
- `src/hooks/useDebounce.test.ts` — Advances fake timers past delay, asserts debounced value updates. — AC 1
- `src/hooks/useDebounce.test.ts` — Changes value before delay elapses, asserts only final value is returned. — AC 1
- `npx tsc --noEmit` — Zero errors validates all `t()` call keys type-check. — AC 10
- `npx vitest run` — All tests pass. — AC 11
- (Manual) Switch locale to German, verify CategoryTab labels, InfoCard labels, ShipLossesView title/subtitle/headers/empty-state, OwnedShipsView headers/fallbacks all display German. — AC 3, 4, 5, 6, 7

## Documentation Updates

- `docs/agents/project-manifest/constraints.md` — Remove "Known Limitations" section (CategoryTab i18n gap resolved).
- `docs/agents/project-manifest/file-tree.md` — Add `useDebounce.ts` and `useDebounce.test.ts` under `src/hooks/`.
- `docs/agents/project-manifest/tech-stack.md` — Add `### Hooks` subsection documenting `useDebounce`.

## Risks & Mitigations

| Risk | Mitigation |
|------|------------|
| **`useDebounce` offset reset side-effect** | The current inline pattern resets `offset` inside the same `setTimeout`. With `useDebounce`, a separate `useEffect` on the debounced value handles the reset. Functionally equivalent; verify in testing. |
| **Missing i18n keys cause runtime blank strings** | TypeScript compilation + manual locale switch test catches missing keys before release. |
| **`_macro` suffix not universal** | `replace(/_macro$/, '')` is a no-op if the suffix is absent — safe fallback. Title tooltip retains the original value for debugging. |
