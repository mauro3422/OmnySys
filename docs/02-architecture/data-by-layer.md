# Datos por Layer - Contratos y Capacidades

**Versión**: 1.0.0  
**Actualizado**: 2026-02-18  

---

## Resumen Ejecutivo

Cada layer extrae y procesa datos específicos. Este documento detalla **qué datos tenemos disponibles** y **qué podemos hacer con ellos**.

---

## Layer A: Static Analysis

### Extractores Activos (17)

```javascript
// src/layer-a-static/extractors/metadata/index.js

const extractors = {
  // CONTRATOS
  jsdoc: extractJSDocContracts(code),      // @param, @returns, @throws
  runtime: extractRuntimeContracts(code),   // Runtime type checks
  
  // PATRONES
  async: extractAsyncPatterns(code),        // async/await, Promises
  errors: extractErrorHandling(code),       // try/catch, throws
  build: extractBuildTimeDependencies(code),// package.json deps
  
  // AVANZADOS
  sideEffects: extractSideEffects(code),    // localStorage, events, globals
  callGraph: extractCallGraph(code),        // function calls
  dataFlow: extractDataFlow(code),          // value transformations
  typeInference: extractTypeInference(code),// inferred types
  temporal: extractTemporalPatterns(code),  // lifecycle hooks
  depDepth: extractDependencyDepth(code),   // import depth
  performance: extractPerformanceHints(code),// perf warnings
  historical: extractHistoricalMetadata(file),// git history
  
  // NUEVOS
  dna: extractDNA(code),                    // Structural fingerprint
  errorFlow: extractErrorFlow(code),        // Error propagation
  performanceMetrics: extractPerformanceMetrics(code),
  typeContracts: extractTypeContracts(code)
};
```

### Output por Archivo

```javascript
{
  filePath: 'src/api.js',
  
  // Cultura del archivo (ver file-cultures.md)
  culture: 'ciudadano',  // 'aduanero' | 'leyes' | 'auditor' | 'script' | 'ciudadano' | 'desconocido'
  cultureRole: 'Lógica de negocio productiva',
  
  // Partículas sueltas (constantes exportadas SIN función contenedora)
  objectExports: [
    { name: 'BATCH_SIZE', value: 20, type: 'number' },
    { name: 'TIMEOUTS', value: { default: 30000, max: 60000 }, type: 'object' }
  ],
  constantExports: [
    { name: 'DEFAULT_TIMEOUT', value: 30000, type: 'number' }
  ],
  
  // Side Effects
  sideEffects: {
    hasNetworkCalls: true,
    hasLocalStorage: false,
    hasEventListeners: true,
    hasGlobals: false,
    events: ['save', 'load', 'error'],
    networkCalls: [{ url: '/api/users', method: 'GET' }]
  },
  
  // Call Graph
  callGraph: {
    functionDefinitions: [
      { name: 'fetchUser', params: ['id'], isAsync: true, isExported: true }
    ],
    internalCalls: [{ callee: 'validateUser', line: 15 }],
    externalCalls: [{ callee: 'axios.get', line: 20 }]
  },
  
  // Data Flow
  dataFlow: {
    inputs: [{ name: 'id', type: 'string' }],
    outputs: [{ type: 'User', confidence: 0.85 }],
    transforms: ['validation', 'fetch', 'mapping']
  },
  
  // Performance
  performance: {
    hasNPlusOne: false,
    hasNestedLoops: true,
    estimatedComplexity: 'O(n²)'
  },
  
  // DNA (fingerprint)
  dna: {
    operationSequence: ['receive', 'validate', 'fetch', 'transform', 'return'],
    pattern: 'read-transform-return',
    clan: 'data-fetchers'
  }
}
```

---

## Layer Graph: Graph Operations

### Datos del Grafo

```javascript
{
  // Nodos
  files: {
    'src/api.js': {
      path: 'src/api.js',
      exports: [...],
      imports: [...],
      usedBy: ['src/main.js', 'src/routes.js'],
      dependsOn: ['src/utils.js', 'src/config.js'],
      transitiveDepends: ['src/types.js', 'src/constants.js'],
      transitiveDependents: ['src/app.js', 'src/server.js']
    }
  },
  
  // Aristas
  dependencies: [
    { from: 'src/api.js', to: 'src/utils.js', type: 'esm', symbols: ['helper'] }
  ],
  
  // Function Links
  function_links: [
    { from: 'src/api.js::fetchUser', to: 'src/utils.js::validate', line: 15 }
  ],
  
  // Métricas
  metadata: {
    totalFiles: 45,
    totalDependencies: 120,
    cyclesDetected: [['src/a.js', 'src/b.js', 'src/a.js']],
    totalFunctions: 230,
    totalFunctionLinks: 450
  }
}
```

### Algoritmos Disponibles

```javascript
// Ciclos
detectCycles(files) → [['a.js', 'b.js', 'a.js']]
isInCycle(file, cycles) → true/false
getFilesInCycles(cycles) → Set<string>

// Impacto
getImpactMap(file, files) → { directDependents, indirectDependents, riskLevel }
findHighImpactFiles(files, limit) → [{ path, dependentCount }]

// Transitivas
calculateTransitiveDependencies(file, files) → Set<string>
calculateTransitiveDependents(file, files) → Set<string>
```

---

## Layer B: Semantic Analysis

### Detección de Arquetipos

```javascript
{
  archetypes: [
    {
      type: 'god-object',
      severity: 8,
      confidence: 0.85,
      evidence: ['exports > 15', 'dependents > 20']
    },
    {
      type: 'event-hub',
      severity: 6,
      confidence: 0.92,
      evidence: ['5 event emitters', '3 event listeners']
    }
  ]
}
```

### Insights LLM (cuando aplica)

```javascript
{
  llmInsights: {
    responsibilities: ['data fetching', 'validation', 'error handling'],
    suggestedSplit: [
      { functions: ['fetchUser', 'fetchAdmin'], newFile: 'user-fetcher.js' },
      { functions: ['validateUser', 'validateAdmin'], newFile: 'user-validator.js' }
    ],
    riskFactors: ['circular dependency', 'tight coupling'],
    recommendations: ['Extract validation to separate module']
  }
}
```

---

## Layer C: Memory & MCP Tools

### 14 Herramientas Disponibles

```
┌─────────────────────────────────────────────────────────────────────────┐
│  HERRAMIENTA         │  QUÉ HACE                                        │
├─────────────────────────────────────────────────────────────────────────┤
│  get_impact_map      │  Mapa completo de impacto de un archivo          │
│  analyze_change      │  Impacto de cambiar un símbolo específico        │
│  explain_connection  │  Por qué dos archivos están conectados           │
│  get_risk_assessment │  Evaluación de riesgo del proyecto               │
│  search_files        │  Buscar archivos por patrón                      │
│  get_server_status   │  Estado del servidor OmnySys                     │
│  get_call_graph      │  Todos los call sites de un símbolo              │
│  analyze_signature   │  Predice breaking changes en firma               │
│  explain_value_flow  │  Flujo de datos: inputs → símbolo → outputs      │
│  get_function_details│  Info atómica: arquetipo, complejidad, calls    │
│  get_molecule_summary│  Resumen molecular de un archivo                 │
│  get_atomic_functions│  Lista funciones por arquetipo                   │
│  get_tunnel_vision   │  Stats de tunnel vision detectado                │
│  atomic_edit         │  Edita con validación atómica                    │
│  atomic_write        │  Escribe archivo nuevo con validación            │
└─────────────────────────────────────────────────────────────────────────┘
```

---

## Qué Podemos Hacer con Estos Datos

### 1. Calcular Entropía

```javascript
function calculateEntropy(file) {
  const connections = [
    ...file.dependsOn.map(d => ({ to: d, type: 'import' })),
    ...file.usedBy.map(u => ({ from: u, type: 'dependent' }))
  ];
  
  const healthyConnections = connections.filter(c => c.confidence >= 0.8);
  const brokenConnections = connections.filter(c => c.confidence < 0.3);
  
  const p = healthyConnections.length / connections.length;
  
  if (p === 0 || p === 1) return 0;
  return -p * Math.log2(p) - (1-p) * Math.log2(1-p);
}
```

### 2. Detectar Sociedades

```javascript
function detectSociety(functions, callGraph) {
  // Encontrar cadenas secuenciales
  const chains = findSequentialChains(callGraph);
  
  // A → B → C = "pipeline"
  // A → B, A → C = "fan-out"
  // A → C, B → C = "fan-in"
  
  return chains.map(chain => ({
    type: classifyPattern(chain),
    members: chain,
    cohesion: calculateCohesion(chain),
    stability: calculateStability(chain)
  }));
}
```

### 3. Predecir Cambios

```javascript
function predictChanges(atom, history) {
  const similarAtoms = findByDNA(atom.dna);
  const historicalPatterns = analyzeHistory(similarAtoms);
  
  return {
    likely: [
      { change: 'add_error_handling', probability: 0.75 },
      { change: 'add_validation', probability: 0.65 },
      { change: 'add_caching', probability: 0.45 }
    ]
  };
}
```

### 4. Auto-Reparar

```javascript
function autoFix(file, issue) {
  switch (issue.type) {
    case 'broken_import':
      const candidates = searchExports(issue.symbol);
      return { fix: `Update import to: ${candidates[0]}` };
      
    case 'renamed_function':
      return { fix: `Update calls from ${issue.oldName} to ${issue.newName}` };
      
    case 'missing_param':
      return { fix: `Add default: ${issue.param} = ${issue.defaultValue}` };
  }
}
```

---

## Flujo de Datos Completo

```
┌─────────────────────────────────────────────────────────────────────────┐
│                         FLUJO DE DATOS                                  │
└─────────────────────────────────────────────────────────────────────────┘

     ARCHIVO FUENTE
          │
          ▼
┌─────────────────────────────────────────────────────────────────────────┐
│  LAYER A: EXTRACCIÓN                                                    │
│                                                                         │
│  17 extractores → metadata completa                                     │
│  • jsdoc, runtime, async, errors                                        │
│  • sideEffects, callGraph, dataFlow                                     │
│  • dna, typeContracts, performance                                      │
│                                                                         │
│  Output: { metadata, atoms, dna }                                       │
└─────────────────────────────────────────────────────────────────────────┘
          │
          ▼
┌─────────────────────────────────────────────────────────────────────────┐
│  LAYER GRAPH: CONSTRUCCIÓN                                              │
│                                                                         │
│  buildSystemMap(parsedFiles, resolvedImports)                           │
│  • Crear nodos y aristas                                                │
│  • Detectar ciclos                                                      │
│  • Calcular transitivas                                                 │
│  • Calcular pesos                                                       │
│                                                                         │
│  Output: { files, dependencies, function_links, metadata }              │
└─────────────────────────────────────────────────────────────────────────┘
          │
          ▼
┌─────────────────────────────────────────────────────────────────────────┐
│  LAYER B: ANÁLISIS SEMÁNTICO                                            │
│                                                                         │
│  detectArchetypes(metadata) → archetypes                                │
│  analyzeWithLLM(if needed) → llmInsights                                │
│  validateContracts() → validation                                       │
│                                                                         │
│  Output: { archetypes, insights, recommendations }                      │
└─────────────────────────────────────────────────────────────────────────┘
          │
          ▼
┌─────────────────────────────────────────────────────────────────────────┐
│  LAYER C: MEMORIA & EXPOSICIÓN                                          │
│                                                                         │
│  Persistir en .omnysysdata/                                             │
│  Exponer via MCP (14 tools)                                             │
│  Calcular métricas en vivo                                              │
│                                                                         │
│  Output: Herramientas para IA/desarrollador                             │
└─────────────────────────────────────────────────────────────────────────┘
          │
          ▼
┌─────────────────────────────────────────────────────────────────────────┐
│  NUEVAS CAPACIDADES (propuestas)                                        │
│                                                                         │
│  • Calcular entropía por archivo                                        │
│  • Detectar sociedades de átomos                                        │
│  • Predecir cambios probables                                           │
│  • Auto-reparar imports rotos                                           │
│  • Alertar cuando se exceden límites                                    │
└─────────────────────────────────────────────────────────────────────────┘
```

---

## Referencias

- [code-physics.md](./code-physics.md) - Visión de código como física
- [layer-graph.md](./layer-graph.md) - Sistema de grafos
- [core.md](./core.md) - Arquitectura general
