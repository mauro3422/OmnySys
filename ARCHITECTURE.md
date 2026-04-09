# OmnySys — Arquitectura Técnica

**Versión**: v0.9.285
**Última actualización**: 2026-04-09
**Estado**: ✅ **100% Estático, 0% LLM** — Tree-sitter + SQLite + Schema Unificado + MCP

---

## Visión General

OmnySys es una **capa de gobernanza y compilador-like control layer para codebases asistidos por IA**. Detecta drift arquitectural, persiste verdad canónica, expone impacto/duplicación/freschezza runtime como contratos, y evita que múltiples agentes de IA fragmenten el mismo codebase en paralelo.

> **OmnySys existe porque la IA ya puede generar código más rápido de lo que los humanos pueden metabolizarlo.**

---

## Arquitectura de Capas (5 capas + core)

```
src/
├── layer-a-static/       # Capa A: Análisis estático (AST + Tree-sitter + regex)
├── layer-b-semantic/     # Capa B: Enriquecimiento semántico (ADN, arquetipos, societies)
├── layer-graph/          # Capa Graph: Grafo de dependencias + métricas de centralidad
├── layer-c-memory/       # Capa C: Persistencia SQLite + MCP Server (45 tools)
├── core/                 # Core: FileWatcher, Orchestrator, Unified Server
├── shared/               # Contratos del compilador, utilidades compartidas
├── cli/                  # CLI de administración (omny.js entry point)
├── ai/                   # Integración LLM (histórico, no usado en análisis)
├── services/             # Capa de servicios
├── utils/                # Logger y utilidades base
└── validation/           # Validación
```

### Áreas por capa (estado real abril 2026)

```
layer-a-static/           # 19 entradas (9 dirs + 10 archivos)
├── scanner.js            # Encuentra archivos del proyecto
├── parser/               # Parseo AST + imports + exports
├── extractors/           # Metadata: side-effects, call-graph, data-flow, tree-sitter
├── pipeline/             # Pipeline orquestado: extract → link → enhance
├── analyses/             # Tier 1/2/3: hotspots, unused exports, shared-state, events
├── pattern-detection/    # Patrones de código (god-function, fragile-network, etc.)
├── race-detector/        # Detección de race conditions
├── module-system/        # Resolución de módulos ESM/CJS
├── resolver.js           # Resuelve imports entre archivos
├── indexer.js            # Orquestador principal (indexProject, refreshPatterns)
├── indexer-project-runner.js
├── indexer-refresh-runner.js
├── indexer-fallback.js
└── analyzer.js

layer-b-semantic/          # 12 entradas (11 dirs + README)
├── metadata-contract/     # SSOT de campos del schema de átomos
├── dna-analyzer/          # ADN de código (fingerprint estructural)
├── society-manager/       # Clusters de cohesión funcional
├── validators/            # Validadores de integridad
├── prompt-engine/         # Histórico (ya no usa LLM)
├── inference-engine/      # Inferencia estática de propósito
├── physics-engine/        # Modelado matemático de relaciones
├── atom-decider/          # Clasificación de arquetipos
├── llm-analyzer/          # Histórico (deprecated)
├── schema-validator/
└── project-analyzer/

layer-graph/               # 9 entradas (7 dirs + index + README)
├── core/                  # Lógica central de grafos
├── builders/              # Constructores
├── queries/               # Queries
├── algorithms/            # Algoritmos (centralidad, etc.)
├── persistence/           # Persistencia de grafo
├── resolvers/
└── utils/

layer-c-memory/            # 24 entradas (8 dirs + 16 archivos)
├── storage/               # SQLite: atoms, files, relations, cache, enrichers
│   ├── database/          # Conexión, schema registry, integridad
│   ├── repository/        # Repositorio con bulk operations
│   ├── atoms/             # CRUD de átomos
│   ├── files/             # CRUD de archivos
│   ├── enrichment/        # Enriquecimiento (vectores, grafo algebra)
│   ├── governance/        # Policy enforcement
│   └── cache/             # Caché singleton
├── mcp/                   # MCP Server (45 herramientas)
│   ├── tools/             # 80 archivos de herramientas (query/action/admin)
│   ├── core/              # Inicialización, server-class
│   └── handlers/          # Handlers por categoría
├── query/                 # APIs de consulta canónica
├── verification/          # Validadores de consistencia
├── migrations/            # Migraciones de DB
├── cache/                 # Caché de herramientas
├── mcp-http-proxy.js      # Proxy HTTP con restart management
├── mcp-http-server.js     # Servidor MCP HTTP real
├── mcp-server.js          # Servidor MCP stdio
├── mcp-stdio-bridge.js    # Bridge stdio ↔ HTTP
└── worker-spawner.js      # Spawning de worker processes

core/                      # 22 entradas (17 dirs + 5 archivos)
├── file-watcher/          # Watcher principal (chokidar) + guards + lifecycle
├── orchestrator/          # Orquestador del análisis
├── unified-server/        # Servidor unificado (Express + MCP)
├── atomic-editor/         # Editor atómico con validación
├── batch-processor/       # Procesamiento por lotes
├── meta-detector/         # Detección de patrones meta
├── cache/                 # Caché global
├── websocket/             # Comunicación WebSocket
├── worker/                # Workers de procesamiento
└── diagnostics/           # Diagnóstico

shared/                    # 19 entradas (9 dirs + 10 archivos)
├── compiler/              # 313 archivos — contratos del compilador
│   ├── compiler-contract-layer/   # Capa de contratos de gobernanza
│   ├── compiler-health-archive/   # Archivo de salud
│   ├── compiler-metrics-current/  # Métricas actuales
│   ├── compiler-control-plane/    # Plano de control
│   ├── propagation-engine/        # Motor de propagación
│   ├── folderization-report/      # Reportes de folderización
│   ├── surface-audit/             # Auditoría de superficies
│   └── ... (280+ módulos de contratos, métricas, políticas)
├── utils/                 # Utilidades compartidas
├── cache/                 # Caché atómico
├── analysis/              # Análisis compartido
└── lifecycle/             # Lifecycle compartido

cli/                       # 5 entradas (3 dirs + 2 archivos)
├── commands/              # Comandos CLI (up, down, status, tools, call)
├── handlers/              # Handlers de procesos
├── utils/                 # Logger CLI, port-checker, opencode-config
├── index.js               # Entry point principal
└── help.js
```

---

## Flujo de Datos Completo

```
┌──────────────────────────────────────────────────────────────────────────┐
│                        FLUJO DE DATOS OmnySys v0.9.285                   │
├──────────────────────────────────────────────────────────────────────────┤
│                                                                           │
│  [Código Fuente del Proyecto]                                             │
│       │                                                                   │
│       ▼                                                                   │
│  ┌───────────────────────────────────────────────────────────────────┐   │
│  │  LAYER A: Static Analysis                                          │   │
│  │  scanner → parser → extractors → pipeline → analyses              │   │
│  │  • Tree-sitter: JavaScript, TypeScript, SQL AST                    │   │
│  │  • 14,241 átomos extraídos de 2,813 archivos activos              │   │
│  │  • Tree-sitter: sharedStateAccess, events, scopeType              │   │
│  └───────────────────────────────────────────────────────────────────┘   │
│       │                                                                   │
│       ▼                                                                   │
│  ┌───────────────────────────────────────────────────────────────────┐   │
│  │  LAYER B: Semantic Enrichment                                      │   │
│  │  DNA fingerprinting · Arquetipos · Societies · Risk               │   │
│  │  • 1,780 sociedades de cohesión detectadas                        │   │
│  │  • 135 conexiones semánticas                                       │   │
│  │  • 100% estático, 0% LLM                                          │   │
│  └───────────────────────────────────────────────────────────────────┘   │
│       │                                                                   │
│       ▼                                                                   │
│  ┌───────────────────────────────────────────────────────────────────┐   │
│  │  LAYER GRAPH: Dependency Graph                                     │   │
│  │  11,202 relaciones de llamada · centralidad · puentes · hubs      │   │
│  └───────────────────────────────────────────────────────────────────┘   │
│       │                                                                   │
│       ▼                                                                   │
│  ┌───────────────────────────────────────────────────────────────────┐   │
│  │  LAYER C: SQLite Persistence + MCP Server                          │   │
│  │  • omnysys.db (344 MB) — 20 tablas, 0 drift                       │   │
│  │  • 45 herramientas MCP (6 query · 21 action · 18 admin)           │   │
│  │  • HTTP proxy con processRestart management                       │   │
│  │  • FileWatcher con guards + batch processing                      │   │
│  └───────────────────────────────────────────────────────────────────┘   │
│       │                                                                   │
│       ▼                                                                   │
│  [Agentes IA: Claude · Qwen · OpenCode · Cline · Codex]                 │
│                                                                           │
└──────────────────────────────────────────────────────────────────────────┘
```

---

## Bootstrap Sequence (OmnySysUnifiedServer)

```
omny.js up
    │
    ▼
src/cli/index.js → findCommand('up')
    │
    ▼
OmnySysUnifiedServer(absolutePath)
    │
    ├── 1. initialization/     → Cache preload, Layer A load, MCP setup
    │                            (startup ~4.5s total)
    │
    ├── 2. api/               → Express routes, status endpoints
    │
    ├── 3. orchestrator/       → FileWatcher start, change processing
    │
    ├── 4. tools/              → MCP tool registration
    │
    └── 5. lifecycle/          → Health checks, shutdown handlers
```

### Fases de Startup

| Fase | Duración | Descripción |
|------|----------|-------------|
| `instance-detection` | 12ms | Detecta instancias previas |
| `layer-a-analysis` | 34ms | Carga datos estructurales existentes |
| `cache-init` | 931ms | Inicializa caché de herramientas |
| `orchestrator-init` | 1,530ms | Inicia FileWatcher + MCP server |
| `mcp-setup` | 7ms | Registra herramientas MCP |
| **Total** | **~4,550ms** | Dentro del budget de 15s |

---

## Bases de Datos

### Arquitectura de 3 Bases de Datos

| Database | Tamaño | Propósito | Preservado en `reanalyze`? |
|----------|--------|-----------|:---:|
| `omnysys.db` | **344 MB** | Datos activos — átomos, archivos, relaciones, riesgo, sesiones | ❌ (se reconstruye) |
| `atom-history.db` | **384 MB** | Archivo histórico — evolución de cada átomo a través de commits Git | ✅ Siempre |
| `health-history.db` | **20 MB** | Historial de métricas — snapshots de salud, tendencias, comparaciones | ✅ Siempre |
| **Total** | **~748 MB** | | |

### Schema de `omnysys.db` (20 tablas, 0 drift)

| Tabla | Columnas | Propósito |
|-------|----------|-----------|
| `atoms` | 66 | Átomos extraídos (funciones, clases, variables, métodos) |
| `files` | 11 | Metadatos por archivo |
| `atom_relations` | 11 | Grafo de llamadas entre átomos (11,202 edges) |
| `system_files` | 18 | System Map extendido |
| `semantic_connections` | 11 | Conexiones semánticas (135 conexiones) |
| `cache_entries` | 5 | Caché de herramientas MCP |
| `atom_versions` | 6 | Versiones de átomos |
| `file_hashes` | 5 | Hashes de archivos (fuente de verdad canónica) |
| `modules` | 15 | Módulos del proyecto |
| `file_dependencies` | 10 | Dependencias entre archivos |
| `atom_events` | 9 | Eventos de átomos |
| `societies` | 9 | Clusters de cohesión funcional (1,780 societies) |
| `risk_assessments` | 13 | Evaluaciones de riesgo por archivo |
| `semantic_issues` | 11 | Issues semánticos (25 activos: coupling) |
| `system_metadata` | 3 | Metadatos del sistema |
| `mcp_sessions` | 8 | Sesiones MCP activas |
| `mcp_tool_runs` | 30 | Telemetría de ejecución de herramientas |
| `compiler_scanned_files` | 3 | Archivos escaneados por el compilador |
| `compiler_metrics_snapshots` | 43 | Snapshots de métricas del compilador |

**Configuración SQLite**:
```javascript
{
  journal_mode: 'WAL',        // Write-Ahead Logging
  cache_size: 64000,          // 64MB cache
  synchronous: 'NORMAL',
  temp_store: 'MEMORY',
  page_size: 4096,
  foreign_keys: 'ON',
  busy_timeout: 5000
}
```

---

## Catálogo de Herramientas MCP (45 tools)

### Query (6 herramientas)

| Tool | Propósito |
|------|-----------|
| `query_graph` | Inspeccionar átomo/símbolo (instances, details, history) |
| `traverse_graph` | Navegar grafo de dependencias (impact_map, call_graph) |
| `impact_atomic` | Simular impacto antes de modificar |
| `aggregate_metrics` | Métricas agrupadas (health, risk, duplicates, society, etc.) |
| `get_atom_history` | Historial Git de un símbolo |
| `get_atom_evolution_report` | Reporte completo: detalles + DNA + dataFlow + impacto + Git |

### Action (21 herramientas)

| Tool | Propósito |
|------|-----------|
| `atomic_edit` | Editar con validación atómica + propagación de vibración |
| `atomic_write` | Crear archivo con validación + indexación inmediata |
| `safe_edit` | Editar por línea o patrón con contexto automático |
| `move_file` | Mover archivo + actualizar TODOS los imports |
| `folderize_family` | Mover familia cohesiva a carpeta dedicada |
| `rename_folderized_family` | Renombrar basenames dentro de familia folderizada |
| `normalize_folderized_family_names` | Normalizar nombres sin mover archivos |
| `fix_imports` | Reparar imports rotos automáticamente |
| `execute_solid_split` | Dividir función compleja (SOLID) |
| `split_large_file` | Dividir archivos >300 líneas |
| `suggest_refactoring` | Sugerencias de refactoring basadas en grafo |
| `suggest_architecture` | Reagrupar archivos cohesivos dispersos (DDD) |
| `suggest_canonical_api` | Detectar acceso directo a DB → sugerir APIs canónicas |
| `validate_imports` | Verificar imports rotos/circulares/no usados |
| `validate_exports` | Verificar que imports coinciden con exports |
| `generate_tests` | Analizar o generar tests |
| `generate_batch_tests` | Generar tests en batch para funciones sin cobertura |
| `consolidate_conceptual_cluster` | Fusionar duplicados conceptuales hacia SSOT |
| `consolidate_batch` | Consolidar múltiples clusters en batch |
| `consolidate_policy_drifts` | Detectar y reparar violaciones de contratos canónicos |
| `detect_folderization_opportunities` | Escanear oportunidades de folderización |

### Admin (18 herramientas)

| Tool | Propósito |
|------|-----------|
| `get_schema` | Consultar schema (atoms, database, registry) |
| `get_server_status` | Estado completo del servidor |
| `get_metrics_snapshot` | Snapshot canónico de métricas con tendencia |
| `get_health_snapshot` | Dashboard de salud con historial |
| `get_health_panel` | Panel de una pantalla: status + trend + next action |
| `get_folderization_snapshot` | Guía de folderización + naming debt |
| `get_tool_inventory_report` | Catálogo de herramientas con recomendaciones |
| `get_system_inventory_report` | Inventario de superficies canónicas, bridges, wrappers |
| `get_canonical_promotion_report` | Plan de promoción para familias folderizadas |
| `list_tools` | Inventario de herramientas MCP |
| `get_recent_errors` | Errores/warnings recientes del logger |
| `restart_server` | Reiniciar servidor (múltiples modos) |
| `detect_performance_hotspots` | Detectar O(n²), blocking I/O, memory risks |
| `execute_sql` | Ejecutar SQL contra omnysys.db |
| `get_technical_debt_report` | Reporte de deuda técnica: duplicados + huérfanos + score |
| `check_pipeline_integrity` | Verificación de 8 checks del pipeline |
| `diagnose_tool_health` | Analizar salud de herramientas MCP |
| `get_tool_inventory_report` | Reporte de herramientas con consolidación |

---

## Schema de Átomos

Cada átomo (función, clase, variable, método) tiene **66 campos** en la DB:

```javascript
{
  // Identidad
  id, name, file_path, line, end_line, atom_type,
  is_exported, is_async, is_generator,

  // Estructural
  lines_of_code, cyclomatic_complexity, parameters,
  imports_json, exports_json, uses_json,

  // Grafo
  calledBy, calls, semanticConnections,

  // Tree-sitter metadata (v0.9.62+)
  sharedStateAccess: [   // Accesos a estado global
    { fullReference, type, line, scopeType, confidence }
  ],
  eventEmitters: [       // Emisores de eventos
    { eventName, type, line }
  ],
  eventListeners: [      // Listeners de eventos
    { eventName, type, line }
  ],
  scopeType: 'local' | 'module' | 'global' | 'closure',

  // Semántico (Layer B)
  archetype, purpose, dna, dataFlow, errorFlow,
  sideEffects, hasSideEffects,

  // Riesgo
  fragility, instability, coupling, propagationScore,

  // Clasificación
  role, category, isCore, isHotPath,

  // Genealogía
  is_removed, created_at, updated_at,
  _meta_json             // Metadata adicional
}
```

**Arquetipos detectados** (100% estático):
`god-function`, `fragile-network`, `hot-path`, `dead-function`, `utility`, `factory`, `validator`, `transformer`, `persister`, `handler`, `initializer`, `orchestrator`, `standard`, `private-utility`, `class-method`, `factory`

---

## FileWatcher System

```
cambio detectado (chokidar)
    │
    ├─→ debounce (500ms) + dedup
    ├─→ batchProcessor (1000ms entre batches)
    ├─→ analyzeSingleFile()
    │   ├─→ Layer A: parse → extract → pipeline
    │   └─→ save → SQLite (bulk operations)
    ├─→ guards (validación de integridad)
    │   ├─→ integrity-guard/dataflow-skip
    │   ├─→ impact-wave
    │   ├─→ semantic-coverage
    │   └─→ topology-regression
    ├─→ watcher-issue-persistence
    └─→ emit events → MCP status
```

**Configuración**:
- `debounceMs`: 500ms
- `batchDelayMs`: 1000ms
- `maxConcurrent`: 3 análisis simultáneos
- Change origins tracked: `filesystem`, `manual`, `api`, `atomic`, `unknown`

---

## CLI (omny.js)

```bash
omny.js up              # Inicia servidor MCP + FileWatcher
omny.js down            # Detiene todo
omny.js status          # Muestra estado
omny.js tools           # Lista herramientas
omny.js call <tool>     # Ejecuta una herramienta
omny.js setup           # Configura OpenCode/VSCode
omny.js help            # Muestra ayuda
```

**Scripts npm principales**:
```bash
npm start               # = omny.js up
npm stop                # = omny.js down
npm status              # = omny.js status
npm run analyze         # Análisis del proyecto
npm run analyze:full    # Análisis completo (8GB RAM)
npm run mcp:http        # Inicia proxy HTTP directamente
npm run mcp:stdio       # Inicia servidor stdio
npm test                # Vitest (todos los tests)
```

---

## Modo de Reinicio del Servidor

| Modo | Mata Proceso? | DB Preservada? | Reindex? | Cuándo Usar |
|------|:---:|:---:|:---:|-------------|
| `{ processRestart: true }` | ✅ | ✅ TODAS | ❌ | Después de editar código |
| `{ clearCacheOnly: true }` | ❌ | ✅ | ❌ | Limpiar caché solamente (más rápido) |
| `{ reindexOnly: true }` | ❌ | ✅ | ✅ | Forzar re-análisis Layer A |
| `{ reanalyze: true }` | ✅ | ⚠️ Parcial | ✅ Full | Reset destructivo (borra omnysys.db) |

**Regla de oro**: Después de editar código → `processRestart: true`. El file watcher reindexea automáticamente los archivos cambiados.

---

## Dependencias Clave

| Dependencia | Versión | Propósito |
|-------------|---------|-----------|
| `tree-sitter` | ^0.25.0 | Parseo AST de alta precisión |
| `tree-sitter-javascript` | ^0.23.1 | Gramática JavaScript |
| `tree-sitter-typescript` | ^0.23.2 | Gramática TypeScript |
| `tree-sitter-sql` | ^0.1.0 | Gramática SQL |
| `@derekstride/tree-sitter-sql` | ^0.3.11 | Gramática SQL alternativa |
| `better-sqlite3` | ^9.2.0 | SQLite síncrono de alto rendimiento |
| `@modelcontextprotocol/sdk` | ^1.26.0 | SDK MCP |
| `chokidar` | ^3.5.3 | File watching |
| `express` | ^4.18.2 | Servidor HTTP |
| `fast-glob` | ^3.3.2 | Globbing de archivos |
| `vitest` | ^4.0.18 | Testing framework |

---

## Métricas Actuales del Codebase (Abril 2026)

| Métrica | Valor |
|---------|-------|
| **Átomos activos** | 14,241 |
| **Archivos activos** | 2,813 |
| **Relaciones (call graph)** | 11,202 |
| **Conexiones semánticas** | 135 |
| **Societies** | 1,780 |
| **Herramientas MCP** | 45 |
| **Tablas SQLite** | 20 |
| **Duplicados estructurales** | 5 grupos (10 instancias) |
| **Issues semánticos activos** | 25 (coupling) |
| **Archivos de shared/compiler/** | 313 |
| **Archivos de src/ (total)** | ~2,813 analizados |

### Distribución de Átomos por Tipo

| Tipo | Cantidad |
|------|----------|
| `function` | 5,613 |
| `arrow` | 4,031 |
| `variable` | 2,114 |
| `method` | 2,100 |
| `class` | 383 |

### Riesgo por Archivo

| Nivel | Cantidad |
|-------|----------|
| Crítico | 0 |
| Alto | 1 |
| Medio | 64 |
| Bajo | 2,699 |

---

## Próximas Mejoras

### Consolidación Inmediata
- [ ] Reconciliar universo de archivos (136 policy drifts)
- [ ] Refactorizar funciones con CC > 30 (15 hotspots)
- [ ] Consolidar 5 grupos de duplicados estructurales
- [ ] Resolver estado compartido radiactivo en scripts de diagnóstico

### Q2-Q3 2026
- [ ] Lazy Indexing: Phase 1 structural < 5s, Phase 2 background
- [ ] Normalizar naming debt (1,871 renombres pendientes)
- [ ] Mejorar metadata coverage de 84% a >90%

### Largo Plazo
- [ ] Intra-atómico: sub-átomos dentro de cada transformación
- [ ] Estado cuántico: simulación de todos los paths posibles
- [ ] Campo unificado: entrelazamiento entre archivos lejanos

---

**Documentación relacionada**:
- [README.md](README.md)
- [ROADMAP.md](ROADMAP.md)
- [CHANGELOG.md](CHANGELOG.md)
- [BACKLOG.md](BACKLOG.md)
- [AGENTS.md](AGENTS.md)
