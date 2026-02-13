# System Analysis: Extractors

**Version**: v0.6.0
**Date**: 2026-02-08
**Author**: Claude Opus 4.6
**Purpose**: Detailed extractor documentation, archetype detection, and metadata that can be extracted

**Related Documents**:
- `SYSTEM_ANALYSIS_OVERVIEW.md` - High-level system flow and architecture summary
- `SYSTEM_ANALYSIS_GAPS.md` - Missing features, improvements, recommendations

---

## Detected Archetypes

### Architectural Patterns (metadata-contract)

#### 1. **God Object**
```javascript
Criteria:
- (Exports >= 5 && Dependents >= 5) ||
- Dependents >= 10 ||
- Dependents >= Exports * 3

Example: store.js
  - 8 exports (actions)
  - 23 dependents (all components)
  -> God Object
```

#### 2. **Orphan Module**
```javascript
Criteria:
- Exports >= 1
- Dependents <= 0

Example: oldHelper.js
  - 3 exports (functions)
  - 0 dependents (nobody uses it)
  -> Orphan Module
```

#### 3. **Facade**
```javascript
Criteria:
- Re-exports >= 3 ||
- (fileName === 'index.js' && Functions <= 1 && Exports >= 3)

Example: components/index.js
  - Re-exports 15 components
  - Defines 0 own functions
  -> Facade
```

#### 4. **Config Hub**
```javascript
Criteria:
- Exports >= 5
- Dependents >= 5
- Functions <= 2

Example: config.js
  - 12 exports (constants)
  - 18 dependents
  - 0 functions
  -> Config Hub
```

#### 5. **Entry Point**
```javascript
Criteria:
- Imports >= 5
- Dependents === 0

Example: main.js
  - 20 imports (whole app)
  - 0 dependents (nobody imports main)
  -> Entry Point
```

---

## Additional Metadata We Can Extract

### 1. **Call Graph Context** (who calls whom)
```javascript
// CURRENT: We only detect that function "calculateTotal" exists
// MISSING: Who calls it and how frequently

{
  function: 'calculateTotal',
  calledBy: [
    { file: 'checkout.js', times: 3, lines: [42, 67, 89] },
    { file: 'cart.js', times: 1, lines: [123] }
  ],
  calls: [
    { function: 'applyDiscount', file: 'discounts.js' },
    { function: 'validateItems', file: 'validation.js' }
  ]
}
```

**Benefit:**
- Detect "hot functions" (frequently called)
- Predict impact of signature changes
- Prioritize testing

---

### 2. **Data Flow Tracking** (how data flows)
```javascript
// CURRENT: We only detect imports/exports
// MISSING: Track how values flow

{
  variable: 'userToken',
  flow: [
    { file: 'auth.js', action: 'generated', line: 42 },
    { file: 'auth.js', action: 'stored', key: 'localStorage.authToken', line: 45 },
    { file: 'api.js', action: 'read', key: 'localStorage.authToken', line: 12 },
    { file: 'api.js', action: 'used', context: 'HTTP header', line: 15 }
  ]
}
```

**Benefit:**
- Detect "data leaks" (values that escape)
- Understand semantic dependencies
- Easier debugging

---

### 3. **Type Information** (type inference)
```javascript
// CURRENT: We only see variable names
// MISSING: Infer types when there's no TypeScript

{
  function: 'calculateTotal',
  params: [
    {
      name: 'items',
      inferredType: 'Array<{id: string, price: number}>',  // <- Inferred
      confidence: 0.8
    }
  ],
  returnType: 'number',  // <- Inferred from code
  confidence: 0.9
}
```

**Benefit:**
- Better LLM predictions
- Detect type mismatches
- Automatic documentation

---

### 4. **Side Effects** (side effects)
```javascript
// CURRENT: We only detect try/catch
// MISSING: Detect ALL side effects

{
  function: 'saveUser',
  sideEffects: [
    { type: 'network', action: 'fetch', url: '/api/users' },
    { type: 'storage', action: 'write', key: 'localStorage.lastUser' },
    { type: 'dom', action: 'modify', element: 'div.notification' },
    { type: 'event', action: 'emit', event: 'userSaved' }
  ]
}
```

**Benefit:**
- Detect "pure" vs "impure" functions
- Understand real impact of changes
- More targeted testing

---

### 5. **Temporal Patterns** (when things execute)
```javascript
// CURRENT: We know that async function exists
// MISSING: When it executes (lifecycle)

{
  function: 'fetchUserData',
  executionContext: {
    timing: 'onMount',  // <- Executes when component mounts
    frequency: 'once',  // <- Only once
    triggers: ['componentDidMount', 'useEffect[]']
  }
}
```

**Benefit:**
- Understand execution order
- Detect race conditions
- Optimize performance

---

### 6. **Dependency Depth** (graph depth)
```javascript
// CURRENT: We only see direct dependencies
// MISSING: Depth of the sub-graph

{
  file: 'checkout.js',
  dependencyDepth: 4,  // <- 4 levels of dependencies
  transitiveImports: 23,  // <- 23 files total
  deepestChain: [
    'checkout.js',
    'cart.js',
    'products.js',
    'api.js',
    'config.js'  // <- 5 levels
  ]
}
```

**Benefit:**
- Detect "dependency hell"
- Prioritize refactoring
- Understand complexity

---

### 7. **Historical Metadata** (git data)
```javascript
// CURRENT: We only see current state
// MISSING: File history

{
  file: 'auth.js',
  history: {
    commits: 47,
    lastModified: '2026-02-05',
    topContributors: ['alice', 'bob'],
    avgChurnRate: 0.3,  // <- 30% of file changes per commit
    bugDensity: 0.05,   // <- 5% of commits were bug fixes
    hotspotScore: 0.8   // <- High churn + high coupling
  }
}
```

**Benefit:**
- Detect "problematic files"
- Predict future bugs
- Prioritize code reviews

---

### 8. **Performance Hints** (performance indicators)
```javascript
// CURRENT: We don't measure anything about performance
// MISSING: Performance heuristics

{
  function: 'renderList',
  performanceHints: [
    { type: 'loop-in-loop', line: 42, severity: 'medium' },
    { type: 'large-array-mutation', line: 67, severity: 'high' },
    { type: 'blocking-io', line: 89, severity: 'critical' }
  ],
  estimatedComplexity: 'O(n^2)'
}
```

**Benefit:**
- Detect bottlenecks before profiling
- Suggest optimizations
- Educate developers

---

**Source**: Split from `SYSTEM-ANALYSIS-CURRENT-STATE.md`
