# OmnySys — Arquitectura del Sistema (v0.9.60)

**Última actualización**: 2026-02-24  
**Estado**: ✅ Producción - Semantic Algebra + SQLite Determinístico

---

## 1. Flujo de Datos Completo (Datos Reales del Sistema)

El sistema sigue un flujo determinístico desde que detecta un cambio hasta que lo persiste:

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                         FLUJO DE DATOS REAL                                 │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  [CAMBIO EN ARCHIVO]                                                       │
│         │                                                                   │
│         ▼                                                                   │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │ CORE: FileWatcher (detecta cambio)                                   │   │
│  │  - lifecycle/change-processing.js::processPendingChanges              │   │
│  │  - processPendingChanges → _processWithBatchProcessor → processBatch  │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│         │                                                                   │
│         ▼                                                                   │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │ LAYER A: Análisis Estático                                          │   │
│  │  - pipeline/single-file.js::analyzeSingleFile                        │   │
│  │    ├── loadExistingMap (carga datos previos)                       │   │
│  │    ├── resolveFileImports (resuelve dependencias)                  │   │
│  │    ├── detectConnections (conexiones semánticas)                   │   │
│  │    └── saveAtoms → saveFileResult (persiste)                      │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│         │                                                                   │
│         ▼                                                                   │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │ LAYER C: Storage (SQLite)                                          │   │
│  │  - storage/repository/adapters/sqlite-adapter-core.js               │   │
│  │    ├── initialize → _prepareStatements → _buildInsertSQL            │   │
│  │    ├── saveSystemMap                                                │   │
│  │    └── checkpoint (WAL mode)                                        │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│         │                                                                   │
│         ▼                                                                   │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │ MCP TOOLS (consultas)                                               │   │
│  │  - atomic-edit/search.js                                            │   │
│  │  - get_impact_map                                                   │   │
│  │  - get_call_graph                                                  │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## 2. Capas del Sistema (Datos Reales)

### Módulos por Capa (Datos del Sistema)

| Capa | Archivos | Átomos | Funciones Exportadas | Complejidad Promedio |
|------|----------|--------|----------------------|---------------------|
| **layer-c-memory** | 284 | 995 | 419 | 5.1 |
| **core** | 168 | 759 | 340 | 2.7 |
| **layer-b-semantic** | 84 | 331 | 179 | 3.8 |
| **scripts** | 51 | 222 | 35 | 6.6 |
| **cli** | 27 | 72 | 68 | 4.3 |

---

## 3. Sociedad de Átomos (Cadenas y Clusters)

### Cadenas Más Largas (Depth = 5)

**Cadena 1: Test Generation**
```
generateAnalysisTest
    → createAnalysisTestSuite
        → createTestSuite
            → createStructureContract
                → createStructureContract
```

**Cadena 2: File Analysis**
```
analyzeFile
    → analyzeFile
        → detectEventPatterns
            → parseCodeToAST
                → getBabelPlugins
```

**Cadena 3: Cache Invalidation**
```
updateAtom
    → invalidateCache
        → invalidateCache
            → getCacheManager
                → has (cache-operations)
```

### Clusters Principales

| Tamaño | Propósito | Miembros Clave |
|--------|-----------|----------------|
| 234 | Test Factories + Graph | create, buildChain, createRace |
| 173 | Validation System | validate, runValidations, _validateAtoms |
| 96 | Batch Processing | AtomicEditor, FileChange, Batch |
| 86 | Cache Management | clear, invalidateCache, restart |
| 85 | CLI Commands | execute, main, redo |

---

## 4. Impacto de Funciones Críticas

### Funciones con Mayor Propagación

| Función | Archivo | Centrality | Propagación |
|---------|---------|------------|-------------|
| `createMockResponse` | api.test.js | 0.33 | 53 callers |
| `processPendingChanges` | change-processing.js | 0.33 | handler crítico |
| `analyzeFile` | analyze-file.js | 0.2 | chain de 5 niveles |
| `updateAtom` | atom-updater.js | - | chain de 5 niveles |

---

## 5. Storage: SQLite Schema

### Tablas Principales

```sql
-- Átomos con vectores matemáticos
atoms (
    id, name, atom_type, file_path,
    -- Vectores
    importance_score, coupling_score, cohesion_score,
    stability_score, propagation_score, fragility_score,
    -- Grafos
    in_degree, out_degree, centrality_score,
    centrality_classification, risk_level,
    -- JSONs
    signature_json, data_flow_json, calls_json, dna_json
)

-- Relaciones entre átomos
atom_relations (
    source_id, target_id, relation_type, weight
)

-- Archivos enriquecidos
system_files (
    path, culture, risk_score,
    semantic_analysis_json, semantic_connections_json
)

-- Conexiones semánticas
semantic_connections (
    connection_type, source_path, target_path, connection_key
)
```

---

## 6. MCP Tools: Las 28 Herramientas

### Por Categoría

| Categoría | Tools |
|-----------|-------|
| **Impacto** | get_impact_map, analyze_change, trace_variable_impact, trace_data_journey, explain_connection, analyze_signature_change |
| **Código** | get_call_graph, explain_value_flow, get_function_details, get_molecule_summary, find_symbol_instances |
| **Métricas** | get_risk_assessment, get_health_metrics, detect_patterns, get_async_analysis, detect_race_conditions |
| **Sociedad** | get_atom_society, get_atom_history, get_removed_atoms |
| **Sistema** | search_files, get_server_status, restart_server, get_atom_schema |
| **Editor** | atomic_edit, atomic_write |
| **Refactoring** | suggest_refactoring, validate_imports |
| **Testing** | generate_tests, generate_batch_tests |

---

## 7. Flujo de Impacto (Ejemplo Real)

### Ejemplo: Cambiar `processPendingChanges`

```javascript
// 1. Función: processPendingChanges (change-processing.js:9)
// 2. Llama a:
//    - _processWithBatchProcessor (batch-processing.js)
//    - processChange (change-processing.js:39)

// 3. Impacto directo:
//    - batch-processor/change-processor.js::processBatch
//    - batch-processor/change-processor.js::processChange

// 4. Transitivamente afecta:
//    - storage/repository/adapters/*.js (SQLite)
//    - cache/manager/*.js
//    - LLM service cache

// 5. Riesgo: MEDIUM-HIGH (2 sequential awaits)
```

---

## 8. Análisis de Calidad (Datos Reales)

### Health Score: 99/100 (Grade A)

| Distribución | Cantidad |
|--------------|----------|
| Grade A | 12,978 |
| Grade B | 175 |
| Grade C | 82 |
| Grade D | 33 |
| Grade F | 26 |

### Problemas Detectados

| Tipo | Cantidad | Top Archivo |
|------|----------|-------------|
| Dead Code | 246 | constructors sin usar |
| God Functions | 212 | inferTypeFromParamName (67 complexity) |
| Fragile Network | 72 | extractNetworkCalls |
| Unused Exports | 71 | checkAndRunAnalysis |
| Architectural Debt | 15 | logger-system.js (293 líneas) |

---

## 9. Async Analysis (Waterfalls)

### Funciones con Waterfalls Críticos

| Función | Sequential Awaits | Reducción Posible |
|---------|-------------------|-------------------|
| `atomic_edit` | 13 | 92% |
| `restart_server` | 14 | 93% |
| `saveAtomIncremental` | 15 | 94% |
| `search_files` | 10 | 90% |

---

## 10. Race Conditions Detectadas

| ID | Tipo | Severidad | Recurso | Funciones Afectadas |
|----|------|-----------|---------|---------------------|
| RACE-002 | RW | CRÍTICO | call:save | MasterIndexer, PatternDirectoryManager, TrainingDatasetManager |
| RACE-001 | WW | HIGH | call:save | 8 funciones escribiendo |
| RACE-003 | WW | HIGH | call:createTestSuiteWithPreset | test-suite-generator |

---

## 11. Referencias a Archivos Clave

| Propósito | Archivo |
|-----------|---------|
| Entry Point CLI | src/cli/index.js::main |
| File Watcher | src/core/file-watcher/index.js |
| Pipeline | src/layer-a-static/pipeline/single-file.js |
| Storage Core | src/layer-c-memory/storage/database/connection.js |
| MCP Server | src/layer-c-memory/mcp-server.js |
| Cache | src/core/cache/singleton.js |

---

*Documento generado con datos reales del sistema via MCP tools*
