# Metadata Insights Guide

**Version**: v0.6.0
**Date**: 2026-02-08
**Purpose**: Core concepts, verification process, and cross-reference matrix for metadata-driven pattern detection.

**Foundation**: This guide implements **Pillar 2** of OmnySys (Metadata Insights Verification) and **Pillar 4** (Fractal Architecture).

**Core Principle**: More metadata = More patterns detected statically = Less LLM usage

**Related Documents**:
- `METADATA_INSIGHTS_CATALOG.md` - Full pattern catalog with examples

---

## Metadata Inventory (57 fields total)

### Required Fields (5)
- `filePath`, `exportCount`, `dependentCount`, `importCount`, `functionCount`

### Optional Fields (52)

**Static Graph** (7): exports, dependents, hasDynamicImports, semanticDependentCount, semanticConnections, colocatedFiles, reExportCount

**Storage & State** (8): hasLocalStorage, localStorageKeys, hasStorageAccess, definesGlobalState, usesGlobalState, globalStateWrites, globalStateReads, hasGlobalAccess

**Events** (3): hasEventEmitters, hasEventListeners, eventNames

**Environment** (4): envVars, hasTestCompanion, routeStrings, hasRoutes

**Side Effects** (5): hasSideEffects, hasNetworkCalls, hasDomManipulation, networkEndpoints, consoleUsage

**Call Graph** (2): callGraphDepth, externalCallCount

**Types** (4): hasTypeScript, hasCSSInJS, inferredTypeCount, hasDataFlow

**Temporal** (2): hasLifecycleHooks, hasCleanupPatterns

**Dependencies** (1): importDepth

**Performance** (4): hasNestedLoops, hasBlockingOps, estimatedComplexity, memoryRisks

**Historical** (2): gitChurnRate, gitHotspotScore

**Async/Contracts** (10): hasAsyncPatterns, hasJSDoc, hasSingletonPattern, assertions, validations, nullChecks, tryBlocks, throwStatements, customErrors

### Atomic Metadata (New in v0.6)

Each function (atom) has its own 57 fields:
- `complexity`, `linesOfCode`, `isExported`, `isAsync`
- `hasNetworkCalls`, `hasErrorHandling`, `hasSideEffects`
- `calls[]`, `calledBy[]`, `internalCalls[]`, `externalCalls[]`
- `archetype`: { type, severity, confidence }

---

## The Fractal Pattern: Metadata at Every Scale

OmnySys applies the same metadata logic at multiple scales:

```
SCALE 1: ATOMS (Functions)
+-- Layer A: Extracts calls, complexity, side effects
+-- Layer B: Detects atomic archetypes
+-- Layer C: Confidence-based decision
           | DERIVES

SCALE 2: MOLECULES (Files)
+-- Layer A: Composes atoms -> exports, imports
+-- Layer B: Detects molecular archetypes
+-- Layer C: Confidence-based decision
           | DERIVES

SCALE 3: SYSTEM
+-- Layer A: File graph
+-- Layer B: Detects architecture
+-- Layer C: High-level decisions
```

### Cross-Scale Pattern Discovery

Patterns can be discovered by combining metadata from different scales:

```javascript
// Example: Atom + molecule combination
{
  // Atom: specific function
  atom: {
    name: "fetchUser",
    archetype: { type: "fragile-network", severity: 8 },
    hasNetworkCalls: true,
    hasErrorHandling: false
  },

  // Molecule: containing file
  molecule: {
    exportCount: 3,
    dependentCount: 15,
    hasMultipleNetworkFunctions: true  // Derived from atoms
  }
}

// Pattern detected: "network-hub-with-fragile-gateway"
// - The file is a network-hub (multiple network functions)
// - Has at least one fragile-network function (no error handling)
// -> Risk: A network error can propagate to 15 dependents
```

---

## Cross-Cutting Pattern Detection

### Verification Process

**When adding new metadata extractors:**

1. **List new fields** - Document what metadata the extractor produces
2. **Check existing patterns** - Review PROMPT_REGISTRY.js archetypes
3. **Find combinations** - Identify N+M combinations (new + old metadata)
4. **Evaluate significance** - Does the pattern reveal invisible coupling?
5. **Calculate confidence** - Can we detect this with confidence >= 0.8?
6. **Implement detector** - Add to registry with confidence calculator

**Example**: Adding `temporal-patterns.js`
- New field: `hasLifecycleHooks`
- Existing field: `definesGlobalState`
- Combination: `hasLifecycleHooks + definesGlobalState` -> "state-lifecycle-manager" pattern
- Confidence: 1.0 (deterministic detection)
- Significance: High - components initializing state in lifecycle need careful ordering
- Action: Add archetype with `requiresLLM: false`

---

## Adding New Metadata: Checklist (Pillar 2 & 4 Implementation)

**CRITICAL**: This checklist implements Pillars 2 & 4. ALWAYS follow ALL steps when adding any new extractor.

When implementing a new extractor like `foo-extractor.js`:

### Step 1: Document New Fields
```markdown
## New Extractor: foo-extractor.js

### Fields Produced:
- `hasFoo`: boolean
- `fooItems[]`: array of detected items
- `fooComplexity`: number (0-10 scale)
```

### Step 2: Review Existing Patterns
```bash
# Check current archetypes
grep -r "detector:" src/layer-b-semantic/prompt-engine/PROMPT_REGISTRY.js

# List all metadata fields
cat src/layer-b-semantic/metadata-contract/constants.js | grep "'"
```

### Step 3: Identify Combinations (Pillar 2)

**Cross-reference matrix** (MANDATORY - check ALL 57 existing fields):
```
hasFoo + hasNetworkCalls -> "foo-network-coordinator"?
hasFoo + hasLifecycleHooks -> "foo-lifecycle-manager"?
hasFoo + definesGlobalState -> "foo-state-manager"?
hasFoo + gitHotspotScore > 3 -> "critical-foo-bottleneck"?
hasFoo + hasEventEmitters -> "foo-event-bridge"?
hasFoo + hasErrorHandling -> "foo-error-boundary"?
... (check all 57 fields - see inventory above)
```

**Key questions for each combination**:
1. Does this reveal **invisible coupling** between files? (Pillar 1 - Box Test)
2. Does this **predict bugs** or **performance issues**?
3. Does this indicate **architectural decisions** worth documenting?
4. Can we calculate **confidence >= 0.8** with this combination?

If YES to question #1 AND #4 -> Strong candidate for new archetype (apply Box Test)
If YES to questions #2 or #3 -> Document in pattern catalog (may not need archetype)

### Step 4: Evaluate Significance & Confidence

**Severity scale**:
- 10: Critical (data corruption, crashes, security)
- 8-9: High (architecture violations, major performance)
- 6-7: Medium-High (code quality, maintainability)
- 4-5: Medium (conventions, best practices)
- 2-3: Low (style, documentation)
- 0-1: Informational

**Confidence calculation**:
- Assign weights to each metadata field (sum = 1.0)
- Document evidence for each threshold
- Target confidence >= 0.8 for bypass

### Step 5: Implement Detector with Confidence

```javascript
// In PROMPT_REGISTRY.js
{
  type: 'new-pattern-name',
  severity: 7,
  requiresLLM: 'conditional', // Will use confidence

  // NEW: Confidence calculator
  calculateConfidence: (metadata) => {
    let confidence = 0;
    const evidence = [];

    // Evidence from foo
    if (metadata.hasFoo === true) {
      confidence += 0.3;
      evidence.push('has-foo');
    }

    // Evidence from bar
    if ((metadata.barCount || 0) > 3) {
      confidence += 0.3;
      evidence.push(`bar-count:${metadata.barCount}`);
    }

    // Evidence from baz
    if (metadata.bazComplexity === 'high') {
      confidence += 0.4;
      evidence.push('high-baz-complexity');
    }

    return { confidence, evidence };
  },

  // Detector uses confidence
  detector: (metadata) => {
    const { confidence } = calculateConfidence(metadata);
    return confidence >= 0.5; // Minimum to be considered
  },

  template: existingTemplate, // Reuse if possible
  mergeKey: 'newPatternAnalysis',
  fields: ['field1', 'field2', 'field3']
}
```

### Step 6: Test Confidence Thresholds

```javascript
// Test cases for confidence calculation
const testCases = [
  {
    metadata: { hasFoo: true, barCount: 5, bazComplexity: 'high' },
    expectedConfidence: 1.0,
    expectedDecision: { needsLLM: false }
  },
  {
    metadata: { hasFoo: true, barCount: 2, bazComplexity: 'low' },
    expectedConfidence: 0.3,
    expectedDecision: { needsLLM: true }
  }
];

// Verify bypass rate
console.log(`Bypass rate: ${calculateBypassRate(testCases)}%`);
// Target: >= 80% bypass with confidence >= 0.8
```

---

## Related Documentation

- `ARCHETYPE_SYSTEM.md` - How archetypes work + confidence system
- `ARCHETYPE_DEVELOPMENT_GUIDE.md` - How to create new archetypes
- `docs/CORE_PRINCIPLES.md` - The 4 Pillars of OmnySys
- `docs/ARCHITECTURE_MOLECULAR_PLAN.md` - Molecular architecture details
- `PROMPT_REGISTRY.js` - Archetype registry source code
- `docs/METADATA_INSIGHTS_CATALOG.md` - Full pattern catalog with examples

---

**Last Updated**: 2026-02-08
**Maintainer**: OmnySys Team
