# Guia de Desarrollo - Sistema de Arquetipos

Guia canonica para agregar arquetipos. Para el resumen del sistema, ver `ARCHETYPE_SYSTEM.md`.

## Proposito y Reglas

Un arquetipo DEBE detectar un **patron de conexion** entre archivos. Antes de crear uno, responde estas 3 preguntas:

1. **Esto me dice algo sobre CONEXIONES entre archivos?** Si no, no es un arquetipo.
2. **La metadata sola puede determinar el patron Y la accion?** Si ambas, no necesita LLM.
3. **El LLM aporta algo que la metadata no puede?** Si si, enviar a LLM.

**Anti-patrones (cosas que NO son arquetipos):**
- "El archivo usa CSS-in-JS" -> Estilo de codigo, no conexion
- "El archivo tiene TypeScript" -> Lenguaje, no conexion
- "El archivo tiene dependencias circulares" -> Layer A ya lo detecta en el grafo
- "El archivo tiene errores" -> Calidad de codigo, no conexion

**Arquetipos removidos (v0.5.2):**
- `styled-component`: Detectaba `hasCSSInJS` pero esto no indica conexiones entre archivos.
- `type-definer`: Detectaba `hasTypeScript` pero esto no indica conexiones entre archivos.

## Flujo

```text
Layer A (metadata)
   |
   v
PROMPT_REGISTRY (detecta arquetipo)
   |
   v
Prompt Engine (elige template + schema)
   |
   v
LLM (1 prompt por archivo)
   |
   v
llmInsights (merge por mergeKey)
```

**Como se elige el prompt**
- Un archivo puede cumplir varios arquetipos.
- Se selecciona el de mayor `severity`.
- Solo se ejecuta un prompt por archivo en cada corrida.

## Mapa de arquetipos y metadatos

| Arquetipo | Detector (metadatos) | Template | Placeholders usados |
|---|---|---|---|
| `god-object` | `exportCount`, `dependentCount`, `semanticDependentCount` | `prompt-templates/god-object.js` | `{filePath}`, `{exportCount}`, `{exports}`, `{dependentCount}`, `{fileContent}` |
| `orphan-module` | `exportCount`, `dependentCount`, `semanticDependentCount` | `prompt-templates/orphan-module.js` | `{filePath}`, `{exportCount}`, `{exports}`, `{dependentCount}`, `{fileContent}` |
| `dynamic-importer` | `hasDynamicImports` | `prompt-templates/dynamic-imports.js` | `{filePath}`, `{hasDynamicImports}`, `{fileContent}` |
| `singleton` | `hasSingletonPattern` o (`functionCount` + `exportCount` + `dependentCount`) | `prompt-templates/singleton.js` | `{filePath}`, `{hasSingletonPattern}`, `{fileContent}` |
| `event-hub` | `hasEventEmitters` o `hasEventListeners` o `eventNames` | `prompt-templates/semantic-connections.js` | `{filePath}`, `{fileContent}` |
| `global-state` | `usesGlobalState` y `localStorageKeys` vacio | `prompt-templates/global-state.js` | `{filePath}`, `{hasGlobalAccess}`, `{fileContent}` |
| `state-manager` | `definesGlobalState` o `localStorageKeys` o `hasGlobalAccess` | `prompt-templates/semantic-connections.js` | `{filePath}`, `{fileContent}` |
| `default` | fallback | `prompt-templates/default.js` | `{filePath}`, `{exportCount}`, `{exports}`, `{dependentCount}`, `{importCount}`, `{functionCount}`, `{fileContent}` |

## Fuentes de metadata (Layer A)

| Metadata | Fuente | Usado por arquetipo |
|---|---|---|
| `exportCount`, `exports` | parser + graph (`exports`, `usedBy`) | god-object, orphan-module |
| `dependentCount`, `dependents` | graph (`usedBy`) | god-object, orphan-module, singleton |
| `importCount` | parser (`imports`) | default |
| `functionCount` | parser (`functions`) | singleton, default |
| `semanticConnections`, `semanticDependentCount` | extractors estaticos + conexiones semanticas | god-object, orphan-module |
| `definesGlobalState`, `usesGlobalState`, `globalStateWrites`, `globalStateReads` | `shared-state-detector` | global-state, state-manager |
| `hasEventEmitters`, `hasEventListeners`, `eventNames` | `event-pattern-detector` | event-hub |
| `hasLocalStorage`, `localStorageKeys` | `static-extractors` + `side-effects-detector` | state-manager |
| `hasGlobalAccess` | `side-effects-detector` + `shared-state-detector` | global-state, state-manager |
| `hasDynamicImports` | parser (import()) | dynamic-importer |
| `hasCSSInJS` | `css-in-js-extractor` | (ninguno - metadata informativa) |
| `hasTypeScript` | extension + `typescript-extractor` | (ninguno - metadata informativa) |
| `hasJSDoc`, `hasAsyncPatterns`, `envVars` | `metadata-extractors` | (contexto general) |
| `hasSingletonPattern` | heuristica en `buildPromptMetadata` | singleton |

## Checklist para agregar un arquetipo

**0. Validar proposito**
- Responde las 3 preguntas de la seccion "Proposito y Reglas" arriba.
- Si no describe conexiones entre archivos, NO crear el arquetipo.

**1. Definir la senal de metadatos**
- El detector solo usa metadata, no regex directos en Orchestrator.
- La fuente unica es `buildPromptMetadata()` en `src/layer-b-semantic/metadata-contract/builders/prompt-builder.js`.
- Si falta metadata, agregarla en `buildPromptMetadata()` y en la fuente Layer A correspondiente.

**2. Crear el template del prompt**

Archivo: `src/layer-b-semantic/prompt-engine/prompt-templates/<type>.js`

Reglas basicas:
- JSON puro, sin wrappers ni markdown.
- El schema debe estar visible en el system prompt.
- El user prompt debe incluir `{fileContent}`.
- Solo usa placeholders que realmente necesita el arquetipo.

**3. Crear JSON schema (opcional pero recomendado)**

Archivo: `src/layer-b-semantic/prompt-engine/json-schemas/<type>.json`

Notas:
- El Prompt Engine intenta cargar `<type>.json` automaticamente.
- Si no existe, usa `default.json`.

**4. Registrar en el registry**

Archivo: `src/layer-b-semantic/prompt-engine/PROMPT_REGISTRY.js`

Campos obligatorios:
- `type` (kebab-case)
- `severity` (0-10)
- `detector(metadata)` - DEBE usar solo campos de `buildPromptMetadata()`
- `template`
- `mergeKey`
- `fields`

El sistema valida el registry al cargar y avisa si falta algo.

**5. (Si aplica) Agregar cognitive vaccine**

Archivo: `src/layer-b-semantic/prompt-engine/cognitive-vaccines.js`

Solo si el analysis type necesita reglas anti-alucinacion especificas.

**6. (Si aplica) Agregar validacion de salida**
- Si el arquetipo extrae datos sensibles (eventos, globals, paths), agrega una validacion.
- Archivo: `src/layer-b-semantic/llm-response-validator.js`
- Objetivo: filtrar resultados que no aparezcan en el codigo real.

**7. Probar y validar**
1. Crear un testcase minimo en `test-cases/`.
2. Borrar `.omnysysdata` del testcase.
3. Ejecutar:
   - `node omnysys.js analyze <testcase>`
   - `node omnysys.js consolidate <testcase>`
4. Verificar:
   - `llmInsights.analysisType`
   - `llmInsights[mergeKey]` con los campos esperados
   - `semantic-issues.json`

## Merge de resultados

- El merge generico usa `mergeKey` + `fields` para guardar datos del LLM.
- Para casos especiales (ej: god-object), el worker agrega campos derivados.
- Si agregas un arquetipo nuevo, asegurate de que su output exista en `llmInsights[mergeKey]`.

## Robustez

- Validacion del registry con warnings (tipos duplicados, templates incompletos).
- Detectores con try/catch para no romper el flujo.
- JSON schema se carga automaticamente si existe `<type>.json`.
- Prompt Engine usa whitelist por placeholders y elimina metadata vacia/false.

## Depuracion rapida

- `DEBUG_METADATA=1` habilita validacion de metadata en el selector.
- Si el LLM no se ejecuta, revisa:
  - `.omnysysdata/index.json` (si ya tiene `llmInsights`, no reanaliza)
  - `analysis.llmOnlyForComplex` y thresholds
- Para forzar, borra `.omnysysdata`.

Ultima actualizacion: 2026-02-06
