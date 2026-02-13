# Guía de Desarrollo - Crear Arquetipos

**Versión**: v0.7.1  
**Prerrequisito**: Leer [system.md](./system.md) primero  
**Implementa**: [Pilar 1 - Box Test](../../01-core/principles.md)

---

## Proposito y Reglas

Un arquetipo DEBE detectar un **patrón de conexión** entre archivos.

### The Box Test (Pilar 1)

Antes de crear un arquetipo, aplica **The Box Test**:

> **"¿Esto me dice algo sobre cómo este archivo se CONECTA con otros archivos?"**

- ✅ **SÍ** → Arquetipo válido
- ❌ **NO** → Solo metadata informativa

### Las 3 Preguntas de Validación

1. **¿Esto me dice algo sobre CONEXIONES entre archivos?** Si no, no es un arquetipo.
2. **¿La metadata sola puede determinar el patrón Y la acción?** Si ambas, no necesita LLM.
3. **¿El LLM aporta algo que la metadata no puede?** Si sí, enviar a LLM. (POR AHORA NO SE USA, DEBEMOS VER QUE ARCHIVOS SERIAN RELEVANTES PARA ESTO... O QUE PODRIAMOS SACAR DE UN LLM)

---

## Anti-patrones (Fallan el Box Test)

Estos NO son arquetipos porque no revelan conexiones:

| Propuesta | ¿Pasa Box Test? | Razón |
|-----------|-----------------|--------|
| "usa CSS-in-JS" | ❌ NO | Estilo de código, no conexión |
| "tiene TypeScript" | ❌ NO | Lenguaje, no conexión |
| "tiene errores" | ❌ NO | Calidad de código, no conexión |
| "tiene dependencias circulares" | ❌ NO | Layer A ya lo detecta en el grafo |
| "complejidad > 100" | ❌ NO | Propiedad interna, no coupling |

**Arquetipos removidos (v0.5.2):**
- `styled-component`: Detectaba `hasCSSInJS` pero falla Box Test
- `type-definer`: Detectaba `hasTypeScript` pero falla Box Test

---

## Ejemplos de Box Test

### ✅ PASA (Arquetipo válido)

```javascript
// Arquetipo: "network-hub"
// Pregunta: "¿Detectar fetch('/api/users') revela conexiones?"
// Respuesta: SÍ - Archivos que llaman al mismo endpoint están acoplados
//            Si cambia el contrato de /api/users, todos se rompen
// → Arquetipo válido
```

### ❌ FALLA (Solo metadata)

```javascript
// Propuesta: "uses-async-await"
// Pregunta: "¿Detectar async/await revela conexiones?"
// Respuesta: NO - Es sintaxis interna, no indica coupling con otros archivos
// → No es arquetipo, solo metadata informativa
```

### 🤔 CONDICIONAL (Depends)

```javascript
// Propuesta: "error-handler"
// Pregunta: "¿Detectar try/catch revela conexiones?"
// Respuesta: DEPENDE:
//   - Si el catch emite eventos → SÍ (event-error-coordinator)
//   - Si el catch solo loggea → NO (calidad interna)
// → Arquetipo condicional con detector refinado
```

---

## Mapa de Arquetipos y Metadata

| Arquetipo | Detector (metadatos) | Template | Placeholders usados |
|-----------|---------------------|----------|---------------------|
| `god-object` | `exportCount`, `dependentCount`, `semanticDependentCount` | `god-object.js` | `{filePath}`, `{exportCount}`, `{exports}`, `{dependentCount}`, `{fileContent}` |
| `orphan-module` | `exportCount`, `dependentCount`, `semanticDependentCount` | `orphan-module.js` | `{filePath}`, `{exportCount}`, `{exports}`, `{dependentCount}`, `{fileContent}` |
| `dynamic-importer` | `hasDynamicImports` | `dynamic-imports.js` | `{filePath}`, `{hasDynamicImports}`, `{fileContent}` |
| `singleton` | `hasSingletonPattern` | `singleton.js` | `{filePath}`, `{hasSingletonPattern}`, `{fileContent}` |
| `event-hub` | `hasEventEmitters` o `hasEventListeners` | `semantic-connections.js` | `{filePath}`, `{fileContent}` |
| `global-state` | `usesGlobalState` | `global-state.js` | `{filePath}`, `{hasGlobalAccess}`, `{fileContent}` |
| `state-manager` | `definesGlobalState` o `localStorageKeys` | `semantic-connections.js` | `{filePath}`, `{fileContent}` |
| `default` | fallback | `default.js` | `{filePath}`, `{exportCount}`, `{exports}`, `{dependentCount}`, `{importCount}`, `{functionCount}`, `{fileContent}` |

---

## Fuentes de Metadata (Layer A)

| Metadata | Fuente | Usado por arquetipo |
|----------|--------|---------------------|
| `exportCount`, `exports` | parser + graph | god-object, orphan-module |
| `dependentCount`, `dependents` | graph | god-object, orphan-module, singleton |
| `importCount` | parser | default |
| `functionCount` | parser | singleton, default |
| `semanticConnections` | extractores estáticos | god-object, orphan-module |
| `definesGlobalState`, `usesGlobalState` | `shared-state-detector` | global-state, state-manager |
| `hasEventEmitters`, `hasEventListeners` | `event-pattern-detector` | event-hub |
| `hasLocalStorage`, `localStorageKeys` | `side-effects-detector` | state-manager |
| `hasGlobalAccess` | `side-effects-detector` | global-state, state-manager |
| `hasDynamicImports` | parser (import()) | dynamic-importer |

---

## Checklist para Agregar un Arquetipo

### 0. Validar Propósito
- [ ] Responde las 3 preguntas de la sección "Proposito y Reglas"
- [ ] Si no describe conexiones entre archivos, NO crear el arquetipo

### 1. Definir la Señal de Metadatos
- [ ] El detector solo usa metadata, no regex directos en Orchestrator
- [ ] La fuente única es `buildPromptMetadata()` en `src/layer-b-semantic/metadata-contract/builders/prompt-builder.js`
- [ ] Si falta metadata, agregarla en `buildPromptMetadata()` y en la fuente Layer A correspondiente

### 2. Crear el Template del Prompt

**Archivo**: `src/layer-b-semantic/prompt-engine/prompt-templates/<type>.js`

**Reglas básicas**:
- JSON puro, sin wrappers ni markdown
- El schema debe estar visible en el system prompt
- El user prompt debe incluir `{fileContent}`
- Solo usa placeholders que realmente necesita el arquetipo

**Ejemplo**:
```javascript
// network-hub.js
export const networkHubTemplate = {
  system: `Eres un analizador de código. Detecta si este archivo es un "network-hub".

Un network-hub coordina múltiples llamadas a APIs.

Responde en JSON:
{
  "isNetworkHub": boolean,
  "confidence": number (0-1),
  "endpoints": string[],
  "coordinations": string[]
}`,
  user: `Analiza este archivo:

{fileContent}

Endpoints detectados estáticamente: {networkEndpoints}
Funciones con network calls: {networkFunctionCount}

¿Es un network-hub?`
};
```

### 3. Crear JSON Schema (Opcional pero recomendado)

**Archivo**: `src/layer-b-semantic/prompt-engine/json-schemas/<type>.json`

```json
{
  "$schema": "http://json-schema.org/draft-07/schema#",
  "type": "object",
  "properties": {
    "isNetworkHub": { "type": "boolean" },
    "confidence": { "type": "number", "minimum": 0, "maximum": 1 },
    "endpoints": { "type": "array", "items": { "type": "string" } },
    "coordinations": { "type": "array", "items": { "type": "string" } }
  },
  "required": ["isNetworkHub", "confidence"]
}
```

### 4. Registrar en PROMPT_REGISTRY

**Archivo**: `src/layer-b-semantic/prompt-engine/prompt-registry.js`

```javascript
export const PROMPT_REGISTRY = {
  // ... arquetipos existentes
  
  'network-hub': {
    template: networkHubTemplate,
    schema: networkHubSchema,
    detector: (metadata) => {
      // Detector basado en metadata
      return metadata.hasNetworkCalls && 
             metadata.networkFunctionCount >= 2;
    },
    confidenceCalculator: (metadata) => {
      // Calcular confianza para bypass
      let confidence = 0;
      const evidence = [];
      
      if (metadata.networkEndpoints?.length > 2) {
        confidence += 0.4;
        evidence.push('multiple-endpoints');
      }
      
      if (metadata.networkFunctionCount >= 3) {
        confidence += 0.3;
        evidence.push('many-network-functions');
      }
      
      return { confidence: Math.min(confidence, 1.0), evidence };
    },
    requiresLLM: 'conditional', // o 'true' o 'false'
    severity: 7,
    mergeKey: 'networkHubAnalysis'
  }
};
```

### 5. Actualizar constants.js

**Archivo**: `src/layer-b-semantic/metadata-contract/constants.js`

Agregar campos opcionales si es necesario:

```javascript
export const OPTIONAL_METADATA_FIELDS = [
  // ... campos existentes
  'networkEndpoints',
  'networkFunctionCount',
  'isNetworkHub'
];
```

### 6. Cognitive Vaccine

Documentar en el PR:
- Por qué pasa el Box Test
- Qué cables revela
- Ejemplo de código que lo activa
- Falsos positivos esperados y cómo evitarlos

---

## Flujo Completo

```
Layer A (metadata extraction)
   |
   v
buildPromptMetadata() -- Enriquece con metadata calculada
   |
   v
PROMPT_REGISTRY -- Detecta arquetipos aplicables
   |
   v
Prompt Engine -- Elige template + schema
   |
   v
Confidence Calculator -- Decide: BYPASS / CONDITIONAL / FULL
   |
   v
LLM (solo si es necesario) -- 1 prompt por archivo
   |
   v
Response Validator -- Valida contra schema
   |
   v
llmInsights -- Merge por mergeKey
   |
   v
Storage -- Guarda en .omnysysdata/
```

---

## Ejemplo: Agregando "rate-limited-api"

### Caso de Uso

Detectar archivos que llaman a APIs con rate limiting, para alertar sobre posibles 429 errors.

### 1. Box Test

> "¿Detectar rate limiting revela conexiones?"

**Respuesta**: SÍ - Archivos que comparten el mismo rate limit están acoplados: si uno agota el límite, el otro falla.

### 2. Metadata Necesaria

```javascript
// En buildPromptMetadata()
{
  hasNetworkCalls: true,
  networkEndpoints: ['/api/users', '/api/orders'],
  // NUEVO: Detectar headers o lógica de rate limit
  hasRateLimiting: boolean,
  rateLimitIndicators: ['x-rate-limit', 'retry-after', '429']
}
```

### 3. Template

```javascript
// rate-limited-api.js
export const rateLimitedApiTemplate = {
  system: `Detecta si este archivo interactúa con APIs rate-limited.

Responde en JSON:
{
  "hasRateLimitedAPIs": boolean,
  "confidence": number,
  "endpoints": string[],
  "mitigation": string // recomendación
}`,
  user: `{fileContent}

Indicadores de rate limit detectados: {rateLimitIndicators}`
};
```

### 4. Registro

```javascript
'rate-limited-api': {
  template: rateLimitedApiTemplate,
  detector: (m) => m.hasNetworkCalls && m.hasRateLimiting,
  confidenceCalculator: (m) => {
    let confidence = 0;
    if (m.rateLimitIndicators?.length > 0) confidence += 0.5;
    if (m.hasRateLimiting) confidence += 0.5;
    return { confidence, evidence: ['rate-limit-detected'] };
  },
  requiresLLM: 'conditional',
  severity: 6,
  mergeKey: 'rateLimitAnalysis'
}
```

---

## Consejos

### ✅ DO
- Usar metadata ya existente cuando sea posible
- Calcular confidence basado en evidencia concreta
- Documentar el "por qué" del Box Test
- Testear con casos reales del proyecto

### ❌ DON'T
- Crear arquetipos por "sería interesante"
- Usar LLM para cosas que la metadata puede determinar
- Ignorar el confidence calculation
- Olvidar el schema validation

---

## Referencias

- [system.md](./system.md) - Catálogo completo y sistema de confianza
- [principles.md](../../01-core/principles.md) - Pilar 1 (Box Test)
- `src/layer-b-semantic/prompt-engine/` - Código del sistema
