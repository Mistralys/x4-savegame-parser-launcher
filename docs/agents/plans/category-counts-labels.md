# Logbook Category Counts & Backend-Driven Labels

**Status**: Ready for Implementation  
**Created**: 2026-02-08  
**Priority**: Medium  
**Estimated Time**: 4-6 hours total

## Problem Statement

The logbook category dropdown in the launcher has two issues:

1. **No Entry Counts**: Users cannot see which categories have entries or how many entries exist without filtering each category individually.
2. **Hardcoded Categories**: Categories are defined in the frontend ([LogbookView.tsx](../src/components/LogbookView.tsx) lines 24-62), violating the architectural principle that the backend is the source of truth for data definitions.

## Solution Overview

Add a new `log-metadata` CLI command in the backend that returns category metadata (ID, localized label, entry count) from the analysis cache. The frontend fetches this on mount and dynamically builds the category dropdown, showing counts like "Combat (45)" or "Tips (0)".

### Key Architectural Decisions

| Decision | Rationale |
|----------|-----------|
| **Backend is source of truth** | Categories defined once in PHP, frontend adapts automatically to changes |
| **Show ALL categories** | Display even 0-count categories for consistency (prevents user confusion about "missing" categories) |
| **Metadata cached in `analysis.json`** | Use existing cache file rather than creating new `_metadata.json` (follows established pattern) |
| **Icons/colors remain in frontend** | UI presentation concerns with graceful fallbacks for unknown categories |
| **Human-readable labels from backend** | Backend already has localized labels via `getLabel()` method |

## Architecture Context

### Backend (x4-savegame-parser)

**Cache Structure**:
- **Location**: `{savegame}/JSON/event-log/` directory
- **Files**: `combat.json`, `missions.json`, etc. (one per category)
- **Metadata**: `{savegame}/JSON/analysis.json` stores cache validity info
- **Current Keys**: `log-cache-written` (ISO date), `log-category-ids` (string array)

**Category System**:
- **Constants**: [LogCategories.php](../../x4-savegame-parser/src/X4/SaveViewer/Data/SaveReader/Log/LogCategories.php) defines 18 category IDs (e.g., `CATEGORY_MISSIONS`, `CATEGORY_ALERT`)
- **Detection**: [DetectionCategories.php](../../x4-savegame-parser/src/X4/SaveViewer/Data/SaveReader/Log/Categories/DetectionCategories.php) creates category instances with labels
- **Labels**: Generated via `t()` localization function (e.g., `t('Missions')`, `t('Combat')`)
- **Entry Counting**: `LogCategory::countEntries()` method exists but not exposed via API

**Existing CLI Commands**:
- `log`: Returns paginated entries with filtering
- No metadata-only endpoint currently exists

### Frontend (x4-savegame-parser-launcher)

**Current Implementation**:
- **File**: [src/components/LogbookView.tsx](../src/components/LogbookView.tsx)
- **Hardcoded Categories**: Lines 24-62 define `CATEGORY_ICONS` and `CATEGORY_COLORS`
- **Dropdown**: Lines 216-227 iterate hardcoded categories
- **Translation**: Uses frontend i18n: `t('logbook.categories.combat')` etc.

**API Integration**:
- **Hook**: [useSaveData.ts](../src/hooks/useSaveData.ts) `query()` method
- **Commands**: Uses Tauri `query_save_data_with_progress` with fallback to `query_save_data`
- **Progress Events**: Already implemented for `LOG_CACHE_BUILDING` operation

---

## Work Packages

### Package 1: Backend - Add Metadata Storage to Cache

**Goal**: Store category metadata (id, label, count) in `analysis.json` during cache generation.

**Files to Modify**:
- `f:\Webserver\www\htdocs\tools\x4-savegame-parser\src\X4\SaveViewer\Data\SaveReader\Log\LogAnalysisWriter.php`

**Implementation Steps**:

1. **Update `writeFiles()` method** (currently lines 31-58):
   ```php
   public function writeFiles(DetectionCategories $collection) : void
   {
       $categories = $collection->getAll();

       // Write category JSON files (existing code)
       foreach ($categories as $category) {
           JSONFile::factory(
               sprintf(
                   '%s/%s.json',
                   $this->path->getFolderPath(),
                   $category->getCategoryID()
               )
           )->putData($category->toArray(), true);
       }

       // NEW: Build metadata array
       $metadata = [];
       foreach ($categories as $category) {
           $metadata[] = [
               'id' => $category->getCategoryID(),
               'label' => $category->getLabel(),
               'count' => $category->countEntries()
           ];
       }

       // Update analysis.json with metadata
       $this->analysis->setKey(LogAnalysisCache::KEY_CACHE_WRITTEN, Microtime::createNow()->getISODate());
       $this->analysis->setKey(LogAnalysisCache::KEY_CATEGORY_IDS, $collection->getIDs());
       $this->analysis->setKey(LogAnalysisCache::KEY_CATEGORY_METADATA, $metadata); // NEW LINE
       $this->analysis->save();
   }
   ```

**Verification**:
```bash
cd f:\Webserver\www\htdocs\tools\x4-savegame-parser

# Extract a savegame to trigger cache generation
bin\extract --save=quicksave

# Inspect analysis.json
cat "F:\Games\X4 Foundations\archived-saves\quicksave\JSON\analysis.json"

# Should contain new key:
# "log-category-metadata": [
#   {"id": "combat", "label": "Combat", "count": 45},
#   ...
# ]
```

**Dependencies**: None  
**Estimated Time**: 30 minutes

---

### Package 2: Backend - Add Metadata Getter Method

**Goal**: Expose method to retrieve category metadata from cache.

**Files to Modify**:
- `f:\Webserver\www\htdocs\tools\x4-savegame-parser\src\X4\SaveViewer\Data\SaveReader\Log\LogAnalysisCache.php`

**Implementation Steps**:

1. **Add constant** (after line 13):
   ```php
   public const string KEY_CATEGORY_METADATA = 'log-category-metadata';
   ```

2. **Add getter method** (after `getCacheDate()` method, around line 56):
   ```php
   /**
    * Get category metadata (id, label, count) from cache.
    * 
    * @return array<int, array{id: string, label: string, count: int}>
    */
   public function getCategoryMetadata() : array
   {
       if (!$this->isCacheValid()) {
           return [];
       }
       
       return $this->analysis->getArray(self::KEY_CATEGORY_METADATA);
   }
   ```

**Verification**:
```bash
cd f:\Webserver\www\htdocs\tools\x4-savegame-parser

# Run PHPStan
vendor\bin\phpstan analyze src/X4/SaveViewer/Data/SaveReader/Log/LogAnalysisCache.php --level=6

# Should pass with no errors
```

**Dependencies**: Package 1 (storage must exist first)  
**Estimated Time**: 15 minutes

---

### Package 3: Backend - Add log-metadata CLI Command

**Goal**: Create new CLI command that returns category metadata.

**Files to Modify**:
- `f:\Webserver\www\htdocs\tools\x4-savegame-parser\src\X4\SaveViewer\CLI\QueryHandler.php`

**Implementation Steps**:

1. **Add command constant** (around line 50, after `COMMAND_LOG`):
   ```php
   public const string COMMAND_LOG_METADATA = 'log-metadata';
   ```

2. **Add match case** (around line 163, in `executeCommand()` match statement):
   ```php
   self::COMMAND_LOG_METADATA => $this->execute_logMetadata($save, $params),
   ```

3. **Implement handler method** (add after `execute_log()` method, around line 500):
   ```php
   /**
    * Execute log-metadata command: Returns category metadata (id, label, count).
    */
   private function execute_logMetadata(BaseSaveFile $save, QueryParameters $params): string
   {
       $log = $save->getReader()->getLog();
       $cache = $log->getCache();
       
       // If cache invalid, build it (with progress events if in JSON mode)
       if (!$cache->isCacheValid()) {
           $log->generateAnalysisCache();
       }
       
       $metadata = $cache->getCategoryMetadata();
       
       return JsonResponseBuilder::success(
           self::COMMAND_LOG_METADATA,
           $metadata,
           $params->isPretty
       );
   }
   ```

**Verification**:
```bash
cd f:\Webserver\www\htdocs\tools\x4-savegame-parser

# Test the command
bin\query log-metadata --save=quicksave --pretty

# Expected output:
# {
#   "success": true,
#   "command": "log-metadata",
#   "version": "...",
#   "timestamp": "...",
#   "data": [
#     {"id": "combat", "label": "Combat", "count": 45},
#     {"id": "missions", "label": "Missions", "count": 123},
#     {"id": "tips", "label": "Tips", "count": 0},
#     ...
#   ]
# }

# Test with JSON streaming mode (progress events)
bin\query log-metadata --save=quicksave --json

# Test with invalid save
bin\query log-metadata --save=nonexistent

# PHPStan check
vendor\bin\phpstan analyze src/X4/SaveViewer/CLI/QueryHandler.php --level=6
```

**Dependencies**: Package 2 (getter method)  
**Estimated Time**: 45 minutes

---

### Package 4: Frontend - Fetch Category Metadata

**Goal**: Add state and API call to fetch metadata from backend.

**Files to Modify**:
- `f:\Webserver\www\htdocs\tools\x4-savegame-parser-launcher\src\components\LogbookView.tsx`

**Implementation Steps**:

1. **Add TypeScript interface** (after line 17, after `LogbookEntry` interface):
   ```typescript
   interface CategoryMetadata {
     id: string;
     label: string;
     count: number;
   }
   ```

2. **Add state variables** (after line 67, after existing state declarations):
   ```typescript
   const [categoryMetadata, setCategoryMetadata] = useState<CategoryMetadata[]>([]);
   const [metadataLoading, setMetadataLoading] = useState(false);
   const [metadataError, setMetadataError] = useState<string | null>(null);
   ```

3. **Add fetch function** (after line 100, after `fetchLogbook` function):
   ```typescript
   const fetchMetadata = useCallback(async () => {
     if (!saveId) return;
     
     setMetadataLoading(true);
     setMetadataError(null);
     
     try {
       const response = await query<CategoryMetadata[]>(saveId, 'log-metadata', {});
       setCategoryMetadata(response.data);
     } catch (err: any) {
       console.error('Failed to fetch category metadata:', err);
       setMetadataError(err.message || 'Failed to load category data');
     } finally {
       setMetadataLoading(false);
     }
   }, [saveId, query]);
   ```

4. **Call in useEffect** (modify existing `useEffect` around line 115):
   ```typescript
   useEffect(() => {
     if (saveId) {
       fetchLogbook();
       fetchMetadata(); // NEW LINE
     }
   }, [saveId, fetchLogbook, fetchMetadata]);
   ```

**Verification**:
```bash
cd f:\Webserver\www\htdocs\tools\x4-savegame-parser-launcher

# Type check
npm run type-check

# Build
npm run build

# Manual test:
# 1. Run launcher: npm run tauri dev
# 2. Open DevTools, go to Network tab
# 3. Navigate to Logbook screen
# 4. Verify API call to log-metadata command
# 5. Check console for metadata array
```

**Dependencies**: Package 3 (CLI command must exist)  
**Estimated Time**: 30 minutes

---

### Package 5: Frontend - Replace Hardcoded Categories with Backend Data

**Goal**: Remove hardcoded category list, use backend metadata for dropdown.

**Files to Modify**:
- `f:\Webserver\www\htdocs\tools\x4-savegame-parser-launcher\src\components\LogbookView.tsx`

**Implementation Steps**:

1. **Keep icon/color mappings** (lines 24-62) - these are UI concerns
   - Add comment: `// UI presentation mapping (backend is source of truth for categories)`
   - No changes to `CATEGORY_ICONS` or `CATEGORY_COLORS`

2. **Calculate total count** (add before dropdown render, around line 210):
   ```typescript
   const totalCount = categoryMetadata.reduce((sum, cat) => sum + cat.count, 0);
   ```

3. **Update dropdown** (replace lines 216-227):
   ```typescript
   <select
     className="pl-10 pr-8 py-2 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl text-sm focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none appearance-none cursor-pointer transition-all"
     value={categoryFilter}
     onChange={(e) => {
       setCategoryFilter(e.target.value);
       setPage(1);
     }}
     disabled={metadataLoading}
   >
     <option value="all">
       {t('logbook.categories.all')} {totalCount > 0 ? `(${totalCount.toLocaleString()})` : '(0)'}
     </option>
     {categoryMetadata.map(cat => (
       <option key={cat.id} value={cat.id}>
         {cat.label} ({cat.count.toLocaleString()})
       </option>
     ))}
   </select>
   ```

4. **Update category badge rendering** (in `columns` definition, around line 130):
   ```typescript
   {
     key: 'category',
     label: t('logbook.table.category'),
     width: '150px',
     render: (entry: LogbookEntry) => {
       const icon = CATEGORY_ICONS[entry.categoryID] || <Info size={14} />;
       const colorClass = CATEGORY_COLORS[entry.categoryID] || 
         'bg-gray-100 text-gray-700 dark:bg-gray-900/30 dark:text-gray-400';
       
       return (
         <span className={`inline-flex items-center gap-1.5 px-2 py-1 rounded-lg text-xs font-medium ${colorClass}`}>
           {icon}
           {entry.categoryLabel}
         </span>
       );
     }
   },
   ```

5. **Add error banner** (after existing error banners, around line 235):
   ```typescript
   {metadataError && (
     <div className="p-4 rounded-xl bg-yellow-500/10 border border-yellow-500/20 flex items-center gap-3 text-yellow-600 dark:text-yellow-400 animate-in fade-in slide-in-from-top-2">
       <AlertCircle size={20} />
       <p className="text-sm font-medium">{metadataError}</p>
     </div>
   )}
   ```

**Verification**:
```bash
cd f:\Webserver\www\htdocs\tools\x4-savegame-parser-launcher

# Type check
npm run type-check

# Manual test:
# 1. Run: npm run tauri dev
# 2. Select a save with logbook entries
# 3. Navigate to Logbook screen
# 4. Verify dropdown shows: "All Categories (1523)", "Combat (45)", "Tips (0)", etc.
# 5. Verify ALL categories appear (even with 0 count)
# 6. Select category with 0 entries -> should show empty table
# 7. Verify category badges use backend labels (not hardcoded translations)
# 8. Test with unknown category (backend adds new one) -> should show fallback icon
```

**Dependencies**: Package 4 (metadata fetch)  
**Estimated Time**: 1 hour

---

### Package 6: Frontend - Remove Hardcoded Category Translations

**Goal**: Clean up i18n files by removing category-specific translation keys (now from backend).

**Files to Modify**:
- `f:\Webserver\www\htdocs\tools\x4-savegame-parser-launcher\src\locales\en.json`
- `f:\Webserver\www\htdocs\tools\x4-savegame-parser-launcher\src\locales\de.json` (if exists)

**Implementation Steps**:

1. **Keep required keys**:
   - `logbook.categories.all` - Frontend-only option
   
2. **Remove category-specific keys** (if they exist):
   - `logbook.categories.combat`
   - `logbook.categories.mission`
   - `logbook.categories.trade`
   - etc. (all category names)

3. **Add new error keys** in `en.json`:
   ```json
   {
     "logbook": {
       "categories": {
         "all": "All Categories"
       },
       "metadataLoadError": "Failed to load category data",
       "noCategories": "No categories available"
     }
   }
   ```

**Verification**:
```bash
cd f:\Webserver\www\htdocs\tools\x4-savegame-parser-launcher

# Search for removed keys
grep -r "logbook.categories.combat" src/

# Should only find them in LogbookView.tsx comments (if any)

# Manual test:
# 1. Run launcher
# 2. Verify dropdown shows English labels from backend
# 3. Verify "All Categories" still translates correctly
```

**Dependencies**: Package 5 (must not break UI)  
**Estimated Time**: 15 minutes

---

### Package 7: Documentation - Update CLI API Reference

**Goal**: Document the new `log-metadata` command in manifest.

**Files to Modify**:
- `f:\Webserver\www\htdocs\tools\x4-savegame-parser\docs\agents\project-manifest\cli-api-reference.md`

**Implementation Steps**:

1. **Add command entry** (in alphabetical order, after `log` command):

````markdown
### `log-metadata`

**Purpose**: Returns category metadata (ID, localized label, entry count) for all logbook categories.

**Usage**:
```bash
bin/query log-metadata --save=<save-id> [--pretty] [--json]
```

**Parameters**:
- `--save` (required): Save name or ID
- `--pretty` (optional): Pretty-print JSON output
- `--json` (optional): Enable NDJSON progress events

**Response Schema**:
```json
{
  "success": true,
  "command": "log-metadata",
  "version": "1.0.0",
  "timestamp": "2026-02-08T10:30:00+00:00",
  "data": [
    {
      "id": "combat",
      "label": "Combat",
      "count": 45
    },
    {
      "id": "missions",
      "label": "Missions",
      "count": 123
    },
    {
      "id": "tips",
      "label": "Tips",
      "count": 0
    }
    // ... all categories, even with count: 0
  ]
}
```

**Data Fields**:
- `id` (string): Category identifier (matches `categoryID` in log entries)
- `label` (string): Human-readable, localized category name
- `count` (int): Number of entries in this category

**Caching**:
- Metadata is cached in `{savegame}/JSON/analysis.json` under `log-category-metadata` key
- Automatically rebuilt if cache is invalid or missing
- Uses existing log analysis cache (same as `log` command)

**Progress Events** (when `--json` flag used):
- `LOG_CACHE_BUILDING` - Emitted if cache needs to be generated

**Example**:
```bash
# Get category metadata
bin\query log-metadata --save=quicksave --pretty

# With progress events
bin\query log-metadata --save=quicksave --json
```

**Use Case**: Display category dropdown with entry counts in UI without loading all entries.
````

2. **Update merged manifest**:
```bash
cd f:\Webserver\www\htdocs\tools\x4-savegame-parser
bin\merge-manifest
```

**Verification**:
- Review the markdown rendering
- Verify command appears in table of contents
- Check merged manifest includes the change

**Dependencies**: Package 3 (command implementation)  
**Estimated Time**: 20 minutes

---

### Package 8: Documentation - Update Public API Reference

**Goal**: Document new methods in the manifest.

**Files to Modify**:
- `f:\Webserver\www\htdocs\tools\x4-savegame-parser\docs\agents\project-manifest\public-api-reference.md`

**Implementation Steps**:

1. **Add to LogAnalysisCache section**:
```markdown
#### `LogAnalysisCache::getCategoryMetadata(): array`

Returns category metadata from cache (id, label, count).

**Return Type**: `array<int, array{id: string, label: string, count: int}>`

**Returns**: Empty array if cache invalid.

**Example**:
```php
$cache = $save->getReader()->getLog()->getCache();
$metadata = $cache->getCategoryMetadata();
// [
//   ['id' => 'combat', 'label' => 'Combat', 'count' => 45],
//   ['id' => 'missions', 'label' => 'Missions', 'count' => 123],
//   ...
// ]
```
```

2. **Update merged manifest**:
```bash
cd f:\Webserver\www\htdocs\tools\x4-savegame-parser
bin\merge-manifest
```

**Dependencies**: Package 2 (method implementation)  
**Estimated Time**: 15 minutes

---

### Package 9: Documentation - Update Constraints Document

**Goal**: Document architectural pattern for frontend project.

**Files to Modify**:
- `f:\Webserver\www\htdocs\tools\x4-savegame-parser-launcher\Docs\Agents\ProjectManifest\constraints.md`

**Implementation Steps**:

1. **Add pattern note** (in appropriate section):
```markdown
### Data Source Authority

**Pattern**: Backend is the single source of truth for data definitions.

**Rule**: The frontend MUST NOT hardcode data lists that originate from backend parsing (categories, enums, taxonomies, etc.).

**Rationale**:
- Prevents synchronization issues between frontend and backend
- Allows backend to add/remove data types without frontend changes
- Ensures consistency between API responses and UI display

**Example Violations**:
- ❌ Hardcoding logbook category list in React component
- ❌ Maintaining duplicate ship type enums in TypeScript
- ❌ Frontend-defined faction relationship labels

**Correct Approach**:
- ✅ Fetch category metadata from backend API
- ✅ Backend provides human-readable labels
- ✅ Frontend handles UI concerns (icons, colors) with fallbacks

**Exception**: UI-only options that don't exist in data (e.g., "All Categories" filter option).
```

2. **Update merged launcher manifest**:
```bash
cd f:\Webserver\www\htdocs\tools\x4-savegame-parser-launcher
node scripts\merge-manifests.js
```

**Dependencies**: None (documentation only)  
**Estimated Time**: 15 minutes

---

## Testing Checklist

**Backend Testing**:
- [ ] Extract savegame creates `log-category-metadata` in `analysis.json`
- [ ] `bin\query log-metadata` returns all categories with counts
- [ ] Categories with 0 entries are included
- [ ] Labels are localized and human-readable
- [ ] Progress events emit during cache building (`--json` flag)
- [ ] Command works with nonexistent save (proper error)
- [ ] PHPStan level 6 passes on modified files

**Frontend Testing**:
- [ ] Dropdown populates from backend (not hardcoded)
- [ ] ALL categories display, including "(0)" counts
- [ ] "All Categories" shows total count
- [ ] Category selection works correctly
- [ ] Selecting 0-count category shows empty table
- [ ] Category badges use backend labels
- [ ] Icons/colors render correctly
- [ ] Unknown categories show fallback icon (gray color)
- [ ] Metadata load error shows error banner
- [ ] Cache building banner still appears (existing feature)
- [ ] TypeScript compilation succeeds
- [ ] No console errors in browser DevTools

**Cross-Project Integration**:
- [ ] Backend category changes appear in frontend without code changes
- [ ] Adding new category in backend appears in dropdown automatically
- [ ] Category labels match between API responses and dropdown

---

## Rollback Plan

If issues arise during implementation:

1. **Backend Rollback**:
   - Remove `COMMAND_LOG_METADATA` constant and handler method
   - Remove `getCategoryMetadata()` method
   - Remove metadata storage from `LogAnalysisWriter::writeFiles()`
   - Re-run `composer dumpautoload`

2. **Frontend Rollback**:
   - Restore hardcoded category list in `LogbookView.tsx`
   - Remove metadata fetch logic
   - Restore hardcoded translations in i18n files
   - Git revert: `git checkout HEAD -- src/components/LogbookView.tsx src/locales/`

3. **Cache Regeneration**:
   - If cache format causes issues, force rebuild: `bin\extract --save=quicksave --force`

---

## Future Enhancements

**Possible Extensions** (not in scope):
- Add category filtering to other screens (owned ships, stations)
- Category-based analytics (entries per category over time)
- Category icons/colors defined in backend configuration
- Batch metadata endpoint for multiple saves
- Cache prewarming for common queries
- Category grouping (e.g., "Station-related", "Combat-related")

---

## Related Documentation

### Backend (x4-savegame-parser)
- [AGENTS.md](../../x4-savegame-parser/AGENTS.md) - Agent operating system
- [Project Manifest README](../../x4-savegame-parser/docs/agents/project-manifest/README.md)
- [CLI API Reference](../../x4-savegame-parser/docs/agents/project-manifest/cli-api-reference.md)
- [Data Flows](../../x4-savegame-parser/docs/agents/project-manifest/data-flows.md)
- [Constraints & Rules](../../x4-savegame-parser/docs/agents/project-manifest/constraints-and-rules.md)

### Frontend (x4-savegame-parser-launcher)
- [AGENTS.md](../AGENTS.md) - Agent operating system
- [Project Manifest README](../docs/agents/project-manifest/README.md)
- [Public API Reference](../docs/agents/project-manifest/public-api.md)
- [Constraints](../docs/agents/project-manifest/constraints.md)

---

## Notes

- **Session Context**: This plan is self-contained. Each package includes full context for implementation without requiring previous session knowledge.
- **Incremental Implementation**: Packages can be implemented in order, with each building on the previous. However, packages 7-9 (documentation) can be done anytime after their dependencies.
- **Testing Between Packages**: Verify each package separately before moving to the next.
- **Manifest Updates**: Remember to regenerate merged manifests after documentation changes.
