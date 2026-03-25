# Layer A Static Tests Report

**Date:** 2026-03-25  
**Status:** ✅ ALL PASSING

## Summary

All 208 tests in `tests/unit/layer-a-static` are passing successfully. No fixes were required.

## Test Results

```
Test Files: 12 passed (12)
Tests: 208 passed (208)
Duration: ~1.6s
```

## Test Files Verified

1. ✅ `extractors/metadata/archetype.test.js` (31 tests)
2. ✅ `analyses/tier3/issue-detectors/shared-state.test.js` (16 tests)
3. ✅ `analyses/tier3/issue-detectors/global-state-builder.test.js` (17 tests)
4. ✅ `analyses/tier3/issue-detectors/unhandled-events.test.js` (8 tests)
5. ✅ `pipeline/purpose.test.js` (34 tests)
6. ✅ `analyses/tier3/issue-detectors/orphaned-files.test.js` (13 tests)
7. ✅ `pipeline/file-summary-storage.test.js` (1 test)
8. ✅ `extractors/metadata/dna-extractor.test.js` (17 tests)
9. ✅ `preprocessor/preprocessor.test.js` (45 tests)
10. ✅ `extractors/metadata/tree-sitter-integration.test.js` (1 test)
11. ✅ `analyses/tier3/issue-detectors/issue-detectors-index.test.js` (8 tests)
12. ✅ `extractors/data-flow-parser-plugins.test.js` (17 tests)

## Notes

- The "Synchronous parse failed in extractDataFlow: Syntax error" messages in `data-flow-parser-plugins.test.js` are **expected behavior** - these tests verify proper error handling when parsing invalid JavaScript syntax.
- No tests were skipped or required modification.
- The test suite is compatible with the recent "Canonical DB Enforcement" architectural changes.

## Command Used

```bash
npx vitest run tests/unit/layer-a-static
```
