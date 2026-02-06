# Indice de Documentacion - OmnySystem

Entrada principal a la documentacion. La vision y los contratos se definen aqui. Si hay diferencias con el codigo, estos documentos marcan el destino.

---

## Convenciones

| Tipo | Descripción | Ejemplo |
|------|-------------|---------|
| **Canónico** | Define el comportamiento esperado. Es la fuente de verdad. | ARCHITECTURE.md |
| **Resumen** | Sintetiza y apunta al canónico. | Este archivo |
| **Histórico** | No usar para decisiones actuales. Solo referencia. | PLAN-DATA-PERSISTENCE.md |

---

## 🚀 Empieza Aqui

### Para Usuarios Nuevos
1. [README.md](../README.md) - Visión general del proyecto
2. [GETTING_STARTED.md](../GETTING_STARTED.md) - Primeros pasos (actualizado v0.5.1)
3. [ROADMAP.md](../ROADMAP.md) - Plan de desarrollo y fases

### Para Entender la Arquitectura
1. [ARCHITECTURE.md](../ARCHITECTURE.md) - Diseño técnico detallado
2. [ARCHITECTURE_LAYER_A_B.md](ARCHITECTURE_LAYER_A_B.md) - Arquitectura Capas A y B (canónico)
3. [MCP_TOOLS.md](MCP_TOOLS.md) - Documentación de tools MCP (canónico)

### Para Desarrolladores
1. [AI_CONSOLIDATION_MODE.md](AI_CONSOLIDATION_MODE.md) - Modo consolidación IA (canónico)
2. [ITERATIVE_MODE.md](ITERATIVE_MODE.md) - Modo iterativo (canónico)
3. [ARCHETYPE_DEVELOPMENT_GUIDE.md](ARCHETYPE_DEVELOPMENT_GUIDE.md) - Guía de desarrollo de arquetipos (canónico)

---

## 📚 Documentación por Tema

### Guías y Convenciones
| Documento | Tipo | Descripción |
|-----------|------|-------------|
| [DOCUMENTATION_GUIDE.md](DOCUMENTATION_GUIDE.md) | Guía | Convenciones para mantener documentación |

### Arquitectura y Diseño
| Documento | Tipo | Descripción |
|-----------|------|-------------|
| [ARCHITECTURE.md](../ARCHITECTURE.md) | Canónico | Arquitectura técnica de 3 capas (A/B/C) |
| [ARCHITECTURE_LAYER_A_B.md](ARCHITECTURE_LAYER_A_B.md) | Canónico | Detalle de Capas A y B |
| [SEMANTIC_LAYER_MODELS.md](SEMANTIC_LAYER_MODELS.md) | Referencia | Modelos de IA para Capa B |

### Sistema de Prompts y Metadata
| Documento | Tipo | Descripción |
|-----------|------|-------------|
| [metadata-prompt-system.md](metadata-prompt-system.md) | Canónico | Sistema de metadata y prompts |
| [METADATA_PROMPT_STANDARD.md](METADATA_PROMPT_STANDARD.md) | Canónico | Estándar de metadata para prompts |
| [ARCHETYPE_SYSTEM.md](ARCHETYPE_SYSTEM.md) | Resumen | Sistema de arquetipos |
| [ARCHETYPE_DEVELOPMENT_GUIDE.md](ARCHETYPE_DEVELOPMENT_GUIDE.md) | Canónico | Guía de desarrollo de arquetipos |

### Modos de Operación
| Documento | Tipo | Descripción |
|-----------|------|-------------|
| [AI_CONSOLIDATION_MODE.md](AI_CONSOLIDATION_MODE.md) | Canónico | Modo consolidación IA |
| [ITERATIVE_MODE.md](ITERATIVE_MODE.md) | Canónico | Modo iterativo de análisis |
| [AUTO_SERVE_IMPLEMENTATION.md](AUTO_SERVE_IMPLEMENTATION.md) | Canónico | Implementación auto-serve |

### Herramientas e Integración
| Documento | Tipo | Descripción |
|-----------|------|-------------|
| [MCP_TOOLS.md](MCP_TOOLS.md) | Canónico | Documentación de tools MCP |
| [FILE_WATCHER_ANALYSIS.md](FILE_WATCHER_ANALYSIS.md) | Canónico | Análisis del FileWatcher |

### Planes y Optimización
| Documento | Tipo | Descripción |
|-----------|------|-------------|
| [LFM2_OPTIMIZATION.md](LFM2_OPTIMIZATION.md) | Referencia | Optimización LFM2.5 |
| [LFM2_EXTRACT_GUIDE.md](LFM2_EXTRACT_GUIDE.md) | Referencia | Guía de extracción LFM2 |
| [LFM2_EXTRACT_PROMPTING_GUIDE.md](LFM2_EXTRACT_PROMPTING_GUIDE.md) | Referencia | Prompting para LFM2 |

---

## 🏗️ Arquitectura Modular v0.5.1

La versión v0.5.1 introduce una arquitectura enterprise con **147 módulos** organizados siguiendo principios SOLID.

### Estructura de Módulos

```
src/
├── core/                           (25 módulos)
│   ├── batch-processor/            (9 módulos)
│   │   ├── models/                 (batch.js, file-change.js)
│   │   ├── constants.js            # SSOT - Priority, BatchState
│   │   ├── priority-calculator.js
│   │   ├── dependency-loader.js
│   │   ├── batch-scheduler.js
│   │   ├── change-processor.js
│   │   └── index.js                # Facade
│   │
│   ├── websocket/                  (10 módulos)
│   │   ├── client/                 (ws-client, message-handler, subscriptions)
│   │   ├── server/                 (websocket-server, connection-handler, heartbeat)
│   │   ├── messaging/              (broadcaster, message-types)
│   │   ├── constants.js            # SSOT - MessageTypes
│   │   └── index.js                # Facade
│   │
│   └── unified-server/initialization/  (7 módulos)
│       ├── index.js                # Main orchestrator init
│       ├── cache-manager.js
│       ├── analysis-manager.js
│       ├── file-watcher-init.js
│       ├── batch-processor-init.js
│       ├── websocket-init.js
│       └── orchestrator-init.js
│
├── layer-a-static/                 (27 módulos)
│   ├── graph/                      (11 módulos)
│   │   ├── builders/               (system-map, export-index, function-links)
│   │   ├── algorithms/             (cycle-detector, transitive-deps, impact)
│   │   ├── resolvers/              (function-resolver)
│   │   ├── utils/                  (path-utils - SSOT, counters)
│   │   ├── types.js                # SSOT - Type definitions
│   │   └── index.js                # Facade
│   │
│   ├── parser/                     (8 módulos)
│   │   ├── extractors/             (imports, exports, definitions, calls, typescript)
│   │   ├── config.js               # SSOT - Babel config
│   │   ├── helpers.js
│   │   └── index.js                # Facade
│   │
│   ├── extractors/                 (17 módulos organizados)
│   │   ├── communication/          (7 módulos: workers, websocket, broadcast, etc.)
│   │   ├── metadata/               (5 módulos: jsdoc, async, errors, build-time)
│   │   ├── static/                 (5 módulos: storage, events, globals)
│   │   ├── state-management/       (10 módulos: redux, context, connections)
│   │   └── utils.js
│   │
│   └── query/                      (6 módulos)
│       ├── queries/                (dependency, file, project)
│       ├── readers/                (json-reader)
│       └── index.js                # Facade
│
└── layer-b-semantic/               (40+ módulos)
    ├── llm-analyzer/               (5 módulos)
    │   ├── core.js                 # LLMAnalyzer class
    │   ├── prompt-builder.js       # SSOT - Prompt building
    │   ├── response-normalizer.js
    │   ├── analysis-decider.js
    │   └── index.js                # Facade
    │
    ├── issue-detectors/            (8 módulos)
    │   ├── connection-hotspots.js
    │   ├── global-state-builder.js
    │   ├── orphaned-files.js
    │   ├── shared-state.js
    │   ├── unhandled-events.js
    │   ├── suspicious-patterns.js
    │   └── index.js                # Facade
    │
    ├── project-analyzer/           (10 módulos)
    │   ├── utils/                  (cohesion, matrix, clusters, orphans)
    │   ├── reports/                (structure, stats)
    │   └── index.js                # Facade
    │
    ├── validators/                 (17 módulos)
    │   ├── extractors/             (event, global, storage)
    │   ├── sanitizers/             (response-sanitizer, false-positives)
    │   ├── validators/             (event, file, global, storage)
    │   ├── utils/                  (timeout-calculator, patterns)
    │   ├── constants.js
    │   └── index.js                # Facade
    │
    └── metadata-contract/          (10 módulos)
        ├── schemas/                (layer-a-metadata)
        ├── builders/               (standard, prompt)
        ├── validators/             (metadata-validator)
        ├── detectors/              (architectural-patterns)
        ├── constants.js            # SSOT - Contract constants
        └── index.js                # Facade
```

### SSOT (Single Source of Truth)

| Dominio | Ubicación | Descripción |
|---------|-----------|-------------|
| SystemMap Structure | `graph/types.js` | Definición central de tipos |
| Path Normalization | `graph/utils/path-utils.js` | Todas las operaciones de path |
| Babel Config | `parser/config.js` | Configuración del parser |
| Prompt Building | `llm-analyzer/prompt-builder.js` | Construcción de prompts LLM |
| Metadata Contract | `metadata-contract/constants.js` | Constantes del contrato A→B |
| Batch Priority | `batch-processor/constants.js` | Estados y prioridades |
| WebSocket Messages | `websocket/constants.js` | Tipos de mensajes |

### Principios SOLID Aplicados

| Principio | Implementación |
|-----------|----------------|
| **S**ingle Responsibility | Cada módulo tiene UNA razón para cambiar |
| **O**pen/Closed | Extensible sin modificar código existente |
| **L**iskov Substitution | Módulos intercambiables con misma interfaz |
| **I**nterface Segregation | Ningún módulo depende de métodos que no usa |
| **D**ependency Inversion | Depende de abstracciones, no concreciones |

---

## 📊 Referencias Visuales

| Documento | Descripción |
|-----------|-------------|
| [storage-visualization.md](storage-visualization.md) | Visualización del sistema de storage |
| [PROJECT_ANALYSIS_DIAGRAM.md](PROJECT_ANALYSIS_DIAGRAM.md) | Diagramas de análisis de proyecto |

---

## 📜 Histórico (Solo Referencia)

> ⚠️ **No usar para decisiones actuales**. Estos documentos se mantienen por contexto histórico.

| Documento | Descripción |
|-----------|-------------|
| [SYSTEM_STATUS_ANALYSIS.md](SYSTEM_STATUS_ANALYSIS.md) | Análisis de estado del sistema (histórico) |
| [REFACTOR_PLAN.md](REFACTOR_PLAN.md) | Plan de refactorización (completado en v0.5.1) |
| [../PLAN-DATA-PERSISTENCE.md](../PLAN-DATA-PERSISTENCE.md) | Plan de persistencia de datos (histórico) |

---

## 🆕 Changelogs Versionados

La documentación de cambios se encuentra en `/changelog/`:

| Versión | Archivo | Descripción |
|---------|---------|-------------|
| v0.5.1 | [changelog/v0.5.1.md](../changelog/v0.5.1.md) | Enterprise Architecture Refactor (147 módulos) |
| v0.5.0 | [changelog/v0.5.0.md](../changelog/v0.5.0.md) | Layer A/B Unification & Orchestrator |
| v0.4.6 | [changelog/v0.4.6.md](../changelog/v0.4.6.md) | Metadata Contract & Plug & Play |
| v0.4.5 | [changelog/v0.4.5.md](../changelog/v0.4.5.md) | MCP Unified Entry Point |

---

## 🔗 Enlaces Rápidos

- [CHANGELOG.md](../CHANGELOG.md) - Índice de changelogs
- [PROBLEM_ANALYSIS.md](PROBLEM_ANALYSIS.md) - Análisis del problema original
- [EXISTING_SOLUTIONS.md](EXISTING_SOLUTIONS.md) - Soluciones existentes en el mercado
- [FUTURE_IDEAS.md](FUTURE_IDEAS.md) - Ideas de expansión futura

---

*Última actualización: 2026-02-06 (v0.5.1)*
