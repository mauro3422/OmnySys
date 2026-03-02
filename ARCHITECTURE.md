# OmnySys — Arquitectura Técnica

**Versión**: v0.9.65
**Última actualización**: 2026-02-28
**Estado**: ✅ **100% Estático, 0% LLM** - Tree-sitter + SQLite + Schema Unificado

---

## Novedades v0.9.73 (Performance & Lazy Indexing Blueprint)

### Eliminación del Contention Overhead
- ✅ **Worker Threads Seguros**: Migración a procesamiento secuencial interno en workers (eliminando `Promise.all` CPU-bound).
- ✅ **Extractor Sync Path**: Eliminación de cientos de miles de microtasks `async/await` promoviendo `getExtractorSync()` y `extractDataFlow` síncronos.
- ✅ **Warmup Pre-arranque**: Caché de módulos pre-calentados al instanciar Workers para eliminar I/O asíncrono en caliente.

### Nuevo Paradigma: Lazy Indexing (Diseño)
El sistema migrará de una arquitectura "Big Bang" (100% de extracción cognitiva antes del arranque) a una arquitectura escalonada inspirada en LSPs (Language Server Protocols):
- **Phase 1 (Structural Fast Scan)**: Tree-sitter + Nombres/Firmas + SQLite. TTI (Time-to-Interactive) en <5s.
- **Phase 2 (Deep Semantic Scan)**: Extractores NLP y Semántica matemática procesados en Background o *On-Demand* cuando el usuario invoca una tool MCP específica.

---

## Visión General

OmnySys está organizado en **5 capas** con responsabilidades claras y separadas:

```
src/
├── layer-a-static/     # Capa A: Análisis estático puro (AST + Tree-sitter)
├── layer-b-semantic/   # Capa B: Metadata enrichment (100% estático)
├── layer-graph/        # Capa Graph: Sistema de grafos de dependencias
├── layer-c-memory/     # Capa C: MCP Server, SQLite, exposición
├── core/               # Core: FileWatcher, Orchestrator
├── cli/                # CLI de administración
├── shared/             # Utilidades compartidas
└── utils/              # Logger y utilidades base
```

**IMPORTANTE (v0.9.62)**: Todo el análisis es **100% ESTÁTICO, 0% LLM**. Usamos **Tree-sitter** para AST de alta precisión + regex + álgebra de grafos.

---

## Capa A — Análisis Estático (`src/layer-a-static/`)

**Propósito**: Extraer información estructural del código sin ejecutarlo.
**LLM**: NUNCA. 100% determinístico vía Tree-sitter + AST + regex.

### Arquitectura de Layer A (v0.9.62)

```
layer-a-static/
├── scanner.js              # Encuentra archivos del proyecto
├── parser/                 # Extrae AST, imports, exports, funciones
├── extractors/             # Extrae metadatos específicos
│   ├── metadata/           # Side effects, call graph, data flow
│   │   ├── tree-sitter-integration.js  # ← NUEVO: Puente Tree-sitter → Schema
│   │   ├── side-effects.js
│   │   ├── call-graph.js
│   │   ├── data-flow.js
│   │   └── registry.js     # Registro centralizado de extractores
│   ├── communication/      # WebWorkers, WebSocket, PostMessage
│   ├── state-management/   # Redux, Context, Zustand
│   └── data-flow/          # Seguimiento de flujo de datos
├── analyses/               # Análisis sobre el grafo
│   ├── tier1/              # Hotspots, unused exports, cycles
│   ├── tier2/              # Análisis de calidad media
│   └── tier3/              # Detectores avanzados (Tree-sitter based)
│       ├── shared-state/   # ← Shared state detection con Tree-sitter
│       ├── event-detector/ # ← Event patterns con Tree-sitter
│       └── side-effects-detector.js
├── pattern-detection/      # Detección de patrones de código
├── race-detector/          # ← AHORA usa datos de Tree-sitter
│   └── trackers/
│       └── module-state-tracker.js  # ← Usa atom.sharedStateAccess
├── pipeline/               # Orquestación del análisis completo
│   ├── phases/
│   │   └── atom-extraction/
│   │       └── builders/
│   │           └── metadata-builder.js  # ← Agrega campos Tree-sitter
│   └── enhance/
│       └── analyzers/
│           └── file-analyzer.js  # ← Analiza con Tree-sitter
├── module-system/          # Resolución de módulos ESM/CJS
├── resolver.js             # Resuelve imports entre archivos
└── indexer.js              # Orquestador principal de Layer A
```

### Flujo de Layer A (Futuro v1.0.0 - Lazy Indexing)

```
indexer.js
    │
    ├─→ [PHASE 1: FAST BOOT < 5s]
    │   ├─→ scanProjectFiles()
    │   ├─→ parseFiles() (Tree-sitter)
    │   ├─→ Structural Atom Extraction (Nombres, Líneas, Firmas, Imports)
    │   └─→ saveSystemMap() → MCP Tools DISPONIBLES
    │
    ├─→ [PHASE 2: DEEP SEMANTICS - Background/Lazy]
    │   ├─→ extractDataFlow() & extractSemanticDomain()
    │   ├─→ buildCalledByLinks() (Cross-file linkage)
    │   ├─→ enrichWithCulture()
    │   └─→ saveEnhancedSystemMap() (Actualizaciones incrementales)
```

**Performance Objetivo**: 18,500 átomos en <5 segundos (TTI Phase 1).

### Schema de Átomos (Status: Híbrido Actual)

**Campos nuevos agregados desde Tree-sitter**:

```javascript
{
  // ... campos existentes (57+)
  
  // NUEVOS: Tree-sitter metadata
  sharedStateAccess: [    // ← Accesos a estado global (window.*, global.*)
    {
      fullReference: 'window.currentUser',
      type: 'read' | 'write',
      line: 42,
      functionContext: 'authenticateUser',
      scopeType: 'global' | 'module' | 'local' | 'closure',
      objectName: 'window',
      propName: 'currentUser',
      confidence: 1.0
    }
  ],
  eventEmitters: [        // ← Emisores de eventos
    {
      eventName: 'user:login',
      type: 'emit' | 'dispatch',
      line: 55
    }
  ],
  eventListeners: [       // ← Listeners de eventos
    {
      eventName: 'click',
      type: 'addEventListener',
      line: 10
    }
  ],
  scopeType: 'local' | 'module' | 'global' | 'closure'  // ← Scope real
}
```

**Total campos**: 41 base + 4 nuevos de Tree-sitter = **45 campos**

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

## Race Detector — Estandarizado con Tree-sitter (v0.9.62)

**Propósito**: Detectar race conditions usando metadata de Tree-sitter en lugar de trackers duplicados.

### Arquitectura del Race Detector (v0.9.62)

```
┌─────────────────────────────────────────────────────────────┐
│                    Tree-sitter (Layer A)                     │
│  - Parsea código con AST real                               │
│  - Detecta shared state (window.*, global.*)                │
│  - Detecta eventos (emitters, listeners)                    │
│  - Scope real (module-level, function context)              │
└─────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────┐
│            tree-sitter-integration.js (PUENTE)              │
│  - Filtra por átomo (línea start-end)                       │
│  - Determina scopeType (local/module/global/closure)        │
│  - Cachea por archivo (performance)                         │
└─────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────┐
│              Schema MCP (45 campos)                         │
│  - sharedStateAccess[]                                      │
│  - eventEmitters[]                                          │
│  - eventListeners[]                                         │
│  - scopeType                                                │
└─────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────┐
│              Race-detector (CONSUME DEL SCHEMA)             │
│  - module-state-tracker usa atom.sharedStateAccess          │
│  - Elimina duplicación de lógica                            │
│  - Precisión garantizada por Tree-sitter                    │
└─────────────────────────────────────────────────────────────┘
```

### Beneficios de la Estandarización

1. **SSOT (Single Source of Truth)**: Tree-sitter es la única fuente de verdad para shared state y eventos
2. **Sin duplicación**: Race-detector consume del schema, no replica lógica
3. **Precisión**: Tree-sitter tiene scope real, no heurísticas
4. **Performance**: Cache por archivo, análisis una sola vez
5. **Extensibilidad**: Nuevos campos se agregan al schema, no a múltiples trackers

### Campos del Schema para Race Detection

```javascript
// Atom metadata (v0.9.62)
{
  // Shared state access (Tree-sitter)
  sharedStateAccess: [
    {
      fullReference: 'window.currentUser',
      type: 'write',  // 'read' o 'write'
      line: 42,
      functionContext: 'authenticateUser',
      scopeType: 'global',  // 'local' | 'module' | 'global' | 'closure'
      objectName: 'window',
      propName: 'currentUser',
      confidence: 1.0
    }
  ],
  
  // Eventos
  eventEmitters: [
    { eventName: 'user:login', type: 'emit', line: 55 }
  ],
  eventListeners: [
    { eventName: 'click', type: 'addEventListener', line: 10 }
  ],
  
  // Scope determinado por Tree-sitter
  scopeType: 'module'
}
```

### Module-State-Tracker (v0.9.62)

**ANTES** (con lógica duplicada):
```javascript
// ❌ Detectaba por su cuenta con regex
trackAtom(atom) {
  const sideEffects = atom.dataFlow?.sideEffects || [];
  for (const effect of sideEffects) {
    if (this.isModuleStateWrite(effect)) {
      const stateType = this.determineStateType(effect, atom);  // Lógica duplicada
      this.registerAccess(stateType, ...);
    }
  }
}
```

**AHORA** (usa Tree-sitter):
```javascript
// ✅ Usa datos de Tree-sitter
trackAtom(atom) {
  // PRIORITY 1: Tree-sitter metadata (más preciso)
  if (atom.sharedStateAccess?.length > 0) {
    for (const access of atom.sharedStateAccess) {
      const stateType = access.scopeType;  // Tree-sitter ya lo determinó
      this.registerAccess(stateType, access.fullReference, ...);
    }
    return;
  }
  
  // FALLBACK: sideEffects (menos preciso)
  const sideEffects = atom.dataFlow?.sideEffects || [];
  // ... fallback logic
}
```

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

## Flujo de Datos Completo (v0.9.62)

```
┌─────────────────────────────────────────────────────────────────────────┐
│                         FLUJO DE DATOS (v0.9.62)                        │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                          │
│  [Código Fuente]                                                         │
│       │                                                                  │
│       ▼                                                                  │
│  ┌──────────────────────────────────────────────────────────────────┐   │
│  │  LAYER A: Static Analysis (Tree-sitter + AST)                    │   │
│  │  • Scanner → Parser → Extractors → Analyses                      │   │
│  │  • Tree-sitter: AST de alta precisión                            │   │
│  │  • extractTreeSitterMetadata(): sharedStateAccess, events, ...   │   │
│  │  • 18 extractores de metadata (incluye tree-sitter-integration)  │   │
│  │  • Cross-file calledBy linkage (6 sub-pasos)                     │   │
│  └──────────────────────────────────────────────────────────────────┘   │
│       │                                                                  │
│       ▼                                                                  │
│  ┌──────────────────────────────────────────────────────────────────┐   │
│  │  Schema MCP (45 campos)                                          │   │
│  │  • 41 campos base + 4 campos Tree-sitter                         │   │
│  │  • sharedStateAccess[], eventEmitters[], eventListeners[]        │   │
│  │  • scopeType: 'local' | 'module' | 'global' | 'closure'          │   │
│  └──────────────────────────────────────────────────────────────────┘   │
│       │                                                                  │
│       ▼                                                                  │
│  ┌──────────────────────────────────────────────────────────────────┐   │
│  │  LAYER C: SQLite Database                                        │   │
│  │  • atoms: 13,485 funciones con 57+ campos                        │   │
│  │  • atom_relations: grafo de dependencias                         │   │
│  │  • files: metadatos por archivo                                  │   │
│  │  • semantic_connections: conexiones semánticas                   │   │
│  │  • WAL mode + checkpoint automático                              │   │
│  └──────────────────────────────────────────────────────────────────┘   │
│       │                                                                  │
│       ▼                                                                  │
│  ┌──────────────────────────────────────────────────────────────────┐   │
│  │  MCP TOOLS (30 herramientas)                                     │   │
│  │  • Impacto: get_impact_map, analyze_change, ...                  │   │
│  │  • Código: get_call_graph, get_function_details, ...             │   │
│  │  • Métricas: get_health_metrics, detect_patterns, ...            │   │
│  │  • Testing: generate_tests, generate_batch_tests, ...            │   │
│  │  • Race Detection: detect_race_conditions (usa Tree-sitter)      │   │
│  └──────────────────────────────────────────────────────────────────┘   │
│       │                                                                  │
│       ▼                                                                  │
│  [Claude / OpenCode / Qwen - IAs]                                      │
│                                                                          │
└─────────────────────────────────────────────────────────────────────────┘
```

---

## Métricas del Sistema (v0.9.62)

| Métrica | Valor | Notas |
|---------|-------|-------|
| **Archivos analizados** | 1,657 | |
| **Átomos extraídos** | 7,792 | |
| **Health Score** | 100/100 (Grade A) | |
| **Campos del Schema** | 45 | 41 base + 4 Tree-sitter |
| **Herramientas MCP** | 30 | |
| **LLM Usage** | 0% ✅ | 100% estático |
| **Tree-sitter** | ✅ Integrado | sharedStateAccess, events |
| **Race Detector** | ✅ Estandarizado | Usa Tree-sitter |
| **SQLite WAL** | ✅ Con checkpoint | Datos visibles inmediatamente |

---

## Próximas Mejoras

### Q2 2026 - Consolidación Tree-sitter

- ✅ Tree-sitter integrado al schema MCP
- ✅ Race-detector usa Tree-sitter como SSOT
- ⏳ Eliminar extractores duplicados (regex vs Tree-sitter)
- ⏳ Migrar todos los trackers a Tree-sitter

### Q3 2026 - Boot Ultrarrápido (Lazy Indexing)

- ✅ Eliminar overhead de microtask asincrónicas en workers
- ⏳ Mover Extractores Semánticos a Phase 2 (Background Queue)
- ⏳ Reducir startup time de 60s a < 5s (Structural only)
- ⏳ Analysis "On-Demand" (cuando una tool MCP solicita un archivo específico)

### Q4 2026 - Intra-Atómico

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
