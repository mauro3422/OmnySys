# Arquitectura Unificada - OmnySys (Layer A + Orchestrator)

**Ultima actualizacion: 2026-02-14 (v0.9.4))

Documento canonico. Define la vision y el contrato del sistema. Si el codigo difiere, este documento marca el destino.

## Vision
Resolver la "vision de tunel" cuando una IA edita codigo modular. El sistema construye un mapa de dependencias y conexiones semanticas y lo expone via MCP para que la IA edite con contexto real.

Principios:
- Local primero. Todo corre offline.
- Layer A solo estatico. Orchestrator solo LLM.
- `.omnysysdata/` es la fuente de verdad.
- Iteraciones controladas hasta convergencia.

## Diagrama (alto nivel)
```text
Project Source
   |
   v
Layer A (Static Analysis)
   |
   +-- Conexiones directas (imports/exports) --> confidence 1.0
   +-- Conexiones semanticas (localStorage, events, globals) --> confidence 1.0
   |
   v
.omnysysdata/ (index, files, connections, risks)
   |
   v
Orchestrator (decide que necesita LLM)
   |
   +-- Solo archivos con arquetipos detectados (~20% del proyecto)
   |
   v
llmInsights + semantic-issues.json
   |
   v
MCP Server (tools)
```

---

## Capa A (src/layer-a-static)

Responsabilidad:
- Scanner, parser, resolver, grafo.
- Extractores estaticos y metadatos.
- **Cross-reference entre archivos** para conexiones con confidence 1.0.
- Detectores y risk scoring.

### Extraccion de Metadata por Archivo

El parser AST (@babel/parser) extrae de cada archivo:
- `imports[]` â€” ESM, CommonJS, dynamic imports (source, specifiers, type)
- `exports[]` â€” Named, default, re-exports (type, name, kind)
- `definitions[]` â€” Funciones y clases (name, params, line)
- `calls[]` â€” Llamadas a funciones
- `functions[]` â€” Info detallada (id, name, params, isExported, calls internos)

Los extractores estaticos (regex) extraen:
- `localStorage` â€” reads y writes con key (ej: `setItem('token', ...)`)
- `events` â€” listeners y emitters con nombre (ej: `emit('save')`, `on('save', ...)`)
- `globals` â€” reads y writes a `window.*` (ej: `window.config = ...`)
- `envVars` â€” variables de entorno `process.env.*`
- Redux: selectors, actions, slices, stores
- Context: createContext, Provider, useContext
- Communication: WebSocket, Workers, BroadcastChannel, fetch, postMessage

### Cross-Reference de Conexiones (Nivel 1)

Despues de extraer metadata de TODOS los archivos, Layer A cruza datos entre pares de archivos para detectar conexiones **sin LLM**:

```text
Para cada par de archivos (A, B):
   |
   +-- localStorage keys en comun? --> Conexion tipo "localStorage", confidence 1.0
   +-- Event names en comun? -------> Conexion tipo "eventListener", confidence 1.0
   +-- Global properties en comun? -> Conexion tipo "globalVariable", confidence 1.0
   +-- Redux selectors en comun? ---> Conexion tipo "sharedSelector", confidence 1.0
   +-- React Context compartido? ---> Conexion tipo "contextUsage", confidence 1.0
```

Cada conexion incluye:
- `sourceFile`, `targetFile` â€” los dos archivos conectados
- `type` â€” tipo de conexion
- `via` â€” el dato compartido (key, event name, property)
- `direction` â€” quien escribe y quien lee (ej: "A writes, B reads")
- `confidence` â€” 1.0 para conexiones estaticas
- `detectedBy` â€” "static-extractor"

**Estas conexiones NO necesitan LLM.** Son hechos verificables extraidos con regex.

### Salida de Layer A

- `.omnysysdata/system-map.json` â€” Grafo de dependencias
- `.omnysysdata/system-map-enhanced.json` â€” Grafo con conexiones semanticas
- `.omnysysdata/index.json` â€” Metadata del proyecto
- `.omnysysdata/files/**` â€” Analisis individual por archivo
- `.omnysysdata/connections/**` â€” Conexiones entre archivos
- `.omnysysdata/risks/**` â€” Riesgos detectados

Regla: **No usa LLM. Todo es determinista.**

---

## Orchestrator (src/core)

Responsabilidad:
- Lee metadatos y decide que archivos requieren LLM.
- Cola de prioridad (CRITICAL > HIGH > MEDIUM > LOW).
- Workers paralelos para LLM.
- Modo iterativo (refinamiento por confianza).
- Deteccion de issues semanticos.

### Decision de LLM (Tres Gates)

El orchestrator tiene tres puntos de decision para determinar si un archivo necesita LLM:

**Gate 1: Archetypes** (`llm-analysis.js`)
```text
metadata = buildPromptMetadata(filePath, fileAnalysis)
archetypes = detectArchetypes(metadata)

Si archetypes.length > 0 --> candidato para LLM (pasa a Gate 2)
Si archetypes.length === 0 --> NO necesita LLM
```

**Gate 2: Bypass Check â€” Las conexiones estaticas ya resuelven el caso?** (`analysis-decider.js`)

No todos los arquetipos necesitan LLM. Si Layer A ya resolvio las conexiones con confidence 1.0, gastar LLM es desperdiciar recursos.

```text
Arquetipo detectado es god-object, dynamic-importer, o orphan-module?
   --> SI, siempre necesita LLM (no hay bypass posible)

Arquetipo es event-hub, global-state, state-manager, o singleton?
   --> Checkear: hay datos sin resolver?
       - Eventos donde el nombre es variable (no string literal)? --> SI LLM
       - localStorage keys sin cross-reference? -----------------> SI LLM
       - Global properties sin cross-reference? -----------------> SI LLM
       - Conexiones existentes con confidence < 0.7? ------------> SI LLM
       - TODO ya cruzado con confidence >= 1.0? -----------------> NO LLM (bypass)
```

**Gate 3: Suspicious Patterns** (`analysis-decider.js`)
```text
Archivo es huerfano sin NINGUNA conexion? ----------> SI LLM
Archivo tiene codigo dinamico (eval, import(var))? -> SI LLM
Huerfano CON global access o localStorage? ---------> SI LLM (sospechoso)
```

### Arquetipos y LLM

| Arquetipo | Siempre LLM? | Bypass posible? | Condicion de bypass |
|-----------|-------------|-----------------|---------------------|
| god-object | SI | No | LLM siempre necesario para analizar responsabilidades |
| dynamic-importer | SI | No | Rutas runtime imposibles de resolver estaticamente |
| orphan-module | SI | No | LLM investiga por que no tiene dependientes |
| event-hub | No | SI | Si todos los eventos son string literals ya cruzados |
| global-state | No | SI | Si todas las properties ya cruzadas con confidence 1.0 |
| state-manager | No | SI | Si todas las keys ya cruzadas con confidence 1.0 |
| singleton | No | SI | Si las conexiones de global state ya estan resueltas |

**Principio**: Si la metadata + cross-reference ya da la conexion como hecho verificable (confidence 1.0), NO gastar LLM. El LLM solo se activa cuando hay incertidumbre.

### Prioridad de Encolamiento

| Prioridad | Arquetipos | Razon |
|-----------|------------|-------|
| CRITICAL | god-object | Alto blast radius, necesita analisis profundo |
| HIGH | orphan-module, state-manager, event-hub | Cables potencialmente ocultos |
| MEDIUM | dynamic-importer, singleton | Conexiones runtime |
| LOW | otros | Analisis general |

### Salida del Orchestrator

- `llmInsights` por archivo â€” Se agrega al JSON existente sin sobrescribir metadata estatica.
- `.omnysysdata/semantic-issues.json` â€” Issues detectados cross-project.

Reglas:
- No re-extrae datos estaticos.
- No sobrescribe metadata estatica. Solo agrega `llmInsights`.
- Conexiones del LLM se agregan con confidence < 1.0 (tipicamente 0.6-0.9).

---

## MCP Server

Responsabilidad:
- Lee `.omnysysdata/`.
- Expone tools para la IA (impact map, risks, conexiones).
- Auto-analysis: si se consulta un archivo no analizado, lo encola como CRITICAL.

---

## CLI (contrato)

- `omnysys analyze <project>` ejecuta Layer A.
- `omnysys consolidate <project>` ejecuta Orchestrator.
- `omnysys serve <project>` prepara analisis y expone MCP.

---

## Resumen de Confidence

| Fuente | Confidence | Necesita LLM? | Ejemplo |
|--------|------------|---------------|---------|
| Import/export AST | 1.0 | No | `import { fn } from './utils'` |
| localStorage cross-ref | 1.0 | No | Dos archivos usan key 'token' |
| Event cross-ref | 1.0 | No | Archivo emite 'save', otro escucha 'save' |
| Global variable cross-ref | 1.0 | No | Dos archivos acceden `window.config` |
| Redux selector cross-ref | 1.0 | No | Dos archivos usan mismo slice |
| LLM: god-object analysis | 0.7-0.9 | Si | "Este archivo tiene 3 responsabilidades" |
| LLM: dynamic import mapping | 0.6-0.8 | Si | "import() probablemente carga ModuleX" |
| LLM: hidden connections | 0.5-0.8 | Si | "Este callback se registra en el event loop" |

**Regla clave**: Las conexiones de confidence 1.0 NUNCA se envian al LLM para re-validacion. El LLM solo busca lo que el analisis estatico no puede ver.

---

**Estado De Implementacion**
- Contrato: Define el comportamiento esperado.
- Realidad: Puede estar parcial. Validar con ejecuciones reales.
- Prioridad: Alinear codigo con este documento.

