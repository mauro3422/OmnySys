# Sistema Metadata -> Prompt -> LLM

Documento canonico del flujo de seleccion de prompts basados en metadatos.

## Objetivo
Seleccionar automaticamente el prompt correcto para cada archivo a partir de metadatos estaticos, sin re-parsear codigo.

## Diagrama
```text
Layer A (metadata)
   |
   v
PROMPT_REGISTRY
   |
   v
Prompt Engine
   |
   v
LLM -> JSON
   |
   v
llmInsights
```

## Flujo
1. Layer A extrae metadatos y los guarda en `.OmnySysData/files/**`.
2. Orchestrator lee metadatos y detecta arquetipos via PROMPT_REGISTRY.
3. Prompt Engine genera prompts con variables del metadata.
4. LLM analiza y retorna JSON estructurado.
5. El resultado se fusiona en `llmInsights` del archivo.

## Fuente de Metadatos
- exports, imports, usedBy, counts
- semanticAnalysis (sharedState, events, sideEffects)
- extractores estaticos (localStorage, eventos, CSS-in-JS, TypeScript)
- metadata-extractors (JSDoc, async, errors, build flags)

## Prompt Engine (SSoT)
Archivos clave:
- `src/layer-b-semantic/prompt-engine/PROMPT_REGISTRY.js`
- `src/layer-b-semantic/prompt-engine/prompt-selector.js`
- `src/layer-b-semantic/prompt-engine/index.js`

## Variables comunes
- `{filePath}` `{fileContent}`
- `{exportCount}` `{dependentCount}` `{importCount}` `{functionCount}`
- `{hasDynamicImports}` `{hasTypeScript}` `{hasCSSInJS}`
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
Layer A no usa LLM. Orchestrator no re-extrae datos estaticos. El prompt se decide con metadata existente.

Ultima actualizacion: 2026-02-05

**Estado De Implementacion**
- Contrato: Define el comportamiento esperado.
- Realidad: Puede estar parcial. Validar con prompts generados.
- Prioridad: Alinear codigo con este documento.
