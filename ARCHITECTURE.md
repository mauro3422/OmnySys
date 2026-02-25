# OmnySys — Arquitectura Técnica

**Versión**: v0.9.61  
**Última actualización**: 2026-02-25  
**Estado**: ✅ **100% Estático, 0% LLM** - SQLite + Dead Code Detection 85% preciso

---

## Visión General

OmnySys está organizado en **5 capas** con responsabilidades claras y separadas:

```
src/
├── layer-a-static/     # Capa A: Análisis estático puro (AST + regex)
├── layer-b-semantic/   # Capa B: Metadata enrichment (100% estático)
├── layer-graph/        # Capa Graph: Sistema de grafos de dependencias
├── layer-c-memory/     # Capa C: MCP Server, SQLite, exposición
├── core/               # Core: FileWatcher, Orchestrator
├── cli/                # CLI de administración
├── shared/             # Utilidades compartidas
└── utils/              # Logger y utilidades base
```

**IMPORTANTE (v0.9.61)**: Todo el análisis es **100% ESTÁTICO, 0% LLM**. No usamos inteligencia artificial para extraer metadata, solo AST + regex + álgebra de grafos.

---

## Capa A — Análisis Estático (`src/layer-a-static/`)

**Propósito**: Extraer información estructural del código sin ejecutarlo.  
**LLM**: NUNCA. 100% determinístico vía AST + regex.

```
layer-a-static/
├── scanner.js              # Encuentra archivos del proyecto
├── parser/                 # Extrae AST, imports, exports, funciones
├── extractors/             # Extrae metadatos específicos
│   ├── metadata/           # Side effects, call graph, data flow
│   ├── communication/      # WebWorkers, WebSocket, PostMessage
│   ├── state-management/   # Redux, Context, Zustand
│   ├── comprehensive-extractor/  # Extractor completo multi-tipo
│   └── data-flow/          # Seguimiento de flujo de datos
├── analyses/               # Análisis sobre el grafo
│   ├── tier1/              # Hotspots, unused exports, cycles
│   ├── tier2/              # Análisis de calidad media
│   └── tier3/              # Detectores avanzados (race, side effects)
├── pattern-detection/      # Detección de patrones de código
├── race-detector/          # Detección de race conditions
├── pipeline/               # Orquestación del análisis completo
├── module-system/          # Resolución de módulos ESM/CJS
├── resolver.js             # Resuelve imports entre archivos
└── indexer.js              # Orquestador principal de Layer A
```

### Flujo de Layer A

```
indexer.js
    │
    ├─→ scanProjectFiles()
    ├─→ parseFiles()
    ├─→ extractAndSaveAtoms()     # AtomExtractionPhase
    ├─→ buildCalledByLinks()      # 6 sub-pasos de linkage
    ├─→ resolveImports()
    ├─→ normalizePaths()
    ├─→ buildSystemGraph()
    ├─→ enrichWithCulture()       # ZERO LLM
    ├─→ generateAnalysisReport()
    └─→ saveEnhancedSystemMap()   # SQLite bulk insert
```

**Performance**: 13,485 átomos en ~30-60 segundos (startup inicial)

---

## Capa B — Metadata Enrichment (`src/layer-b-semantic/`)

**Propósito**: Enriquecer metadata con arquetipos, propósitos, vectores matemáticos.  
**LLM**: NUNCA (deprecated desde v0.9.61). Todo estático.

```
layer-b-semantic/
├── prompt-engine/          # (Histórico, ya no usa LLM)
│   └── prompt-registry/    # Detectores estáticos de arquetipos
├── metadata-contract/      # Contrato de metadata (SSOT de campos)
│   └── constants.js        # 57+ campos definidos
├── validators/             # Validadores de integridad
└── project-analyzer/       # Análisis de proyecto completo
```

### Arquetipos detectados (100% estático)

`god-function`, `fragile-network`, `hot-path`, `dead-function`, `utility`, `factory`, `validator`, `transformer`, `persister`, `handler`, `initializer`, `orchestrator`

**Todos detectados con reglas estáticas**, SIN LLM.

---

## Capa Graph — Sistema de Grafos (`src/layer-graph/`)

**Propósito**: Construir y consultar el grafo de dependencias del proyecto.  
**Creado en**: v0.9.15 (extraído de Layer A para separación de responsabilidades).

```
layer-graph/
├── core/                   # Lógica central de grafos
├── builders/               # Constructores de grafos
├── queries/                # Queries de grafos
├── metrics/                # Métricas de grafos (centralidad, etc.)
└── utils/                  # Utilidades de grafos
```

### Métricas de Grafo

```javascript
{
  hubs: 9,                      // Funciones muy conectadas
  bridges: 29,                  // Conectan módulos
  leaves: 13408,                // Funciones aisladas
  avgCentrality: 0.165,         // Centralidad promedio
  highRisk: 2834,               // Funciones de alto riesgo
  avgPropagationScore: 0.334    // Propagación promedio
}
```

---

## Capa C — Memoria y Exposición (`src/layer-c-memory/`)

**Propósito**: Persistir metadata en SQLite y exponer vía MCP tools.

```
layer-c-memory/
├── storage/                # Persistencia en SQLite
│   ├── repository/         # Repositorio con bulk operations
│   ├── cache/              # Caché singleton
│   └── enrichers/          # Enriquecimiento de átomos (vectores)
├── mcp/                    # MCP Server
│   ├── tools/              # 29 herramientas MCP
│   ├── core/               # Core del MCP (hot-reload, etc.)
│   └── handlers/           # Handlers de herramientas
└── shadow-registry/        # (Histórico) ADN de código
```

### SQLite Storage

**Configuración**:
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

**Tablas principales**:
- `atoms` → 13,485 funciones con 50+ campos
- `atom_relations` → Grafo de llamadas entre átomos
- `files` → Metadatos por archivo
- `system_files` → System Map extendido
- `semantic_connections` → Conexiones semánticas

**Performance**: 13,000 átomos en ~3 segundos (bulk insert)

---

## Core — FileWatcher y Orchestrator (`src/core/`)

**Propósito**: Detectar cambios en archivos y orquestar el análisis.

```
core/
├── file-watcher/           # Detección de cambios
│   ├── index.js            # Watcher principal
│   ├── lifecycle/          # Lifecycle de cambios
│   └── helpers.js          # Helpers
├── orchestrator/           # Orquestador del análisis
│   ├── change-processor.js # Procesa cambios
│   └── batch-processor.js  # Procesamiento por lotes
└── cache/                  # Caché singleton
```

### Flujo de FileWatcher

```
Cambio detectado
    │
    ├─→ processPendingChanges()
    ├─→ _processWithBatchProcessor()
    ├─→ processBatch()
    ├─→ analyzeSingleFile()
    └─→ saveFileResult() → SQLite
```

**Performance**: <1 segundo por archivo (análisis incremental)

---

## CLI — Administración (`src/cli/`)

**Propósito**: CLI de administración del sistema.

```
cli/
├── index.js                # Entry point principal
├── commands/               # Comandos CLI
│   ├── analyze.js          # Analizar proyecto
│   ├── status.js           # Ver status
│   └── restart.js          # Reiniciar servidor
├── handlers/               # Handlers de comandos
└── utils/                  # Utilidades CLI
```

### Comandos Disponibles

```bash
# Analizar proyecto
npm run analyze

# Ver status
npm run status

# Reiniciar servidor
npm run restart

# Limpiar y reanalizar
npm run clean && npm run analyze
```

---

## Flujo de Datos Completo

```
┌─────────────────────────────────────────────────────────────┐
│                         FLUJO DE DATOS                      │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  [Código Fuente]                                            │
│       │                                                      │
│       ▼                                                      │
│  ┌──────────────────────────────────────────────────────┐   │
│  │  LAYER A: Static Analysis (100% determinístico)      │   │
│  │  • Scanner → Parser → Extractors → Analyses          │   │
│  │  • 17 extractores de metadata                        │   │
│  │  • Cross-file calledBy linkage (6 sub-pasos)         │   │
│  └──────────────────────────────────────────────────────┘   │
│       │                                                      │
│       ▼                                                      │
│  ┌──────────────────────────────────────────────────────┐   │
│  │  LAYER C: SQLite Database                            │   │
│  │  • atoms: 13,485 funciones con 50+ campos            │   │
│  │  • atom_relations: grafo de dependencias             │   │
│  │  • files: metadatos por archivo                      │   │
│  │  • semantic_connections: conexiones semánticas       │   │
│  └──────────────────────────────────────────────────────┘   │
│       │                                                      │
│       ▼                                                      │
│  ┌──────────────────────────────────────────────────────┐   │
│  │  MCP TOOLS (29 herramientas)                         │   │
│  │  • Impacto: get_impact_map, analyze_change, ...      │   │
│  │  • Código: get_call_graph, get_function_details, ... │   │
│  │  • Métricas: get_health_metrics, detect_patterns, .. │   │
│  │  • Testing: generate_tests, generate_batch_tests, .. │   │
│  └──────────────────────────────────────────────────────┘   │
│       │                                                      │
│       ▼                                                      │
│  [Claude / OpenCode / Qwen - IAs]                           │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

---

## Métricas del Sistema (v0.9.61)

| Métrica | Valor |
|---------|-------|
| **Archivos analizados** | 1,860 |
| **Átomos extraídos** | 13,485 |
| **Health Score** | 99/100 (Grade A) |
| **Test Coverage** | 79% |
| **God Functions** | 193 |
| **Dead Code** | 42 (85% mejora) |
| **Duplicados** | 118 exactos |
| **Herramientas MCP** | 29 |
| **LLM Usage** | 0% ✅ |

---

## Próximas Mejoras

### Q2 2026 - Tree-sitter Migration

- Reemplazar Babel con Tree-sitter
- Mejor detección de `isExported` para arrow functions
- Análisis de tipos TypeScript más preciso
- Performance mejorado en proyectos grandes

### Q3 2026 - Intra-Atómico

- Dentro de cada transformación, ver los **sub-átomos**
- Detectar precision loss en cálculos financieros

### Q4 2026 - Estado Cuántico

- Simular **todos los paths posibles** (if/else, try/catch)
- Generar test cases automáticamente

---

**Ver documentación completa**: [docs/INDEX.md](docs/INDEX.md)

---

**Última actualización**: 2026-02-25 (v0.9.61)  
**Estado**: ✅ **100% Estático, 0% LLM**  
**Próximo**: 🚧 Migración a Tree-sitter (Q2 2026)
