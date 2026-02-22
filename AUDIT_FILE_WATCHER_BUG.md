# Bug Audit: File Watcher Metadata Sync Issue

**Status**: Active Bug - Workaround Available  
**Severity**: High (Data Integrity Risk)  
**Discovered**: 2026-02-22  
**Related To**: Technical Debt Refactoring Project

## Problem Description

The file watcher detects filesystem changes (create/delete), but the `totalFiles` counter in server metadata **does not decrement** when files are deleted. This creates stale data that can mislead decision-making.

## Evidence

### Test Case (2026-02-22)

1. **Initial State**: `totalFiles: 1981`
2. **Created file**: `tests/factories/test-watcher-check.js`
3. **After creation**: `totalFiles: 1982` ✅ (incremented correctly)
4. **Deleted file**: `tests/factories/test-watcher-check.js`
5. **After deletion**: `totalFiles: 1982` ❌ (should be 1981)
6. **Search result**: File not found ✅ (index updated correctly)

### Impact

The discrepancy between `totalFiles` (1982) and actual indexed files (1981) indicates the metadata counter is not synchronized with the actual index state after deletions.

## Risk Assessment

### High Risk Scenarios

1. **Refactoring Decisions**: If `detect_patterns` shows 15 files with debt, but the counter is wrong, we might miss files or think we're done when we're not.

2. **Missing Files**: After refactoring 6 test factories, we discovered 3 NEW files with debt that weren't visible before. This suggests the cache/index might be lagging behind reality.

3. **False Positives**: Files that were deleted might still appear in analysis results until a full reanalysis is triggered.

## Workarounds

### Immediate (For Users)

1. **Don't trust `totalFiles` counter** after file deletions
2. **Use `search_files`** to verify actual filesystem state:
   ```javascript
   search_files({ pattern: "**/filename.js" })
   ```
3. **After major refactorings** (deleting/moving files), always run:
   ```javascript
   restart_server({ clearCache: true, reanalyze: true })
   ```
4. **Cross-check** `detect_patterns` results with `glob` searches

### Code Pattern for Safe Refactoring

```javascript
// Before refactoring - verify current state
const debtBefore = await detect_patterns({ patternType: "architectural-debt" });
const actualFiles = await search_files({ pattern: "tests/factories/**/*.js" });

// After file operations
const debtAfter = await detect_patterns({ patternType: "architectural-debt" });

// Verify the file no longer appears
const stillExists = await search_files({ pattern: "**/old-file.js" });
if (stillExists.found > 0) {
  console.warn("⚠️ Cache inconsistency detected - file still in index after deletion");
}
```

## Root Cause Hypothesis

The file watcher likely:
1. ✅ Detects file deletion event
2. ✅ Removes file from search index
3. ❌ Fails to decrement `totalFiles` counter in metadata
4. ❌ Doesn't trigger metadata refresh

## Proposed Solutions

### Option 1: Immediate Metadata Sync
Ensure file deletion events trigger an immediate metadata update.

### Option 2: Periodic Reconciliation
Run a background job every X seconds to reconcile `totalFiles` with actual index size.

### Option 3: Remove Counters
Don't expose `totalFiles` in metadata - force users to query the actual index state.

## Related Files

- Server status endpoint: Returns stale `totalFiles`
- File watcher: Detects changes but doesn't update counters
- Pattern detection: May show stale results after deletions

## Test Cases Needed

1. Create file → verify counter increments
2. Delete file → verify counter decrements
3. Bulk delete (10+ files) → verify counter accuracy
4. Rapid create/delete cycle → verify eventual consistency

## Action Items

- [ ] Fix file deletion to decrement `totalFiles`
- [ ] Add metadata reconciliation background job
- [ ] Add warning when counter vs actual mismatch detected
- [ ] Update documentation to warn users about this behavior

---

**Note**: This bug was discovered during aggressive refactoring where we deleted 6 large files and replaced them with 30+ modular files. The system handled the additions correctly but failed to account for deletions in metadata.
