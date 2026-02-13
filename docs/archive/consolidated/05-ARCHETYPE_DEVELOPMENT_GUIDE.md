---
⚠️  DOCUMENTO ARCHIVADO - Ver nueva ubicación
---
Este documento ha sido consolidado en la nueva estructura de documentación.

📍 Nueva ubicación: Ver docs/archive/consolidated/README.md para el mapa completo

🚀 Usar en su lugar:
- docs/01-core/ (fundamentos)
- docs/02-architecture/ (sistemas)
- docs/04-guides/ (guías prácticas)

---
Documento original (mantenido para referencia histórica):
# Guia de Desarrollo - Sistema de Arquetipos

Guia canonica para agregar arquetipos. Para el resumen del sistema, ver `ARCHETYPE_SYSTEM.md`.

**IMPORTANTE**: Este documento implementa **Pillar 1** del sistema (Box Test). Ver `docs/CORE_PRINCIPLES.md` para fundamentos.

## Proposito y Reglas

Un arquetipo DEBE detectar un **patron de conexion** entre archivos.

### The Box Test (Pillar 1)

Antes de crear un arquetipo, aplica **The Box Test**:

> **"Â¿Esto me dice algo sobre cÃ³mo este archivo se CONECTA con otros archivos?"**

- âœ… **SI** â†’ Arquetipo vÃ¡lido
- âŒ **NO** â†’ Solo metadata informativa

### Las 3 Preguntas de ValidaciÃ³n

1. **Â¿Esto me dice algo sobre CONEXIONES entre archivos?** Si no, no es un arquetipo.
2. **Â¿La metadata sola puede determinar el patron Y la accion?** Si ambas, no necesita LLM.
3. **Â¿El LLM aporta algo que la metadata no puede?** Si si, enviar a LLM.

### Anti-patrones (fallan el Box Test)

Estos NO son arquetipos porque no revelan conexiones:

| Propuesta | Â¿Pasa Box Test? | RazÃ³n |
|-----------|-----------------|--------|
| "usa CSS-in-JS" | âŒ NO | Estilo de cÃ³digo, no conexiÃ³n |
| "tiene TypeScript" | âŒ NO | Lenguaje, no conexiÃ³n |
| "tiene errores" | âŒ NO | Calidad de cÃ³digo, no conexiÃ³n |
| "tiene dependencias circulares" | âŒ NO | Layer A ya lo detecta en el grafo |
| "complejidad > 100" | âŒ NO | Propiedad interna, no coupling |

**Arquetipos removidos (v0.5.2):**
- `styled-component`: Detectaba `hasCSSInJS` pero falla Box Test
- `type-definer`: Detectaba `hasTypeScript` pero falla Box Test

### Ejemplos de Box Test

**âœ… PASA (Arquetipo vÃ¡lido):**
```javascript
// Arquetipo: "network-hub"
// Pregunta: "Â¿Detectar fetch('/api/users') revela conexiones?"
// Respuesta: SÃ - Archivos que llaman al mismo endpoint estÃ¡n acoplados
//            Si cambia el contrato de /api/users, todos se rompen
// â†’ Arquetipo vÃ¡lido
```

**âŒ FALLA (Solo metadata):**
```javascript
// Propuesta: "uses-async-await"
// Pregunta: "Â¿Detectar async/await revela conexiones?"
// Respuesta: NO - Es sintaxis interna, no indica coupling con otros archivos
// â†’ No es arquetipo, solo metadata informativa
```

**ðŸ¤” CONDICIONAL (Depends):**
```javascript
// Propuesta: "error-handler"
// Pregunta: "Â¿Detectar try/catch revela conexiones?"
// Respuesta: DEPENDE:
//   - Si el catch emite eventos â†’ SÃ (event-error-coordinator)
//   - Si el catch solo loggea â†’ NO (calidad interna)
// â†’ Arquetipo condicional con detector refinado
```

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

