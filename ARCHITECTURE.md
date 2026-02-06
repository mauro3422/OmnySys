# OmnySys - Arquitectura Tecnica

**Version**: v0.5.2
**Ultima actualizacion**: 2026-02-06

## Vision General

OmnySys es un **motor de contexto multi-capa** que actua como memoria externa para IAs que modifican codigo. Resuelve el problema de "vision de tunel" mediante tres capas que trabajan en conjunto:

1. **Layer A (Estatica)**: Analisis determinista y rapido
2. **Layer B (Semantica)**: Analisis inteligente con IA local
3. **Layer C (Memoria)**: Persistencia y servicio de consulta

**Innovacion clave**: El **MCP Server es el entry point unico**. Un solo comando inicia todo el sistema incluyendo el Orchestrator como componente interno.

---

## Arquitectura Unificada

```
+-----------------------------------------------------------------------+
|                                                                       |
|                  MCP SERVER (Entry Point Unico)                       |
|            node src/layer-c-memory/mcp-server.js /proyecto            |
|                                                                       |
+-----------------------------------------------------------------------+
|                                                                       |
|  +---------------------------------------------------------------+   |
|  |  LAYER A: STATIC (El Cuerpo)                                  |   |
|  |  Escanea y construye grafo base                                |   |
|  |                                                                |   |
|  |  - PROJECT SCANNER: Recorre filesystem, detecta JS/TS         |   |
|  |  - AST PARSER (@babel/parser): imports, exports, definiciones  |   |
|  |  - GRAPH BUILDER: Grafo file->file, ciclos, metricas          |   |
|  |  - STATIC EXTRACTORS: localStorage, eventos, globals, etc.    |   |
|  |  -> OUTPUT: system-map.json                                    |   |
|  +---------------------------------------------------------------+   |
|                           |                                           |
|                           v                                           |
|  +---------------------------------------------------------------+   |
|  |  LAYER B: SEMANTIC (La Mente)                                  |   |
|  |  Enriquece con IA local                                        |   |
|  |                                                                |   |
|  |  - LLM ANALYZER: Conexiones no obvias (el 20% restante)       |   |
|  |  - ARCHETYPE SYSTEM: Clasifica archivos por patron de conexion |   |
|  |  - VALIDATORS: Filtro de alucinaciones                         |   |
|  |  -> OUTPUT: enhanced-system-map.json                           |   |
|  +---------------------------------------------------------------+   |
|                           |                                           |
|                           v                                           |
|  +---------------------------------------------------------------+   |
|  |  ORCHESTRATOR (Componente Interno)                             |   |
|  |  Procesa y encola analisis                                     |   |
|  |                                                                |   |
|  |  - ANALYSIS QUEUE: CRITICAL > HIGH > MEDIUM > LOW             |   |
|  |  - ANALYSIS WORKER: Procesa con LLM cuando necesario          |   |
|  |  - FILE WATCHER: Detecta cambios en tiempo real               |   |
|  |  - BATCH PROCESSOR: Agrupa cambios                            |   |
|  +---------------------------------------------------------------+   |
|                           |                                           |
|                           v                                           |
|  +---------------------------------------------------------------+   |
|  |  LAYER C: MEMORY                                               |   |
|  |  Almacena y sirve datos                                        |   |
|  |                                                                |   |
|  |  - STORAGE: .omnysysdata/ (particionado por archivo)        |   |
|  |  - UNIFIED CACHE: RAM + Disk con invalidacion en cascada       |   |
|  |  - QUERY SERVICE: API eficiente para consultas                 |   |
|  +---------------------------------------------------------------+   |
|                           |                                           |
|                           v                                           |
|  +---------------------------------------------------------------+   |
|  |  MCP TOOLS (Interfaz para la IA)                               |   |
|  |                                                                |   |
|  |  - get_impact_map(filePath)                                    |   |
|  |  - analyze_change(file, symbol)                                |   |
|  |  - explain_connection(a, b)                                    |   |
|  |  - get_risk_assessment(minSeverity)                            |   |
|  |  - search_files(pattern)                                       |   |
|  |  - get_server_status()                                         |   |
|  +---------------------------------------------------------------+   |
|                                                                       |
+-----------------------------------------------------------------------+
```

---

## Flujo de Inicializacion

```
node src/layer-c-memory/mcp-server.js /ruta/proyecto

  STEP 0: Initialize Orchestrator (queue, worker, fileWatcher)
  STEP 1: AI Server Setup (auto-start LLM if needed)
  STEP 2: Data Structure (create .omnysysdata/)
  STEP 3: Load Data (existing analysis)
  STEP 4: Unified Cache (RAM + Disk)
  STEP 5: Background Indexing (if no data)
  STEP 6: Tools Ready

  -> MCP Server Ready
```

## Flujo de Auto-Analisis

Cuando la IA consulta un archivo no analizado:

```
get_impact_map("CameraState.js")
  |
  v
Archivo analizado en STORAGE?
  |
  +-- SI --> Return cached data
  |
  +-- NO --> Auto-Analisis:
              1. Encolar como CRITICAL
              2. Orchestrator procesa con LLM
              3. Esperar resultado (max 60s)
              4. Guardar en STORAGE
              5. Responder a IA
```

Si el analisis tarda mas de 60 segundos, se retorna un status parcial con sugerencia de reintentar.

---

## Layer A: Analisis Estatico

Extrae relaciones tecnicas entre archivos mediante analisis sintactico (AST).

**Componentes**: Scanner, Parser (@babel/parser), Graph Builder, Static Extractors
**Output**: `system-map.json` con grafo de dependencias

Para detalle completo de Layer A, ver [docs/ARCHITECTURE_LAYER_A_B.md](docs/ARCHITECTURE_LAYER_A_B.md).

### Estructura del Grafo

```typescript
interface SystemMap {
  files: { [filePath: string]: FileNode };
  dependencies: Dependency[];
}

interface FileNode {
  path: string;
  exports: string[];
  imports: ImportStatement[];
  usedBy: string[];
  calls: string[];
  type: 'module' | 'component' | 'utility' | 'config';
}
```

---

## Layer B: Analisis Semantico

Encuentra conexiones que el analisis estatico no puede detectar:
- **Estado compartido**: Objetos mutables importados por multiples archivos
- **Eventos**: emit/on/addEventListener con nombres compartidos
- **Side effects**: localStorage, sessionStorage, window.*
- **Imports dinamicos**: import() cuyas rutas se resuelven en runtime

Usa un sistema de **arquetipos** que clasifica archivos por sus patrones de conexion y selecciona prompts especializados para el LLM. Ver [docs/ARCHETYPE_SYSTEM.md](docs/ARCHETYPE_SYSTEM.md).

**Output**: `enhanced-system-map.json`

Para detalle de Layer B, ver [docs/ARCHITECTURE_LAYER_A_B.md](docs/ARCHITECTURE_LAYER_A_B.md).
Para el flujo metadata->prompt->LLM, ver [docs/metadata-prompt-system.md](docs/metadata-prompt-system.md).

---

## Layer C: Memoria Persistente

Mantiene el grafo actualizado y sirve consultas rapidas a las IAs.

**Storage**: `.omnysysdata/` con archivos JSON particionados por archivo
**Cache**: UnifiedCacheManager con RAM + Disk e invalidacion en cascada
**Query Service**: API para consultas eficientes desde MCP Tools

Para documentacion de MCP Tools, ver [docs/MCP_TOOLS.md](docs/MCP_TOOLS.md).
Para visualizacion del storage, ver [docs/storage-visualization.md](docs/storage-visualization.md).

---

## Arquitectura Modular SOLID (v0.5.1)

17 archivos monoliticos fueron refactorizados en ~147 modulos enfocados.

### Principios Aplicados

| Principio | Implementacion | Ejemplo |
|-----------|----------------|---------|
| **S**ingle Responsibility | Cada modulo tiene UNA razon para cambiar | `cycle-detector.js` solo detecta ciclos |
| **O**pen/Closed | Extensible sin modificar codigo existente | Agregar extractor sin tocar parser |
| **L**iskov Substitution | Modulos intercambiables con misma interfaz | Extractores de diferentes tipos |
| **I**nterface Segregation | Ningun modulo depende de metodos que no usa | Cada inicializador recibe solo lo necesario |
| **D**ependency Inversion | Depende de abstracciones, no concreciones | Context objects en lugar de `this` |

### SSOT (Single Source of Truth)

| Dominio | Ubicacion | Proposito |
|---------|-----------|-----------|
| SystemMap Structure | `graph/types.js` | Definicion central de tipos |
| Path Normalization | `graph/utils/path-utils.js` | Operaciones de path |
| Babel Config | `parser/config.js` | Configuracion del parser |
| Prompt Building | `llm-analyzer/prompt-builder.js` | Construccion de prompts LLM |
| Metadata Contract | `metadata-contract/constants.js` | Constantes del contrato A->B |
| Batch Priority | `batch-processor/constants.js` | Estados y prioridades |
| WebSocket Messages | `websocket/constants.js` | Tipos de mensajes |

### Estructura de Modulos

```
src/
+-- core/                          (25 modulos)
|   +-- orchestrator/              (lifecycle, queueing, llm-analysis)
|   +-- batch-processor/           (9 modulos)
|   +-- websocket/                 (10 modulos)
|   +-- unified-server/            (7 modulos)
|
+-- layer-a-static/                (27 modulos)
|   +-- graph/                     (11 modulos: builders, algorithms, resolvers, utils)
|   +-- parser/                    (8 modulos: extractors, config, helpers)
|   +-- extractors/                (17 modulos: communication, metadata, static, state-management)
|   +-- query/                     (6 modulos)
|
+-- layer-b-semantic/              (40+ modulos)
|   +-- llm-analyzer/              (5 modulos)
|   +-- issue-detectors/           (8 modulos)
|   +-- project-analyzer/          (10 modulos)
|   +-- validators/                (17 modulos)
|   +-- prompt-engine/             (plug & play prompts)
|   +-- metadata-contract/         (10 modulos)
|
+-- layer-c-memory/
    +-- mcp/                       (core, tools)
    +-- storage/                   (persistencia)
    +-- query/                     (consultas)
```

---

## Decisiones de Diseno

### Por que tres capas y no solo una?
- Layer A sola: Rapida pero limitada (no ve conexiones semanticas)
- Layer B sola: Inteligente pero lenta (necesita IA para todo)
- Combinacion: 80% estatico (rapido) + 20% semantico (preciso)

### Por que IA local y no GPT-4?
- **Costo**: Analizar 100 archivos con GPT-4 = caro
- **Privacidad**: El codigo no sale del entorno local
- **Velocidad**: IA local corre en paralelo sin rate limits

### Por que pre-construir y no analizar on-demand?
- La IA necesita respuesta instantanea al editar codigo
- Pre-construir = costo inicial, velocidad constante despues

### Por que MCP?
- Estandar para herramientas de IAs
- Funciona con cualquier IA compatible (Claude, GPT, modelos locales)
- No requiere modificar el codigo de la IA

---

## Limitaciones Conocidas

1. **Codigo dinamico**: `require(variable)` no se resuelve estaticamente
2. **Codigo generado**: Build tools (Webpack) generan codigo no analizable
3. **Side effects complejos**: DOM, APIs externas requieren heuristicas
4. **Proyectos enormes**: 10,000+ archivos necesitan analisis incremental

---

## Referencias

- [README.md](README.md) - Overview del proyecto
- [ROADMAP.md](ROADMAP.md) - Plan de desarrollo
- [docs/INDEX.md](docs/INDEX.md) - Indice de documentacion
- [docs/ARCHITECTURE_LAYER_A_B.md](docs/ARCHITECTURE_LAYER_A_B.md) - Detalle de Layers A y B
- [docs/MCP_TOOLS.md](docs/MCP_TOOLS.md) - Documentacion de MCP Tools
- [docs/ARCHETYPE_SYSTEM.md](docs/ARCHETYPE_SYSTEM.md) - Sistema de arquetipos
