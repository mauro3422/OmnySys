# Sistema Metadata -> Prompt -> LLM

**Ultima actualizacion**: 2026-02-06 (v0.5.2)

Documento canonico del flujo de seleccion de prompts basados en metadatos.

## Objetivo
Seleccionar automaticamente el prompt correcto para cada archivo a partir de metadatos estaticos, sin re-parsear codigo. **Y mas importante: NO enviar al LLM lo que la metadata ya resuelve.**

## Principio Core

```text
Si metadata + cross-reference da confidence 1.0 --> NO usar LLM
Si metadata indica patron complejo pero no puede resolverlo --> SI usar LLM
```

Los arquetipos detectan **patrones de conexion** entre archivos, no calidad de codigo.
Ver `ARCHETYPE_SYSTEM.md` para el detalle completo.

## Diagrama

```text
Layer A (metadata estatica)
   |
   v
Cross-reference entre archivos
   |
   +-- Conexiones confidence 1.0 --> Se guardan SIN LLM
   |   (localStorage, events, globals, Redux, Context)
   |
   v
PROMPT_REGISTRY (detecta arquetipos)
   |
   +-- Sin arquetipos? --> Archivo resuelto, no necesita LLM
   |
   +-- Con arquetipos? --> Elegir prompt por severity
       |
       v
   Prompt Engine (template + schema)
       |
       v
   LLM --> JSON (llmInsights)
       |
       v
   Conexiones adicionales (confidence < 1.0)
```

## Flujo Detallado

1. **Layer A** extrae metadatos por archivo y los guarda en `.omnysysdata/files/**`.
2. **Layer A** cruza metadatos entre archivos para encontrar conexiones con confidence 1.0 (localStorage keys compartidas, event names compartidos, global properties compartidas). **Esto NO usa LLM.**
3. **Orchestrator** lee metadatos y detecta arquetipos via PROMPT_REGISTRY.
4. **Bypass check**: si el arquetipo es condicional (event-hub, global-state, state-manager, singleton) Y las conexiones estaticas ya cubren el caso con confidence 1.0, **NO se envia a LLM**. Solo se envia si hay datos sin resolver (eventos dinamicos, keys sin cruzar, etc).
5. **Solo archivos que realmente necesitan LLM** pasan (~10-20% del proyecto).
6. **Prompt Engine** genera prompts con variables del metadata.
7. **LLM** analiza y retorna JSON estructurado con conexiones adicionales.
8. El resultado se fusiona en `llmInsights` del archivo sin sobrescribir metadata estatica.

### Principio de eficiencia
**Metadata resuelve conexion con certeza? --> NO gastar LLM.**
**Metadata detecta patron pero no puede resolver la conexion? --> SI usar LLM.**

Arquetipos que SIEMPRE necesitan LLM: `god-object`, `dynamic-importer`, `orphan-module`.
Arquetipos con bypass posible: `event-hub`, `global-state`, `state-manager`, `singleton`.
Ver `ARCHETYPE_SYSTEM.md` para tabla completa de bypass por arquetipo.

## Que NO necesita LLM (confidence 1.0)

| Dato | Deteccion | Ejemplo |
|------|-----------|---------|
| Dos archivos comparten localStorage key | Regex + cross-ref | A: `setItem('token')`, B: `getItem('token')` |
| Archivo A emite evento, B escucha mismo evento | Regex + cross-ref | A: `emit('save')`, B: `on('save')` |
| Dos archivos acceden mismo `window.*` | Regex + cross-ref | A: `window.config = {}`, B: `window.config.x` |
| Dos archivos usan mismo Redux selector path | AST + cross-ref | A y B: `useSelector(s => s.user)` |
| Provider y Consumer del mismo Context | AST + cross-ref | A: `<UserContext.Provider>`, B: `useContext(UserContext)` |
| Import/export directo | AST | `import { fn } from './utils'` |
| Dependencia circular | Grafo | A importa B, B importa A |

**Regla: si la conexion se puede verificar como hecho (no como inferencia), NO se gasta LLM.**

## Que SI necesita LLM (confidence < 1.0)

| Situacion | Por que el script no alcanza |
|-----------|------------------------------|
| God object: que responsabilidades tiene | Requiere entender semantica del codigo |
| `import(variable)`: que modulo carga | La ruta se resuelve en runtime |
| Archivo huerfano: por que no tiene dependientes | Puede ser plugin, callback, o dead code |
| Eventos con nombres genericos (`'data'`, `'change'`) | Muchos archivos pueden emitir el mismo nombre |
| Singleton: que estado global controla | Requiere analisis del patron de instancia |

## Fuente de Metadatos
- exports, imports, usedBy, counts
- semanticAnalysis (sharedState, events, sideEffects)
- extractores estaticos (localStorage, eventos, globals, Redux, Context, communication)
- metadata-extractors (JSDoc, async, errors, build flags)

> Nota: `{hasTypeScript}` y `{hasCSSInJS}` siguen disponibles en el replacement map
> pero ningun arquetipo activo los usa. Son metadata informativa de Layer A.

## Prompt Engine (SSoT)
Archivos clave:
- `src/layer-b-semantic/prompt-engine/PROMPT_REGISTRY.js`
- `src/layer-b-semantic/prompt-engine/prompt-selector.js`
- `src/layer-b-semantic/prompt-engine/index.js`

## Variables comunes
- `{filePath}` `{fileContent}`
- `{exportCount}` `{dependentCount}` `{importCount}` `{functionCount}`
- `{hasDynamicImports}`
- `{hasLocalStorage}` `{hasEventListeners}` `{hasGlobalAccess}`
- `{localStorageKeys}` `{eventNames}` `{envVars}`

## Practicas LFM2 (extract + instruct)
- Temperature = 0.0 para salida determinista.
- ChatML con system prompt que incluya schema JSON.
- "Root object, NO wrappers" en el schema.
- Cognitive vaccines: no inventar, copiar literales, arrays vacios si no hay datos.
- Evidence-first: basar la salida en evidencia del codigo, no en ejemplos.
- El cliente LLM debe preservar TODOS los campos (`...parsed`).
- No confiar solo en JSON schema del servidor HTTP.

## Regla de oro
Layer A no usa LLM. Orchestrator no re-extrae datos estaticos. El prompt se decide con metadata existente. **Si la metadata ya da la conexion con certeza, NO gastar LLM.**

---

**Estado De Implementacion**
- Contrato: Define el comportamiento esperado.
- Realidad: Puede estar parcial. Validar con prompts generados.
- Prioridad: Alinear codigo con este documento.
