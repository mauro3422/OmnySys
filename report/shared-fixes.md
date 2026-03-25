# Shared Unit Tests Fix Report

**Date:** March 25, 2026  
**Issue:** Tests failing after "Canonical DB Enforcement" changes removed runtime fallback reads

---

## Summary

Fixed 2 failing test files in `tests/unit/shared/compiler/` that were broken due to missing database columns and SQL syntax errors in the metadata extraction coverage repair logic.

### Test Results After Fix
- ✅ **17 test files** passed
- ✅ **241 tests** passed
- ⏭️ **1 test** skipped
- ❌ **0 tests** failed

---

## Issues Fixed

### 1. `metadata-extraction-coverage.test.js`

**Problem:** Test schema was missing columns that were added in recent database schema updates.

**Changes Made:**
- Added missing columns to in-memory test database schema:
  - `atoms.test_callback_type` - for test callback type detection
  - `atoms.is_test_callback` - flag for test callbacks
  - `atoms.calls_json` - stores calls made by atoms
  - `atoms._meta_json` - metadata for extraction
  - `files.hash` - content hash for incremental analysis
  - `files.updated_at` - timestamp tracking
  - `system_files.updated_at` - timestamp tracking
  - `system_files.calls_json` - system file calls
  - `system_files.identifier_refs_json` - identifier references
  - `system_files.used_by_json` - usage tracking
  - `system_files.depends_on_json` - dependency tracking
  - `system_files.transitive_depends_json` - transitive dependencies
  - `system_files.transitive_dependents_json` - reverse transitive dependencies
  - `file_hashes` table - for content hash persistence

**File:** `tests/unit/shared/compiler/metadata-extraction-coverage.test.js`

---

### 2. `metadata-extraction-coverage-repair-system-files.js`

**Problem:** SQL syntax error when updating multiple columns. The `buildConditionalUpdateStatement` helper was being misused for multi-column updates, generating invalid SQL like:
```sql
UPDATE system_files SET culture, culture_role, definitions_json = ?, updated_at = ? WHERE path = ?
```

**Changes Made:**
- Refactored `backfillSystemFileDefinitionsAndCulture()` to use inline SQL for multi-column updates
- Changed from using the helper function to directly building the UPDATE statement with proper parameter binding
- Maintains backward compatibility with/without `updated_at` column

**Before:**
```javascript
const updateStmt = buildConditionalUpdateStatement(
  db, 
  'system_files', 
  'culture, culture_role, definitions_json',  // ❌ Invalid column list
  "(culture IS NULL OR culture = '') OR ...", 
  hasUpdatedAt
);
const result = runConditionalUpdate(updateStmt, hasUpdatedAt, 
  [patch.culture, patch.cultureRole, patch.definitionsJson], 
  nowIso, 
  patch.filePath
);
```

**After:**
```javascript
const updateSql = hasUpdatedAt
  ? `UPDATE system_files SET culture = ?, culture_role = ?, definitions_json = ?, updated_at = ? WHERE path = ?`
  : `UPDATE system_files SET culture = ?, culture_role = ?, definitions_json = ? WHERE path = ?`;
const updateStmt = db.prepare(updateSql);
const result = hasUpdatedAt
  ? updateStmt.run(patch.culture, patch.cultureRole, patch.definitionsJson, nowIso, patch.filePath)
  : updateStmt.run(patch.culture, patch.cultureRole, patch.definitionsJson, patch.filePath);
```

**File:** `src/shared/compiler/metadata-extraction-coverage-repair-system-files.js`

---

## Root Cause

The "Canonical DB Enforcement" changes introduced new database columns and stricter schema validation. The unit tests were using outdated in-memory schemas that didn't include these new columns, causing:

1. **Missing column errors** when the code tried to query columns that didn't exist in the test schema
2. **SQL syntax errors** from improper multi-column UPDATE statement generation

---

## Verification

All tests in `tests/unit/shared` now pass:

```bash
npx vitest run tests/unit/shared
# ✅ Test Files: 17 passed (17)
# ✅ Tests: 241 passed | 1 skipped (242)
```

---

## Related Files

- `tests/unit/shared/compiler/metadata-extraction-coverage.test.js` - Updated test schema
- `tests/unit/shared/compiler/metadata-extraction-coverage-repair.test.js` - Now passing (no changes needed)
- `src/shared/compiler/metadata-extraction-coverage-repair-system-files.js` - Fixed SQL generation
- `src/shared/compiler/metadata-extraction-coverage-repair.js` - Main repair logic
- `src/layer-c-memory/storage/database/schema-registry.js` - Source of truth for DB schema

---

## Notes

- The `buildConditionalUpdateStatement` helper in `metadata-extraction-coverage-repair-updates.js` is still valid for single-column updates
- Multi-column updates should use inline SQL as shown in the fix
- Test schemas should be kept in sync with `schema-registry.js` to prevent future breakage
