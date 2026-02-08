# Metadata Insights: Pattern Catalog

**Version**: v0.6.0
**Date**: 2026-02-08
**Purpose**: Full catalog of discovered patterns with detection rules, examples, and confidence calculations.

**Related Documents**:
- `METADATA_INSIGHTS_GUIDE.md` - Core concepts, verification process, and cross-reference matrix

---

## Discovered Pattern Catalog

### Phase 1: Critical Patterns (Confidence-Based Bypass)

#### 1. Critical Bottleneck
```yaml
Type: critical-bottleneck
Severity: 10 (CRITICAL)
Detection: gitHotspotScore > 3 AND estimatedComplexity in ['O(n^2)', 'O(n^3)'] AND (dependentCount + semanticDependentCount) > 5 AND externalCallCount > 3
Metadata Used: gitHotspotScore, estimatedComplexity, dependentCount, semanticDependentCount, externalCallCount
Confidence Calculation:
  - gitHotspotScore > 3: +0.25
  - estimatedComplexity O(n^2) or worse: +0.25
  - totalDependents > 5: +0.25
  - externalCallCount > 3: +0.25
  - Total: 1.0 (deterministic bypass)
Significance: Highest refactoring priority - frequently changed, complex, widely used
Example: File modified 20x/month with nested loops and 10+ dependents
LLM Needed: NO if confidence >= 0.8 (sufficient evidence)
Template: criticalBottleneckTemplate (only if confidence < 0.8)
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
LLM Needed: CONDITIONAL (only if confidence < 0.8)
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
Template: storageSyncTemplate (only if complex logic)
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
Cross-Scale: Molecule + atom combination
Confidence Calculation:
  - >=2 functions with network calls: +0.3
  - >=1 fragile-network function: +0.4
  - Endpoints cross-referenced: +0.3
  - Total: 1.0 (bypass if endpoints resolved)
Significance: API coordinator with deficient error handling
Example: api.js with fetchUser (no try/catch) + fetchPosts (no try/catch)
LLM Needed: NO if confidence >= 0.8
Recommendation: "Add error handling to N functions"
```

**Cross-Scale Insight**: Only detectable by combining atomic metadata (fragile-network) with molecular (network-hub).

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
Cross-Scale: Derived from atoms
Confidence: 1.0 (deterministic)
Significance: No exported function is used externally
Example: File with 5 functions, all dead-function
LLM Needed: NO (confidence = 1.0)
Recommendation: "Safe to delete entire module"
```

---

## Metadata Combination Examples

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
- **Multiple functions without error handling** -- Cross-scale insight

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
**Architectural Insight**: **Memory leak candidate** in specific function - addEventListener without removeEventListener in useEffect cleanup of `useDataFetcher`.

---

### Example 3: Churn + Complexity + Coupling + Atomic Hot-Path

**Metadata**:
```json
{
  "molecular": {
    "gitHotspotScore": 12.5,
    "gitChurnRate": 5.2,
    "estimatedComplexity": "O(n^2)",
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
- O(n^2) complexity
- 12 total dependents (8 static + 4 semantic)
- **Contains god-function with 20 callers** -- Cross-scale insight

**Confidence**: 0.95 (bypass!)
**Architectural Insight**: **Refactor immediately** - this file is constantly modified, is complex, and has a critical function (`processData`) called from 20 places.

---

## Impact Metrics

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
- **Cross-scale patterns**: 6 (atom+molecule combinations)

---

## Maintenance

### When to update this catalog:
1. **New extractor added** -> Run through checklist in `METADATA_INSIGHTS_GUIDE.md`
2. **New archetype added** -> Document metadata dependencies + confidence calc
3. **Bypass criteria added** -> Document confidence thresholds
4. **Pattern false positives** -> Adjust detector thresholds

### Quarterly review:
- Analyze which patterns fire most frequently
- Measure confidence distribution (target: 80% >= 0.8)
- Adjust severity scores based on actual impact
- Retire patterns that never fire or have high false positive rate

---

## Related Documentation

- `METADATA_INSIGHTS_GUIDE.md` - Core concepts, verification process, checklist
- `ARCHETYPE_SYSTEM.md` - How archetypes work + confidence system
- `ARCHETYPE_DEVELOPMENT_GUIDE.md` - How to create new archetypes
- `docs/CORE_PRINCIPLES.md` - The 4 Pillars of OmnySys
- `docs/ARCHITECTURE_MOLECULAR_PLAN.md` - Molecular architecture details
- `PROMPT_REGISTRY.js` - Archetype registry source code

---

**Last Updated**: 2026-02-08
**Maintainer**: OmnySys Team
