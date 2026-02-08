# Metadata Insights Guide

**Purpose**: This document catalogs how combining multiple Layer A metadata fields reveals architectural patterns that would otherwise require expensive LLM analysis.

**Foundation**: This guide implements **Pillar 2** of OmnySys (Metadata Insights Verification). See `docs/CORE_PRINCIPLES.md` for the complete foundation.

**Core Principle**: More metadata = More patterns detected statically = Less LLM usage

**Pillar 2 States**: *"Every new metadata extractor must be verified against existing metadata to discover emergent patterns"*

---

## 📊 Metadata Inventory (57 fields total)

### Required Fields (5)
- `filePath`, `exportCount`, `dependentCount`, `importCount`, `functionCount`

### Optional Fields (52)
Organized by category:

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

---

## 🔍 Cross-Cutting Pattern Detection

### Verification Process

**When adding new metadata extractors:**

1. **List new fields** - Document what metadata the extractor produces
2. **Check existing patterns** - Review PROMPT_REGISTRY.js archetypes
3. **Find combinations** - Identify N+M combinations (new + old metadata)
4. **Evaluate significance** - Does the pattern reveal invisible coupling?
5. **Implement detector** - Add to registry if high-value

**Example**: Adding `temporal-patterns.js`
- New field: `hasLifecycleHooks`
- Existing field: `definesGlobalState`
- Combination: `hasLifecycleHooks + definesGlobalState` → "state-lifecycle-manager" pattern
- Significance: High - components initializing state in lifecycle need careful ordering
- Action: Add archetype

---

## 🎯 Discovered Pattern Catalog

### Phase 1: Critical Patterns (Implement First)

#### 1. Critical Bottleneck
```yaml
Type: critical-bottleneck
Severity: 10 (CRITICAL)
Detection: gitHotspotScore > 3 AND estimatedComplexity in ['O(n²)', 'O(n³)'] AND (dependentCount + semanticDependentCount) > 5 AND externalCallCount > 3
Metadata Used: gitHotspotScore, estimatedComplexity, dependentCount, semanticDependentCount, externalCallCount
Significance: Highest refactoring priority - frequently changed, complex, widely used
Example: File modified 20x/month with nested loops and 10+ dependents
LLM Needed: YES - suggest specific optimizations
Template: criticalBottleneckTemplate
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
Significance: Multiple API endpoints with event coordination
Example: Service that calls 3 APIs and emits 'data-loaded' events
LLM Needed: YES - analyze event flow timing
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
Significance: Multi-tab state synchronization
Example: File that writes localStorage AND listens to 'storage' events
LLM Needed: CONDITIONAL - only if sync logic is complex
Template: storageSyncTemplate
Fields: syncPatterns, conflictResolution, consistencyGuarantees
```

**Why it matters**: Multi-tab state sync is notoriously bug-prone (race conditions, stale reads). This pattern surfaces these risky files.

**Impact**: Catches bugs before they reach production.

---

### Phase 2: High-Value Patterns

#### 4. State Lifecycle Manager
```yaml
Type: state-lifecycle-manager
Severity: 7
Detection: hasLifecycleHooks AND definesGlobalState AND hasCleanupPatterns
Metadata Used: hasLifecycleHooks, definesGlobalState, hasCleanupPatterns
Significance: Components managing global state in lifecycle
Example: React component with useEffect initializing Redux + cleanup
LLM Needed: YES - suggest custom hook extraction
```

#### 5. WebSocket Event Hub
```yaml
Type: websocket-event-hub
Severity: 7
Detection: extractWebSocket().urls.length > 0 AND hasEventEmitters AND eventNames matches WS event patterns
Metadata Used: WebSocket extractor, hasEventEmitters, eventNames
Significance: Real-time bidirectional communication
Example: WebSocket client that emits 'message-received' events
LLM Needed: YES - analyze message flow
```

#### 6. Blocking Main Thread
```yaml
Type: blocking-main-thread
Severity: 7
Detection: hasBlockingOps AND estimatedComplexity != 'O(1)' AND importDepth > 2 AND dependentCount > 3
Metadata Used: hasBlockingOps, estimatedComplexity, importDepth, dependentCount
Significance: Blocking I/O in widely-depended-on module
Example: Utility file with readFileSync imported by 10+ modules
LLM Needed: YES - suggest async refactoring
```

---

### Phase 3: Medium-Value Patterns

#### 7. Memory Leak Risk
```yaml
Type: memory-leak-risk
Severity: 6
Detection: hasLifecycleHooks AND !hasCleanupPatterns AND hasEventListeners > 0 AND memoryRisks.length > 0
Metadata Used: hasLifecycleHooks, hasCleanupPatterns, hasEventListeners, memoryRisks
Significance: Event listeners without cleanup
Example: addEventListener without corresponding removeEventListener
LLM Needed: CONDITIONAL
```

#### 8. Initialization Sequencer
```yaml
Type: initialization-sequencer
Severity: 6
Detection: importDepth > 3 AND hasAsyncPatterns AND callGraphDepth > 2 AND gitChurnRate > 2
Metadata Used: importDepth, hasAsyncPatterns, callGraphDepth, gitChurnRate
Significance: Complex bootstrapping with high churn
Example: Main.js loading 10+ modules async with frequent changes
LLM Needed: YES - map initialization order
```

#### 9. Shared Worker State Manager
```yaml
Type: shared-worker-state-manager
Severity: 6
Detection: extractSharedWorkerUsage().workers.length > 0 AND definesGlobalState AND semanticConnections.length > 2
Metadata Used: SharedWorker extractor, definesGlobalState, semanticConnections
Significance: Multi-tab state coordination via SharedWorker
LLM Needed: YES - verify tab synchronization
```

---

### Phase 4: Specialized Patterns

#### 10-17. (Additional Patterns)
- Event Lifecycle Bridge
- Cross Worker Coordinator
- Broadcast Channel Hub
- Global State Router
- Lazy Initializer
- Error Boundary Coordinator
- Defensive Guard Validator
- Multi-Framework Bridge

(See METADATA-INSIGHTS-GUIDE.md for full details)

---

## 🔄 Adding New Metadata: Checklist (Pillar 2 Implementation)

**CRITICAL**: This checklist implements Pillar 2 - Metadata Insights Verification. ALWAYS follow ALL steps when adding any new extractor.

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

### Step 3: Identify Combinations

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

If YES to question #1 → Strong candidate for new archetype (apply Box Test)
If YES to questions #2 or #3 → Document in pattern catalog (may not need archetype)

### Step 4: Evaluate Significance

**Severity scale**:
- 10: Critical (data corruption, crashes, security)
- 8-9: High (architecture violations, major performance)
- 6-7: Medium-High (code quality, maintainability)
- 4-5: Medium (conventions, best practices)
- 2-3: Low (style, documentation)
- 0-1: Informational

**LLM requirement**:
- `true`: Pattern needs LLM to explain invisible connections
- `false`: Pattern is 100% deterministic from metadata
- `'conditional'`: LLM only if static analysis can't resolve

### Step 5: Implement Detector

```javascript
// In PROMPT_REGISTRY.js
{
  type: 'new-pattern-name',
  severity: 7,
  requiresLLM: 'conditional',
  detector: (metadata) => {
    // Combine 3+ metadata dimensions
    const condition1 = metadata.hasFoo === true;
    const condition2 = (metadata.barCount || 0) > 3;
    const condition3 = metadata.bazComplexity === 'high';

    return condition1 && condition2 && condition3;
  },
  template: existingTemplate, // Reuse if possible
  mergeKey: 'newPatternAnalysis',
  fields: ['field1', 'field2', 'field3']
}
```

### Step 6: Add Bypass Criteria (Optional)

If pattern is conditional, add bypass logic to `analysis-decider.js`:

```javascript
function hasResolvedFooPattern(fileAnalysis) {
  const fooItems = fileAnalysis.metadata?.foo?.items || [];
  if (fooItems.length === 0) return true; // No foo → skip

  // Check if static analysis already resolved connections
  const resolvedConnections = (fileAnalysis.semanticConnections || [])
    .filter(c => c.type === 'foo-connection' && c.confidence >= 1.0);

  return fooItems.length === resolvedConnections.length;
}

// Add to needsLLMAnalysis():
if (hasResolvedFooPattern(fileAnalysis)) {
  return false; // Bypass LLM
}
```

---

## 📈 Metadata Combination Examples

### Example 1: Network + Events + State

**Metadata**:
```json
{
  "hasNetworkCalls": true,
  "networkEndpoints": ["/api/users", "/api/posts"],
  "hasEventEmitters": true,
  "eventNames": ["data-loaded", "error"],
  "definesGlobalState": true,
  "globalStateWrites": ["currentUser", "posts"]
}
```

**Detected Pattern**: `api-state-coordinator`
- Makes 2+ API calls
- Emits events on completion
- Writes to global state

**Architectural Insight**: This file is a **data fetching coordinator** - changes to API contracts will break multiple consumers. Refactor candidate.

---

### Example 2: Lifecycle + Cleanup + Memory

**Metadata**:
```json
{
  "hasLifecycleHooks": true,
  "lifecycleHooks": [{"hook": "useEffect", "framework": "React"}],
  "hasCleanupPatterns": false,
  "hasEventListeners": true,
  "memoryRisks": [{"type": "closure-in-loop", "line": 45}]
}
```

**Detected Pattern**: `memory-leak-risk`
- Has useEffect without cleanup return
- Registers event listeners
- Has closure-in-loop memory risk

**Architectural Insight**: **Memory leak candidate** - addEventListener without removeEventListener in useEffect cleanup.

---

### Example 3: Churn + Complexity + Coupling

**Metadata**:
```json
{
  "gitHotspotScore": 12.5,
  "gitChurnRate": 5.2,
  "estimatedComplexity": "O(n²)",
  "dependentCount": 8,
  "semanticDependentCount": 4,
  "hasNestedLoops": true
}
```

**Detected Pattern**: `critical-bottleneck`
- Very high churn (5 commits/month)
- High hotspot score (12.5)
- O(n²) complexity
- 12 total dependents (8 static + 4 semantic)

**Architectural Insight**: **Refactor immediately** - this file is modified constantly, is complex, and breaks many things when it changes.

---

## 🎯 Impact Metrics

### Before Metadata Insights
- **Patterns detected**: 11 (all single-dimension)
- **LLM bypass rate**: 70% (30% need LLM)
- **False positives**: Moderate (generic patterns)

### After Metadata Insights (with Phase 1 patterns)
- **Patterns detected**: 14 (11 old + 3 new multi-dimension)
- **LLM bypass rate**: 85% (15% need LLM)
- **False positives**: Low (specific multi-dimension patterns)

### After Full Implementation (all 17 patterns)
- **Patterns detected**: 28 total
- **LLM bypass rate**: 90% (10% need LLM)
- **Architectural insights**: 3x more specific

---

## 🔧 Maintenance

### When to update this guide:
1. **New extractor added** → Run through checklist
2. **New archetype added** → Document metadata dependencies
3. **Bypass criteria added** → Document conditions
4. **Pattern false positives** → Adjust detector thresholds

### Quarterly review:
- Analyze which patterns fire most frequently
- Adjust severity scores based on actual impact
- Retire patterns that never fire or have high false positive rate

---

## 📚 Related Documentation

- `ARCHETYPE_SYSTEM.md` - How archetypes work
- `ARCHETYPE_DEVELOPMENT_GUIDE.md` - How to create new archetypes
- `docs/METADATA-CONTRACT.md` - Full metadata schema
- `PROMPT_REGISTRY.js` - Archetype registry source code

---

**Last Updated**: 2026-02-08
**Maintainer**: OmnySys Team
