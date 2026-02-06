# Guia de Desarrollo - Sistema de Arquetipos

Esta guia explica como agregar un arquetipo nuevo con su prompt y validar que funcione sin romper el pipeline.

**Flujo**
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

**Mapa de arquetipos y metadatos**

| Arquetipo | Detector (metadatos) | Template | Placeholders usados |
|---|---|---|---|
| `god-object` | `exportCount`, `dependentCount`, `semanticDependentCount` | `prompt-templates/god-object.js` | `{filePath}`, `{exportCount}`, `{exports}`, `{dependentCount}`, `{fileContent}` |
| `orphan-module` | `exportCount`, `dependentCount`, `semanticDependentCount` | `prompt-templates/orphan-module.js` | `{filePath}`, `{exportCount}`, `{exports}`, `{dependentCount}`, `{fileContent}` |
| `dynamic-importer` | `hasDynamicImports` | `prompt-templates/dynamic-imports.js` | `{filePath}`, `{hasDynamicImports}`, `{fileContent}` |
| `singleton` | `hasSingletonPattern` o (`functionCount` + `exportCount` + `dependentCount`) | `prompt-templates/singleton.js` | `{filePath}`, `{hasSingletonPattern}`, `{fileContent}` |
| `event-hub` | `hasEventEmitters` o `hasEventListeners` o `eventNames` | `prompt-templates/semantic-connections.js` | `{filePath}`, `{fileContent}` |
| `global-state` | `usesGlobalState` y `localStorageKeys` vacio | `prompt-templates/global-state.js` | `{filePath}`, `{hasGlobalAccess}`, `{fileContent}` |
| `state-manager` | `definesGlobalState` o `localStorageKeys` o `hasGlobalAccess` | `prompt-templates/semantic-connections.js` | `{filePath}`, `{fileContent}` |
| `styled-component` | `hasCSSInJS` | `prompt-templates/css-in-js.js` | `{filePath}`, `{fileContent}` |
| `type-definer` | `hasTypeScript` | `prompt-templates/typescript.js` | `{filePath}`, `{fileContent}` |
| `default` | fallback | `prompt-templates/default.js` | `{filePath}`, `{exportCount}`, `{exports}`, `{dependentCount}`, `{importCount}`, `{functionCount}`, `{fileContent}` |

**Fuentes de metadata (Layer A)**

| Metadata | Fuente |
|---|---|
| `exportCount`, `exports` | parser + graph (`exports`, `usedBy`) |
| `dependentCount`, `dependents` | graph (`usedBy`) |
| `importCount` | parser (`imports`) |
| `functionCount` | parser (`functions`) |
| `semanticConnections`, `semanticDependentCount` | extractors estaticos + conexiones semanticas |
| `definesGlobalState`, `usesGlobalState`, `globalStateWrites`, `globalStateReads` | `shared-state-detector` |
| `hasEventEmitters`, `hasEventListeners`, `eventNames` | `event-pattern-detector` |
| `hasLocalStorage`, `localStorageKeys` | `static-extractors` + `side-effects-detector` |
| `hasGlobalAccess` | `side-effects-detector` + `shared-state-detector` |
| `hasDynamicImports` | parser (import()) |
| `hasCSSInJS` | `css-in-js-extractor` |
| `hasTypeScript` | extension + `typescript-extractor` |
| `hasJSDoc`, `hasAsyncPatterns`, `envVars` | `metadata-extractors` |
| `hasSingletonPattern` | heuristica en `buildPromptMetadata` |

**Checklist para agregar un arquetipo**
1. Definir la señal de metadatos.
2. Crear el template del prompt.
3. (Opcional) Crear el JSON schema.
4. Registrar el arquetipo en el registry.
5. Probar en un testcase y validar el merge.

**1) Definir la señal de metadatos**
- El detector solo usa metadata, no regex directos en Orchestrator.
- La fuente unica es `buildPromptMetadata()` en `src/layer-b-semantic/metadata-contract.js`.
- Si falta metadata, agregarla en `buildPromptMetadata()` y en la fuente Layer A correspondiente.
- Usa nombres consistentes con `metadata-contract.js`.

**2) Crear el template del prompt**
Archivo:
- `src/layer-b-semantic/prompt-engine/prompt-templates/<type>.js`

Reglas basicas:
- JSON puro, sin wrappers ni markdown.
- El schema debe estar visible en el system prompt.
- El user prompt debe incluir `{fileContent}`.
- Solo usa placeholders que realmente necesita el arquetipo.

**3) Crear JSON schema (opcional pero recomendado)**
Archivo:
- `src/layer-b-semantic/prompt-engine/json-schemas/<type>.json`

Notas:
- El Prompt Engine intenta cargar `<type>.json` automaticamente.
- Si no existe, usa `default.json`.

**4) Registrar en el registry**
Archivo:
- `src/layer-b-semantic/prompt-engine/PROMPT_REGISTRY.js`

Campos obligatorios:
- `type` (kebab-case)
- `severity` (0-10)
- `detector(metadata)`
- `template`
- `mergeKey`
- `fields`

El sistema ahora valida el registry al cargar y avisa si falta algo.

**Validacion de salida (anti-alucinaciones)**
- Si el arquetipo extrae datos sensibles (eventos, globals, paths), agrega una validacion.
- Archivo: `src/layer-b-semantic/llm-response-validator.js`
- Activar la validacion en `src/layer-b-semantic/llm-analyzer.js` segun `analysisType`.
- Objetivo: filtrar resultados que no aparezcan en el codigo real.

**5) Probar y validar**
1. Crear un testcase minimo en `test-cases/`.
2. Borrar `.OmnySysData` del testcase.
3. Ejecutar:
   - `node omnysystem.js analyze <testcase>`
   - `node omnysystem.js consolidate <testcase>`
4. Verificar:
   - `llmInsights.analysisType`
   - `llmInsights[mergeKey]` con los campos esperados
   - `semantic-issues.json`

**Merge de resultados**
- El merge generico usa `mergeKey` + `fields` para guardar datos del LLM.
- Para casos especiales (ej: god-object), el worker agrega campos derivados.
- Si agregas un arquetipo nuevo, asegurate de que su output exista en `llmInsights[mergeKey]`.

**Robustez agregada**
- Validacion del registry con warnings (tipos duplicados, templates incompletos).
- Detectores con try/catch para no romper el flujo.
- JSON schema se carga automaticamente si existe `<type>.json`.
- Prompt Engine usa whitelist por placeholders y elimina metadata vacia/false.

**Depuracion rapida**
- `DEBUG_METADATA=1` habilita validacion de metadata en el selector.
- Si el LLM no se ejecuta, revisa:
  - `.OmnySysData/index.json` (si ya tiene `llmInsights`, no reanaliza)
  - `analysis.llmOnlyForComplex` y thresholds
- Para forzar, borra `.OmnySysData`.

Ultima actualizacion: 2026-02-06
