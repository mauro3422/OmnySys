# Sistema de Arquetipos

Documento central del sistema de arquetipos. Para agregar un nuevo arquetipo, ver `ARCHETYPE_DEVELOPMENT_GUIDE.md`.

## Proposito

Los arquetipos clasifican archivos segun sus **patrones de conexion**: como un archivo se conecta con otros archivos del proyecto. Imagina que cada archivo es una caja — al levantarla, ves cables conectados a otras cajas. El arquetipo te dice **que tipo de cables tiene** y cuantos.

**Los arquetipos NO son para detectar calidad de codigo.** Cosas como "usa CSS-in-JS" o "tiene tipos TypeScript" no son arquetipos porque no cambian las conexiones del archivo.

## Test de la Caja

Antes de crear un arquetipo, debe pasar este test: **"Al levantar la caja (archivo), este arquetipo me ayuda a ver cables (conexiones) que de otra forma no veria?"**

| Arquetipo | Pasa? | Que cables revela | Necesita LLM? |
|-----------|-------|-------------------|---------------|
| `god-object` | SI | Caja con 20+ cables a todos lados. Alto blast radius. | SI siempre |
| `dynamic-importer` | SI | Cables invisibles (resueltos en runtime). Sin LLM no los ves. | SI siempre |
| `event-hub` | SI | Cables invisibles (emit/listen). No aparecen en imports. | Condicional |
| `global-state` | SI | Cables invisibles via `window.*`. Conecta lectores con escritores. | Condicional |
| `state-manager` | SI | Cables a todos los consumidores de estado (localStorage, etc). | Condicional |
| `orphan-module` | SI | Caja SIN cables visibles. Sospechoso: o es codigo muerto o tiene cables ocultos. | SI siempre |
| `singleton` | SI (debil) | Acoplamiento implicito: todos los usuarios de la instancia estan conectados entre si. | Condicional |
| `facade` | SI | Cables de re-export: todos los consumidores dependen transitivamente de los modulos internos. | NO (metadata) |
| `config-hub` | SI | Caja de config con cables a todos los consumidores. Cambiar una key afecta a muchos. | NO (metadata) |
| `entry-point` | SI | Punto de entrada: cables de import hacia adentro, cero hacia afuera. | NO (metadata) |
| `default` | N/A | Fallback, no es un arquetipo real. | SI (general) |

---

## Regla LLM vs No-LLM

El sistema tiene **dos niveles** de deteccion de conexiones:

### Nivel 1: Conexiones Estaticas (NO necesitan LLM)

Layer A detecta conexiones cruzando datos entre archivos. Estas conexiones tienen **confidence = 1.0** porque son hechos verificables:

| Dato extraido | Como se cruza | Ejemplo |
|---------------|---------------|---------|
| `localStorageKeys` | Archivo A escribe key X, Archivo B lee key X | A: `localStorage.setItem('token', ...)` / B: `localStorage.getItem('token')` |
| `eventNames` | Archivo A emite evento Y, Archivo B escucha evento Y | A: `emit('userLogin')` / B: `on('userLogin', ...)` |
| `globalStateWrites/Reads` | Archivo A escribe `window.Z`, Archivo B lee `window.Z` | A: `window.config = {...}` / B: `if (window.config.debug)` |
| `envVars` | Archivo A y B leen `process.env.SAME_VAR` | Acoplados por configuracion |

**Estas conexiones NO necesitan LLM.** Layer A las detecta con regex + cross-reference entre archivos.

### Nivel 2: Conexiones Semanticas (SI necesitan LLM)

Cuando la metadata indica patrones complejos pero no puede determinar la conexion exacta:

| Situacion | Por que necesita LLM |
|-----------|---------------------|
| God object con 15 exports | LLM determina QUE responsabilidades tiene y CUALES afectan a cada dependiente |
| Import dinamico `import(variable)` | LLM infiere que rutas podria resolver en runtime |
| Archivo huerfano con `hasGlobalAccess` | LLM busca conexiones no obvias (callbacks, plugins, side effects) |
| Eventos con nombres genericos | LLM determina el flujo real de datos entre emisor y receptor |

### Decision de LLM (Pipeline)

```text
Layer A extrae metadata
   |
   v
buildPromptMetadata() -- normaliza los datos
   |
   v
detectArchetypes(metadata) -- evalua detectores
   |
   v
Archivo tiene arquetipos?
   |
   +-- NO --> No necesita LLM (ya tiene conexiones estaticas)
   |
   +-- SI --> Calcular prioridad:
              - CRITICAL: god-object
              - HIGH: orphan-module, state-manager, event-hub
              - MEDIUM: dynamic-importer, singleton
              - LOW: otros
              |
              v
         Encolar para LLM
```

**Regla clave**: Si Layer A ya detecto las conexiones con confidence >= 1.0, el LLM no las re-valida. El LLM solo busca conexiones ADICIONALES que la metadata no puede ver.

---

## Arquetipos Actuales (11) — Clasificacion por Necesidad de LLM

Para cada arquetipo, la pregunta es: **"La metadata y el cross-reference ya resuelven las conexiones, o NECESITO LLM?"**

### requiresLLM: true (SIEMPRE necesitan LLM)

| Arquetipo | Severity | Analisis |
|-----------|----------|----------|
| `god-object` | 10 | La metadata sabe que tiene 15 exports y 20 dependents, pero NO sabe que responsabilidades tiene. Solo LLM puede decir "este archivo tiene 3 areas: auth, logging, config" y cuales afectan a cada dependiente. |
| `dynamic-importer` | 7 | Si la ruta del import() es una variable, es imposible resolverla estaticamente. Solo LLM puede inferir que modulo carga basandose en el contexto. |
| `orphan-module` | 5 | La metadata sabe que es huerfano pero NO sabe por que. Puede ser dead code, puede ser un plugin, puede tener cables via callback registration. LLM es el unico que puede investigar. |
| `default` | 0 | Fallback. Analisis general para archivos sin otro arquetipo. |

### requiresLLM: 'conditional' (A veces se resuelven sin LLM)

| Arquetipo | Severity | Bypass si... |
|-----------|----------|-------------|
| `singleton` | 7 | Metadata ya cruzo las conexiones de global state con confidence 1.0. |
| `event-hub` | 6 | Layer A ya cruzo todos los event names entre archivos (string literals). |
| `global-state` | 6 | `window.config` ya fue cruzado entre archivos con confidence 1.0. |
| `state-manager` | 6 | localStorage keys ya estan cruzadas con confidence 1.0. |

### requiresLLM: false (NUNCA necesitan LLM)

| Arquetipo | Severity | Por que no necesita LLM |
|-----------|----------|------------------------|
| `facade` | 4 | 100% determinístico: `reExportCount` viene del AST. Si re-exporta >= 3 modulos, es facade. Las conexiones son los mismos imports/exports — visibles sin LLM. |
| `config-hub` | 5 | 100% determinístico: `exportCount + dependentCount` del grafo. Muchos exports, muchos dependents, pocas funciones = config hub. |
| `entry-point` | 3 | 100% determinístico: `importCount + dependentCount` del grafo. Importa mucho, nadie lo importa = entry point. |

**SSOT**: El campo `requiresLLM` esta definido en `PROMPT_REGISTRY.js` para cada arquetipo. El pipeline en `llm-analysis.js` usa `filterArchetypesRequiringLLM()` para separar los que pasan por LLM de los que no.

### Pipeline de Decision LLM (corregido v0.6)

```text
Layer A extrae metadata
   |
   v
detectArchetypes(metadata) -- evalua TODOS los detectores
   |
   v
filterArchetypesRequiringLLM(archetypes)
   |
   +-- requiresLLM: false --> Se registra el arquetipo pero NO pasa por LLM
   |   (facade, config-hub, entry-point)
   |
   +-- requiresLLM: true/conditional --> Pasan a Gate 2
       |
       v
   needsLLMAnalysis() -- analysis-decider.js
       |
       +-- Conexiones ya resueltas (confidence >= 1.0) --> Bypass
       |
       +-- Conexiones sin resolver --> Encolar para LLM
```

Esta optimizacion se implementa en:
- `PROMPT_REGISTRY.js`: define `requiresLLM` por arquetipo
- `llm-analysis.js`: usa `filterArchetypesRequiringLLM()` para filtrar
- `analysis-decider.js`: Gate 2, evalua conexiones no resueltas

## Arquetipos Removidos (v0.5.2)

| Arquetipo | Detector | Razon de remocion |
|-----------|----------|-------------------|
| `styled-component` | `hasCSSInJS === true` | No describe conexiones. Los estilos CSS-in-JS no cambian como un archivo se conecta con otros. |
| `type-definer` | `hasTypeScript === true` | No describe conexiones. Que un archivo tenga tipos TypeScript no cambia su grafo de dependencias. |

**Nota**: La metadata `hasCSSInJS` y `hasTypeScript` sigue siendo extraida por Layer A como informacion de contexto. Solo se removio su uso como detector de arquetipos.

---

## Diagrama de Flujo

```text
Layer A (metadata estatica)
   |
   v
Cross-reference entre archivos
   |
   +-- Conexiones con confidence 1.0 (localStorage, events, globals)
   |   --> Se guardan directamente, NO necesitan LLM
   |
   v
PROMPT_REGISTRY (detecta arquetipos por metadata)
   |
   v
Prompt Engine (elige template + schema por severity)
   |
   v
LLM (1 prompt por archivo, el de mayor severity)
   |
   v
llmInsights (merge por mergeKey en el JSON del archivo)
   |
   +-- Conexiones adicionales del LLM (confidence < 1.0)
       --> Se agregan a las conexiones existentes
```

---

## Anti-patrones

Antes de agregar un arquetipo, pregunta: **"Esto me dice algo sobre las CONEXIONES entre archivos?"**

| Pregunta | Respuesta | Es arquetipo? |
|----------|-----------|---------------|
| "Emite eventos custom" | Si, conexion invisible | SI |
| "Lee localStorage" | Si, estado compartido entre archivos | SI |
| "Tiene 20 dependents" | Si, acoplamiento critico | SI |
| "Usa CSS-in-JS" | No, es un detalle de estilo | NO |
| "Tiene TypeScript" | No, es un lenguaje | NO |
| "Tiene dependencias circulares" | Si, pero Layer A ya lo detecta | NO (no necesita arquetipo) |
| "Tiene muchos errores" | No, es calidad de codigo | NO |

Y antes de mandar algo al LLM, pregunta: **"La metadata ya me da esta conexion con certeza?"**

| Dato | Necesita LLM? | Por que |
|------|--------------|---------|
| "File A y B comparten localStorage key 'token'" | NO | Regex + cross-reference da confidence 1.0 |
| "File A emite 'save' y File B escucha 'save'" | NO | Regex + cross-reference da confidence 1.0 |
| "File A tiene import() pero no sabemos que carga" | SI | Solo LLM puede inferir la ruta |
| "File A tiene 15 exports usados por 20 archivos" | SI | Solo LLM puede agrupar responsabilidades |

---

## Archivos Clave

| Archivo | Rol |
|---------|-----|
| `src/layer-b-semantic/prompt-engine/PROMPT_REGISTRY.js` | Definicion de arquetipos (SSOT) |
| `src/layer-b-semantic/prompt-engine/prompt-selector.js` | Seleccion por severity |
| `src/layer-b-semantic/prompt-engine/index.js` | Generacion de prompts |
| `src/layer-b-semantic/metadata-contract/constants.js` | Umbrales y campos de metadata |
| `src/layer-b-semantic/metadata-contract/detectors/architectural-patterns.js` | Detectores de God Object y Orphan Module |
| `src/layer-b-semantic/metadata-contract/builders/prompt-builder.js` | Transforma metadata Layer A en formato estandar |
| `src/layer-b-semantic/llm-analyzer/analysis-decider.js` | Decide si un archivo necesita LLM |
| `src/core/orchestrator/llm-analysis.js` | Orquestacion del analisis LLM |
| `src/layer-a-static/extractors/static/index.js` | Orquesta extraccion y cross-reference |
| `src/layer-a-static/extractors/static/storage-connections.js` | Cross-reference de localStorage |
| `src/layer-a-static/extractors/static/events-connections.js` | Cross-reference de eventos |
| `src/layer-a-static/extractors/static/globals-connections.js` | Cross-reference de globals |
| `src/layer-a-static/extractors/static/env-connections.js` | Cross-reference de env vars (process.env) |
| `src/layer-a-static/extractors/static/route-extractor.js` | Extrae rutas API (server + client) |
| `src/layer-a-static/extractors/static/route-connections.js` | Cross-reference de rutas API compartidas |
| `src/layer-a-static/extractors/static/colocation-extractor.js` | Detecta archivos co-locados (test, stories) |
| `tests/smoke-test.js` | Smoke test: valida extractores y bypass LLM |

Ultima actualizacion: 2026-02-06
