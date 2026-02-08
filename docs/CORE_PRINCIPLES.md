# OmnySys Core Principles

**Purpose**: This document defines the fundamental principles that guide all development in OmnySys.

**Status**: Living document - Updated as system evolves

---

## 🎯 The Two Pillars of OmnySys

### Pillar 1: The Box Test (Archetype Validation)

**Principle**: *"An archetype must reveal invisible CONNECTIONS between files"*

#### The Test

Before adding any new archetype, ask:

> **"Does this tell me something about how this file CONNECTS with other files?"**

- ✅ **YES** → Valid archetype candidate
- ❌ **NO** → Informative metadata, NOT an archetype

#### Examples

**✅ Valid Archetypes (Pass Box Test)**:
```javascript
// Reveals connection through shared API endpoint
hasNetworkCalls + endpoint == '/api/users'
→ "network-hub": Files coupled through backend contract

// Reveals connection through event system
hasEventEmitters + eventName == 'data-loaded'
→ "event-hub": Files coupled through pub/sub

// Reveals connection through global state
definesGlobalState + globalVar == 'currentUser'
→ "state-manager": Files coupled through shared memory

// Reveals connection through lifecycle
hasLifecycleHooks + framework == 'React'
→ "lifecycle-coupled": Components coordinating mount/unmount
```

**❌ Invalid Archetypes (Fail Box Test)**:
```javascript
// Does NOT reveal connections
hasTypeScript == true
→ Language choice, no coupling info

// Does NOT reveal connections
hasCSSInJS == true
→ Styling approach, no coupling info

// Does NOT reveal connections
hasErrors == true
→ Code quality, no coupling info

// Does NOT reveal connections
complexity > 100
→ Internal property, no cross-file impact
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
   hasFoo + hasNetworkCalls → ?
   hasFoo + hasLifecycleHooks → ?
   hasFoo + definesGlobalState → ?
   hasFoo + gitHotspotScore → ?
   hasFoo + estimatedComplexity → ?
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
   → High risk of race conditions
   ```

4. **Validate with Box Test**:
   - Does the emergent pattern reveal CONNECTIONS?
   - If YES → Add archetype
   - If NO → Just informative metadata

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
→ Components initializing state in lifecycle hooks

hasLifecycleHooks + hasEventListeners + !hasCleanupPatterns
= "memory-leak-risk" pattern
→ Event listeners without cleanup in lifecycle

hasLifecycleHooks + hasNetworkCalls + hasEventEmitters
= "data-fetching-component" pattern
→ Component fetching and broadcasting data
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

## 🧬 The Molecular Evolution (v0.6+ Future)

### Principle 3 (Upcoming): Atomic Composition

**Principle**: *"Files (molecules) have NO metadata of their own - they are COMPOSED from the metadata of their functions (atoms)"*

This is the natural evolution of Pillars 1 & 2:

```javascript
// Current (v0.5): File-level metadata
{
  "src/api.js": {
    "hasNetworkCalls": true,
    "complexity": 120,
    "exportCount": 3
  }
}

// Future (v0.6): Atomic composition
{
  "atoms": {
    "src/api.js::fetchUser": {
      "hasNetworkCalls": true,
      "complexity": 35,
      "isExported": true
    },
    "src/api.js::validateToken": {
      "hasNetworkCalls": false,
      "complexity": 15,
      "isExported": false
    }
  },
  "molecules": {
    "src/api.js": {
      "atoms": ["::fetchUser", "::validateToken"],
      // Derived (not stored):
      "hasNetworkCalls": OR(atoms.hasNetworkCalls),
      "complexity": SUM(atoms.complexity),
      "exportCount": COUNT(atoms.isExported)
    }
  }
}
```

**Why this is powerful**:

1. **Precision**: "Function `fetchUser` affects 12 call sites" vs "File api.js affects 30 imports"
2. **Efficiency**: Modify one function → invalidate ONLY that function's cache
3. **Composability**: Same detector works on atoms AND molecules
4. **Scalability**: Classes, modules, packages all follow same pattern

**This preserves Pillars 1 & 2**:
- Box Test still applies (at atom level + molecule level)
- Metadata Insights Verification still applies (atoms discover new patterns too)

See `docs/ARCHITECTURE_MOLECULAR_PLAN.md` for full details.

---

## 🎓 Application Guidelines

### For Adding New Extractors

**ALWAYS follow this checklist**:

1. ✅ Implement extractor logic
2. ✅ Run Metadata Insights Verification (cross-reference ALL existing fields)
3. ✅ Document discovered patterns in `METADATA-INSIGHTS-GUIDE.md`
4. ✅ For each pattern, apply Box Test
5. ✅ Add valid archetypes to `PROMPT_REGISTRY.js`
6. ✅ Update `constants.js` with new optional fields
7. ✅ Update `prompt-builder.js` to expose fields to LLM

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
- ❌ REJECT archetype

// Counter-example: "lodash-chain-coordinator"
detector: (metadata) =>
  metadata.imports.includes('lodash') &&
  metadata.hasNetworkCalls &&
  metadata.externalCallCount > 5

// Box Test Question:
"Does knowing a file coordinates lodash chains with network calls tell me about connections?"

// Answer: MAYBE
- If multiple files use lodash chains on shared data → YES
- If just one file using lodash internally → NO
- Need semantic analysis to determine
- → Make requiresLLM: 'conditional'
```

### For Code Reviews

**Checklist for reviewers**:

- [ ] If adding extractor: Did they run Metadata Insights Verification?
- [ ] If adding archetype: Did they apply Box Test? (must be in commit message)
- [ ] If modifying detector: Did they check impact on derived patterns?
- [ ] Are new metadata fields documented in `constants.js`?
- [ ] Are new patterns documented in `METADATA-INSIGHTS-GUIDE.md`?

---

## 📊 Success Metrics

### System Health

**Good indicators**:
- Archetype count stable or growing slowly (~1-2 per quarter)
- LLM usage decreasing as metadata improves
- Pattern catalog growing faster than archetype count (more insights from same data)
- False positive rate < 5%

**Bad indicators**:
- Archetype explosion (>30 archetypes)
- Many archetypes with requiresLLM: true (should be conditional)
- Metadata fields not being cross-referenced
- Pattern catalog stagnant

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
    "discovered_patterns": 17  // ← Metadata Insights Verification unlocked this
  },
  "v0.6.0": {
    "extractors": 13,  // Same extractors
    "metadata_fields": 57,  // Same fields
    "archetypes": 20,  // 5 more from atom-level insights
    "discovered_patterns": 35  // Atoms × Molecules combinations
  }
}
```

---

## 🔗 Related Documentation

- `METADATA-INSIGHTS-GUIDE.md` - Full pattern catalog + verification process
- `ARCHETYPE_SYSTEM.md` - How archetypes work
- `ARCHETYPE_DEVELOPMENT_GUIDE.md` - Step-by-step archetype creation
- `ARCHITECTURE_MOLECULAR_PLAN.md` - Future evolution (Pillar 3)

---

## 💡 Philosophy

OmnySys is built on a simple insight:

> **"Most architectural coupling is invisible to static analysis but discoverable through metadata combination"**

The Three Pillars ensure we:
1. **Focus on connections** (Box Test)
2. **Maximize insights from existing data** (Metadata Verification)
3. **Scale gracefully** (Atomic Composition)

Every design decision should pass these filters.

---

**Last Updated**: 2026-02-08
**Maintainer**: OmnySys Team
**Status**: Active - Foundation of all development
