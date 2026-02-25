# Datos por Layer - Contratos y Capacidades

**Versión**: v0.9.61  
**Actualizado**: 2026-02-25  
**Estado**: ✅ **100% Estático, 0% LLM** - Datos en SQLite

---

## Resumen Ejecutivo

Cada layer extrae y procesa datos específicos. Este documento detalla **qué datos tenemos disponibles** y **qué podemos hacer con ellos**.

**IMPORTANTE (v0.9.61)**: Todos los datos se persisten en **SQLite** (.omnysysdata/omnysys.db), no en JSONs dispersos.

---

## Layer A: Static Analysis

### Extractores Activos (17)

**Código REAL**: `src/layer-a-static/indexer.js` + extractores

```javascript
// Pipeline completo de Layer A
export async function indexProject(rootPath, options = {}) {
  // 1. scanProjectFiles()
  const { relativeFiles, files } = await scanProjectFiles(absoluteRootPath, verbose);
  
  // 2. parseFiles()
  const parsedFiles = await parseFiles(files, verbose);
  
  // 3. extractAndSaveAtoms() - AtomExtractionPhase
  const totalAtomsExtracted = await extractAndSaveAtoms(parsedFiles, absoluteRootPath, verbose);
  
  // 4. buildCalledByLinks() - 6 sub-pasos
  await buildCalledByLinks(parsedFiles, absoluteRootPath, verbose);
  
  // 5. resolveImports()
  const { resolvedImports } = await resolveImports(parsedFiles, absoluteRootPath, verbose);
  
  // 6. normalizePaths()
  const normalizedParsedFiles = normalizeParsedFiles(parsedFiles, absoluteRootPath);
  
  // 7. buildSystemGraph()
  const systemMap = buildSystemGraph(normalizedParsedFiles, normalizedResolvedImports, verbose);
  
  // 8. enrichWithCulture() - ZERO LLM
  enrichWithCulture(systemMap);
  
  // 9. generateAnalysisReport() + enhanceSystemMap()
  const [analysisReport, enhancedSystemMap] = await Promise.all([
    generateAnalysisReport(systemMap, atomsIndex),
    generateEnhancedSystemMap(absoluteRootPath, parsedFiles, systemMap, verbose, skipLLM)
  ]);
  
  // 10. saveEnhancedSystemMap() - SQLite bulk insert
  await saveEnhancedSystemMap(enhancedSystemMap, verbose, absoluteRootPath);
}
```

### 6 Sub-pasos de CalledBy Linkage

**Código REAL**: `src/layer-a-static/indexer.js:277-395`

```javascript
async function buildCalledByLinks(parsedFiles, absoluteRootPath, verbose) {
  // 1. Build atom index
  const index = buildAtomIndex(allAtoms);
  
  // 2. Function calledBy (linkFunctionCalledBy)
  const { updatedAtoms } = await linkFunctionCalledBy(allAtoms, absoluteRootPath, index, verbose);
  
  // 3. Variable reference calledBy (linkVariableCalledBy)
  const { updatedAtoms } = await linkVariableCalledBy(allAtoms, parsedFiles, absoluteRootPath, verbose);
  
  // 4. Mixin/namespace imports (linkMixinNamespaceCalledBy)
  const { updatedAtoms } = await linkMixinNamespaceCalledBy(allAtoms, parsedFiles, absoluteRootPath, verbose);
  
  // 5. Class instantiation (resolveClassInstantiationCalledBy)
  const { resolved } = await resolveClassInstantiationCalledBy(allAtoms);
  
  // 6. Export object references (linkExportObjectReferences)
  const { updatedAtoms } = await linkExportObjectReferences(allAtoms, parsedFiles, absoluteRootPath, verbose);
  
  // 7. Caller Pattern Detection (enrichWithCallerPattern)
  enrichWithCallerPattern(allAtoms);
  
  // 8. BULK SAVE a SQLite
  const repo = getRepository(absoluteRootPath);
  repo.saveManyBulk(Array.from(modifiedAtoms), 500);
}
```

### Metadata Extraída por Archivo

**Código REAL**: Múltiples extractores en `src/layer-a-static/extractors/`

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
  
  // DNA (fingerprint estructural)
  dna: {
    structuralHash: 'abc123...',
    patternHash: 'def456...',
    flowType: 'read-transform-persist',
    operationSequence: ['receive', 'read', 'transform', 'persist', 'return']
  },
  
  // Arquetipo
  archetype: {
    type: 'persister',
    severity: 6,
    confidence: 0.95
  },
  
  // Propósito
  purpose: {
    type: 'API_EXPORT',
    confidence: 1.0,
    isDeadCode: false
  }
}
```

### Persistencia en SQLite

**Schema REAL**: `src/layer-c-memory/storage/database/schema.sql`

```sql
-- Tabla atoms con TODOS los campos
CREATE TABLE atoms (
    -- Identidad
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    atom_type TEXT NOT NULL,
    file_path TEXT NOT NULL,
    line_start INTEGER,
    line_end INTEGER,
    lines_of_code INTEGER,
    complexity INTEGER,
    
    -- Flags
    is_exported BOOLEAN,
    is_async BOOLEAN,
    is_test_callback BOOLEAN,
    
    -- Clasificación
    archetype_type TEXT,
    archetype_severity INTEGER,
    archetype_confidence REAL,
    purpose_type TEXT,
    purpose_confidence REAL,
    is_dead_code BOOLEAN,
    
    -- Vectores matemáticos (Semantic Algebra)
    importance_score REAL,
    coupling_score REAL,
    cohesion_score REAL,
    stability_score REAL,
    propagation_score REAL,
    fragility_score REAL,
    testability_score REAL,
    
    -- Grafos
    in_degree INTEGER,
    out_degree INTEGER,
    centrality_score REAL,
    centrality_classification TEXT,
    risk_level TEXT,
    
    -- Contadores
    callers_count INTEGER,
    callees_count INTEGER,
    dependency_depth INTEGER,
    external_call_count INTEGER,
    
    -- Temporales (SIN GIT - usa extractedAt/updatedAt)
    change_frequency REAL,
    age_days INTEGER,
    generation INTEGER,
    extracted_at TEXT,
    updated_at TEXT,
    
    -- JSONs con estructuras complejas
    signature_json TEXT,
    data_flow_json TEXT,
    calls_json TEXT,
    temporal_json TEXT,
    error_flow_json TEXT,
    performance_json TEXT,
    dna_json TEXT,
    derived_json TEXT,
    _meta_json TEXT
);

-- Índices optimizados
CREATE INDEX idx_atoms_file_path ON atoms(file_path);
CREATE INDEX idx_atoms_archetype ON atoms(archetype_type);
CREATE INDEX idx_atoms_purpose ON atoms(purpose_type);
CREATE INDEX idx_atoms_importance ON atoms(importance_score DESC);
CREATE INDEX idx_atoms_propagation ON atoms(propagation_score DESC);
```

---

## Layer B: Metadata Enrichment

**Código REAL**: `src/layer-c-memory/storage/enrichers/atom-enricher.js`

### Enriquecimiento de Vectores

```javascript
// enrichAtom(atom, context)
export function enrichAtom(atom, context = {}) {
  // Calcular vectores matemáticos
  const vectors = calculateAtomVectors(atom, context);
  
  // Crear átomo enriquecido
  const enrichedAtom = {
    ...atom,
    
    // Vectores relacionales
    callersCount: vectors.callersCount,
    calleesCount: vectors.calleesCount,
    dependencyDepth: vectors.dependencyDepth,
    externalCallCount: vectors.externalCallCount,
    
    // Vectores semánticos
    archetypeWeight: vectors.archetypeWeight,
    cohesionScore: vectors.cohesionScore,
    couplingScore: vectors.couplingScore,
    
    // Vectores temporales (SIN GIT)
    changeFrequency: vectors.changeFrequency,
    ageDays: vectors.ageDays,
    
    // Vectores para Semantic Algebra
    importanceScore: vectors.importance,
    stabilityScore: vectors.stability,
    propagationScore: vectors.propagation,
    fragilityScore: vectors.fragility,
    testabilityScore: vectors.testability,
    
    // Derived completo
    derived: {
      fragilityScore: vectors.fragility,
      testabilityScore: vectors.testability,
      couplingScore: vectors.coupling,
      changeRisk: vectors.propagation
    }
  };
  
  return enrichedAtom;
}
```

### Cálculo de Vectores

**Código REAL**: `src/layer-c-memory/storage/repository/utils/vector-calculator.js`

```javascript
// calculateAtomVectors(atom, context)
export function calculateAtomVectors(atom, context = {}) {
  const { callers = [], callees = [] } = context;
  
  // Calcular vectores temporales (SIN GIT - usa extractedAt/updatedAt)
  const temporal = calculateTemporalVectors(atom);
  
  return {
    // Vectores estructurales
    linesOfCode: calculateLinesOfCode(atom),
    parameterCount: atom.signature?.params?.length || 0,
    
    // Vectores relacionales
    callersCount: callers.length,
    calleesCount: callees.length,
    dependencyDepth: calculateDependencyDepth(atom, context),
    externalCallCount: atom.externalCalls?.length || 0,
    
    // Vectores semánticos
    archetypeWeight: calculateArchetypeWeight(atom),
    cohesionScore: calculateCohesion(atom),
    couplingScore: calculateCoupling(atom, context),
    
    // Vectores temporales
    changeFrequency: temporal.changeFrequency,
    ageDays: temporal.ageDays,
    
    // Vectores para Semantic Algebra
    importance: calculateImportance(atom, context),
    stability: calculateStability(atom),
    propagationScore: calculatePropagation(atom, context),
    fragilityScore: calculateFragility(atom, context),
    testabilityScore: calculateTestability(atom, context)
  };
}
```

### Fórmulas de Vectores

```javascript
// Cohesión: inversamente proporcional a complejidad/LOC
function calculateCohesion(atom) {
  const loc = calculateLinesOfCode(atom);
  const complexity = atom.complexity || 1;
  
  if (loc === 0) return 1;
  
  const ratio = complexity / loc;
  const cohesion = Math.max(0, Math.min(1, 1 - (ratio * 2)));
  
  return Math.round(cohesion * 100) / 100;
}

// Coupling: proporcional a dependencias externas
function calculateCoupling(atom, { callers = [], callees = [] }) {
  const externalCalls = atom.externalCalls?.length || 0;
  const totalCalls = atom.calls?.length || 0;
  const totalConnections = callers.length + callees.length + totalCalls;
  
  if (totalConnections === 0) return 0;
  
  return externalCalls / totalConnections;
}

// Importancia: PageRank simplificado
function calculateImportance(atom, { callers = [] }) {
  if (callers.length === 0) return 0;
  
  const callerImportance = callers.reduce((sum, caller) => {
    const callerOutDegree = caller.calls?.length || 1;
    return sum + (1 / callerOutDegree);
  }, 0);
  
  return Math.min(1, callerImportance / callers.length);
}

// Estabilidad: 1 - change_frequency
function calculateStability(atom) {
  const changeFrequency = atom.changeFrequency || 0;
  return 1 - changeFrequency;
}
```

---

## Layer C: Memory & MCP Exposure

### MCP Tools Disponibles (29)

**Código REAL**: `src/layer-c-memory/mcp/tools/index.js`

```javascript
// Tools ACTIVAS (29)
export const toolDefinitions = [
  // Impacto (6)
  { name: 'get_impact_map', ... },
  { name: 'analyze_change', ... },
  { name: 'trace_variable_impact', ... },
  { name: 'trace_data_journey', ... },
  { name: 'explain_connection', ... },
  { name: 'analyze_signature_change', ... },
  
  // Código (5)
  { name: 'get_call_graph', ... },
  { name: 'explain_value_flow', ... },
  { name: 'get_function_details', ... },
  { name: 'get_molecule_summary', ... },
  { name: 'find_symbol_instances', ... },
  
  // Métricas (5)
  { name: 'get_risk_assessment', ... },
  { name: 'get_health_metrics', ... },
  { name: 'detect_patterns', ... },
  { name: 'get_async_analysis', ... },
  { name: 'detect_race_conditions', ... },
  
  // Sociedad (3)
  { name: 'get_atom_society', ... },
  { name: 'get_atom_history', ... },
  { name: 'get_removed_atoms', ... },
  
  // Sistema (4)
  { name: 'search_files', ... },
  { name: 'get_server_status', ... },
  { name: 'restart_server', ... },
  { name: 'get_atom_schema', ... },
  
  // Módulo (1)
  { name: 'get_module_overview', ... },
  
  // Editor (2)
  { name: 'atomic_edit', ... },
  { name: 'atomic_write', ... },
  
  // Refactoring (2)
  { name: 'suggest_refactoring', ... },
  { name: 'validate_imports', ... },
  
  // Testing (2)
  { name: 'generate_tests', ... },
  { name: 'generate_batch_tests', ... },
  
  // Simulación (1)
  { name: 'simulate_data_journey', ... }
];
```

### Queries a SQLite

**Código REAL**: `src/layer-c-memory/storage/repository/adapters/sqlite-adapter.js`

```javascript
// Ejemplo: Query de átomos por archivo
async function queryAtoms(filePath, filters = {}) {
  const db = getDatabase();
  
  let sql = `
    SELECT * FROM atoms
    WHERE file_path = ?
  `;
  
  const params = [filePath];
  
  // Filtros opcionales
  if (filters.archetype) {
    sql += ` AND archetype_type = ?`;
    params.push(filters.archetype);
  }
  
  if (filters.minComplexity) {
    sql += ` AND complexity >= ?`;
    params.push(filters.minComplexity);
  }
  
  if (filters.isExported !== undefined) {
    sql += ` AND is_exported = ?`;
    params.push(filters.isExported ? 1 : 0);
  }
  
  // Ordenar por importancia
  sql += ` ORDER BY importance_score DESC`;
  
  return db.prepare(sql).all(...params);
}
```

---

## Derivation Engine (Composición Molecular)

**Código REAL**: `src/shared/derivation-engine/composer.js`

```javascript
// composeMolecularMetadata(moleculeId, atoms)
export function composeMolecularMetadata(moleculeId, atoms) {
  const derive = (ruleName) => {
    const rule = DerivationRules[ruleName];
    if (!rule) {
      throw new Error(`Unknown derivation rule: ${ruleName}`);
    }
    return rule(atoms);
  };
  
  return {
    // Identity
    id: moleculeId,
    type: 'molecule',
    atomCount: atoms.length,
    
    // Derived archetype
    archetype: derive('moleculeArchetype'),
    
    // Derived complexity metrics
    totalComplexity: derive('moleculeComplexity'),
    riskScore: derive('moleculeRisk'),
    
    // Derived exports
    exports: derive('moleculeExports'),
    exportCount: derive('moleculeExportCount'),
    
    // Derived side effects
    hasSideEffects: derive('moleculeHasSideEffects'),
    hasNetworkCalls: derive('moleculeHasNetworkCalls'),
    hasDomManipulation: derive('moleculeHasDomManipulation'),
    hasStorageAccess: derive('moleculeHasStorageAccess'),
    
    // Derived error handling
    hasErrorHandling: derive('moleculeHasErrorHandling'),
    
    // Derived async patterns
    hasAsyncPatterns: derive('moleculeHasAsyncPatterns'),
    
    // Derived call graph
    externalCallCount: derive('moleculeExternalCallCount'),
    
    // Derived temporal
    hasLifecycleHooks: derive('moleculeHasLifecycleHooks'),
    hasCleanupPatterns: derive('moleculeHasCleanupPatterns'),
    
    // References
    atoms: atoms.map(a => a.id),
    
    // Metadata
    derivedAt: new Date().toISOString(),
    derivationSource: 'atomic-composition'
  };
}
```

---

## Métricas Reales (v0.9.61)

```
┌─────────────────────────────────────────────────────────────┐
│  Datos Disponibles — v0.9.61                               │
├─────────────────────────────────────────────────────────────┤
│  Archivos:       1,860                                     │
│  Átomos:         13,485                                    │
│  Relaciones:     ~50,000                                   │
│  Vectores:       15+ por átomo                             │
│  Storage:        SQLite (WAL mode)                         │
│  Índices:        15+ índices optimizados                   │
│  LLM Usage:      0% - 100% ESTÁTICO                        │
└─────────────────────────────────────────────────────────────┘
```

---

**Última actualización**: 2026-02-25 (v0.9.61)  
**Estado**: ✅ **100% Estático, 0% LLM** - SQLite + Semantic Algebra  
**Próximo**: 🚧 Tree-sitter integration (Q2 2026)
