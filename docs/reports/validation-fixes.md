# Validation Tests Status Report

**Date:** 2026-03-25  
**Test Run:** `npx vitest run tests/unit/validation`

## Summary

✅ **All validation tests are PASSING**

- **Total Tests:** 289
- **Passed:** 283
- **Skipped:** 6
- **Failed:** 0

## Canonical DB Enforcement Impact

The recent "Canonical DB Enforcement" change (v0.9.145) **did not break** any validation tests. The validation system was already using direct filesystem reads via `FileLoader.readSourceFile()` instead of relying on the deprecated runtime fallback reads from `calls_json`/`called_by_json` fields.

### Validation Architecture (Post-Canonical DB Enforcement)

```
ValidationContext
  └── FileLoader
      ├── loadFiles() → Reads from .omnysysdata/files/*.json
      ├── loadIndex() → Reads from .omnysysdata/index.json
      └── readSourceFile() → Direct FS read from project path
```

No storage/repository mocking is used - the validation system reads directly from:
1. OmnySys metadata files (`.omnysysdata/files/`)
2. Source files (project filesystem)

## Skipped Tests Analysis

The 6 skipped tests are **intentionally disabled** and fall into two categories:

### TODO Tests (3 tests) - Features Not Yet Implemented

**File:** `tests/unit/validation/rules/source-rules.test.js`

1. **Line 128:** `ExportConsistencyRule should detect exports missing from code`
   - Tests detection of registered exports that don't exist in source code
   - Status: Feature not implemented

2. **Line 144:** `ExportConsistencyRule should return warning not error for unregistered exports`
   - Tests severity level for exports in code but not registered
   - Status: Feature not implemented

3. **Line 287:** `ImportResolutionRule should detect missing relative imports`
   - Tests detection of broken relative imports
   - Status: Feature not implemented

### BUG Tests (3 tests) - Known Issues

**File:** `tests/unit/validation/integration.test.js`

4. **Line 114:** `BUG: detects export inconsistencies`
   - Integration test for export consistency validation
   - Status: Known bug in validation logic

5. **Line 141:** `BUG: detects duplicate IDs`
   - Tests UniqueIdsInvariant for duplicate detection
   - Status: Known bug in invariant logic

**File:** `tests/unit/validation/invariants/system-invariants.test.js`

6. **Line 175:** `BUG: returns critical for missing back-reference`
   - Tests BidirectionalGraphInvariant for graph consistency
   - Status: Known bug in invariant logic

## Recommendations

### No Action Required for Canonical DB Enforcement

The validation tests do not require any fixes related to the Canonical DB Enforcement change. The system is already compliant with the new architecture.

### Future Work (Optional)

The skipped tests represent legitimate gaps in validation coverage. Consider:

1. **Implement TODO features** when validation rules need enhancement
2. **Fix BUG tests** when addressing validation logic issues
3. **Keep tests skipped** until the underlying features/bugs are addressed

## Test Files Inventory

```
tests/unit/validation/
├── index.test.js                          ✅ 26 tests
├── integration.test.js                    ✅ 7 tests (2 skipped)
├── core/
│   ├── rule-registry.test.js              ✅ 52 tests
│   └── validation-result.test.js          ✅ 39 tests
├── engine/
│   ├── reports.test.js                    ✅ 15 tests
│   ├── runners.test.js                    ✅ 18 tests
│   ├── strategies.test.js                 ✅ 20 tests
│   └── validation-engine.test.js          ✅ 34 tests
├── invariants/
│   └── system-invariants.test.js          ✅ 21 tests (1 skipped)
└── rules/
    ├── derivation-rules.test.js           ✅ 23 tests
    ├── semantic-rules.test.js             ✅ 10 tests
    ├── source-rules.test.js               ✅ 24 tests (3 skipped)
```

## Conclusion

**No fixes or skips were necessary** for the Canonical DB Enforcement migration. All validation tests continue to pass, and the skipped tests are unrelated to this architectural change.
