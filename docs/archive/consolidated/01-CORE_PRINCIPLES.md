---
⚠️  DOCUMENTO ARCHIVADO - Ver nueva ubicación
---
Este documento ha sido consolidado en la nueva estructura de documentación.

📍 Nueva ubicación: Ver docs/archive/consolidated/README.md para el mapa completo

🚀 Usar en su lugar:
- docs/01-core/ (fundamentos)
- docs/02-architecture/ (sistemas)
- docs/04-guides/ (guías prácticas)

---
Documento original (mantenido para referencia histórica):
# OmnySys Core Principles

**Purpose**: This document defines the fundamental principles that guide all development in OmnySys.

**Status**: Living document - Updated as system evolves

---

## ðŸŽ¯ The Four Pillars of OmnySys

### Pillar 1: The Box Test (Archetype Validation)

**Principle**: *"An archetype must reveal invisible CONNECTIONS between files"*

#### The Test

Before adding any new archetype, ask:

> **"Does this tell me something about how this file CONNECTS with other files?"**

- âœ… **YES** â†’ Valid archetype candidate
- âŒ **NO** â†’ Informative metadata, NOT an archetype

#### Examples

**âœ… Valid Archetypes (Pass Box Test)**:
```javascript
// Reveals connection through shared API endpoint
hasNetworkCalls + endpoint == '/api/users'
â†’ "network-hub": Files coupled through backend contract

// Reveals connection through event system
hasEventEmitters + eventName == 'data-loaded'
â†’ "event-hub": Files coupled through pub/sub

// Reveals connection through global state
definesGlobalState + globalVar == 'currentUser'
â†’ "state-manager": Files coupled through shared memory

// Reveals connection through lifecycle
hasLifecycleHooks + framework == 'React'
â†’ "lifecycle-coupled": Components coordinating mount/unmount
```

**âŒ Invalid Archetypes (Fail Box Test)**:
```javascript
// Does NOT reveal connections
hasTypeScript == true
â†’ Language choice, no coupling info

// Does NOT reveal connections
hasCSSInJS == true
â†’ Styling approach, no coupling info

// Does NOT reveal connections
hasErrors == true
â†’ Code quality, no coupling info

// Does NOT reveal connections
complexity > 100
â†’ Internal property, no cross-file impact
```

#### Why This Matters

**Without Box Test**: System fills with noise
- 50+ "archetypes" that are just metadata flags
- LLM wastes tokens on "this file uses TypeScript"
- User overwhelmed with irrelevant patterns

**With Box Test**: System stays focused
- ~15 high-signal archetypes
- Each reveals REAL architectural coupling
- User sees ONLY patterns that matter for refactoring

---

### Pillar 2: Metadata Insights Verification (Cross-Metadata Discovery)

**Principle**: *"Every new metadata extractor must be verified against existing metadata to discover emergent patterns"*

#### The Verification Process

**When adding a new extractor** (e.g., `foo-extractor.js`):

1. **Document new fields**:
   ```javascript
   // foo-extractor.js produces:
   - hasFoo: boolean
   - fooItems: array
   - fooComplexity: number
   ```

2. **Cross-reference with ALL existing metadata**:
   ```javascript
   // Matrix check:
   hasFoo + hasNetworkCalls â†’ ?
   hasFoo + hasLifecycleHooks â†’ ?
   hasFoo + definesGlobalState â†’ ?
   hasFoo + gitHotspotScore â†’ ?
   hasFoo + estimatedComplexity â†’ ?
   // ... for ALL 57 metadata fields
   ```

3. **Identify emergent patterns**:
   ```javascript
   // Example discovery:
   hasFoo + hasNetworkCalls + eventEmitters
   = "foo-network-coordinator" pattern!

   // Why it matters:
   Files making network calls with foo + emitting events
   are coordinating async operations across components
   â†’ High risk of race conditions
   ```

4. **Validate with Box Test**:
   - Does the emergent pattern reveal CONNECTIONS?
   - If YES â†’ Add archetype
   - If NO â†’ Just informative metadata

5. **Document in Metadata Insights Guide**:
   - Add to pattern catalog
   - Specify detection criteria
   - Provide example code
   - Estimate significance

#### Example: Temporal Patterns Extractor

When we added `temporal-patterns.js`, we discovered:

```javascript
// NEW METADATA:
- hasLifecycleHooks (from temporal-patterns.js)
- hasCleanupPatterns (from temporal-patterns.js)

// CROSS-REFERENCE:
hasLifecycleHooks + definesGlobalState
= "state-lifecycle-manager" pattern
â†’ Components initializing state in lifecycle hooks

hasLifecycleHooks + hasEventListeners + !hasCleanupPatterns
= "memory-leak-risk" pattern
â†’ Event listeners without cleanup in lifecycle

hasLifecycleHooks + hasNetworkCalls + hasEventEmitters
= "data-fetching-component" pattern
â†’ Component fetching and broadcasting data
```

**Without verification**:
- We'd miss these 3 patterns
- They'd only be discovered by LLM (expensive)
- Or worse, never discovered (bugs in production)

**With verification**:
- Patterns found immediately
- Added to registry (free detection)
- LLM usage reduced by 15-20%

#### The Insight Matrix

Maintain a matrix of metadata combinations:

```
                | hasNetwork | hasEvents | definesState | hasLifecycle | gitHotspot
----------------|------------|-----------|--------------|--------------|------------
hasSideEffects  | network-hub| event-hub | state-mgr    | lifecycle-io | hotspot-io
hasComplexity   | api-heavy  | event-ord | complex-state| lifecycle-cmplx | critical-bottleneck
hasErrorHandling| resilient  | event-err | state-err    | lifecycle-err| battle-tested
hasCleanup      | -          | safe-evt  | safe-state   | safe-lifecycle| -
```

Each cell is a **potential pattern** to investigate.

---

### Pillar 3: Atomic Composition (Molecular Architecture)

**Principle**: *"Files (molecules) have NO metadata of their own - they are COMPOSED from the metadata of their functions (atoms)"*

#### The Molecular Model (v0.6+)

```javascript
// SSOT: Single Source of Truth at Function Level
{
  "atoms": {
    "src/api.js::fetchUser": {
      "id": "src/api.js::fetchUser",
      "type": "atom",
      "parentMolecule": "src/api.js",
      
      // Atomic metadata (SSOT)
      "line": 15,
      "complexity": 35,
      "isExported": true,
      "hasNetworkCalls": true,
      "hasErrorHandling": false,
      "calls": ["validateToken"],
      "calledBy": ["UserCard.jsx::loadUser", "ProfilePage.jsx::init"],
      
      // Atomic archetype (detected statically)
      "archetype": {
        "type": "fragile-network",
        "severity": 8,
        "confidence": 1.0
      }
    }
  },
  
  "molecules": {
    "src/api.js": {
      "id": "src/api.js",
      "type": "molecule",
      "atoms": ["src/api.js::fetchUser", "src/api.js::validateToken"],
      
      // DERIVED (not stored - calculated from atoms):
      // "hasNetworkCalls": OR(atoms.hasNetworkCalls)
      // "totalComplexity": SUM(atoms.complexity)
      // "exportCount": COUNT(atoms.isExported)
      // "riskScore": MAX(atoms.archetype.severity)
    }
  }
}
```

#### Derivation Rules

```javascript
// src/shared/derivation-engine.js
// No data duplication - everything derived from atoms

export const DerivationRules = {
  // Rule 1: Molecule archetype inferred from atoms
  moleculeArchetype: (atoms) => {
    const atomArchetypes = atoms.map(a => a.archetype?.type);
    
    if (atomArchetypes.includes('fragile-network') && 
        atoms.filter(a => a.hasNetworkCalls).length >= 2) {
      return { type: 'network-hub', severity: 8 };
    }
    if (atoms.every(a => !a.isExported)) {
      return { type: 'internal-module', severity: 3 };
    }
    // ... more rules
  },
  
  // Rule 2: Molecule complexity = sum of atoms
  moleculeComplexity: (atoms) => {
    return atoms.reduce((sum, atom) => sum + (atom.complexity || 0), 0);
  },
  
  // Rule 3: Molecule risk = max atomic risk
  moleculeRisk: (atoms) => {
    return Math.max(...atoms.map(a => a.archetype?.severity || 0));
  }
};
```

**Why this is powerful**:

1. **Precision**: "Function `fetchUser` affects 12 call sites" vs "File api.js affects 30 imports"
2. **Efficiency**: Modify one function â†’ invalidate ONLY that function's cache
3. **Composability**: Same detector works on atoms AND molecules
4. **Scalability**: Classes, modules, packages all follow same pattern

**Atomic Archetypes** (detected 100% statically):
- `god-function`: complexity > 20 && lines > 100
- `fragile-network`: fetch/axios without try/catch
- `hot-path`: exported && calledBy.length > 5
- `dead-function`: !exported && calledBy.length === 0
- `utility`: !hasSideEffects && complexity < 5

---

### Pillar 4: Fractal Architecture (Recursive Aâ†’Bâ†’C)

**Principle**: *"The Aâ†’Bâ†’C pattern repeats at every scale of the system"*

#### The Recursive Pattern

The same three-layer architecture applies to functions, files, modules, and systems:

```
â”Œâ”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”
â”‚                    SCALE 1: FUNCTIONS (Atoms)                           â”‚
â”œâ”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”¤
â”‚  Layer A (Static): Parse functions, extract calls, calculate complexity â”‚
â”‚       â†“                                                                 â”‚
â”‚  Layer B (Detection): Atomic archetypes (god-function, dead-code)       â”‚
â”‚       â†“                                                                 â”‚
â”‚  Layer C (Decision): Need LLM? Only if metadata insufficient            â”‚
â”‚           â†’ 98% bypass, 2% LLM                                          â”‚
â””â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”˜
                                    â”‚
                                    â–¼ DERIVES
â”Œâ”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”
â”‚                    SCALE 2: FILES (Molecules)                           â”‚
â”œâ”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”¤
â”‚  Layer A (Static): Compose atoms â†’ exports, imports, connections        â”‚
â”‚       â†“                                                                 â”‚
â”‚  Layer B (Detection): Molecular archetypes (network-hub, god-object)    â”‚
â”‚       â†“                                                                 â”‚
â”‚  Layer C (Decision): Need LLM? Only if metadata insufficient            â”‚
â”‚           â†’ 90% bypass, 10% LLM                                         â”‚
â””â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”˜
                                    â”‚
                                    â–¼ DERIVES  
â”Œâ”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”
â”‚                    SCALE 3: MODULES/CLUSTERS                            â”‚
â”œâ”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”¤
â”‚  Layer A (Static): Graph of files â†’ clusters, cycles, APIs              â”‚
â”‚       â†“                                                                 â”‚
â”‚  Layer B (Detection): Architecture patterns (monolith, microservices)   â”‚
â”‚       â†“                                                                 â”‚
â”‚  Layer C (Decision): Need LLM? Only if patterns ambiguous               â”‚
â”‚           â†’ 95% bypass, 5% LLM                                          â”‚
â””â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”˜
```

#### Confidence-Based Bypass at Every Level

Each level implements the same decision logic:

```javascript
// Universal decision function (works at any scale)
function shouldUseLLM(entity, metadata, confidenceThreshold = 0.8) {
  // Layer A: Do we have enough metadata?
  if (!metadata || metadata.quality < confidenceThreshold) {
    return { needsLLM: true, reason: 'insufficient_metadata' };
  }
  
  // Layer B: Can we determine the pattern with confidence?
  const { confidence, evidence } = calculateConfidence(metadata);
  
  if (confidence >= confidenceThreshold) {
    return { 
      needsLLM: false, 
      reason: 'sufficient_evidence',
      confidence,
      evidence
    };
  }
  
  // Layer C: Need deeper analysis
  return { 
    needsLLM: true, 
    reason: 'low_confidence',
    confidence,
    evidence
  };
}
```

#### Example: Confidence Calculation

```javascript
// For a god-object archetype at file level
const calculateConfidence = (metadata) => {
  let confidence = 0;
  const evidence = [];
  
  // Evidence from exports
  if (metadata.exportCount > 15) {
    confidence += 0.3;
    evidence.push(`exports:${metadata.exportCount}`);
  }
  
  // Evidence from dependencies
  const totalDeps = (metadata.dependentCount || 0) + 
                    (metadata.semanticDependentCount || 0);
  if (totalDeps > 20) {
    confidence += 0.3;
    evidence.push(`dependents:${totalDeps}`);
  }
  
  // Evidence from atomic composition
  const hasGodFunction = metadata.atoms?.some(
    a => a.archetype?.type === 'god-function'
  );
  if (hasGodFunction) {
    confidence += 0.4;
    evidence.push('has-god-function');
  }
  
  return { confidence, evidence };
};

// Decision:
// confidence >= 0.8 â†’ Bypass LLM (we're sure it's a god-object)
// confidence < 0.8 â†’ Use LLM (need to verify)
```

#### Benefits of Fractal Design

| Aspect | Before (Single Scale) | After (Fractal) |
|--------|----------------------|-----------------|
| LLM Usage | 30% of files | 10% of files |
| Precision | File-level | Function-level |
| Cache Invalidation | Entire file | Single function |
| Pattern Detection | 11 archetypes | 11 + 7 atomic = 18 |
| Explanations | "LLM says..." | "Evidence: X, Y, Z" |

---

## ðŸ§¬ Evolution Summary

### The Four Pillars Build Upon Each Other

```
Pillar 1: Box Test
    â†“
    "Focus on connections, not attributes"
    â†“
Pillar 2: Metadata Insights Verification
    â†“
    "Combine metadata to find patterns"
    â†“
Pillar 3: Atomic Composition
    â†“
    "Apply pillars 1-2 at function level"
    â†“
Pillar 4: Fractal Architecture
    â†“
    "Apply pillars 1-3 recursively at all scales"
```

### Version Evolution

| Version | Pillars | Key Innovation | LLM Bypass |
|---------|---------|----------------|------------|
| v0.5.0 | 1-2 | Box Test + Metadata Insights | 70% |
| v0.5.4 | 1-2 | 8 new extractors, 57 metadata fields | 85% |
| v0.6.0 | 1-4 | Molecular architecture + Fractal Aâ†’Bâ†’C | 90% |

---

## ðŸŽ“ Application Guidelines

### For Adding New Extractors

**ALWAYS follow this checklist**:

1. âœ… Implement extractor logic
2. âœ… Run Metadata Insights Verification (cross-reference ALL existing fields)
3. âœ… Document discovered patterns in `METADATA-INSIGHTS-GUIDE.md`
4. âœ… For each pattern, apply Box Test
5. âœ… Add valid archetypes to `PROMPT_REGISTRY.js`
6. âœ… Update `constants.js` with new optional fields
7. âœ… Update `prompt-builder.js` to expose fields to LLM

**Example commit message**:
```
feat: Add foo-extractor.js + 3 new patterns

- Extractor detects foo usage in code
- Discovered patterns via cross-reference:
  1. foo-network-coordinator (Box Test: PASS)
  2. foo-lifecycle-manager (Box Test: PASS)
  3. foo-with-typescript (Box Test: FAIL - just metadata)
- Added patterns #1 and #2 to registry
- Updated METADATA-INSIGHTS-GUIDE.md with analysis
```

### For Adding New Archetypes

**ALWAYS apply Box Test first**:

```javascript
// Proposed archetype: "uses-lodash"
detector: (metadata) => metadata.imports.includes('lodash')

// Box Test Question:
"Does knowing a file uses lodash tell me how it CONNECTS to other files?"

// Answer: NO
- Lodash is internal implementation detail
- Doesn't reveal coupling between files
- âŒ REJECT archetype

// Counter-example: "lodash-chain-coordinator"
detector: (metadata) =>
  metadata.imports.includes('lodash') &&
  metadata.hasNetworkCalls &&
  metadata.externalCallCount > 5

// Box Test Question:
"Does knowing a file coordinates lodash chains with network calls tell me about connections?"

// Answer: MAYBE
- If multiple files use lodash chains on shared data â†’ YES
- If just one file using lodash internally â†’ NO
- Need semantic analysis to determine
- â†’ Make requiresLLM: 'conditional'
```

### For Code Reviews

**Checklist for reviewers**:

- [ ] If adding extractor: Did they run Metadata Insights Verification?
- [ ] If adding archetype: Did they apply Box Test? (must be in commit message)
- [ ] If modifying detector: Did they check impact on derived patterns?
- [ ] Are new metadata fields documented in `constants.js`?
- [ ] Are new patterns documented in `METADATA-INSIGHTS-GUIDE.md`?
- [ ] Does the change follow the Fractal Aâ†’Bâ†’C pattern?

---

## ðŸ“Š Success Metrics

### System Health

**Good indicators**:
- Archetype count stable or growing slowly (~1-2 per quarter)
- LLM usage decreasing as metadata improves
- Pattern catalog growing faster than archetype count (more insights from same data)
- False positive rate < 5%
- Confidence scores > 0.8 for 90% of detections

**Bad indicators**:
- Archetype explosion (>30 archetypes)
- Many archetypes with requiresLLM: true (should be conditional)
- Metadata fields not being cross-referenced
- Pattern catalog stagnant
- Low confidence scores (<0.5) common

### Pattern Discovery

Track metadata insights over time:

```javascript
{
  "v0.5.0": {
    "extractors": 5,
    "metadata_fields": 41,
    "archetypes": 11,
    "discovered_patterns": 0  // No systematic discovery yet
  },
  "v0.5.4": {
    "extractors": 13,
    "metadata_fields": 57,
    "archetypes": 15,
    "discovered_patterns": 17  // â† Metadata Insights Verification unlocked this
  },
  "v0.6.0": {
    "extractors": 13,  // Same extractors
    "metadata_fields": 57,  // Same fields
    "archetypes": 20,  // 5 more from atom-level insights
    "discovered_patterns": 35,  // Atoms Ã— Molecules combinations
    "llm_bypass_rate": "90%",  // â† Fractal Aâ†’Bâ†’C achievement
    "confidence_threshold": 0.8
  }
}
```

---

## ðŸ”— Related Documentation

- `METADATA-INSIGHTS-GUIDE.md` - Full pattern catalog + verification process
- `ARCHETYPE_SYSTEM.md` - How archetypes work
- `ARCHETYPE_DEVELOPMENT_GUIDE.md` - Step-by-step archetype creation
- `ARCHITECTURE_MOLECULAR_PLAN.md` - Molecular architecture details
- `ARCHITECTURE.md` - System architecture overview

---

## ðŸ’¡ Philosophy

OmnySys is built on a simple insight:

> **"Most architectural coupling is invisible to static analysis but discoverable through metadata combination"**

The Four Pillars ensure we:
1. **Focus on connections** (Box Test)
2. **Maximize insights from existing data** (Metadata Verification)
3. **Scale gracefully** (Atomic Composition)
4. **Apply consistently at all levels** (Fractal Architecture)

Every design decision should pass these filters.

---

**Last Updated**: 2026-02-08
**Maintainer**: OmnySys Team
**Status**: Active - Foundation of all development

