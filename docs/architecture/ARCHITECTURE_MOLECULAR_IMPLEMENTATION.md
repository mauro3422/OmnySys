# Arquitectura Molecular: Implementation Details

**Fecha**: 2026-02-08
**Version**: v0.6.0
**Estado**: IMPLEMENTADO Y ESTABLE
**Guia**: Este documento cubre la implementacion de la arquitectura molecular. Para conceptos fundamentales, ver `ARCHITECTURE_MOLECULAR_PLAN.md`.

---

## Pipeline de Extraccion

### Flujo Unico: Extraer Atomos -> Componer Moleculas

```javascript
// src/layer-a-static/pipeline/molecular-extractor.js

export async function extractMolecularStructure(filePath, code, ast) {
  // PASO 1: Extraer atomos (funciones) - SSOT
  const atoms = [];

  traverse(ast, {
    FunctionDeclaration(nodePath) {
      const atom = extractAtom(nodePath, filePath, code);
      atoms.push(atom);
    },
    ArrowFunctionExpression(nodePath) {
      if (isTopLevel(nodePath)) {
        const atom = extractAtom(nodePath, filePath, code);
        atoms.push(atom);
      }
    },
    // MethodDefinition for classes
    MethodDefinition(nodePath) {
      const atom = extractAtom(nodePath, filePath, code, {
        isMethod: true,
        parentClass: getParentClass(nodePath)
      });
      atoms.push(atom);
    }
  });

  // PASO 2: Create molecule as COMPOSITION of atoms
  const molecule = {
    id: filePath,
    type: 'molecule',
    atoms: atoms.map(a => a.id),
    // NO duplicated metadata here - everything is derived
  };

  // PASO 3: Calculate relationships between atoms (internal call graph)
  const atomIndex = new Map(atoms.map(a => [a.name, a]));

  for (const atom of atoms) {
    atom.calls = atom.rawCalls.map(call => {
      const targetAtom = atomIndex.get(call.name);
      if (targetAtom) {
        // Internal call
        targetAtom.calledBy.push(atom.id);
        return { type: 'internal', target: targetAtom.id };
      } else {
        // External call
        return { type: 'external', name: call.name };
      }
    });
  }

  return { molecule, atoms };
}

// Extraction of an individual atom
function extractAtom(nodePath, filePath, code, options = {}) {
  const node = nodePath.node;
  const name = extractFunctionName(node, options);

  return {
    id: `${filePath}::${name}`,
    type: 'atom',
    parentMolecule: filePath,
    name,

    // Spatial metadata
    line: node.loc?.start.line || 0,
    endLine: node.loc?.end.line || 0,
    lines: (node.loc?.end.line || 0) - (node.loc?.start.line || 0),

    // Signature
    params: node.params.map(p => p.name || extractParamName(p)),
    isAsync: node.async || false,
    isExported: isExportedFunction(nodePath) || options.isMethod || false,
    isMethod: options.isMethod || false,
    parentClass: options.parentClass || null,

    // Complexity
    complexity: calculateCyclomatic(nodePath),

    // Side effects (detected statically)
    hasNetworkCalls: detectNetworkCalls(nodePath),
    hasDomManipulation: detectDomCalls(nodePath),
    hasStorageAccess: detectStorageCalls(nodePath),
    hasErrorHandling: detectTryCatch(nodePath),
    hasLogging: detectConsoleCalls(nodePath),

    // Calls (to resolve)
    rawCalls: extractRawCalls(nodePath),
    calls: [],        // Resolved later
    calledBy: [],     // Resolved later

    // Content for LLM if needed
    snippet: extractSnippet(code, node.loc)
  };
}
```

---

## Problematicas Identificadas y Soluciones

### 1. Funciones Anonimas

**Problema**:
```javascript
const handler = () => { ... };  // Atom?
array.map(x => x * 2);          // Atom?
```

**Solucion**:
- Functions with binding (const/let/var) -> Are atoms
- Class methods -> Are atoms
- Inline callbacks -> NOT atoms (parent function metadata)
- IIFEs -> NOT atoms (execute immediately)

```javascript
// Heuristic
function shouldBeAtom(nodePath) {
  // 1. Has explicit name
  if (node.id?.name) return true;

  // 2. Assigned to variable
  if (isVariableDeclaration(nodePath.parent)) return true;

  // 3. Class method
  if (nodePath.parent?.type === 'ClassBody') return true;

  // 4. Exported directly
  if (isExported(nodePath)) return true;

  return false;
}
```

### 2. Clases

**Problema**: Is a class an atom or a molecule?

**Solucion**: Class = "Compound molecule"

```javascript
// Class as molecule with atoms (methods)
{
  "molecules": {
    "src/services/UserService.js": {
      "type": "molecule",
      "moleculeType": "class",
      "atoms": [
        "src/services/UserService.js::constructor",
        "src/services/UserService.js::fetchUser",
        "src/services/UserService.js::updateProfile"
      ]
    }
  },
  "atoms": {
    "src/services/UserService.js::fetchUser": {
      "type": "atom",
      "atomType": "method",
      "parentClass": "UserService",
      "parentMolecule": "src/services/UserService.js"
    }
  }
}
```

### 3. Dynamic Imports/Exports

**Problema**:
```javascript
export { getFeature as default } from './features';
```

**Solucion**: Virtual atoms

```javascript
// Re-export creates virtual atom pointing to the real one
{
  "atoms": {
    "src/index.js::getFeature": {
      "type": "atom",
      "atomType": "virtual-export",
      "targetAtom": "src/features.js::getFeature",
      "alias": "default"
    }
  }
}
```

### 4. Duplicacion de Logica

**Problema**: Do file detectors repeat function detector logic?

**Solucion**: Generic detectors with configurable thresholds

```javascript
export const PatternDetectors = {
  godEntity: (entity, options = {}) => {
    const threshold = options.threshold ||
      (entity.type === 'atom' ? 50 : 500);

    const connections = entity.type === 'atom'
      ? (entity.calledBy?.length || 0) + (entity.calls?.length || 0)
      : entity.atoms?.reduce((sum, a) =>
          sum + (a.calledBy?.length || 0), 0);

    return connections > threshold;
  }
};

// Usage
PatternDetectors.godEntity(func, { threshold: 50 });     // For function
PatternDetectors.godEntity(file, { threshold: 500 });    // For file
```

### 5. Performance de Derivacion

**Problema**: Calculating derivations on every query is slow

**Solucion**: Derivation cache

```javascript
class DerivationCache {
  constructor() {
    this.cache = new Map();
    this.dependencyGraph = new Map(); // atom -> derived fields
  }

  derive(molecule, ruleName) {
    const cacheKey = `${molecule.id}::${ruleName}`;

    if (this.cache.has(cacheKey)) {
      return this.cache.get(cacheKey);
    }

    const result = DerivationRules[ruleName](molecule.atoms);
    this.cache.set(cacheKey, result);

    // Register dependencies for invalidation
    for (const atom of molecule.atoms) {
      if (!this.dependencyGraph.has(atom.id)) {
        this.dependencyGraph.set(atom.id, new Set());
      }
      this.dependencyGraph.get(atom.id).add(cacheKey);
    }

    return result;
  }

  invalidate(atomId) {
    // Invalidate all derivations that depend on this atom
    const affected = this.dependencyGraph.get(atomId) || new Set();
    for (const cacheKey of affected) {
      this.cache.delete(cacheKey);
    }
  }
}
```

---

## Ejemplos de Uso

### Ejemplo 1: Impacto Preciso

```javascript
// User: "What happens if I modify fetchUser?"

get_impact_map("src/api.js", { function: "fetchUser" });

// Response:
{
  target: {
    molecule: "src/api.js",
    atom: "fetchUser",
    archetype: "fragile-gateway",
    severity: 8,
    metadata: {
      complexity: 35,
      hasErrorHandling: false,
      callers: 12
    }
  },

  // Molecular impact (files)
  molecularImpact: ["UserCard.jsx", "ProfilePage.jsx"],

  // Precise atomic impact
  atomicImpact: [
    {
      molecule: "UserCard.jsx",
      atom: "loadUser",
      relationship: "calls",
      line: 42
    },
    {
      molecule: "ProfilePage.jsx",
      atom: "init",
      relationship: "calls",
      line: 15
    }
  ],

  // Risk derived from atomic metadata
  riskLevel: "high",
  reason: "fetchUser is called by 12 functions, has no error handling"
}
```

### Ejemplo 2: Dead Code Detection

```javascript
// Detector finds dead function

get_risk_assessment({ includeDeadCode: true });

// Response:
{
  deadAtoms: [
    {
      id: "src/utils/helpers.js::oldFormatDate",
      type: "dead-function",
      confidence: 1.0,
      reason: "Not exported, 0 callers",
      suggestion: "Delete unused function"
    }
  ],
  deadMolecules: [
    {
      id: "src/legacy/api-v1.js",
      type: "dead-module",
      confidence: 0.95,
      reason: "No exported function is used externally"
    }
  ]
}
```

### Ejemplo 3: Refactor Assistant

```javascript
// User wants to rename a function

analyze_signature_change("src/api.js", "fetchUser", {
  newName: "getUserById"
});

// Response:
{
  changes: [
    {
      type: "rename",
      target: "src/api.js::fetchUser",
      newName: "getUserById",
      confidence: 1.0
    },
    {
      type: "update-calls",
      targets: [
        { file: "UserCard.jsx", line: 42, col: 15 },
        { file: "ProfilePage.jsx", line: 15, col: 8 }
      ],
      count: 12
    }
  ],
  estimatedImpact: "12 call sites in 5 files"
}
```

---

## Roadmap de Implementacion

### Fase 1: Estructura Atomica (1-2 days)
- [ ] Modify `system-map.json` schema to support `atoms[]`
- [ ] Create `derivation-engine.js` with basic rules
- [ ] Create `molecular-extractor.js` (unified pipeline)
- [ ] Migrate existing `call-graph.js` to extract atoms
- [ ] Tests: Verify that atom extraction works

### Fase 2: Detectores Compuestos (2-3 days)
- [ ] Refactor existing detectors to accept `entity` (atom|molecule)
- [ ] Implement `detectFunctionArchetype()` with static rules
- [ ] Implement derivation rules for molecules
- [ ] Tests: Verify that derivation is correct and consistent
- [ ] Benchmark: Measure overhead of atomic extraction

### Fase 3: Integracion Orchestrator (2-3 days)
- [ ] Change cache invalidation: by function (atom), not by file
- [ ] Implement prioritization: critical functions first
- [ ] Modify `AnalysisQueue` to support atomic jobs
- [ ] Selective LLM: only atoms where `needsLLMForFunction()`
- [ ] Tests: Verify race conditions in partial invalidation

### Fase 4: Tools Mejoradas (1-2 days)
- [ ] Extend `get_impact_map` to show function-level impact
- [ ] Improve `get_call_graph` (already works naturally with atom graph)
- [ ] New: `get_function_details(atomId)` for specific query
- [ ] New: `get_molecule_summary(filePath)` for file view
- [ ] Tests: Verify precision of atomic impact

### Fase 5: Migracion y Backward Compatibility (1-2 days)
- [ ] Maintain current API (no breaking changes)
- [ ] Add `atomic: true` flag for new features
- [ ] Document API changes
- [ ] Migration guide for existing data

---

## Comparacion: Antes vs Despues

### Scenario: Project with 100 files, 500 functions

| Aspect | Before (File-only) | After (Molecular) |
|--------|-------------------|---------------------|
| **Entities analyzed** | 100 files | 500 atoms + 100 molecules |
| **LLM Calls** | ~10 (10% files) | ~25 (5% atoms) |
| **Storage** | ~10MB | ~15MB (indexes + atoms) |
| **Precision** | "File A affects B" | "Function A.f affects B.g" |
| **Cache Invalidation** | Entire file | Only modified function |
| **Extraction time** | ~50ms per file | ~70ms per file (+40%) |

**Gains**:
- 5x more precision in analysis
- Granular invalidation (only modified function)
- Logic reuse (compound detectors)
- Extensible to other levels (classes, modules)

---

## Checklist de Implementacion

### Pre-implementation
- [ ] Review this plan with the team (if applicable)
- [ ] Define exact thresholds for detectors
- [ ] Prepare synthetic test suite
- [ ] Backup existing data

### During implementation
- [ ] Atomic commits per phase
- [ ] Tests passing at each phase
- [ ] Performance benchmarks
- [ ] Documentation of changes

### Post-implementation
- [ ] Testing on real project
- [ ] Validation of analysis precision
- [ ] Measurement of performance overhead
- [ ] Documentation update

---

**Nota**: This plan represents the natural evolution of OmnySys towards more granular analysis without sacrificing the efficiency of the hybrid approach that already works.

**Autor**: Claude + Mauro (discussion 2026-02-08)
**Related**: `ARCHITECTURE_MOLECULAR_PLAN.md` for core concepts
