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

**Checklist para agregar un arquetipo**
1. Definir la señal de metadatos.
2. Crear el template del prompt.
3. (Opcional) Crear el JSON schema.
4. Registrar el arquetipo en el registry.
5. Probar en un testcase y validar el merge.

**1) Definir la señal de metadatos**
- El detector solo usa metadata, no regex directos en Orchestrator.
- Si falta metadata, agregarla donde se construye el objeto `metadata` en:
  - `src/core/orchestrator.js`
  - `src/core/analysis-worker.js`
- Usa nombres consistentes con `metadata-contract.js`.

**2) Crear el template del prompt**
Archivo:
- `src/layer-b-semantic/prompt-engine/prompt-templates/<type>.js`

Reglas basicas:
- JSON puro, sin wrappers ni markdown.
- El schema debe estar visible en el system prompt.
- El user prompt debe incluir `{fileContent}`.

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

**Depuracion rapida**
- `DEBUG_METADATA=1` habilita validacion de metadata en el selector.
- Si el LLM no se ejecuta, revisa:
  - `.OmnySysData/index.json` (si ya tiene `llmInsights`, no reanaliza)
  - `analysis.llmOnlyForComplex` y thresholds
- Para forzar, borra `.OmnySysData`.

Ultima actualizacion: 2026-02-06
