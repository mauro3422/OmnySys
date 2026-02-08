# Metadata Insights Guide

**Purpose**: This document catalogs how combining multiple metadata fields reveals architectural patterns that would otherwise require expensive LLM analysis.

**Foundation**: This guide implements **Pillar 2** of OmnySys (Metadata Insights Verification) and **Pillar 4** (Fractal Architecture).

**Core Principle**: More metadata = More patterns detected statically = Less LLM usage

---

## 📊 Metadata Inventory (57 fields total)

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

### Atomic Metadata (Nuevo en v0.6)

Cada función (átomo) tiene sus propios 57 campos:
- `complexity`, `linesOfCode`, `isExported`, `isAsync`
- `hasNetworkCalls`, `hasErrorHandling`, `hasSideEffects`
- `calls[]`, `calledBy[]`, `internalCalls[]`, `externalCalls[]`
- `archetype`: { type, severity, confidence }

---

## 🔄 The Fractal Pattern: Metadata at Every Scale

OmnySys aplica la misma lógica de metadata en múltiples escalas:

```
ESCALA 1: ÁTOMOS (Funciones)
├── Layer A: Extrae calls, complexity, side effects
├── Layer B: Detecta arquetipos atómicos
└── Layer C: Confidence-based decision
           ↓ DERIVA
           
ESCALA 2: MOLÉCULAS (Archivos)
├── Layer A: Compone átomos → exports, imports
├── Layer B: Detecta arquetipos moleculares
└── Layer C: Confidence-based decision
           ↓ DERIVA
           
ESCALA 3: SISTEMA
├── Layer A: Grafo de archivos
├── Layer B: Detecta arquitectura
└── Layer C: Decisiones de alto nivel
```

### Cross-Scale Pattern Discovery

Los patrones pueden descubrirse combinando metadata de diferentes escalas:

```javascript
// Ejemplo: Combinación átomo + molécula
{
  // Átomo: función específica
  atom: {
    name: "fetchUser",
    archetype: { type: "fragile-network", severity: 8 },
    hasNetworkCalls: true,
    hasErrorHandling: false
  },
  
  // Molécula: archivo contenedor
  molecule: {
    exportCount: 3,
    dependentCount: 15,
    hasMultipleNetworkFunctions: true  // Derivado de átomos
  }
}

// Pattern detectado: "network-hub-with-fragile-gateway"
// - El archivo es un network-hub (múltiples funciones de red)
// - Tiene al menos una función fragile-network (sin error handling)
// → Riesgo: Un error de red puede propagarse a 15 dependientes
```

---

## 🔍 Cross-Cutting Pattern Detection

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
- Combination: `hasLifecycleHooks + definesGlobalState` → "state-lifecycle-manager" pattern
- Confidence: 1.0 (deterministic detection)
- Significance: High - components initializing state in lifecycle need careful ordering
- Action: Add archetype with `requiresLLM: false`

---

## 🎯 Discovered Pattern Catalog

### Phase 1: Critical Patterns (Confidence-Based Bypass)

#### 1. Critical Bottleneck
```yaml
Type: critical-bottleneck
Severity: 10 (CRITICAL)
Detection: gitHotspotScore > 3 AND estimatedComplexity in ['O(n²)', 'O(n³)'] AND (dependentCount + semanticDependentCount) > 5 AND externalCallCount > 3
Metadata Used: gitHotspotScore, estimatedComplexity, dependentCount, semanticDependentCount, externalCallCount
Confidence Calculation:
  - gitHotspotScore > 3: +0.25
  - estimatedComplexity O(n²) or worse: +0.25
  - totalDependents > 5: +0.25
  - externalCallCount > 3: +0.25
  - Total: 1.0 (deterministic bypass)
Significance: Highest refactoring priority - frequently changed, complex, widely used
Example: File modified 20x/month with nested loops and 10+ dependents
LLM Needed: NO if confidence >= 0.8 (evidencia suficiente)
Template: criticalBottleneckTemplate (solo si confidence < 0.8)
Fields: optimizationStrategy, estimatedImpact, refactoringRisk
```

**Why it matters**: Combines git history (churn), performance (complexity), and architecture (coupling) to identify THE most critical file to refactor.

**Impact**: Prevents wasting time optimizing low-churn or low-coupling files.

---

#### 2. API Event Bridge
```yaml
Type: api-event-bridge
Severity: 8 (HIGH)
Detection: hasNetworkCalls AND hasEventEmitters AND networkEndpoints.length > 1
Metadata Used: hasNetworkCalls, hasEventEmitters, networkEndpoints
Confidence Calculation:
  - hasNetworkCalls: +0.3
  - hasEventEmitters: +0.3
  - networkEndpoints > 1: +0.3
  - Event cross-reference resolved: +0.3 (bonus)
  - Total: 0.9-1.0 (bypass if events resolved)
Significance: Multiple API endpoints with event coordination
Example: Service that calls 3 APIs and emits 'data-loaded' events
LLM Needed: CONDITIONAL (solo si confidence < 0.8)
Template: apiEventBridgeTemplate
Fields: apiFlowDiagram, eventSequence, riskOfRaceConditions
```

**Why it matters**: Reveals files coordinating multiple APIs through events - common pattern in modern React/Vue apps with separate API layer.

**Impact**: Identifies candidates for centralizing into API service classes.

---

#### 3. Storage Sync Manager
```yaml
Type: storage-sync-manager
Severity: 8 (HIGH)
Detection: hasLocalStorage AND hasEventListeners AND eventNames includes 'storage' AND semanticConnections.length > 2
Metadata Used: hasLocalStorage, hasEventListeners, eventNames, semanticConnections
Confidence Calculation:
  - hasLocalStorage: +0.25
  - hasEventListeners: +0.25
  - has 'storage' event: +0.25
  - semanticConnections > 2: +0.25
  - Total: 1.0 (deterministic if all present)
Significance: Multi-tab state synchronization
Example: File that writes localStorage AND listens to 'storage' events
LLM Needed: NO if confidence >= 0.8
Template: storageSyncTemplate (solo si lógica compleja)
Fields: syncPatterns, conflictResolution, consistencyGuarantees
```

**Why it matters**: Multi-tab state sync is notoriously bug-prone (race conditions, stale reads). This pattern surfaces these risky files.

**Impact**: Catches bugs before they reach production.

---

#### 4. Network Hub with Fragile Gateway
```yaml
Type: network-hub-fragile
Severity: 9 (CRITICAL)
Detection: networkHub atoms includes fragile-network
Metadata Used: 
  - Molecular: hasNetworkCalls, networkEndpoints
  - Atomic: atoms.archetype.type === 'fragile-network'
Cross-Scale: Combinación molécula + átomo
Confidence Calculation:
  - >=2 funciones con network calls: +0.3
  - >=1 función fragile-network: +0.4
  - Endpoints cross-referenciados: +0.3
  - Total: 1.0 (bypass si endpoints resueltos)
Significance: Coordinador de APIs con error handling deficiente
Example: api.js con fetchUser (sin try/catch) + fetchPosts (sin try/catch)
LLM Needed: NO si confidence >= 0.8
Recommendation: "Add error handling to N functions"
```

**Cross-Scale Insight**: Solo detectable combinando metadata atómica (fragile-network) con molecular (network-hub).

---

### Phase 2: High-Value Patterns

#### 5. State Lifecycle Manager
```yaml
Type: state-lifecycle-manager
Severity: 7
Detection: hasLifecycleHooks AND definesGlobalState AND hasCleanupPatterns
Metadata Used: hasLifecycleHooks, definesGlobalState, hasCleanupPatterns
Confidence: 1.0 (deterministic - all boolean flags)
Significance: Components managing global state in lifecycle
Example: React component with useEffect initializing Redux + cleanup
LLM Needed: NO (confidence = 1.0)
```

#### 6. WebSocket Event Hub
```yaml
Type: websocket-event-hub
Severity: 7
Detection: extractWebSocket().urls.length > 0 AND hasEventEmitters AND eventNames matches WS event patterns
Metadata Used: WebSocket extractor, hasEventEmitters, eventNames
Confidence: 0.9 (if WS events cross-referenced)
Significance: Real-time bidirectional communication
Example: WebSocket client that emits 'message-received' events
LLM Needed: CONDITIONAL
```

#### 7. Blocking Main Thread
```yaml
Type: blocking-main-thread
Severity: 7
Detection: hasBlockingOps AND estimatedComplexity != 'O(1)' AND importDepth > 2 AND dependentCount > 3
Metadata Used: hasBlockingOps, estimatedComplexity, importDepth, dependentCount
Confidence: 0.85 (if all conditions met)
Significance: Blocking I/O in widely-depended-on module
Example: Utility file with readFileSync imported by 10+ modules
LLM Needed: NO if confidence >= 0.8
```

---

### Phase 3: Medium-Value Patterns

#### 8. Memory Leak Risk
```yaml
Type: memory-leak-risk
Severity: 6
Detection: hasLifecycleHooks AND !hasCleanupPatterns AND hasEventListeners > 0 AND memoryRisks.length > 0
Metadata Used: hasLifecycleHooks, hasCleanupPatterns, hasEventListeners, memoryRisks
Confidence: 1.0 (deterministic)
Significance: Event listeners without cleanup
Example: addEventListener without corresponding removeEventListener in useEffect
LLM Needed: NO (confidence = 1.0)
```

#### 9. Initialization Sequencer
```yaml
Type: initialization-sequencer
Severity: 6
Detection: importDepth > 3 AND hasAsyncPatterns AND callGraphDepth > 2 AND gitChurnRate > 2
Metadata Used: importDepth, hasAsyncPatterns, callGraphDepth, gitChurnRate
Confidence: 0.85 (if all conditions met)
Significance: Complex bootstrapping with high churn
Example: Main.js loading 10+ modules async with frequent changes
LLM Needed: NO if confidence >= 0.8
```

#### 10. Dead Module
```yaml
Type: dead-module
Severity: 5
Detection: atoms.length > 0 AND atoms.every(a => a.archetype.type === 'dead-function')
Metadata Used: Atoms + atomic archetypes
Cross-Scale: Derivado de átomos
Confidence: 1.0 (deterministic)
Significance: Ninguna función exportada es usada externamente
Example: Archivo con 5 funciones, todas dead-function
LLM Needed: NO (confidence = 1.0)
Recommendation: "Safe to delete entire module"
```

---

## 🔄 Adding New Metadata: Checklist (Pillar 2 & 4 Implementation)

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
hasFoo + hasNetworkCalls → "foo-network-coordinator"?
hasFoo + hasLifecycleHooks → "foo-lifecycle-manager"?
hasFoo + definesGlobalState → "foo-state-manager"?
hasFoo + gitHotspotScore > 3 → "critical-foo-bottleneck"?
hasFoo + hasEventEmitters → "foo-event-bridge"?
hasFoo + hasErrorHandling → "foo-error-boundary"?
... (check all 57 fields - see inventory above)
```

**Key questions for each combination**:
1. Does this reveal **invisible coupling** between files? (Pillar 1 - Box Test)
2. Does this **predict bugs** or **performance issues**?
3. Does this indicate **architectural decisions** worth documenting?
4. Can we calculate **confidence >= 0.8** with this combination?

If YES to question #1 AND #4 → Strong candidate for new archetype (apply Box Test)
If YES to questions #2 or #3 → Document in pattern catalog (may not need archetype)

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

## 📈 Metadata Combination Examples

### Example 1: Network + Events + State + Atomic Composition

**Metadata**:
```json
{
  "molecular": {
    "hasNetworkCalls": true,
    "networkEndpoints": ["/api/users", "/api/posts"],
    "hasEventEmitters": true,
    "eventNames": ["data-loaded", "error"],
    "definesGlobalState": true
  },
  "atomic": {
    "atoms": [
      {
        "name": "loadUserData",
        "hasNetworkCalls": true,
        "archetype": { "type": "fragile-network" }
      },
      {
        "name": "loadPosts",
        "hasNetworkCalls": true,
        "archetype": { "type": "fragile-network" }
      }
    ]
  }
}
```

**Detected Pattern**: `api-state-coordinator-with-fragile-gateways`
- Makes 2+ API calls
- Emits events on completion
- Writes to global state
- **Multiple functions without error handling** ← Cross-scale insight

**Confidence**: 0.95 (bypass!)
**Architectural Insight**: This file is a **critical data fetching coordinator** with poor error handling. Changes to API contracts will break multiple consumers, and errors may crash the app.

---

### Example 2: Lifecycle + Cleanup + Memory + Atom Level

**Metadata**:
```json
{
  "molecular": {
    "hasLifecycleHooks": true,
    "hasCleanupPatterns": false
  },
  "atomic": {
    "atoms": [
      {
        "name": "useDataFetcher",
        "hasLifecycleHooks": true,
        "lifecycleHooks": [{"hook": "useEffect", "hasCleanup": false}],
        "hasEventListeners": true,
        "memoryRisks": [{"type": "closure-in-loop", "line": 45}]
      }
    ]
  }
}
```

**Detected Pattern**: `memory-leak-risk-at-atomic-level`
- Has useEffect without cleanup return
- Registers event listeners
- Has closure-in-loop memory risk

**Confidence**: 1.0 (bypass!)
**Architectural Insight**: **Memory leak candidate** en función específica - addEventListener sin removeEventListener en useEffect cleanup de `useDataFetcher`.

---

### Example 3: Churn + Complexity + Coupling + Atomic Hot-Path

**Metadata**:
```json
{
  "molecular": {
    "gitHotspotScore": 12.5,
    "gitChurnRate": 5.2,
    "estimatedComplexity": "O(n²)",
    "dependentCount": 8,
    "semanticDependentCount": 4
  },
  "atomic": {
    "atoms": [
      {
        "name": "processData",
        "complexity": 45,
        "calledBy": ["...20 callers..."],
        "archetype": { "type": "god-function", "severity": 9 }
      }
    ]
  }
}
```

**Detected Pattern**: `critical-bottleneck-with-god-function`
- Very high churn (5 commits/month)
- High hotspot score (12.5)
- O(n²) complexity
- 12 total dependents (8 static + 4 semantic)
- **Contains god-function with 20 callers** ← Cross-scale insight

**Confidence**: 0.95 (bypass!)
**Architectural Insight**: **Refactor immediately** - este archivo es modificado constantemente, es complejo, y tiene una función crítica (`processData`) llamada desde 20 lugares.

---

## 🎯 Impact Metrics

### Before Metadata Insights (v0.5.0)
- **Patterns detected**: 11 (all single-dimension)
- **LLM bypass rate**: 70% (30% need LLM)
- **False positives**: Moderate (generic patterns)
- **Average confidence**: N/A (no confidence scoring)

### After Metadata Insights (v0.5.4)
- **Patterns detected**: 14 (11 old + 3 new multi-dimension)
- **LLM bypass rate**: 85% (15% need LLM)
- **False positives**: Low (specific multi-dimension patterns)
- **Average confidence**: 0.75

### After Fractal Architecture (v0.6.0)
- **Patterns detected**: 28 total (15 molecular + 7 atomic + 6 cross-scale)
- **LLM bypass rate**: 90% (10% need LLM)
- **False positives**: Very low (confidence-based filtering)
- **Average confidence**: 0.87
- **Cross-scale patterns**: 6 (combinaciones átomo+molécula)

---

## 🔧 Maintenance

### When to update this guide:
1. **New extractor added** → Run through checklist
2. **New archetype added** → Document metadata dependencies + confidence calc
3. **Bypass criteria added** → Document confidence thresholds
4. **Pattern false positives** → Adjust detector thresholds

### Quarterly review:
- Analyze which patterns fire most frequently
- Measure confidence distribution (target: 80% >= 0.8)
- Adjust severity scores based on actual impact
- Retire patterns that never fire or have high false positive rate

---

## 📚 Related Documentation

- `ARCHETYPE_SYSTEM.md` - How archetypes work + confidence system
- `ARCHETYPE_DEVELOPMENT_GUIDE.md` - How to create new archetypes
- `docs/CORE_PRINCIPLES.md` - The 4 Pillars of OmnySys
- `docs/ARCHITECTURE_MOLECULAR_PLAN.md` - Molecular architecture details
- `PROMPT_REGISTRY.js` - Archetype registry source code

---

**Last Updated**: 2026-02-08  
**Version**: v0.6.0  
**Maintainer**: OmnySys Team
