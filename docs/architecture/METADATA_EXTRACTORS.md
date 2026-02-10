# Metadata Extractors - Sistema de Extracción de Metadata

**Ubicación**: `src/layer-a-static/extractors/metadata/`
**Total Extractors**: 18 (13 original + 5 new in v0.7.1)
**Versión**: 0.7.1

---

## 🎯 Visión General

El sistema de metadata extractors es el corazón de Layer A (Static Analysis). Cada extractor analiza el AST de una función y extrae un tipo específico de metadata **sin necesidad de LLM**.

### Arquitectura

```
┌─────────────────────────────────────────────────────────────┐
│                    AST (Babel Parser)                        │
└─────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────┐
│              18 METADATA EXTRACTORS (Parallel)               │
│  ┌──────────┬──────────┬──────────┬──────────┬──────────┐  │
│  │ JSDoc    │ Async    │ Error    │ Call     │ Data     │  │
│  │ Contracts│ Patterns │ Handling │ Graph    │ Flow     │  │
│  └──────────┴──────────┴──────────┴──────────┴──────────┘  │
│  ┌──────────┬──────────┬──────────┬──────────┬──────────┐  │
│  │ Type     │ Temporal │ Side     │ Perf     │ DNA      │  │
│  │ Inference│ Patterns │ Effects  │ Hints    │ Extractor│  │
│  └──────────┴──────────┴──────────┴──────────┴──────────┘  │
│  ┌──────────┬──────────┬──────────┬──────────┬──────────┐  │
│  │ Temporal │ Type     │ Error    │ Perf     │ Runtime  │  │
│  │ Connect. │ Contracts│ Flow     │ Impact   │ Contracts│  │
│  └──────────┴──────────┴──────────┴──────────┴──────────┘  │
│  ┌──────────┬──────────┬──────────┐                        │
│  │ Dep      │ Build    │ Hist     │                        │
│  │ Depth    │ Time Deps│ Metadata │                        │
│  └──────────┴──────────┴──────────┘                        │
└─────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────┐
│                    ATOM METADATA (Rich)                      │
│  { jsdoc, async, errors, callGraph, dataFlow, types, ... }  │
└─────────────────────────────────────────────────────────────┘
```

### Principios

1. **Single Responsibility**: Cada extractor hace UNA cosa
2. **No LLM Required**: Todo es análisis estático del AST
3. **Composable**: Los metadatos se combinan para detectar patrones
4. **Fast**: Ejecución paralela, cada extractor ~1-5ms
5. **Deterministic**: Mismo input → mismo output siempre

---

## 📋 Todos los Extractors (18 Total)

### Extractores Originales (13)

| # | Extractor | Output Key | Propósito |
|---|-----------|------------|-----------|
| 1 | `jsdoc-contracts.js` | `jsdocContracts` | Extrae tipos JSDoc/TypeScript |
| 2 | `runtime-contracts.js` | `runtimeContracts` | Detecta validaciones Zod/Joi/Yup |
| 3 | `async-patterns.js` | `asyncPatterns` | Analiza async/await, Promises |
| 4 | `error-handling.js` | `errorHandling` | Mapea try/catch, throws |
| 5 | `build-time-deps.js` | `buildTimeDeps` | Detecta dependencias build-time |
| 6 | `call-graph.js` | `callGraph` | Construye grafo de llamadas |
| 7 | `data-flow.js` | `dataFlow` | Extrae flujo de datos básico |
| 8 | `type-inference.js` | `typeInference` | Infiere tipos desde código |
| 9 | `dependency-depth.js` | `dependencyDepth` | Calcula profundidad de imports |
| 10 | `performance-hints.js` | `performanceHints` | Detecta loops, operaciones costosas |
| 11 | `historical-metadata.js` | `historicalMetadata` | Extrae metadata de Git |
| 12 | `temporal-patterns.js` | `temporalPatterns` | Detecta lifecycle hooks |
| 13 | `side-effects.js` | `sideEffects` | Detecta efectos secundarios |

### Extractores Nuevos v0.7.1 (5)

| # | Extractor | Output Key | Propósito |
|---|-----------|------------|-----------|
| 14 | `dna-extractor.js` | `dna` | Fingerprint único del átomo |
| 15 | `temporal-connections.js` | `temporalConnections` | Orden de ejecución, lifecycle |
| 16 | `type-contracts.js` | `typeContracts` | Validación de compatibilidad |
| 17 | `error-flow.js` | `errorFlow` | Mapeo throws→catches completo |
| 18 | `performance-impact.js` | `performanceImpact` | Score de impacto de rendimiento |

---

## 📖 Extractores Originales (Detalles)

### 1. jsdoc-contracts.js

**Propósito**: Extraer tipos y contratos desde JSDoc y TypeScript.

**Output**:
```javascript
{
  hasJSDoc: true,
  paramTypes: [
    { name: 'userId', type: 'string', required: true, description: 'User ID' }
  ],
  returnType: { type: 'Promise<User>', nullable: false },
  throws: ['NotFoundError'],
  deprecated: false,
  since: '1.0.0'
}
```

**Detecta**:
- @param, @returns, @throws
- TypeScript type annotations
- Deprecated functions
- Version annotations

### 2. runtime-contracts.js

**Propósito**: Detectar validaciones runtime (Zod, Joi, Yup, class-validator).

**Output**:
```javascript
{
  hasValidation: true,
  validationType: 'zod',
  schemas: [
    { name: 'userSchema', library: 'zod', fields: [...] }
  ],
  validationPoints: ['param-0', 'return']
}
```

**Soporta**:
- Zod
- Joi
- Yup
- class-validator
- Custom validators

### 3. async-patterns.js

**Propósito**: Analizar patrones asíncronos.

**Output**:
```javascript
{
  isAsync: true,
  usesAwait: true,
  usesPromises: true,
  usesCallbacks: false,
  promiseChains: 2,
  awaitCount: 3,
  hasPromiseAll: true,
  hasPromiseRace: false
}
```

### 4. error-handling.js

**Propósito**: Mapear manejo de errores.

**Output**:
```javascript
{
  hasTryCatch: true,
  catchBlocks: 2,
  throwsErrors: true,
  errorTypes: ['ValidationError', 'Error'],
  hasFinally: true,
  propagatesErrors: true
}
```

### 5. build-time-deps.js

**Propósito**: Detectar dependencias de build-time vs runtime.

**Output**:
```javascript
{
  buildTimeDeps: ['typescript', 'webpack'],
  runtimeDeps: ['express', 'lodash'],
  devDeps: ['jest', 'eslint'],
  totalDeps: 5
}
```

### 6. call-graph.js

**Propósito**: Construir grafo de llamadas.

**Output**:
```javascript
{
  internalCalls: [
    { name: 'validateUser', line: 10, args: 1 }
  ],
  externalCalls: [
    { name: 'fetch', module: 'global', line: 15 }
  ],
  totalCalls: 5
}
```

### 7. data-flow.js (v1 - Legacy)

**Propósito**: Extracción básica de flujo de datos.

**Output**:
```javascript
{
  inputs: ['userId'],
  outputs: ['user'],
  assignments: 3,
  mutations: 1
}
```

**Nota**: Reemplazado por Data Flow v2 en v0.7.1 (mucho más completo).

### 8. type-inference.js

**Propósito**: Inferir tipos desde el código.

**Output**:
```javascript
{
  inferredTypes: {
    'userId': 'string',
    'count': 'number',
    'user': 'object'
  },
  confidence: 0.85
}
```

### 9. dependency-depth.js

**Propósito**: Calcular profundidad de dependencias.

**Output**:
```javascript
{
  totalImports: 5,
  maxDepth: 3,
  avgDepth: 2.2,
  deepestChain: ['a.js', 'b.js', 'c.js', 'd.js']
}
```

### 10. performance-hints.js

**Propósito**: Detectar posibles problemas de performance.

**Output**:
```javascript
{
  nestedLoops: 2,
  blockingOps: ['fs.readFileSync'],
  hasRecursion: false,
  complexityWarnings: ['high-cyclomatic'],
  estimatedComplexity: 'O(n²)'
}
```

### 11. historical-metadata.js

**Propósito**: Extraer metadata de Git history.

**Output**:
```javascript
{
  commits: 15,
  authors: 3,
  lastModified: '2026-02-09',
  churnRate: 0.7,
  hotspotScore: 8.5
}
```

### 12. temporal-patterns.js

**Propósito**: Detectar patrones de lifecycle.

**Output**:
```javascript
{
  framework: 'react',
  lifecycleHooks: ['useEffect', 'componentDidMount'],
  eventListeners: ['onClick', 'onSubmit'],
  timerPatterns: ['setTimeout', 'setInterval']
}
```

**Soporta**:
- React (hooks + class components)
- Vue (setup, mounted, etc.)
- Angular (ngOnInit, ngOnDestroy)
- Svelte (onMount, onDestroy)
- SolidJS (onMount, onCleanup)

### 13. side-effects.js

**Propósito**: Detectar efectos secundarios.

**Output**:
```javascript
{
  hasSideEffects: true,
  types: {
    network: ['fetch', 'axios'],
    dom: ['document.getElementById'],
    storage: ['localStorage.setItem'],
    console: ['console.log'],
    timers: ['setTimeout']
  },
  totalSideEffects: 5
}
```

---

## 🆕 Extractores Nuevos v0.7.1 (Detalles Completos)

### 14. dna-extractor.js - DNA Fingerprinting

**Agregado en**: v0.7.1
**Propósito**: Generar un fingerprint único y estable para cada átomo, usado por Shadow Registry.

**Output**:
```javascript
{
  structuralHash: "sha256:abc123def456...",
  patternHash: "sha256:789xyz...",
  flowType: "read-transform-persist",
  semanticFingerprint: "verb:process domain:user entity:data",

  // Metadata usada para generar hash
  _metadata: {
    paramCount: 2,
    returnType: 'object',
    complexity: 7,
    hasSideEffects: true,
    callGraphSize: 5
  }
}
```

**Cómo funciona**:

1. **Structural Hash**: Hash del AST normalizado (sin nombres específicos)
   ```javascript
   // Ignora nombres de variables, conserva estructura
   function foo(x) { return x + 1; }
   function bar(y) { return y + 1; }
   // → Mismo structuralHash
   ```

2. **Pattern Hash**: Hash del patrón de data flow estandarizado
   ```javascript
   // INPUT → TRANSFORM → OUTPUT
   // → patternHash único por patrón
   ```

3. **Flow Type**: Clasificación de alto nivel
   - `read-only`: Solo lectura
   - `read-transform`: Lee y transforma
   - `read-transform-persist`: CRUD completo
   - `event-handler`: Responde a eventos
   - `pure-computation`: Sin side effects

4. **Semantic Fingerprint**: Verbo + Dominio + Entidad
   ```javascript
   // "verb:fetch domain:user entity:profile"
   // "verb:validate domain:payment entity:card"
   ```

**Casos de uso**:
- Encontrar átomos similares (>85% match)
- Detectar duplicación semántica
- Rastrear linaje después de refactorización
- Sugerir conexiones basadas en similarity

**Integración**:
```javascript
// En Shadow Registry
const similar = await shadowRegistry.findSimilar(atom.dna, 0.85);
// → [{ shadow, similarity: 0.92 }, ...]

// En Connection Enricher
const ancestry = enricher.findAncestry(atom.dna);
// → { parent: shadowId, vibrationScore: 0.78 }
```

---

### 15. temporal-connections.js - Temporal Execution Patterns

**Agregado en**: v0.7.1
**Propósito**: Detectar orden de ejecución, lifecycle patterns, y patrones async.

**Output**:
```javascript
{
  lifecycle: {
    hasInit: true,
    hasDestroy: false,
    hasBeforeMount: false,
    hasAfterMount: true,
    hooks: ['useEffect', 'componentDidMount']
  },

  eventDriven: {
    listeners: [
      { event: 'click', handler: 'handleClick', element: 'button' }
    ],
    emitters: [
      { event: 'dataLoaded', payload: 'user' }
    ],
    handlers: ['onClick', 'onSubmit']
  },

  asyncFlow: {
    usesPromises: true,
    usesAsyncAwait: true,
    usesCallbacks: false,
    parallelCalls: [
      { type: 'Promise.all', calls: ['fetchUser', 'fetchOrders'] }
    ],
    sequentialCalls: [
      { first: 'login', then: 'fetchProfile' }
    ]
  },

  timers: {
    hasTimers: true,
    types: ['setTimeout', 'setInterval'],
    delays: [1000, 5000],
    hasCleanup: true
  },

  executionOrder: {
    detectableOrder: true,
    sequence: ['init', 'fetch', 'render', 'cleanup'],
    hasConcurrency: true
  }
}
```

**Detecta**:

1. **Lifecycle Hooks**:
   - React: useEffect, componentDidMount, componentWillUnmount
   - Vue: setup, mounted, beforeDestroy, onMounted
   - Angular: ngOnInit, ngOnDestroy
   - Svelte: onMount, onDestroy
   - SolidJS: onMount, onCleanup

2. **Event Patterns**:
   - Event listeners: addEventListener, onClick, etc.
   - Event emitters: emit, dispatchEvent, trigger
   - Custom events

3. **Async Patterns**:
   - Parallel execution: Promise.all, Promise.race
   - Sequential execution: await chain
   - Callbacks vs Promises

4. **Timers**:
   - setTimeout, setInterval
   - requestAnimationFrame
   - Cleanup detection (clearTimeout, etc.)

**Casos de uso**:
- Detectar race conditions (usado en race-detector)
- Validar orden de inicialización
- Optimizar ejecución paralela
- Detectar memory leaks (timers sin cleanup)

**Integración con Race Detector**:
```javascript
// En race-detection-strategy.js
sameBusinessFlow(access1, access2) {
  const temporal1 = access1.atom.temporalConnections;
  const temporal2 = access2.atom.temporalConnections;

  // Si ambos en Promise.all → ejecución paralela → posible race
  if (temporal1.asyncFlow.parallelCalls && temporal2.asyncFlow.parallelCalls) {
    return false; // Diferentes flows, pueden correr en paralelo
  }

  // Si uno en cleanup de otro → secuencial → no race
  if (temporal1.lifecycle.hasDestroy && temporal2.lifecycle.hasInit) {
    return false; // Orden garantizado
  }
}
```

---

### 16. type-contracts.js - Type Contract Validation

**Agregado en**: v0.7.1
**Propósito**: Validar compatibilidad de tipos entre conexiones.

**Output**:
```javascript
{
  jsdoc: {
    hasJSDoc: true,
    valid: true,
    paramTypes: [
      { name: 'userId', type: 'string', required: true, nullable: false }
    ],
    returnType: {
      type: 'Promise<User>',
      nullable: false,
      genericParams: ['User']
    },
    throws: ['NotFoundError', 'ValidationError']
  },

  runtime: {
    hasTypeGuards: true,
    hasValidation: true,
    validationType: 'zod',
    schemas: [
      {
        name: 'UserSchema',
        fields: [
          { name: 'id', type: 'string', required: true },
          { name: 'email', type: 'string', required: true }
        ]
      }
    ]
  },

  compatibility: {
    score: 0.95,
    issues: [],
    warnings: ['Nullable return not validated in runtime']
  },

  inference: {
    canInferTypes: true,
    confidence: 0.9,
    inferredTypes: {
      'userId': { type: 'string', source: 'jsdoc' },
      'result': { type: 'User', source: 'inference' }
    }
  }
}
```

**Validaciones**:

1. **JSDoc/TypeScript**:
   - Parámetros coinciden con uso
   - Return type correcto
   - Nullable/undefined handling

2. **Runtime Validation**:
   - Zod schemas
   - Joi validators
   - Yup schemas
   - class-validator decorators

3. **Cross-Connection Validation**:
   ```javascript
   // Función A
   function getUser(id: string): User { ... }

   // Función B
   function processUser(user: number) { ... }
   //                          ^^^^^^ Type mismatch!

   // typeContracts detecta incompatibilidad
   ```

**Casos de uso**:
- Detectar breaking changes en APIs
- Validar refactorizaciones
- Auto-sugerir type fixes
- Prevenir runtime type errors

**Integración con Connection Enricher**:
```javascript
// En connection-enricher.js
const typeCompatibility = validateTypeContract(
  sourceAtom.typeContracts,
  targetAtom.typeContracts,
  connection
);

connection.typeCompatibility = {
  compatible: typeCompatibility.score > 0.8,
  score: typeCompatibility.score,
  issues: typeCompatibility.issues
};
```

---

### 17. error-flow.js - Complete Error Flow Mapping

**Agregado en**: v0.7.1
**Propósito**: Mapeo completo de flujo de errores (quién lanza, quién atrapa).

**Output**:
```javascript
{
  throws: [
    {
      type: 'ValidationError',
      message: 'Invalid input',
      line: 15,
      conditional: true,
      condition: '!user.email'
    },
    {
      type: 'NotFoundError',
      message: 'User not found',
      line: 20,
      conditional: false
    }
  ],

  catches: [
    {
      type: 'ValidationError',
      handler: 'local',
      rethrows: false,
      line: 25,
      handlesTypes: ['ValidationError']
    },
    {
      type: 'Error',
      handler: 'global',
      rethrows: true,
      line: 30,
      handlesTypes: ['Error', '*']  // Catch-all
    }
  ],

  unhandled: ['NotFoundError'],  // ⚠️ Peligro: no hay catch para este

  propagation: 'upstream',  // local | upstream | global

  errorHandlingScore: 0.7,  // 0-1, basado en coverage

  analysis: {
    totalThrows: 2,
    totalCatches: 2,
    coverage: 0.5,  // 50% de throws con catch
    hasGlobalHandler: true,
    rethrowRate: 0.5
  }
}
```

**Detecta**:

1. **Throws**:
   - new Error(), throw statements
   - Tipo de error (si es detectable)
   - Mensaje de error
   - Condicional vs incondicional

2. **Catches**:
   - try/catch blocks
   - Tipos capturados (si filtra por tipo)
   - Si rethrow o maneja localmente
   - Catch-all vs específico

3. **Propagación**:
   ```javascript
   // Local: manejado en la función
   try { ... } catch (e) { console.log(e); }

   // Upstream: rethrow a caller
   try { ... } catch (e) { throw new CustomError(e); }

   // Global: sin catch, propaga al top
   throw new Error(); // Sin try/catch
   ```

4. **Unhandled Errors**:
   ```javascript
   function risky() {
     throw new NotFoundError();  // ← No hay catch para este tipo
     try {
       throw new ValidationError();
     } catch (ValidationError e) {
       // Solo captura ValidationError
     }
   }
   // → unhandled: ['NotFoundError']
   ```

**Casos de uso**:
- Detectar errores no manejados
- Validar error handling completo
- Mapear propagación de errores en call chains
- Generar error handling reports

**Integración con Connection Enricher**:
```javascript
// En connection-enricher.js
const errorFlow = analyzeErrorPropagation(
  sourceAtom.errorFlow,
  targetAtom.errorFlow
);

connection.errorPropagation = {
  canPropagate: errorFlow.unhandledInSource.length > 0,
  unhandledTypes: errorFlow.unhandledInSource,
  requiresCatch: errorFlow.requiresCatch
};
```

---

### 18. performance-impact.js - Performance Impact Scoring

**Agregado en**: v0.7.1
**Propósito**: Calcular score de impacto de rendimiento (0-10).

**Output**:
```javascript
{
  score: 7.5,  // 0-10, mayor = más impacto
  level: 'high',  // low | medium | high | critical

  factors: {
    nestedLoops: 2,
    loopDepth: 2,
    blockingOps: [
      { op: 'fs.readFileSync', line: 15, impact: 'critical' },
      { op: 'heavyComputation', line: 20, impact: 'high' }
    ],
    recursion: false,
    recursionDepth: 0,
    asyncOverhead: true,
    asyncCount: 5
  },

  complexity: {
    cyclomatic: 12,
    cognitive: 8,
    halstead: {
      volume: 450,
      difficulty: 15,
      effort: 6750
    },
    estimatedBigO: 'O(n²)'
  },

  hotspots: [
    { line: 15, reason: 'nested-loop', severity: 'high' },
    { line: 20, reason: 'blocking-io', severity: 'critical' }
  ],

  recommendations: [
    'Consider async I/O instead of fs.readFileSync',
    'Reduce nested loop depth or use more efficient algorithm'
  ]
}
```

**Calcula**:

1. **Nested Loops**:
   ```javascript
   for (let i = 0; i < n; i++) {
     for (let j = 0; j < m; j++) {  // ← Depth 2
       for (let k = 0; k < p; k++) {  // ← Depth 3
         // O(n*m*p) → score += 3
       }
     }
   }
   ```

2. **Blocking Operations**:
   - Synchronous I/O: fs.readFileSync, fs.writeFileSync
   - CPU-intensive: JSON.parse (large data), crypto, heavy regex
   - Database: synchronous queries
   - Network: synchronous HTTP calls

3. **Recursion**:
   ```javascript
   function factorial(n) {
     if (n <= 1) return 1;
     return n * factorial(n - 1);  // ← Recursion detected
   }
   // → recursion: true, estimatedDepth: n
   ```

4. **Async Overhead**:
   - Muchos awaits en secuencia (vs paralelo)
   - Async en loops
   - Promise creation overhead

5. **Complexity Metrics**:
   - **Cyclomatic**: Branches (if, switch, loops)
   - **Cognitive**: Dificultad de entender
   - **Halstead**: Volumen de operadores/operandos

**Score Calculation**:
```javascript
score = base(5.0)
  + nestedLoops * 1.5
  + blockingOps.length * 2.0
  + recursion ? 1.0 : 0
  + asyncOverhead ? 0.5 : 0
  + (complexity.cyclomatic > 10 ? 1.0 : 0)
```

**Casos de uso**:
- Detectar performance hotspots
- Priorizar optimizaciones
- Calcular impacto en call chains
- Code review automático

**Integración con Connection Enricher**:
```javascript
// En connection-enricher.js
const chainImpact = calculateChainImpact(callChain);
// Si A (high) → B (high) → C (low)
// → chainImpact: 'critical' (dos high en cadena)

connection.performanceImpact = {
  sourceScore: sourceAtom.performanceImpact.score,
  targetScore: targetAtom.performanceImpact.score,
  chainScore: chainImpact,
  recommendation: chainImpact > 15 ? 'Optimize this chain' : null
};
```

---

## 🔗 Integración en Pipeline

### Extracción Automática

Todos los extractors se ejecutan automáticamente en `atom-extraction-phase.js`:

```javascript
// En atom-extraction-phase.js
import * as metadataExtractors from '../extractors/metadata/index.js';

// Para cada función detectada
for (const func of functions) {
  const atom = {
    id: generateId(func),
    name: func.name,
    // ... metadata básico
  };

  // Ejecutar todos los extractors (paralelo)
  const metadata = await Promise.all([
    metadataExtractors.extractJSDocContracts(func.ast),
    metadataExtractors.extractRuntimeContracts(func.ast),
    metadataExtractors.extractAsyncPatterns(func.ast),
    metadataExtractors.extractErrorHandling(func.ast),
    // ... todos los 18 extractors
  ]);

  // Merge metadata en atom
  Object.assign(atom, ...metadata);

  atoms.push(atom);
}
```

### Acceso desde MCP

```javascript
// Via get_function_details
const details = await get_function_details({
  filePath: 'src/utils.js',
  functionName: 'processUser'
});

console.log(details);
// {
//   name: 'processUser',
//   jsdocContracts: { ... },
//   runtimeContracts: { ... },
//   asyncPatterns: { ... },
//   errorFlow: { ... },
//   performanceImpact: { score: 7.5, ... },
//   dna: { structuralHash: '...', ... },
//   // ... todos los 18 metadatos
// }
```

---

## 📊 Metadata Combinations (Pillar 2)

Los metadatos se combinan para detectar patrones complejos:

### Ejemplo 1: Network Hub Archetype

```javascript
// Combina: side-effects + call-graph + data-flow
if (
  atom.sideEffects.types.network.length > 3 &&
  atom.callGraph.totalCalls > 5 &&
  atom.dataFlow.outputs.includes('response')
) {
  archetype = 'network-hub';
}
```

### Ejemplo 2: Critical Bottleneck

```javascript
// Combina: performance-impact + historical-metadata + call-graph
if (
  atom.performanceImpact.score > 7.0 &&
  atom.historicalMetadata.churnRate > 0.8 &&
  atom.callGraph.calledBy.length > 10
) {
  archetype = 'critical-bottleneck';
}
```

### Ejemplo 3: Unhandled Error Risk

```javascript
// Combina: error-flow + type-contracts + call-graph
if (
  atom.errorFlow.unhandled.length > 0 &&
  atom.typeContracts.throws.length > 0 &&
  atom.callGraph.calledBy.some(caller => !caller.hasTryCatch)
) {
  risk = 'high-unhandled-error-risk';
}
```

---

## 🎯 Roadmap

### v0.7.2 (Short-term)
- ✅ Tests unitarios para cada extractor
- ✅ Benchmark de performance
- ✅ Documentar todas las combinaciones útiles

### v0.8.0 (Mid-term)
- ✅ Security metadata extractor
- ✅ Memory usage extractor
- ✅ Accessibility patterns extractor

### v0.9.0 (Long-term)
- ✅ ML-based pattern detection
- ✅ Auto-suggest new extractors
- ✅ Custom extractor plugin system

---

## 📚 Referencias

- **Pillar 2**: `docs/architecture/CORE_PRINCIPLES.md` - Metadata Insights
- **Catalog**: `docs/guides/METADATA_INSIGHTS_CATALOG.md`
- **Changelog**: `changelog/v0.7.1.md`
- **Tests**: `src/layer-a-static/extractors/metadata/__tests__/` (pendiente)

---

**Última actualización**: 2026-02-09
**Versión del documento**: 1.0.0
**Estado**: Production Ready
