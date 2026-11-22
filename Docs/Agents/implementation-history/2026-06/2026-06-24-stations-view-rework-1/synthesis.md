# Synthesis Report — 2026-06-24-stations-view-rework-1

**Generated:** 2026-06-24  
**Project Status:** COMPLETE  
**Duration:** ~49 minutes (09:23 → 10:12 UTC)

---

## Executive Summary

This plan addressed all four non-blocking observations surfaced in the `2026-06-24-stations-view` synthesis. The work delivered four concrete improvements:

1. **Shared `useDebounce` hook** — Extracted a reusable `useDebounce<T>(value, delay)` hook to `src/hooks/useDebounce.ts`, eliminating three instances of inline `setTimeout`/`clearTimeout` duplication across `StationsView.tsx` and `OwnedShipsView.tsx`.

2. **Codebase-wide i18n pass** — Added `viewer.*` and `ship_losses.*` locale sections plus `ships.*` extensions to all three locale files (EN/DE/FR). Wired `t()` calls throughout `SaveDataViewer.tsx`, `ShipLossesView.tsx`, and `OwnedShipsView.tsx`. Resolved the previously documented "Known Limitations → CategoryTab Labels Are Hardcoded English" constraint.

3. **StationsView `_macro` suffix stripping** — The Type column now displays clean station type identifiers (e.g., `station_gen_factory_base_01` instead of `station_gen_factory_base_01_macro`). Raw macro values are preserved in the `title` tooltip attribute.

4. **`constraints.md` cleanup** — Removed the resolved "Known Limitations" section. Replaced it with a new "Known i18n Gaps" section tracking the remaining hardcoded strings across three components for future resolution.

All 7 work packages passed all 4 pipeline stages (implementation → QA → code-review → documentation) with zero rework cycles.

---

## Metrics

| Metric | Value |
|--------|-------|
| Work Packages | 7 / 7 COMPLETE |
| Pipeline stages passed | 28 / 28 (100%) |
| Rework cycles | 0 |
| TypeScript errors at completion | 0 |
| Tests passed (final run) | 10 / 10 |
| Test regressions | 0 |
| Reviewer Fix-Forwards applied | 2 (both non-behavioral) |

### Files Modified

| File | Modified By |
|------|-------------|
| `src/hooks/useDebounce.ts` | WP-001 (created) |
| `src/hooks/useDebounce.test.ts` | WP-001 (created) |
| `src/locales/en.json` | WP-002 |
| `src/locales/de.json` | WP-002 |
| `src/locales/fr.json` | WP-002 |
| `src/components/StationsView.tsx` | WP-003 |
| `src/components/OwnedShipsView.tsx` | WP-004, WP-007 |
| `src/components/SaveDataViewer.tsx` | WP-005 |
| `src/components/ShipLossesView.tsx` | WP-006 |
| `docs/agents/project-manifest/file-tree.md` | WP-001 (updated), WP-001 Doc (LogbookView.test.tsx added) |
| `docs/agents/project-manifest/tech-stack.md` | WP-001 (Hooks subsection added) |
| `docs/agents/project-manifest/detail-screens.md` | WP-003, WP-004 |
| `docs/agents/project-manifest/constraints.md` | WP-005, WP-006, WP-007 |
| `docs/agents/plans/.../work/WP-002.md` | WP-002 Doc (AC typo corrected) |

---

## Strategic Recommendations

### Gold Nugget 1 — Hook test file establishes a missing pattern

`useDebounce.test.ts` is the **first hook test file** in `src/hooks/`. It establishes the `renderHook` + `vi.useFakeTimers` pattern for future hook tests. The per-suite `beforeEach`/`afterEach` timer management (rather than a global setup) is the correct approach and is now documented. Future hook authors have a clear precedent to follow.

### Gold Nugget 2 — `useDebounce` generic constraint worth noting for non-string consumers

QA flagged (WP-001) that the generic `<T>` parameter is correct but callers passing object or array references will trigger spurious debounce resets unless they memoize those references. Current usage is string-only (safe), but this caveat should be added to `tech-stack.md`'s Hooks subsection before any non-string consumer is introduced.

### Gold Nugget 3 — Double-fetch pattern is a systemic architectural risk

The code review (WP-003, WP-004) identified a **medium-priority data-fetch race** in both `StationsView.tsx` and `OwnedShipsView.tsx`: when a debounced filter value changes while `offset > 0`, two `fetch*` calls are dispatched in rapid succession — one with the stale offset, one with `offset = 0`. Without an `AbortController` to cancel the stale-offset request, a slow first response could overwrite the correct second response. Under normal latency this is silent, but it is a genuine race window. This should be addressed as a discrete follow-up WP before the app is used in high-latency environments.

### Gold Nugget 4 — i18n coverage is now ~85%, not 100%

The plan deliberately scoped to the most visible hardcoded strings. Constraints.md now tracks three components with residual gaps:

- `SaveDataViewer.tsx`: 3 strings ('Back to list', 'Active Analysis', 'Refresh Data')
- `ShipLossesView.tsx`: 4 strings (FilterButton labels 'All'/'Combat'/'Accident', info banner, raw `item.category` display, 'Unknown' fallback)
- `OwnedShipsView.tsx`: 11 faction display names ('Argon Federation', etc.)

A single follow-up i18n WP could close all of these. The gaps are catalogued with suggested locale key names in `constraints.md`.

### Gold Nugget 5 — Pre-existing offset-reset gap in `OwnedShipsView`

The code review (WP-004) noted that `purposeFilter`, `sizeFilter`, and `factionFilter` changes do **not** reset `offset` to 0. If a user is on page 2 and switches a dropdown filter, page 2 of the new result set is shown — which may be empty. This predates this plan but was explicitly flagged for tracking.

---

## Deferred & Follow-Up Items

### Deferred (intentionally postponed)

| # | Source | Agent | Description | Priority |
|---|--------|-------|-------------|----------|
| D1 | WP-005 review | Reviewer | `SaveDataViewer.tsx` — 3 residual hardcoded strings: `title='Back to list'` (back-nav button), `'Active Analysis'` (breadcrumb), `'Refresh Data'` (refresh button). Suggested keys: `viewer.header.back_to_list`, `viewer.header.active_analysis`, `viewer.overview.refresh`. Tracked in `constraints.md` § Known i18n Gaps. | Medium |
| D2 | WP-006 review | Reviewer | `ShipLossesView.tsx` — 4 residual hardcoded strings: FilterButton labels ('All', 'Combat', 'Accident'), universe-wide info banner text, raw `item.category` display (backend values 'combat'/'accident'), `'Unknown'` destroyedBy fallback. Tracked in `constraints.md` § Known i18n Gaps. | Medium |
| D3 | WP-007 review | Reviewer | `OwnedShipsView.tsx` — 11 hardcoded faction display names in `availableFactions` filter list (e.g. 'Argon Federation', 'Antigone Republic', etc.). Suggested key prefix: `ships.factions.*`. Tracked in `constraints.md` § Known i18n Gaps. | Low |

### Out-of-Scope (beyond this plan's boundaries)

| # | Source | Agent | Description | Priority |
|---|--------|-------|-------------|----------|
| O1 | WP-003 review | Reviewer | `StationsView.tsx` — double-fetch pattern: filter change while `offset > 0` issues two fetches without `AbortController`. Stale-closure race under high latency. Recommend `AbortController` or single-effect restructuring. | Medium |
| O2 | WP-004 review | Reviewer | `OwnedShipsView.tsx` — same double-fetch pattern as StationsView (same root cause). | Medium |
| O3 | WP-004 review | Reviewer | `OwnedShipsView.tsx` — `purposeFilter`, `sizeFilter`, `factionFilter` changes do not reset `offset` to 0 (pre-existing). Users on page 2+ see empty results after a filter change. | Medium |
| O4 | WP-002 implementation | Developer | `fr.json` — pre-existing gap: `logbook.cacheBuildingTitle` and `logbook.cacheBuildingMessage` keys absent (present in `en.json` and `de.json`). | Low |
| O5 | WP-007 review | Reviewer | `OwnedShipsView.tsx` — `columns` array not wrapped in `useMemo`, while `availableFactions` directly above it is. Inconsistency; low risk but worth harmonising. | Low |

---

## Next Steps

### Immediate (next cycle candidates)

1. **Follow-up i18n WP** — Combine D1, D2, D3 into a single WP. All gaps are catalogued in `constraints.md` § Known i18n Gaps with suggested locale key names. Estimated scope: add ~18 locale keys across 3 files, wire ~18 `t()` calls.

2. **Fetch cancellation WP** — Address O1 and O2. Introduce `AbortController` pattern in `StationsView.tsx` and `OwnedShipsView.tsx` fetch effects, or restructure to colocate filter + offset state changes in a single effect. Consider whether a shared `useFetchWithAbort` hook is worthwhile given the number of data-fetching components.

3. **OwnedShipsView offset-reset fix** — Address O3. Add `setOffset(0)` to the `purposeFilter`, `sizeFilter`, and `factionFilter` change handlers (or colocate state with their effects).

### Lower priority

4. **fr.json logbook gap** (O4) — Add `cacheBuildingTitle` and `cacheBuildingMessage` to `fr.json`.

5. **OwnedShipsView columns memoization** (O5) — Wrap the `columns` array in `useMemo([t])` for consistency with `availableFactions`.

6. **useDebounce non-primitive caveat** — Update `tech-stack.md` § Hooks to note that object/array `T` arguments should be memoized at call sites to avoid spurious debounce resets.
