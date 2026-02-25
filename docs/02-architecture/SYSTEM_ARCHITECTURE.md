# OmnySys — Arquitectura del Sistema (v0.9.61)

**Última actualización**: 2026-02-25  
**Estado**: ✅ **100% Estático, 0% LLM** - SQLite Determinístico + Dead Code Detection 85% preciso  
**Próximo**: 🚧 Migración a Tree-sitter (Q2 2026)

---

## 1. Flujo de Datos Completo (Datos Reales del Sistema)

El sistema sigue un flujo **100% determinístico** desde que detecta un cambio hasta que lo persiste:

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                         FLUJO DE DATOS REAL (100% ESTÁTICO)                 │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  [CAMBIO EN ARCHIVO]                                                        │
│         │                                                                   │
│         ▼                                                                   │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │ CORE: FileWatcher (detecta cambio)                                   │   │
│  │  - lifecycle/change-processing.js::processPendingChanges             │   │
│  │  - processPendingChanges → _processWithBatchProcessor → processBatch │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│         │                                                                   │
│         ▼                                                                   │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │ LAYER A: Análisis Estático (100% determinístico, SIN LLM)           │   │
│  │  - pipeline/single-file.js::analyzeSingleFile                        │   │
│  │    ├── loadExistingMap (carga datos previos)                        │   │
│  │    ├── resolveFileImports (resuelve dependencias)                   │   │
│  │    ├── detectConnections (conexiones semánticas)                    │   │
│  │    ├── extractAtoms (AST + regex)                                   │   │
│  │    ├── buildCalledByLinks (cross-file linkage)                      │   │
│  │    ├── enrichWithCulture (ZERO LLM)                                 │   │
│  │    └── saveAtoms → saveFileResult (persiste)                        │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│         │                                                                   │
│         ▼                                                                   │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │ LAYER C: Storage (SQLite)                                           │   │
│  │  - storage/repository/adapters/sqlite-adapter-core.js               │   │
│  │    ├── initialize → _prepareStatements → _buildInsertSQL            │   │
│  │    ├── saveSystemMap                                                │   │
│  │    └── checkpoint (WAL mode)                                        │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│         │                                                                   │
│         ▼                                                                   │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │ MCP TOOLS (consultas determinísticas)                               │   │
│  │  - atomic-edit/search.js                                            │   │
│  │  - get_impact_map (grafo de dependencias)                           │   │
│  │  - get_call_graph (llamadas entre funciones)                        │   │
│  │  - detect_patterns (dead code, duplicados, god functions)           │   │
│  │  - get_health_metrics (calidad de código)                           │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                                                              │
│  NOTA: LLM está DEPRECATED desde v0.9.61. Todo el análisis es estático.    │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## 2. Capas del Sistema (Datos Reales v0.9.61)

### Módulos por Capa

| Capa | Archivos | Átomos | Funciones Exportadas | Complejidad Promedio |
|------|----------|--------|----------------------|----------------------|
| **layer-c-memory** | 290 | 1,083 | 437 | 4.4 |
| **core** | 168 | 759 | 340 | 2.7 |
| **layer-b-semantic** | 84 | 331 | 179 | 3.8 |
| **scripts** | 51 | 224 | 38 | 7.1 |
| **cli** | 28 | 117 | 79 | 3.3 |
| **test-cases** | 86 | 208 | 153 | 1.6 |
| **utils** | 5 | 42 | 20 | 2.6 |
| **services** | 19 | 131 | 22 | 3.0 |

**Total**: 1,860 archivos, 13,485 átomos (funciones)

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
| `processPendingChanges` | change-processing.js | 0.33 | handler crítico |
| `analyzeFile` | analyze-file.js | 0.2 | chain de 5 niveles |
| `updateAtom` | atom-updater.js | - | chain de 5 niveles |
| `get_impact_map` | impact-map.js | 0.25 | consulta 3 tablas SQLite |

---

## 5. Storage: SQLite Schema (Real)

### Tablas Principales

```sql
-- Átomos con vectores matemáticos
atoms (
    id TEXT PRIMARY KEY,
    name TEXT,
    atom_type TEXT,
    file_path TEXT,
    
    -- Vectores matemáticos
    importance_score REAL,
    coupling_score REAL,
    cohesion_score REAL,
    stability_score REAL,
    propagation_score REAL,
    fragility_score REAL,
    
    -- Grafo
    in_degree INTEGER,
    out_degree INTEGER,
    centrality_score REAL,
    centrality_classification TEXT,
    risk_level TEXT,
    
    -- Metadata
    complexity INTEGER,
    lines_of_code INTEGER,
    archetype_json TEXT,
    purpose_json TEXT,
    
    -- JSONs
    signature_json TEXT,
    data_flow_json TEXT,
    calls_json TEXT,
    dna_json TEXT,
    called_by_json TEXT
);

-- Relaciones entre átomos
atom_relations (
    source_id TEXT,
    target_id TEXT,
    relation_type TEXT,
    weight REAL,
    context TEXT
);

-- Archivos enriquecidos
system_files (
    path TEXT PRIMARY KEY,
    culture TEXT,
    risk_score REAL,
    semantic_analysis_json TEXT,
    semantic_connections_json TEXT
);

-- Conexiones semánticas
semantic_connections (
    connection_type TEXT,
    source_path TEXT,
    target_path TEXT,
    connection_key TEXT
);
```

### Índices para Queries Rápidas

```sql
CREATE INDEX idx_atoms_importance ON atoms(importance_score DESC);
CREATE INDEX idx_atoms_propagation ON atoms(propagation_score DESC);
CREATE INDEX idx_atoms_complexity ON atoms(complexity DESC);
CREATE INDEX idx_atoms_file ON atoms(file_path);
CREATE INDEX idx_relations_caller ON atom_relations(caller_id);
CREATE INDEX idx_relations_callee ON atom_relations(callee_id);
```

---

## 6. MCP Tools: Las 28-30 Herramientas

### Por Categoría

| Categoría | Tools | Cantidad |
|-----------|-------|----------|
| **Impacto** | get_impact_map, analyze_change, trace_variable_impact, trace_data_journey, explain_connection, analyze_signature_change | 6 |
| **Código** | get_call_graph, explain_value_flow, get_function_details, get_molecule_summary, find_symbol_instances | 5 |
| **Métricas** | get_risk_assessment, get_health_metrics, detect_patterns, get_async_analysis, detect_race_conditions | 5 |
| **Sociedad** | get_atom_society, get_atom_history, get_removed_atoms | 3 |
| **Sistema** | search_files, get_server_status, restart_server, get_atom_schema | 4 |
| **Editor** | atomic_edit, atomic_write | 2 |
| **Refactoring** | suggest_refactoring, validate_imports | 2 |
| **Testing** | generate_tests, generate_batch_tests | 2 |
| **TOTAL** | | **29** |

---

## 7. Flujo de Impacto (Ejemplo Real)

### Ejemplo: Cambiar `processPendingChanges`

```javascript
// 1. Función: processPendingChanges (change-processing.js:9)
// 2. Llama a:
//    - _processWithBatchProcessor (batch-processing.js)
//    - processChange (change-processing.js:39)

// 3. Impacto directo (get_impact_map):
//    - batch-processor/change-processor.js::processBatch
//    - batch-processor/change-processor.js::processChange

// 4. Transitivamente afecta (BFS sobre dependientes):
//    - storage/repository/adapters/*.js (SQLite)
//    - cache/manager/*.js
//    - file-watcher handlers

// 5. Riesgo: MEDIUM (propagation_score: 0.33)
```

---

## 8. Análisis de Calidad (Datos Reales v0.9.61)

### Health Score: 99/100 (Grade A)

| Distribución | Cantidad | % |
|--------------|----------|---|
| Grade A | 13,093 | 97.1% |
| Grade B | 171 | 1.3% |
| Grade C | 81 | 0.6% |
| Grade D | 33 | 0.2% |
| Grade F | 27 | 0.2% |

### Problemas Detectados (v0.9.61)

| Tipo | Cantidad | Estado | Top Archivo |
|------|----------|--------|-------------|
| **Dead Code** | 42 | ✅ 85% menos falsos positivos | extract (OutputExtractor.js) |
| **God Functions** | 193 | 🔴 En progreso | deduceAtomPurpose (37 complexity) |
| **Fragile Network** | 65 | 🔴 Sin error handling | fetchData (ApiClient.js) |
| **Unused Exports** | 186 | 🟡 Mayormente tests | ORCHESTRATOR_EXPORTS |
| **Architectural Debt** | 15 | ✅ 3 refactorizados | molecular-chains-test.factory.js (1146 líneas) |
| **Duplicados** | 118 exactos, 694 contextuales | 🔴 En progreso | generateSessionId (2 archivos) |

---

## 9. Async Analysis (Waterfalls)

### Funciones con Waterfalls Críticos

| Función | Sequential Awaits | Reducción Posible | Estado |
|---------|-------------------|-------------------|---------|
| `atomic_edit` | 13 | 92% | 🔴 Refactorizar |
| `restart_server` | 14 | 93% | 🔴 Refactorizar |
| `saveAtomIncremental` | 15 | 94% | 🔴 Refactorizar |
| `search_files` | 10 | 90% | 🔴 Refactorizar |

**Recomendación**: Usar `Promise.all()` para paralelizar awaits independientes.

---

## 10. Race Conditions Detectadas

| ID | Tipo | Severidad | Recurso | Funciones Afectadas |
|----|------|-----------|---------|---------------------|
| RACE-002 | RW | CRÍTICO | call:save | MasterIndexer, PatternDirectoryManager, TrainingDatasetManager |
| RACE-001 | WW | HIGH | call:save | 8 funciones escribiendo |
| RACE-003 | WW | HIGH | call:createTestSuiteWithPreset | test-suite-generator |

---

## 11. Dead Code Detection (Mejora v0.9.61)

### Mejoras Implementadas

**Antes**: 273 casos (muchos falsos positivos)  
**Ahora**: 42 casos (85% menos)

**Patrones detectados**:
- ✅ Constructores de clase (se llaman con `new`)
- ✅ Métodos de clase (se llaman dinámicamente)
- ✅ Phase/Strategy/Step patterns (`*Phase.execute()`)
- ✅ Detector/Query functions (`detect*`, `get*`)
- ✅ Builder pattern methods (`with*`)
- ✅ Archivos eliminados (verificación con `fileExists()`)

### Top 5 Dead Code Restante

| Función | Archivo | Líneas | Estado |
|---------|---------|--------|--------|
| `extract` | OutputExtractor.js | 45 | 🟡 Método de clase |
| `execute` | AtomExtractionPhase.js | 25 | 🟡 Método de clase |
| `execute` | ChainBuildingPhase.js | 28 | 🟡 Método de clase |
| `reload` | pipeline-strategy.js | 30 | 🟡 Método de clase |
| `execute` | orchestrator-init-step.js | 19 | 🟡 Método de clase |

**Nota**: La mayoría son métodos de clases Phase/Strategy que se llaman dinámicamente.

---

## 12. Referencias a Archivos Clave

| Propósito | Archivo | Función Principal |
|-----------|---------|-------------------|
| Entry Point CLI | src/cli/index.js | `main` |
| File Watcher | src/core/file-watcher/index.js | `FileWatcher` |
| Pipeline | src/layer-a-static/pipeline/single-file.js | `analyzeSingleFile` |
| Indexer | src/layer-a-static/indexer.js | `indexProject` |
| Storage Core | src/layer-c-memory/storage/database/connection.js | `getDatabase` |
| MCP Server | src/layer-c-memory/mcp-server.js | `createMcpServer` |
| Cache | src/core/cache/singleton.js | `getCacheManager` |
| Repository | src/layer-c-memory/storage/repository/index.js | `getRepository` |

---

## 13. Métricas del Sistema (v0.9.61)

| Métrica | Valor | Estado |
|---------|-------|--------|
| **Archivos analizados** | 1,860 | ✅ |
| **Átomos extraídos** | 13,485 | ✅ |
| **Health Score** | 99/100 (Grade A) | ✅ Excelente |
| **Test Coverage** | 79% | 🟡 Casi 80% |
| **God Functions** | 193 | 🔴 En progreso |
| **Dead Code** | 42 | ✅ 85% mejora |
| **Duplicados** | 118 exactos | 🔴 En progreso |
| **Deuda Arquitectónica** | 15 archivos | ✅ 3 refactorizados |
| **Base de datos** | SQLite (WAL mode) | ✅ |
| **Tablas** | 10 | ✅ |
| **Índices** | 6+ | ✅ |
| **Herramientas MCP** | 29 | ✅ |

---

## 14. Optimizaciones de Memoria (v0.9.61)

### Memory Cleanup

```javascript
// src/layer-a-static/indexer.js:118-125
for (const parsedFile of Object.values(parsedFiles)) {
  if (parsedFile.source) {
    freedMemory += parsedFile.source.length;
    parsedFile.source = null;  // Liberar source code después de extraer
  }
}
// ~50-100MB liberados
```

### Bulk Operations

```javascript
// En lugar de guardar átomo por átomo:
await saveAtom(atom);  // ❌ Lento, 13,000 queries

// Se acumulan y guardan en bulk:
repo.saveManyBulk(allExtractedAtoms, 500);  // ✅ Rápido, 27 batches
```

**Performance**:
- **Antes**: 13,000 inserts individuales → ~30 segundos
- **Ahora**: 27 batches de 500 → ~3 segundos

---

## 15. Próximas Mejoras

### Migración a Tree-sitter (Q2 2026)

**Por qué**:
- Mejor detección de `isExported` para arrow functions
- Análisis de tipos TypeScript más preciso
- Performance mejorado en proyectos grandes

**Beneficios**:
- ✅ Parsing incremental (más rápido)
- ✅ Mejor manejo de errores de sintaxis
- ✅ Soporte nativo para más lenguajes
- ✅ AST más rico y preciso

**Impacto en MCP Tools**: Las herramientas MCP seguirán funcionando igual, pero con mayor precisión en la detección de patrones y menos falsos positivos.

---

*Documento generado con datos reales del sistema via MCP tools - v0.9.61*
