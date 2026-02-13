# System Analysis: Overview

**Version**: v0.6.0
**Date**: 2026-02-08
**Author**: Claude Opus 4.6
**Purpose**: High-level system flow, metadata overview, and architecture summary

**Related Documents**:
- `SYSTEM_ANALYSIS_EXTRACTORS.md` - Detailed extractor documentation
- `SYSTEM_ANALYSIS_GAPS.md` - Missing features, improvements, recommendations

---

## What happens when you modify a file?

### Complete Flow (step by step)

```
1. Editor saves file (user.js)
   |
2. File watcher detects change
   |
3. Queue with debounce (500ms)
   |
4. Process batch (max 3 files in parallel)
   |
5. Calculate MD5 hash
   |
6. Hash changed?
   +-- NO -> Ignore (was just "touch")
   +-- YES -> Continue analysis
       |
7. Re-parse file with AST (babel/swc)
   |
8. Resolve imports (relative paths -> absolute)
   |
9. Detect semantic connections
   +-- Static extractors (localStorage, events)
   +-- Advanced extractors (WebSockets, BroadcastChannel)
   |
10. Extract metadata
    +-- JSDoc contracts
    +-- Async patterns
    +-- Error handling
    +-- Build-time deps
    |
11. Detect specific changes
    +-- IMPORT_CHANGED (added/removed)
    +-- EXPORT_CHANGED (added/removed)
    +-- FUNCTIONS_CHANGED
    |
12. Save analysis in .omnysysdata/files/{hash}.json
    |
13. Update global index (.omnysysdata/index.json)
    |
14. Emit events
    +-- file:modified
    +-- dependency:added (if added import)
    +-- dependency:removed (if removed import)
    +-- cache:invalidate
    |
15. END (file processed)
```

---

## When does the LLM activate?

### IMPORTANT: The LLM does NOT activate automatically in the file watcher

The file watcher only does static analysis (AST). The LLM is activated **manually** when:

### Criteria for activating LLM (analysis-decider.js)

#### 1. **Orphan without connections**
```javascript
// File that:
- Has NO imports
- Has NO dependents (nobody uses it)
- Has NO detected semantic connections

// Example: util.js that nobody uses
// Why does it exist? LLM tries to discover
```

#### 2. **Dynamic code** (cannot be analyzed statically)
```javascript
// Code that uses:
- dynamic imports: import(variablePath)
- eval: eval('code from server')
- dynamic require: require(computed)

// Example: plugin loader
const plugin = await import(`./plugins/${pluginName}.js`);
// Layer A doesn't know what files are loaded -> LLM helps
```

#### 3. **Events NOT resolved** by Layer A
```javascript
// Layer A detected:
eventEmitter.on('userLogin', handler)

// But did NOT find who does:
eventEmitter.emit('userLogin')

// LLM searches for files that emit that event
```

#### 4. **Shared state NOT resolved** by Layer A
```javascript
// Layer A detected:
localStorage.setItem('authToken', token)

// But did NOT find who reads:
localStorage.getItem('authToken')

// LLM searches for files that read that key
```

#### 5. **Low confidence connections** (<0.7)
```javascript
// Layer A detected connection but with low certainty
{
  target: 'auth.js',
  via: 'globalVariable',
  confidence: 0.5  // <- Low
}

// LLM confirms/refutes the connection
```

---

## Metadata Extracted Currently

### Layer A - Static Analysis (ALWAYS extracted)

#### 1. **Imports & Exports**
```javascript
{
  imports: [
    {
      source: 'react',
      resolvedPath: 'node_modules/react/index.js',
      type: 'npm',
      specifiers: ['useState', 'useEffect']
    }
  ],
  exports: [
    { name: 'MyComponent', type: 'default' },
    { name: 'helper', type: 'named' }
  ]
}
```

#### 2. **Functions & Definitions**
```javascript
{
  definitions: [
    {
      type: 'function',
      name: 'calculateTotal',
      params: ['items', 'discount'],
      isAsync: false
    }
  ],
  calls: [
    { function: 'fetch', args: ['api/users'] }
  ]
}
```

#### 3. **Semantic Connections** (static extractors)
```javascript
{
  semanticConnections: [
    {
      target: 'auth.js',
      type: 'localStorage',
      key: 'authToken',
      confidence: 1.0,  // <- Complete certainty (AST parsing)
      detectedBy: 'static-extractor'
    },
    {
      target: 'events.js',
      type: 'eventListener',
      event: 'userLogin',
      confidence: 0.8,
      detectedBy: 'advanced-extractor'
    }
  ]
}
```

#### 4. **Metadata Contracts**
```javascript
{
  metadata: {
    jsdocContracts: {
      all: [
        {
          function: 'calculateTotal',
          params: [
            { name: 'items', type: 'Array<Item>' },
            { name: 'discount', type: 'number' }
          ],
          returns: 'number',
          throws: ['InvalidItemError']
        }
      ]
    },
    asyncPatterns: {
      all: [
        { type: 'async-await', function: 'fetchUser' },
        { type: 'promise', function: 'loadData' }
      ]
    },
    errorHandling: {
      all: [
        { type: 'try-catch', line: 42 },
        { type: 'throw', line: 56, error: 'ValidationError' }
      ]
    },
    buildTimeDeps: {
      envVars: ['API_URL', 'NODE_ENV']
    }
  }
}
```

---

## How more metadata = less LLM

### Principle
```
More static metadata (deterministic) ->
Less uncertainty ->
Less need for LLM (probabilistic)
```

### Concrete example

#### Without additional metadata:
```javascript
// Layer A detects:
localStorage.setItem('token', data)

// Does not know who reads 'token'
// -> NEEDS LLM to search
```

#### With additional metadata (Data Flow Tracking):
```javascript
// Layer A detects:
{
  variable: 'token',
  flow: [
    { file: 'auth.js', action: 'write', key: 'token', line: 42 },
    { file: 'api.js', action: 'read', key: 'token', line: 15 }  // <- Already knows
  ]
}

// Connection resolved without LLM
// -> Does NOT need LLM
```

### Decision Matrix

| Metadata | Without -> LLM | With -> Static |
|----------|---------------|----------------|
| Call graph | LLM searches calls | Already knows them |
| Data flow | LLM infers flow | Already traced it |
| Type inference | LLM infers types | Already inferred them |
| Side effects | LLM analyzes code | Already detected them |
| Temporal patterns | LLM deduces timing | Already knows when |

### Result
```
Current: 30% files -> LLM
With additional metadata: 10% files -> LLM
```

**Savings:**
- 67% fewer LLM calls
- 67% faster
- 67% less cost (if using cloud LLM)

---

**Source**: Split from `SYSTEM-ANALYSIS-CURRENT-STATE.md`
