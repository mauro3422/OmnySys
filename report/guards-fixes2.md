# Guards Test Files - Import Path & Mock Fixes

**Date:** March 25, 2026  
**Author:** Assistant

## Summary

Fixed import path and mock configuration issues in 5 test files located in `tests/unit/core/file-watcher/guards/`. The primary issues were:

1. **Incorrect import paths** - Tests used relative paths (`../../../src/...`) instead of the vitest alias paths (`/src/...`)
2. **Mock application** - `vi.mock()` calls now use the correct `/src/...` alias syntax matching the vitest configuration

## Files Modified

### 1. `registry.test.js`
- **Changes:** Updated all `vi.mock()` and `import()` paths from `/src/...` to use the vitest alias
- **Status:** ✅ All 34 tests passing

### 2. `unified-duplicate-guard.test.js`
- **Changes:** 
  - Fixed `vi.mock()` paths for logger, watcher-issue-persistence, shared/compiler, guard-standards, duplicate-structural-core, duplicate-conceptual-core, persistence, and helpers
  - Fixed dynamic `import()` paths in test cases
- **Status:** ⚠️ 11/15 tests passing (4 failures related to mock behavior, not imports)

### 3. `circular-guard.test.js`
- **Changes:**
  - Fixed `vi.mock()` paths for logger, watcher-issue-persistence, circular-issue-service, shared/compiler, path-utils, cycle-detector
  - Fixed dynamic `import()` paths in test cases
- **Status:** ⚠️ 6/15 tests passing (9 failures related to test expectations and database schema)

### 4. `dead-code-guard.test.js`
- **Changes:**
  - Fixed `vi.mock()` paths for logger, watcher-issue-persistence, shared/compiler
  - Fixed main import path
- **Status:** ⚠️ 6/15 tests passing (9 failures - mocks not preventing actual function execution)

### 5. `complexity-guard.test.js`
- **Changes:**
  - Fixed `vi.mock()` paths for logger, watcher-issue-persistence, shared/compiler
  - Fixed dynamic `import()` paths for main module and submodules
- **Status:** ⚠️ 15/19 tests passing (4 failures related to mock application)

## Test Results Summary

```
Test Files: 4 failed | 1 passed (5)
Tests: 26 failed | 72 passed (98)
```

## Root Cause Analysis

### Import Path Issue (FIXED)
The vitest configuration (`vitest.config.js`) defines aliases:
```javascript
alias: {
  '/src': resolve(__dirname, './src'),
  '/tests': resolve(__dirname, './tests')
}
```

Tests were using relative paths like `../../../src/...` which resolved incorrectly at runtime to paths like `/tests/src/...`. All imports now use the `/src/...` alias syntax.

### Mock Application Issue (PARTIALLY FIXED)
While the import paths are now correct, some mocks are not being applied effectively at runtime. This is due to:

1. **vi.mock() hoisting**: The `vi.mock()` calls must be hoisted to the top of the file, but when the factory function references `vi.fn()`, the `vi` object may not be fully initialized.

2. **Dynamic import timing**: Some tests use `await import()` inside test cases to access mocked modules, but the mocks may not be applied correctly in all cases.

3. **Mock function behavior**: Some mocked functions (like `isSuspiciousDeadCodeAtom`) are returning values that don't match test expectations.

## Remaining Issues

### Dead Code Guard (9 failures)
The `isSuspiciousDeadCodeAtom` mock from `/src/shared/compiler/index.js` is not being applied correctly. The actual function is being called instead of the mock, causing tests to fail because the real implementation has different logic than expected.

**Recommendation:** Ensure the mock is properly hoisted by placing all `vi.mock()` calls at the very top of the file, before any other imports.

### Complexity Guard (4 failures)
Similar issue with `classifyFileOperationalRole` mock not being applied. Tests expect certain behavior from the mocked function that differs from the actual implementation.

### Circular Guard (9 failures)
Multiple issues:
- Database schema mismatch (test tries to insert into columns that don't exist)
- Mock `detectCircularImportsForFile` returning `null` instead of expected array
- Test expectations don't match actual implementation behavior

### Unified Duplicate Guard (4 failures)
- Test expectations for empty results don't match actual return structure
- `maxFindings` option not being respected (mock implementation issue)
- Priority coordination logic differs from test expectations

## Next Steps

To fully fix the remaining test failures:

1. **Verify mock hoisting**: Ensure all `vi.mock()` calls are at the top of each test file
2. **Update test expectations**: Some tests have expectations that don't match the current implementation
3. **Fix database schema**: Update circular-guard tests to match actual database schema
4. **Review mock implementations**: Ensure mocked functions return values consistent with test expectations

## Commands

```bash
# Run tests
npx vitest run tests/unit/core/file-watcher/guards

# Run specific test file
npx vitest run tests/unit/core/file-watcher/guards/registry.test.js

# Run with verbose output
npx vitest run tests/unit/core/file-watcher/guards --reporter=verbose
```

## Conclusion

The **import path issues have been fully resolved**. All test files now correctly use the `/src/...` alias syntax defined in `vitest.config.js`. The remaining test failures are due to mock application issues and test expectation mismatches, not import path problems.
