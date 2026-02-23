# Flujo de Datos - OmnySys

**Versión**: v0.9.57
**Última actualización**: 2026-02-23

---

## Visión General

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                           FLUJO DE DATOS COMPLETO                            │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│   [Código Fuente]                                                           │
│        │                                                                     │
│        ▼                                                                     │
│   ┌─────────────────────────────────────────────────────────────────────┐   │
│   │  LAYER A: Análisis Estático (100% determinístico, sin LLM)          │   │
│   │  ───────────────────────────────────────────────────────────────    │   │
│   │  Scanner → Parser → AtomExtractionPhase → CrossFileLinker           │   │
│   │                              │                                        │   │
│   │                              ▼                                        │   │
│   │                    ┌─────────────────┐                               │   │
│   │                    │    ÁTOMO        │                               │   │
│   │                    │ ─────────────── │                               │   │
│   │                    │ • complexity    │                               │   │
│   │                    │ • dataFlow      │                               │   │
│   │                    │ • dna           │                               │   │
│   │                    │ • archetype     │                               │   │
│   │                    │ • purpose       │                               │   │
│   │                    │ • calledBy      │                               │   │
│   │                    │ • calls         │                               │   │
│   │                    │ • typeContracts │                               │   │
│   │                    │ • performance   │                               │   │
│   │                    │ • temporal      │                               │   │
│   │                    │ • errorFlow     │                               │   │
│   │                    └─────────────────┘                               │   │
│   └─────────────────────────────────────────────────────────────────────┘   │
│        │                                                                     │
│        ▼                                                                     │
│   ┌─────────────────────────────────────────────────────────────────────┐   │
│   │  STORAGE: SQLite Database (.omnysysdata/omnysys.db)                 │   │
│   │  ───────────────────────────────────────────────────────────────    │   │
│   │  atoms             → Tabla de átomos (funciones, variables)        │   │
│   │  atom_relations    → Grafo de dependencias entre átomos            │   │
│   │  files             → Metadatos por archivo                          │   │
│   │  system_files      → Extensión para System Map                      │   │
│   │  file_dependencies → Dependencias entre archivos                    │   │
│   │  semantic_connections → Conexiones semánticas                       │   │
│   │  risk_assessments  → Evaluación de riesgo por archivo              │   │
│   │  atom_events       → Event sourcing para audit trail               │   │
│   └─────────────────────────────────────────────────────────────────────┘   │
│        │                                                                     │
│        ▼                                                                     │
│   ┌─────────────────────────────────────────────────────────────────────┐   │
│   │  LAYER C: Memory / MCP Server                                        │   │
│   │  ───────────────────────────────────────────────────────────────    │   │
│   │  Query APIs → Derivation Engine → 30 MCP Tools                      │   │
│   │       │              │                   │                           │   │
│   │       ▼              ▼                   ▼                           │   │
│   │   file-api.js   composeMolecular    impact-map.js                   │   │
│   │   project-api.js  Metadata()        get-call-graph.js               │   │
│   │   risk-api.js                        get-molecule-summary.js         │   │
│   │                                      analyze-change.js               │   │
│   │                                      ... (30 tools)                  │   │
│   └─────────────────────────────────────────────────────────────────────┘   │
│        │                                                                     │
│        ▼                                                                     │
│   [Claude / OpenCode - IA]                                                   │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## Fase 1: Extracción de Átomos (Layer A)

### Ubicación
`src/layer-a-static/pipeline/phases/atom-extraction/`

### Proceso

```
Archivo.js
    │
    ▼
┌───────────────────────────────────────────────────────────────┐
│  AtomExtractionPhase.execute()                                 │
├───────────────────────────────────────────────────────────────┤
│                                                                │
│  1. extractAtoms(fileInfo, code, fileMetadata, filePath)      │
│     ├─ atom-extractor.js → Extrae funciones                   │
│     ├─ variable-extractor.js → Extrae constants/variables     │
│     └─ metadata/*.js → Enriquece cada átomo                   │
│         ├─ archetype.js → Detecta tipo (hot-path, utility...) │
│         ├─ purpose.js → Detecta propósito (API, DEAD...)      │
│         ├─ data-flow-extractor.js → Análisis de flujo         │
│         └─ dna-extractor.js → Hash estructural                │
│                                                                │
│  2. buildCallGraph(atoms)                                      │
│     └─ call-graph.js → Relaciones intra-archivo               │
│                                                                │
│  3. recalculateArchetypes(atoms)                               │
│     └─ archetype.js → Recalcula con calledBy info             │
│                                                                │
└───────────────────────────────────────────────────────────────┘
    │
    ▼
┌───────────────────────────────────────────────────────────────┐
│  Cross-file Linkage (indexer.js:134-250)                       │
├───────────────────────────────────────────────────────────────┤
│                                                                │
│  1. Recolectar TODOS los átomos del proyecto                  │
│  2. Construir índices:                                         │
│     • atomBySimpleName: "info" → [atom1, atom2, ...]          │
│     • atomByQualifiedName: "Logger.info" → atom               │
│     • atomByFilePath: "file.js::func" → atom                  │
│  3. Para cada llamada en cada átomo:                          │
│     • Buscar átomo target                                      │
│     • Agregar callerId a target.calledBy                       │
│  4. Persistir átomos actualizados                             │
│                                                                │
│  5. Class Instantiation Tracker                                │
│     └─ Resuelve new Clase().metodo() → calledBy               │
│                                                                │
│  6. Variable Reference Linker (v0.9.18)                       │
│     └─ Detecta referencias a variables/constants exportadas   │
│     └─ Usa imports para saber qué buscar                      │
│     └─ +384 calledBy links agregados                           │
│                                                                │
└───────────────────────────────────────────────────────────────┘
```

### Metadata Extraída por Átomo

| Campo | Descripción | Coverage |
|-------|-------------|----------|
| `id` | Identificador único `file::name` | 100% |
| `complexity` | Complejidad ciclomática | 100% |
| `dataFlow` | Grafo de flujo de datos | 100% |
| `dna` | Hash estructural + fingerprint | 99.7% |
| `archetype` | Tipo: hot-path, utility, god-function... | 99.7% |
| `purpose` | API_EXPORT, INTERNAL_HELPER, DEAD_CODE... | 100% |
| `calledBy` | Array de IDs que llaman a este átomo | 44.7% |
| `calls` | Array de llamadas que hace | 66.3% |
| `typeContracts` | Tipos inferidos de params/returns | 99.7% |
| `performance` | bigO, nestedLoops, heavyCalls | 99.7% |
| `temporal` | asyncPatterns, timers, events | ~100% |
| `errorFlow` | catches, throws, propagation | ~100% |

---

## Fase 2: Storage (SQLite)

### Ubicación
`.omnysysdata/omnysys.db`

### Base de Datos SQLite

OmnySys usa **SQLite** con configuración optimizada para performance:

```javascript
// Configuración SQLite (connection.js)
journal_mode = WAL          // Write-Ahead Logging
cache_size = 64000          // 64MB cache
synchronous = NORMAL        // Balance safety/performance
temp_store = MEMORY         // Temp tables en RAM
page_size = 4096            // Páginas de 4KB
foreign_keys = ON           // Integridad referencial
busy_timeout = 5000         // 5s timeout
```

### Tablas Principales

```
omnysys.db
├── atoms               # Átomos (funciones, variables)
│   ├── id              # Identificador único
│   ├── name            # Nombre del átomo
│   ├── file_path       # Archivo fuente
│   ├── type            # function | arrow | variable | constant
│   ├── complexity      # Complejidad ciclomática
│   ├── archetype       # Clasificación semántica
│   ├── purpose         # API_EXPORT, INTERNAL_HELPER, etc.
│   ├── data_flow       # JSON: flujo de datos
│   ├── dna             # JSON: hash estructural
│   ├── calls           # JSON: llamadas que hace
│   ├── called_by       # JSON: callers
│   └── ...             # 50+ campos de metadata
│
├── atom_relations      # Grafo de dependencias
│   ├── caller_id       # Átomo que llama
│   ├── callee_id       # Átomo llamado
│   ├── call_type       # direct | dynamic | bridge
│   └── context         # JSON: contexto de la llamada
│
├── files               # Metadatos por archivo
├── system_files        # Extensión para System Map
├── file_dependencies   # Dependencias entre archivos
├── semantic_connections # Conexiones semánticas
├── risk_assessments    # Evaluación de riesgo
├── atom_events         # Event sourcing
└── modules             # Agrupación lógica
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

### APIs de Storage

```javascript
// src/layer-c-memory/storage/repository/repository-factory.js

import { getRepository } from '#layer-c/storage/repository/repository-factory.js';

// Obtener repositorio (SQLite por defecto)
const repo = getRepository();

// Operaciones CRUD
const atom = repo.getById('src/file.js::functionName');
repo.save(atom);
repo.delete(atom.id);

// Queries
const atoms = repo.query({ filePath: 'src/file.js' });
const callers = repo.getCallers('src/file.js::functionName');

// Bulk operations
repo.saveMany(atoms);
repo.saveRelationsBulk(relations);
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

## Fase 3: Query APIs (Layer C)

### Ubicación
`src/layer-c-memory/query/`

### APIs Disponibles

```
query/
├── apis/
│   ├── file-api.js      → getFileAnalysis, getFileDependents
│   ├── project-api.js   → getProjectMetadata
│   ├── risk-api.js      → getRiskAssessment
│   └── connections-api.js → getAllConnections
│
├── queries/
│   └── file-query/
│       ├── core/        → getFileAnalysis
│       ├── dependencies/ → getFileDependents, getFileDependencies
│       ├── enriched/    → getFileAnalysisWithAtoms
│       └── atoms/       → getAtomDetails, findAtomsByArchetype
│
└── readers/
    └── json-reader.js   → readJSON, readMultipleJSON
```

### Derivation Engine

```javascript
// src/shared/derivation-engine/composer.js

function composeMolecularMetadata(filePath, atoms) {
  return {
    id: filePath,
    type: 'molecule',
    
    // Composición desde átomos
    atomCount: atoms.length,
    totalComplexity: sum(atoms.map(a => a.complexity)),
    riskScore: calculateRisk(atoms),
    
    // Archetype derivado
    archetype: deriveArchetype(atoms),
    
    // Agregaciones
    exports: flatten(atoms.map(a => a.isExported ? a.name : [])),
    hasSideEffects: any(atoms.map(a => a.hasSideEffects)),
    hasNetworkCalls: any(atoms.map(a => a.hasNetworkCalls)),
    
    // IDs de átomos
    atoms: atoms.map(a => a.id)
  };
}
```

---

## Fase 4: MCP Tools

### Ubicación
`src/layer-c-memory/mcp/tools/`

### Herramientas (30)

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

### Flujo de una Query Típica

```
Usuario: "¿Qué pasa si cambio get_impact_map?"
    │
    ▼
┌───────────────────────────────────────────────────────────────┐
│  analyze_change(filePath, symbolName)                          │
├───────────────────────────────────────────────────────────────┤
│                                                                │
│  1. getFileAnalysis(projectPath, filePath)                    │
│     └─ Lee .omnysysdata/files/{filePath}.json                 │
│                                                                │
│  2. Buscar símbolo en exports                                 │
│     └─ Si no existe → error                                   │
│                                                                │
│  3. get_impact_map(filePath)                                  │
│     ├─ getFileAnalysis() → imports, exports, usedBy           │
│     ├─ getFileDependents() → archivos que usan este           │
│     └─ Calcular transitivos → BFS sobre dependientes          │
│                                                                │
│  4. Retornar:                                                  │
│     {                                                          │
│       symbol: "get_impact_map",                               │
│       directDependents: [...],                                │
│       transitiveDependents: [...],                            │
│       totalAffected: N,                                        │
│       riskLevel: "medium"                                     │
│     }                                                          │
│                                                                │
└───────────────────────────────────────────────────────────────┘
```

---

## Sociedad de Átomos

### Concepto

Los átomos no existen aislados. Forman **sociedades** conectadas por:
- `calls` / `calledBy` - Relaciones de llamada
- `purpose` - API_EXPORT conecta con INTERNAL_HELPER
- `archetype` - hot-paths forman pipelines
- `dna.structuralHash` - Código similar

### Propósitos Detectados

```javascript
const ATOM_PURPOSES = {
  API_EXPORT:       '📤 Exportado - API pública',
  EVENT_HANDLER:    '⚡ Maneja eventos/lifecycle',
  TEST_HELPER:      '🧪 Función en test',
  TIMER_ASYNC:      '⏱️ Timer o async pattern',
  NETWORK_HANDLER:  '🌐 Hace llamadas de red',
  INTERNAL_HELPER:  '🔧 Helper interno',
  CONFIG_SETUP:     '⚙️ Configuración',
  SCRIPT_MAIN:      '🚀 Entry point de script',
  CLASS_METHOD:     '📦 Método de clase',
  DEAD_CODE:        '💀 Sin evidencia de uso'
};
```

### Cadena de Propósitos

```
API_EXPORT → INTERNAL_HELPER → INTERNAL_HELPER → EVENT_HANDLER
     │              │                 │                │
     ▼              ▼                 ▼                ▼
[handleRequest] → [validateInput] → [processData] → [logEvent]
```

### Detección de Sociedades (Propuesto)

```javascript
function detectSociety(atoms) {
  // 1. Cadenas: A → B → C → D
  const chains = [];
  for (const atom of atoms.filter(a => a.purpose === 'API_EXPORT')) {
    chains.push(traceChain(atom));
  }
  
  // 2. Clusters: Funciones mutuamente conectadas
  const clusters = findClusters(atoms, minConnections = 3);
  
  // 3. Hubs: Funciones con > 10 callers
  const hubs = atoms.filter(a => a.calledBy?.length > 10);
  
  return { chains, clusters, hubs };
}
```

---

## Métricas del Sistema

| Métrica | Valor |
|---------|-------|
| Archivos analizados | 1,800+ |
| Átomos extraídos | 12,000+ |
| Herramientas MCP | 30 |
| Coverage calledBy | 44.7% |
| Culture coverage | 99.5% |
| Health Score | 99/100 |
| Base de datos | SQLite (WAL mode) |
| Tablas | 10 |

---

## Referencias

- [ARCHITECTURE.md](../../ARCHITECTURE.md) - Arquitectura general
- [code-physics.md](../02-architecture/code-physics.md) - Concepto de sociedad
- [ISSUES_AND_IMPROVEMENTS.md](./ISSUES_AND_IMPROVEMENTS.md) - Issues conocidos
