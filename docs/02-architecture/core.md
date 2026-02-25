# Arquitectura Unificada - OmnySys (Layer A + Orchestrator)

**Versión**: v0.9.61  
**Última actualización**: 2026-02-25  
**Estado**: ✅ SQLite + Bulk Operations + CalledBy Linkage + File Cultures + Dead Code Detection 85% preciso  
**Próximo**: 🚧 Migración a Tree-sitter (Q2 2026)

---

## Visión

Resolver la "visión de túnel" cuando una IA edita código modular. El sistema construye un mapa de dependencias y conexiones semánticas y lo expone vía MCP para que la IA edite con contexto real.

### Principios Fundamentales

1. **Local primero**: Todo corre offline
2. **Layer A solo estático**: Análisis 100% determinístico (AST + regex)
3. **SQLite es la fuente de verdad**: `.omnysysdata/omnysys.db`
4. **Zero LLM para extracción**: LLM solo para casos ambiguos (~3-10%)
5. **Bulk operations**: Guardar en lotes, no átomo por átomo
6. **Memory cleanup**: Liberar source code después de extraer

---

## Diagrama Arquitectónico Real

```text
┌─────────────────────────────────────────────────────────────────────────┐
│                        ARQUITECTURA COMPLETA                             │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                          │
│  [Código Fuente]                                                         │
│       │                                                                  │
│       ▼                                                                  │
│  ┌────────────────────────────────────────────────────────────────────┐ │
│  │  INDEXER.JS - Orquestador Principal                                │ │
│  │  ─────────────────────────────────────────────────────────────     │ │
│  │  12 pasos coordinados (ver DATA_FLOW.md para detalle)              │ │
│  └────────────────────────────────────────────────────────────────────┘ │
│       │                                                                  │
│       ▼                                                                  │
│  ┌────────────────────────────────────────────────────────────────────┐ │
│  │  LAYER A: Static Analysis (src/layer-a-static)                     │ │
│  │  ─────────────────────────────────────────────────────────────     │ │
│  │  • Scanner: scanProjectFiles                                        │ │
│  │  • Parser: parseFiles (@babel/parser)                              │ │
│  │  • Extractor: extractAndSaveAtoms (AtomExtractionPhase)            │ │
│  │  • Linker: buildCalledByLinks (6 sub-pasos)                        │ │
│  │  • Graph: buildSystemGraph                                          │ │
│  │  • Culture: enrichWithCulture (ZERO LLM)                           │ │
│  │  • Analysis: generateAnalysisReport + enhanceSystemMap             │ │
│  └────────────────────────────────────────────────────────────────────┘ │
│       │                                                                  │
│       ▼                                                                  │
│  ┌────────────────────────────────────────────────────────────────────┐ │
│  │  STORAGE: SQLite Database (.omnysysdata/omnysys.db)                │ │
│  │  ─────────────────────────────────────────────────────────────     │ │
│  │  TABLAS: atoms, atom_relations, files, system_files,               │ │
│  │          file_dependencies, semantic_connections,                  │ │
│  │          risk_assessments, modules                                 │ │
│  │                                                                     │ │
│  │  CONFIG: WAL mode, 64MB cache, 4KB pages, 5s timeout               │ │
│  └────────────────────────────────────────────────────────────────────┘ │
│       │                                                                  │
│       ▼                                                                  │
│  ┌────────────────────────────────────────────────────────────────────┐ │
│  │  LAYER C: Memory / MCP Server (src/layer-c-memory)                 │ │
│  │  ─────────────────────────────────────────────────────────────     │ │
│  │  Query APIs → Derivation Engine → 28-30 MCP Tools                  │ │
│  └────────────────────────────────────────────────────────────────────┘ │
│       │                                                                  │
│       ▼                                                                  │
│  [Claude / OpenCode / Qwen - IAs]                                       │
│                                                                          │
└─────────────────────────────────────────────────────────────────────────┘
```

---

## Capa A: Análisis Estático (src/layer-a-static)

### Responsabilidades

- **Scanner**: Escaneo recursivo de archivos
- **Parser**: AST con @babel/parser (TypeScript, JSX, decorators)
- **Extractor**: Metadata estática + vectores matemáticos
- **Linker**: Cross-reference entre archivos (calledBy)
- **Graph**: Grafo de dependencias
- **Culture**: Clasificación de roles (Laws, Gatekeepers, Citizens, etc.)
- **Analysis**: Calidad de código, riesgos, duplicados

### Metadata Extraída por Archivo

```javascript
{
  // Imports/Exports
  imports: [],        // ESM, CommonJS, dynamic
  exports: [],        // Named, default, re-exports
  
  // Definiciones
  definitions: [],    // Funciones y clases
  functions: [],      // Info detallada
  
  // Llamadas
  calls: [],          // Llamadas a funciones
  
  // Metadata semántica (regex extractors)
  localStorage: [],   // setItem/getItem con keys
  events: [],         // emit/on con nombres
  globals: [],        // window.* access
  envVars: [],        // process.env.*
  redux: {},          // selectors, actions, slices
  context: {},        // createContext, Provider
  communication: {}   // WebSocket, Workers, fetch
}
```

### Cross-Reference de Conexiones (Nivel 1)

**Después** de extraer metadata de TODOS los archivos, Layer A cruza datos para detectar conexiones **sin LLM**:

```javascript
// Para cada par de archivos (A, B):
if (A.localStorage.keys ∩ B.localStorage.keys ≠ ∅) {
  → Conexión "localStorage", confidence: 1.0
}
if (A.events.names ∩ B.events.names ≠ ∅) {
  → Conexión "eventListener", confidence: 1.0
}
if (A.globals.properties ∩ B.globals.properties ≠ ∅) {
  → Conexión "globalVariable", confidence: 1.0
}
// ... Redux selectors, React Context, etc.
```

**Cada conexión incluye**:
- `sourceFile`, `targetFile`
- `type` (localStorage, eventListener, etc.)
- `via` (key, event name, property)
- `direction` (A writes, B reads)
- `confidence: 1.0` (hecho verificable)
- `detectedBy: "static-extractor"`

**Estas conexiones NO necesitan LLM.** Son hechos extraídos con regex.

---

## Pipeline de Extracción de Átomos

### AtomExtractionPhase (src/layer-a-static/pipeline/phases/atom-extraction/)

```javascript
// src/layer-a-static/pipeline/phases/atom-extraction/AtomExtractionPhase.js
async execute(context) {
  // 1. Extraer átomos del archivo
  const atoms = extractAtoms(context.fileInfo, context.code);
  
  // 2. Build call graph intra-archivo
  buildCallGraph(atoms);
  
  // 3. Recalcular arquetipos con calledBy info
  recalculateArchetypes(atoms);
  
  // 4. Recalcular propósitos
  recalculatePurposes(atoms);
  
  context.atoms = atoms;
}
```

### Enrichment en Cascada

```javascript
// src/layer-a-static/indexer.js:223-228

// Primero: purpose + archetype
const purposeEnriched = atoms.map(atom => enrichAtomPurpose(atom));

// Luego: vectores matemáticos (cohesion, ageDays, etc.)
const enrichedAtoms = purposeEnriched.map(atom => enrichAtomVectors(atom));

parsedFile.atoms = enrichedAtoms;
```

### Campos Extraídos por Átomo

| Campo | Descripción | Coverage |
|-------|-------------|----------|
| `id` | `file::functionName` | 100% |
| `complexity` | Complejidad ciclomática | 100% |
| `dataFlow` | Grafo de flujo de datos | 100% |
| `dna` | Hash estructural + fingerprint | 99.7% |
| `archetype` | hot-path, utility, god-function... | 99.7% |
| `purpose` | API_EXPORT, INTERNAL_HELPER, DEAD_CODE... | 100% |
| `calledBy` | IDs que llaman a este átomo | 44.7% |
| `calls` | Llamadas que hace | 66.3% |
| `typeContracts` | Tipos inferidos | 99.7% |
| `performance` | bigO, nestedLoops, heavyCalls | 99.7% |
| `temporal` | asyncPatterns, timers, events | ~100% |
| `errorFlow` | catches, throws, propagation | ~100% |
| `callerPattern` | Patrón de callers detectado | 100% |
| `cohesionScore` | Cohesión interna | 100% |
| `ageDays` | Antigüedad del archivo | 100% |

---

## Cross-File CalledBy Linkage

### 6 Sub-pasos de Linkage (src/layer-a-static/indexer.js:277-395)

```javascript
async function buildCalledByLinks(parsedFiles, absoluteRootPath, verbose) {
  // 1. Build atom index
  const index = buildAtomIndex(allAtoms);
  
  // 2. Function calledBy (linkFunctionCalledBy)
  //    Busca llamadas cross-file por nombre
  //    Ej: fileA.js::import { foo } → fileB.js::export function foo
  
  // 3. Variable reference calledBy (linkVariableCalledBy)
  //    Detecta referencias a variables/constants exportadas
  //    +384 calledBy links agregados (v0.9.18)
  
  // 4. Mixin/namespace imports (linkMixinNamespaceCalledBy)
  //    Resuelve import * as Utils y Utils.func()
  //    También this.* en contextos de clase
  
  // 5. Class instantiation (resolveClassInstantiationCalledBy)
  //    Detecta new ClassName() y rastrea métodos
  //    Ej: const obj = new Foo(); obj.bar() → Foo.bar.calledBy++
  
  // 6. Export object references (linkExportObjectReferences)
  //    export const handlers = { func1, func2 }
  //    handlers.func1 → calledBy linkage
  
  // 7. Caller Pattern Detection (enrichWithCallerPattern)
  //    Detecta patrones: direct-caller, event-caller, lifecycle-caller
  
  // 8. BULK SAVE (repo.saveManyBulk)
}
```

### Bulk Insert Optimization

```javascript
// src/layer-a-static/indexer.js:256-260
const repo = getRepository(absoluteRootPath);
repo.saveManyBulk(allExtractedAtoms, 500);  // Batch de 500 átomos
```

**Antes**: 13,000 inserts individuales → ~30 segundos  
**Ahora**: 27 batches de 500 → ~3 segundos

---

## File Culture Classification (ZERO LLM)

### Culturas Detectadas (src/layer-a-static/analysis/file-culture-classifier.js)

| Cultura | Descripción | Detector | % Típico |
|---------|-------------|----------|----------|
| **🏛️ Laws** | Configuración, constantes, tipos | `file.includes('/config/')` | 8% |
| **👮 Gatekeepers** | Validadores, auth, middlewares | `archetype === 'validator'` | 11% |
| **👨‍💼 Citizens** | Componentes UI, lógica de negocio | `archetype === 'standard'` | 43% |
| **🔍 Auditors** | Tests, análisis, reporting | `file.includes('/test/')` | 22% |
| **🚪 EntryPoints** | CLI, routes, main files | `archetype === 'entry-point'` | 3% |
| **📜 Scripts** | Scripts de build, migración | `file.startsWith('scripts/')` | 5% |
| **❓ Unknown** | Sin clasificar | - | 8% |

### Ejemplo de Estadísticas

```javascript
{
  citizen: 800,      // 43%
  auditor: 400,      // 22%
  gatekeeper: 200,   // 11%
  laws: 150,         // 8%
  entrypoint: 50,    // 3%
  script: 100,       // 5%
  unknown: 150       // 8%
}
```

---

## Storage: SQLite Database

### Configuración (src/layer-c-memory/storage/database/connection.js)

```javascript
{
  journal_mode: 'WAL',        // Write-Ahead Logging
  cache_size: 64000,          // 64MB cache
  synchronous: 'NORMAL',      // Balance safety/performance
  temp_store: 'MEMORY',       // Temp tables en RAM
  page_size: 4096,            // Páginas de 4KB
  foreign_keys: 'ON',         // Integridad referencial
  busy_timeout: 5000          // 5s timeout
}
```

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
    
    -- JSONs
    signature_json TEXT,
    data_flow_json TEXT,
    calls_json TEXT,
    dna_json TEXT,
    archetype_json TEXT,
    purpose_json TEXT
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

### Feature Flags

```bash
# Usar SQLite (default)
OMNY_SQLITE=true

# Forzar JSON legacy (no recomendado)
OMNY_SQLITE=false

# Dual write (migración)
OMNY_DUAL_WRITE=true
```

---

## MCP Server (src/layer-c-memory/mcp/tools/)

### Responsabilidades

- Lee `.omnysysdata/` (SQLite + JSONs)
- Expone 28-30 tools para IAs
- Auto-analysis: si se consulta archivo no analizado, lo encola como CRITICAL

### Herramientas por Categoría

| Categoría | Herramientas |
|-----------|--------------|
| **Impacto** | `get_impact_map`, `analyze_change`, `trace_variable_impact`, `trace_data_journey`, `explain_connection`, `analyze_signature_change` |
| **Código** | `get_call_graph`, `explain_value_flow`, `get_function_details`, `get_molecule_summary`, `find_symbol_instances` |
| **Métricas** | `get_risk_assessment`, `get_health_metrics`, `detect_patterns`, `get_async_analysis`, `detect_race_conditions` |
| **Sociedad** | `get_atom_society`, `get_atom_history`, `get_removed_atoms` |
| **Sistema** | `search_files`, `get_server_status`, `restart_server`, `get_atom_schema` |
| **Editor** | `atomic_edit`, `atomic_write` |
| **Refactoring** | `suggest_refactoring`, `validate_imports` |
| **Testing** | `generate_tests`, `generate_batch_tests` |

---

## Decisiones de LLM (Tres Gates)

### Gate 1: Archetypes

```javascript
// src/layer-c-memory/mcp/core/llm-analysis.js
metadata = buildPromptMetadata(filePath, fileAnalysis);
archetypes = detectArchetypes(metadata);

if (archetypes.length > 0) {
  → Candidato para LLM (pasa a Gate 2)
} else {
  → NO necesita LLM
}
```

### Gate 2: Bypass Check

```javascript
// src/layer-c-memory/mcp/core/analysis-decider.js

// Arquetipos que SIEMPRE necesitan LLM:
if (archetype in ['god-object', 'dynamic-importer', 'orphan-module']) {
  return { needsLLM: true };
}

// Arquetipos que PUEDEN hacer bypass:
if (archetype in ['event-hub', 'global-state', 'state-manager', 'singleton']) {
  if (allConnectionsResolvedWithConfidence >= 1.0) {
    return { needsLLM: false };  // BYPASS
  }
  return { needsLLM: true };
}
```

### Gate 3: Suspicious Patterns

```javascript
// src/layer-c-memory/mcp/core/analysis-decider.js

if (file.isOrphan && file.hasNoConnections) {
  return { needsLLM: true };  // Investigar por qué no tiene dependientes
}

if (file.hasDynamicCode) {  // eval, import(var)
  return { needsLLM: true };
}

if (file.isOrphan && (file.hasGlobalAccess || file.hasLocalStorage)) {
  return { needsLLM: true };  // Sospechoso: usa globals pero nadie lo importa
}
```

### Arquetipos y LLM

| Arquetipo | Siempre LLM? | Bypass posible? | Condición de bypass |
|-----------|-------------|-----------------|---------------------|
| god-object | ✅ SI | ❌ No | LLM siempre necesario |
| dynamic-importer | ✅ SI | ❌ No | Rutas runtime imposibles |
| orphan-module | ✅ SI | ❌ No | LLM investiga por qué no tiene dependientes |
| event-hub | ❌ No | ✅ SI | Si todos los eventos son string literals ya cruzados |
| global-state | ❌ No | ✅ SI | Si todas las properties ya cruzadas con confidence 1.0 |
| state-manager | ❌ No | ✅ SI | Si todas las keys ya cruzadas con confidence 1.0 |
| singleton | ❌ No | ✅ SI | Si las conexiones de global state ya están resueltas |

**Principio clave**: Si la metadata + cross-reference ya da la conexión como hecho verificable (confidence 1.0), **NO gastar LLM**. El LLM solo se activa cuando hay incertidumbre.

---

## Resumen de Confidence

| Fuente | Confidence | Necesita LLM? | Ejemplo |
|--------|------------|---------------|---------|
| Import/export AST | 1.0 | ❌ No | `import { fn } from './utils'` |
| localStorage cross-ref | 1.0 | ❌ No | Dos archivos usan key 'token' |
| Event cross-ref | 1.0 | ❌ No | Archivo emite 'save', otro escucha 'save' |
| Global variable cross-ref | 1.0 | ❌ No | Dos archivos acceden `window.config` |
| Redux selector cross-ref | 1.0 | ❌ No | Dos archivos usan mismo slice |
| LLM: god-object analysis | 0.7-0.9 | ✅ SI | "Este archivo tiene 3 responsabilidades" |
| LLM: dynamic import mapping | 0.6-0.8 | ✅ SI | "import() probablemente carga ModuleX" |
| LLM: hidden connections | 0.5-0.8 | ✅ SI | "Este callback se registra en el event loop" |

**Regla de oro**: Las conexiones de confidence 1.0 **NUNCA** se envían al LLM para re-validación. El LLM solo busca lo que el análisis estático no puede ver.

---

## CLI (Contrato)

```bash
# Ejecutar Layer A completo
omnysys analyze <project>

# Ejecutar Orchestrator (LLM decisions)
omnysys consolidate <project>

# Preparar análisis y exponer MCP
omnysys serve <project>
```

---

## Estado de Implementación

| Componente | Estado | Notas |
|------------|--------|-------|
| **Scanner** | ✅ Comple | scanProjectFiles |
| **Parser** | ✅ Completo | @babel/parser |
| **Extractor** | ✅ Completo | 17 extractores activos |
| **Linker** | ✅ Completo | 6 sub-pasos de calledBy |
| **Graph** | ✅ Completo | buildSystemGraph |
| **Culture** | ✅ Completo | enrichWithCulture (ZERO LLM) |
| **Storage** | ✅ Completo | SQLite + bulk operations |
| **MCP Tools** | ✅ Completo | 28-30 tools |
| **Dead Code Detection** | ✅ 85% preciso | 273 → 42 casos |
| **Tree-sitter** | 🚧 Pendiente | Q2 2026 |

---

**Última actualización**: 2026-02-25 (v0.9.61)  
**Mantenimiento**: OmnySys Team  
**Estado**: ✅ Producción
