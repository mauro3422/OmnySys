# OmnySys — Arquitectura Técnica

**Versión**: v0.9.16  
**Última actualización**: 2026-02-18

---

## Visión General

OmnySys está organizado en **5 capas** con responsabilidades claras y separadas:

```
src/
├── layer-a-static/     # Capa A: Análisis estático puro (AST)
├── layer-b-semantic/   # Capa B: Análisis semántico + arquetipos
├── layer-graph/        # Capa Graph: Sistema de grafos de dependencias
├── layer-c-memory/     # Capa C: MCP Server, caché persistente, exposición
├── core/               # Core: Infraestructura compartida
├── ai/                 # Scripts de IA y GPU
├── cli/                # CLI de administración
├── config/             # Configuración centralizada
├── services/           # Servicios (LLMService, etc.)
├── shared/             # Utilidades compartidas entre capas
├── utils/              # Logger y utilidades base
└── validation/         # Sistema de validación global
```

---

## Capa A — Análisis Estático (`src/layer-a-static/`)

**Propósito**: Extraer información estructural del código sin ejecutarlo.  
**Sin LLM**: Siempre. 100% determinístico vía AST.

```
layer-a-static/
├── scanner.js              # Encuentra archivos del proyecto
├── parser/                 # Extrae AST, imports, exports, funciones
├── extractors/             # Extrae metadatos específicos
│   ├── metadata/           # Side effects, call graph, data flow, etc.
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
└── resolver.js             # Resuelve imports entre archivos
```

### Flujo de Layer A

```
Scanner → Parser → Extractors → Analyses → Pipeline → Output
                                                         │
                                              .omnysysdata/files/
```

---

## Capa B — Análisis Semántico (`src/layer-b-semantic/`)

**Propósito**: Enriquecer con significado: arquetipos, validación, análisis LLM selectivo.  
**LLM**: Solo cuando confidence < 0.8 (~10% de los archivos).

```
layer-b-semantic/
├── llm-analyzer/           # Análisis con LLM (selectivo)
│   ├── analysis-decider.js # Decide si usar LLM o bypass
│   └── ...
├── prompt-engine/          # Generación de prompts por arquetipo
│   └── prompt-templates/   # 15+ arquetipos (god-object, network-hub, etc.)
├── metadata-contract/      # Contrato de metadata (SSOT de campos)
│   └── constants.js        # 57+ campos definidos
├── schema-validator/       # Validación de esquema de metadata
├── validators/             # Validadores de integridad
│   └── extractors/         # Extractores simplificados para validación
└── project-analyzer/       # Análisis de proyecto completo
```

### Arquetipos detectados (15+)

`god-object`, `network-hub`, `fragile-network`, `hot-path`, `dead-function`,
`private-utility`, `utility`, `standard`, `api-event-bridge`, `storage-sync-manager`,
`critical-bottleneck`, `circular-dependency`, `validator`, `transformer`, `your-analysis-type`

---

## Capa Graph — Sistema de Grafos (`src/layer-graph/`)

**Propósito**: Construir y consultar el grafo de dependencias del proyecto.  
**Creado en**: v0.9.15 (extraído de Layer A para separación de responsabilidades).

```
layer-graph/
├── index.js            # API pública unificada (54 exports)
├── core/
│   └── types.js        # SSOT: SystemMap, FileNode, Dependency, etc.
├── builders/           # Construcción del grafo
│   ├── system-map.js   # Build principal del SystemMap
│   ├── export-index.js # Índice de exports + re-exports
│   ├── function-links.js  # Enlaces entre funciones
│   └── call-graph.js   # Call graph extractor
├── algorithms/         # Algoritmos de análisis
│   ├── cycle-detector.js    # Detección de ciclos (DFS)
│   ├── impact-analyzer.js   # Análisis de impacto + RISK_LEVELS
│   └── transitive-deps.js   # Dependencias y dependientes transitivos
├── query/              # Consultas async al grafo
│   ├── dependency-query.js  # getDependencyGraph, getTransitiveDependents
│   ├── impact-query.js      # queryImpact
│   └── call-graph-analyzer.js  # findCallSites
├── resolvers/
│   └── function-resolver.js  # Resolución de funciones entre archivos
├── persistence/
│   └── index.js        # serialize, deserialize, delta
└── utils/
    ├── path-utils.js   # Normalización de paths
    └── counters.js     # Métricas del grafo
```

### Tipos principales

| Tipo | Descripción |
|------|-------------|
| `SystemMap` | El grafo completo del proyecto |
| `FileNode` | Nodo de archivo con imports, exports, usedBy, dependsOn |
| `Dependency` | Arista entre dos archivos |
| `FunctionLink` | Enlace entre dos funciones |
| `ImpactInfo` | Resultado de análisis de impacto |

### Uso

```javascript
import { buildSystemMap, getImpactMap, detectCycles, RISK_LEVELS } from '#layer-graph/index.js';

const systemMap = buildSystemMap(parsedFiles, resolvedImports);
const impact = getImpactMap('src/core/orchestrator.js', systemMap.files);
const cycles = detectCycles(systemMap.files);
```

---

## Capa C — Memory / MCP Server (`src/layer-c-memory/`)

**Propósito**: Exponer las 14 herramientas MCP, persistir datos, gestionar caché de disco.

```
layer-c-memory/
├── mcp-server.js           # Entry point: inicia el servidor MCP
├── mcp/
│   ├── core/
│   │   ├── server-class.js         # OmnySysMCPServer (clase principal)
│   │   ├── hot-reload-manager/     # Auto-recarga de módulos en dev
│   │   └── initialization/         # Pipeline de inicialización (7 pasos)
│   │       └── steps/
│   │           ├── instance-detection-step.js
│   │           ├── layer-a-analysis-step.js
│   │           ├── cache-init-step.js
│   │           ├── llm-setup-step.js
│   │           ├── orchestrator-init-step.js
│   │           ├── mcp-setup-step.js
│   │           └── ready-step.js
│   └── tools/                      # Implementación de las 14 herramientas
│       ├── impact-map.js
│       ├── get-call-graph.js
│       ├── get-function-details.js
│       ├── get-molecule-summary.js
│       ├── risk.js
│       ├── search.js
│       ├── status.js
│       └── ...
├── storage/                # Persistencia en .omnysysdata/
│   ├── index.js
│   ├── atoms/              # Funciones individuales
│   ├── files/              # Análisis por archivo
│   ├── molecules/          # Cadenas moleculares
│   └── setup/              # Inicialización del storage
├── shadow-registry/        # Sistema de linaje de archivos
├── verification/           # Validación de integridad
└── query/                  # Queries de datos persistidos
```

### Pipeline de Inicialización (7 pasos)

```
1. InstanceDetectionStep   → ¿Ya hay una instancia corriendo?
2. LayerAAnalysisStep      → Análisis estático inicial (crea .omnysysdata/)
3. CacheInitStep           → Carga datos en caché RAM
4. LLMSetupStep            → Inicia LLM en background (non-blocking)
5. OrchestratorInitStep    → Conecta FileWatcher + Queue + Workers
6. McpSetupStep            → Registra las 14 herramientas MCP
7. ReadyStep               → Servidor listo para conexiones
```

---

## Core — Infraestructura (`src/core/`)

**Propósito**: Componentes compartidos de infraestructura que usan todas las capas.

```
core/
├── cache/                  # Cache Manager (RAM + disco)
│   ├── manager/            # CRUD de entradas de caché
│   └── invalidator/        # Invalidación atómica
├── orchestrator/           # Cola de análisis + workers
├── file-watcher/           # Detecta cambios en archivos
├── batch-processor/        # Procesamiento en lotes de cambios
├── websocket/              # Comunicación WebSocket
├── unified-server/         # Servidor HTTP unificado
├── error-guardian/         # Manejo centralizado de errores
├── atomic-editor/          # Editor atómico (operaciones seguras)
├── tunnel-vision-detector/ # Detector de visión de túnel
├── tunnel-vision-logger/   # Logger de eventos de túnel
└── worker/                 # Workers de análisis
```

### Nota sobre dependencias de Core

`src/core/index.js` re-exporta desde Layer Graph y Layer C (storage).
Esto establece que **Core es el punto de acceso unificado** para la infraestructura:

```javascript
// core/index.js re-exporta:
export * from '#layer-graph/index.js';    // grafo
export * from '#layer-c/storage/index.js'; // storage
```

---

## Flujo Completo de Datos

```
[Archivo .js en tu proyecto]
        │
        ▼
Layer A: Scanner → Parser → Extractors
        │
        ▼
Layer Graph: buildSystemMap() → SystemMap
        │
        ▼
Layer A: Analyses (tier1, tier2, tier3)
        │
        ▼
Layer B: Archetypes + Validators (+ LLM si es necesario)
        │
        ▼
Layer C Storage: .omnysysdata/{atoms,files,molecules}/
        │
        ▼
Core Cache: RAM cache para acceso rápido
        │
        ▼
Layer C MCP Tools: Respuesta a la IA
```

---

## Alias de Imports (`package.json#imports`)

Todos los módulos usan aliases para imports limpios:

| Alias | Resuelve a |
|-------|-----------|
| `#core/*` | `src/core/*` |
| `#layer-a/*` | `src/layer-a-static/*` |
| `#layer-b/*` | `src/layer-b-semantic/*` |
| `#layer-c/*` | `src/layer-c-memory/*` |
| `#layer-graph/*` | `src/layer-graph/*` |
| `#ai/*` | `src/ai/*` |
| `#cli/*` | `src/cli/*` |
| `#config/*` | `src/config/*` |
| `#services/*` | `src/services/*` |
| `#shared/*` | `src/shared/*` |
| `#utils/*` | `src/utils/*` |
| `#validation/*` | `src/validation/*` |

---

## Decisiones de Diseño Clave

### 1. Zero LLM para extracción
Toda la extracción es determinística (AST + regex). LLM solo para:
- Confidence < 0.8 (~10% de archivos)
- Casos semánticamente ambiguos

**Resultado**: 90%+ de archivos analizados sin LLM, startup en ~2s.

### 2. SSOT — Single Source of Truth
Los **átomos** (funciones) son la fuente de verdad.  
Las **moléculas** (archivos) derivan sus propiedades de los átomos.  
Si cambia un átomo → se invalida la molécula → se invalida el grafo.

### 3. Fractal A→B→C
El mismo patrón `inputs → transform → output` se repite en todas las escalas:
```
Función:  params → lógica → return
Archivo:  imports → proceso → exports
Módulo:   datos externos → pipeline → resultado
Sistema:  proyecto → análisis → SystemMap
```

### 4. Confidence-Based LLM Bypass
Cada arquetipo calcula un score de confianza (0.0–1.0) basado en evidencia observable:
- Si `confidence >= 0.8` → **bypass LLM** (rápido, determinístico)
- Si `confidence < 0.8` → **invoke LLM** (semántica adicional)

---

## Issues Conocidos (v0.9.16)

| Issue | Impacto | Prioridad |
|-------|---------|-----------|
| 26 imports rotos en runtime | No arranca en algunos flujos | 🔴 Alta |
| Smoke test de Layer C deshabilitado | No hay test E2E del MCP server | 🟡 Media |
| Layer C coverage ~30% | Riesgo de regresiones | 🟡 Media |
| Tests no detectan imports rotos | Falsa sensación de estabilidad | 🟡 Media |

Ver **[PLAN_ESTABILIZACION.md](PLAN_ESTABILIZACION.md)** para el plan de resolución.
