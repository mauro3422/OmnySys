# Flujo de Datos - OmnySys

**Versión**: v0.9.17
**Última actualización**: 2026-02-20

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
│   │  STORAGE: .omnysysdata/                                              │   │
│   │  ───────────────────────────────────────────────────────────────    │   │
│   │  atoms/           → Un archivo JSON por función                     │   │
│   │  files/           → Un archivo JSON por archivo                     │   │
│   │  molecules/       → Metadata derivada de átomos                     │   │
│   │  connections/     → Conexiones semánticas                           │   │
│   │  risks/           → Evaluación de riesgo                            │   │
│   └─────────────────────────────────────────────────────────────────────┘   │
│        │                                                                     │
│        ▼                                                                     │
│   ┌─────────────────────────────────────────────────────────────────────┐   │
│   │  LAYER C: Memory / MCP Server                                        │   │
│   │  ───────────────────────────────────────────────────────────────    │   │
│   │  Query APIs → Derivation Engine → 14 MCP Tools                      │   │
│   │       │              │                   │                           │   │
│   │       ▼              ▼                   ▼                           │   │
│   │   file-api.js   composeMolecular    impact-map.js                   │   │
│   │   project-api.js  Metadata()        get-call-graph.js               │   │
│   │   risk-api.js                        get-molecule-summary.js         │   │
│   │                                      analyze-change.js               │   │
│   │                                      ...                             │   │
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

## Fase 2: Storage

### Ubicación
`.omnysysdata/`

### Estructura

```
.omnysysdata/
├── index.json                    # Índice global del proyecto
├── system-map.json               # Grafo completo (~300MB)
├── system-map-enhanced.json      # Con análisis semántico
├── system-map-analysis.json      # Métricas agregadas
│
├── files/                        # Un JSON por archivo
│   └── src/
│       └── layer-c-memory/
│           └── mcp/
│               └── tools/
│                   └── index.js.json
│
├── atoms/                        # Un JSON por FUNCIÓN
│   └── src/
│       └── layer-c-memory/
│           └── mcp/
│               └── tools/
│                   ├── index/
│                   │   ├── toolDefinitions.json
│                   │   └── toolHandlers.json
│                   └── impact-map/
│                       ├── get_impact_map.json
│                       └── logger.json
│
├── molecules/                    # Metadata derivada por archivo
│   └── src/
│       └── .../
│           └── file.js.molecule.json
│
├── connections/                  # Conexiones semánticas
│   ├── shared-state.json
│   └── event-listeners.json
│
└── risks/
    └── assessment.json
```

### APIs de Storage

```javascript
// src/layer-c-memory/storage/index.js

// Átomos
import { saveAtom, loadAtoms } from './atoms/index.js';

// Moléculas
import { saveMolecule, loadMolecule } from './molecules/index.js';

// Files
import { saveFileAnalysis, saveMetadata } from './files/index.js';
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

### Herramientas (14)

| Herramienta | Propósito | Datos que Usa |
|-------------|-----------|---------------|
| `get_impact_map` | Mapa de impacto de archivo | files/, usedBy |
| `analyze_change` | Impacto de cambiar símbolo | get_impact_map |
| `explain_connection` | Conexión entre 2 archivos | imports, usedBy |
| `get_risk_assessment` | Evaluación de riesgo | risks/, metadata |
| `get_call_graph` | Call sites de símbolo | atoms/, calls |
| `analyze_signature_change` | Breaking changes | calls, signature |
| `explain_value_flow` | Flujo de datos | dataFlow, calls |
| `get_function_details` | Detalles de función | atoms/ completo |
| `get_molecule_summary` | Resumen de archivo | atoms/ + derived |
| `search_files` | Búsqueda de archivos | fileIndex |
| `get_server_status` | Estado del servidor | metadata, cache |
| `restart_server` | Reiniciar servidor | - |
| `atomic_edit` | Edición segura | files/ |
| `atomic_write` | Escritura segura | files/ |

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
| Archivos analizados | 1,747 |
| Átomos extraídos | 5,984 |
| Herramientas MCP | 14 |
| Coverage calledBy | 44.7% |
| Culture coverage | 99.5% |
| Health Score | 77.9/100 |

---

## Referencias

- [ARCHITECTURE.md](../../ARCHITECTURE.md) - Arquitectura general
- [code-physics.md](../02-architecture/code-physics.md) - Concepto de sociedad
- [ISSUES_AND_IMPROVEMENTS.md](./ISSUES_AND_IMPROVEMENTS.md) - Issues conocidos
