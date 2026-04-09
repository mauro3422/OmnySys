# Query Queries Test Fixes - Summary

**Date:** March 25, 2026  
**Issue:** Test files failing due to mock syntax errors

## Problems Fixed

### 1. `vi.mocked(...).mockResolvedValue is not a function`

**Root Cause:** The `vi.mocked()` helper was being used incorrectly. The mock array wasn't properly initialized because `vi.mock()` factories are hoisted to the top of the file, but the mock function references were being set after the hoisting occurred.

**Solution:** 
- Moved `vi.mock()` calls to come **BEFORE** any imports from the mocked module
- Created the mock function directly inside the `vi.mock()` factory using `vi.fn()`
- Imported the mocked function after the `vi.mock()` call
- Used `.mockReturnValue()` directly on the imported mock in `beforeEach`

### 2. "SQLite not available" - `repo` variable not accessible in nested `vi.mock()` calls

**Root Cause:** The `repo` variable was being assigned in `beforeEach()`, but the `vi.mock()` factory was trying to reference it at module load time (before `beforeEach` runs). Additionally, nested `beforeEach` blocks in describe suites weren't properly setting up the mock.

**Solution:**
- Hoisted `vi.mock()` to the top of the file (before all imports)
- Created the mock with `vi.fn()` inside the factory
- Imported `getRepository` after the `vi.mock()` call
- Set up mock return values in `beforeEach()` using `getRepository.mockReturnValue(repo)`

## Files Modified

### 1. `tests/unit/layer-c-memory/query/queries/file-query-core-single-file.test.js`

**Changes:**
- Moved `vi.mock('#layer-c/storage/repository/index.js')` to top of file (before imports)
- Created mock with `vi.fn()` inside factory
- Added `import { getRepository }` after `vi.mock()` call
- Updated `beforeEach()` to call `getRepository.mockReturnValue(repo)`
- Updated error handling tests to use `getRepository.mockReturnValue(null)`

### 2. `tests/unit/layer-c-memory/query/queries/risk-query.test.js`

**Changes:** Same pattern as file-query-core-single-file.test.js

### 3. `tests/unit/layer-c-memory/query/queries/dependency-query.test.js`

**Changes:** Same pattern as file-query-core-single-file.test.js

### 4. `tests/unit/layer-c-memory/query/queries/file-query-enriched-with-atoms.test.js`

**Changes:**
- Added `vi.mock()` calls for all mocked modules at top of file
- Replaced all `vi.mocked(X).mockResolvedValue(Y)` with `X.mockResolvedValue(Y)`

### 5. `tests/unit/layer-c-memory/query/queries/file-query-atoms-atom-query.test.js`

**Changes:**
- Added `vi.mock()` calls for all mocked modules at top of file
- Replaced all `vi.mocked(X).mockResolvedValue(Y)` with `X.mockResolvedValue(Y)`
- Fixed `fs.readdir` and `fs.readFile` mocks to use direct mock methods

## Test Results After Fixes

**Before:** All 139 tests failing with mock-related errors
**After:** 55 tests passing, 84 tests failing (non-mock issues)

### Remaining Issues (Not Mock-Related)

The remaining test failures are due to:

1. **SQLite schema mismatches** - Test database schemas missing columns like:
   - `atoms.lines_of_code`
   - `atoms.is_phase2_complete`
   
2. **Test logic issues** - Some tests have assertions that don't match the current implementation behavior

These are separate issues from the original mock syntax problems and would require updating test schemas and/or test assertions.

## Key Takeaways

### Correct Pattern for Vitest Mocks

```javascript
// ✅ CORRECT: vi.mock() BEFORE imports
vi.mock('#layer-c/storage/repository/index.js', async (importOriginal) => {
  const actual = await importOriginal();
  return {
    ...actual,
    getRepository: vi.fn()
  };
});

import { getRepository } from '#layer-c/storage/repository/index.js';

describe('myTest', () => {
  beforeEach(() => {
    getRepository.mockReturnValue({ /* mock data */ });
  });
});
```

```javascript
// ❌ WRONG: Import before vi.mock()
import { getRepository } from '#layer-c/storage/repository/index.js';

vi.mock('#layer-c/storage/repository/index.js', async (importOriginal) => {
  // This won't work - import already happened
});
```

```javascript
// ❌ WRONG: Using vi.mocked() incorrectly
vi.mocked(getRepository).mockResolvedValue(data); // Don't do this

// ✅ CORRECT: Direct mock method call
getRepository.mockResolvedValue(data); // Do this instead
```

## Verification Command

```bash
npx vitest run tests/unit/layer-c-memory/query/queries
```
