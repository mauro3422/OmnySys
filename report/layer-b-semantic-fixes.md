# Layer-B-Semantic Test Fixes Report

**Date:** March 25, 2026  
**Status:** ✅ All tests passing (643/643)  
**Test Suite:** `tests/unit/layer-b-semantic`

---

## Summary

Fixed 5 failing tests across 2 test files. The failures were caused by API method name mismatches and error message expectation discrepancies — **not** related to the "Canonical DB Enforcement" changes or removed runtime fallback reads.

---

## Issues Fixed

### 1. `prompt-engine.test.js` (3 failures)

**Problem:** Tests called `engine.getStats()` but the actual method name is `engine.getPromptEngineStats()`.

**Files Modified:**
- `tests/unit/layer-b-semantic/prompt-engine/core/prompt-engine.test.js`

**Changes:**
- Line 73: `engine.getStats()` → `engine.getPromptEngineStats()`
- Line 161: `engine.getStats()` → `engine.getPromptEngineStats()` (2 occurrences)
- Line 174: `engine.getStats()` → `engine.getPromptEngineStats()`

**Tests Fixed:**
- ✅ `should clear cache`
- ✅ `should cache schema after first use`
- ✅ `should preload specified schemas`

---

### 2. `coherence-checks.test.js` (2 failures)

**Problem:** Test expectations used simplified error messages that didn't match the actual implementation's more detailed messages.

**Files Modified:**
- `tests/unit/layer-b-semantic/validators/lineage-validator/checks/coherence-checks.test.js`

**Changes:**
- Line 77: Updated expected error message from `'FlowType says "read" but no read operation found'`  
  → `'FlowType says "read" but no read-like operation found'`

- Line 115: Updated expected error message from `'FlowType says "persist" but no side effect output found'`  
  → `'FlowType says "persist" but no side effect output or mutation found'`

**Tests Fixed:**
- ✅ `should detect missing read operation for read flowType`
- ✅ `should detect missing side effect for persist flowType`

---

## Test Results

### Before Fixes
```
Test Files:  2 failed | 36 passed (38)
Tests:       5 failed | 638 passed (643)
```

### After Fixes
```
Test Files:  38 passed (38)
Tests:       643 passed (643)
Duration:    ~20s
```

---

## Root Cause Analysis

The failures were **not** related to the "Canonical DB Enforcement" architectural changes. The issues were:

1. **Method name inconsistency**: The test file used a shorthand method name (`getStats`) that doesn't exist in the implementation (`getPromptEngineStats`).

2. **Error message drift**: The implementation's error messages were updated to be more descriptive, but the test expectations weren't updated accordingly.

---

## Recommendations

1. **Add integration test**: Consider adding a test that verifies the public API surface to catch method name mismatches early.

2. **Error message constants**: Centralize error messages in constants to prevent drift between implementation and tests.

3. **No files needed to be skipped**: All tests are now functional and relevant to the current architecture.

---

## Files Modified

```
tests/unit/layer-b-semantic/prompt-engine/core/prompt-engine.test.js
tests/unit/layer-b-semantic/validators/lineage-validator/checks/coherence-checks.test.js
```

---

## Verification Command

```bash
npx vitest run tests/unit/layer-b-semantic
```
