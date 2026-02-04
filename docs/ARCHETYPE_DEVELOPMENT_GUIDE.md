# Guía de Desarrollo - Sistema Plug & Play de Arquetipos

Esta guía documenta cómo agregar nuevos tipos de análisis semántico al sistema de forma estandarizada y robusta.

## Arquitectura del Sistema

```
Layer A (Static Analysis)
    ↓ [exportCount, dependentCount, etc.]
Metadata Contract (metadata-contract.js)
    ↓ [Validación y estandarización]
Prompt Registry (PROMPT_REGISTRY.js)
    ↓ [Detección de arquetipo]
Prompt Selector (prompt-selector.js)
    ↓ [Selección de template]
Prompt Engine (prompt-engine/index.js)
    ↓ [Generación de prompt]
LLM Analyzer (llm-analyzer.js)
    ↓ [Respuesta JSON]
Mergers (mergers.js)
    ↓ [Merge usando registry]
Storage (.OmnySysData/)
```

## Pasos para Agregar un Nuevo Arquetipo

### Paso 1: Crear el Template de Prompt

Crear un archivo en `src/layer-b-semantic/prompt-engine/prompt-templates/{nombre-arquetipo}.js`

**Estructura requerida (ChatML v3):**

```javascript
/**
 * {Nombre} Template - ChatML v3 Format
 * 
 * Descripción breve del arquetipo.
 */

export default {
  systemPrompt: `<|im_start|>system
You are a specialized data extractor for {nombre} analysis. Return ONLY valid JSON.

Schema (root object, NO wrappers):
{
  "confidence": 0.0-1.0,
  "reasoning": "string",
  // ... campos específicos del arquetipo
}

Instructions:
- confidence: certainty of detection (0.0-1.0)
- reasoning: 1 sentence explaining what was found
- [Instrucciones específicas]
- Use exact strings found in code
- DO NOT invent data not present in code
- NO wrappers, NO extra objects, return root object directly<|im_end|>`,

  userPrompt: `<|im_start|>user
FILE: {filePath}
EXPORTS: {exportCount} ({exports})
DEPENDENTS: {dependentCount}
// ... otras variables del metadata

CODE:
{fileContent}

ANALYZE FOR {NOMBRE}:
1. [Instrucciones específicas]

Extract {nombre} analysis as JSON.<|im_end|>
<|im_start|>assistant`
};
```

**Variables disponibles en userPrompt:**
- `{filePath}` - Ruta del archivo
- `{exportCount}` - Cantidad de exports
- `{dependentCount}` - Cantidad de dependientes
- `{importCount}` - Cantidad de imports
- `{functionCount}` - Cantidad de funciones
- `{exports}` - Lista de nombres de exports
- `{fileContent}` - Contenido del archivo
- `{hasDynamicImports}`, `{hasTypeScript}`, `{hasCSSInJS}`, etc. - Flags booleanos
- `{localStorageKeys}`, `{eventNames}`, `{envVars}` - Arrays de strings

### Paso 2: Registrar el Arquetipo

Agregar una entrada en `src/layer-b-semantic/prompt-engine/PROMPT_REGISTRY.js`:

```javascript
// Importar el template
import singletonTemplate from './prompt-templates/singleton.js';

// Agregar al ARCHETYPE_REGISTRY
export const ARCHETYPE_REGISTRY = [
  // ... arquetipos existentes ...
  
  {
    type: 'singleton',           // Identificador único (snake-case)
    severity: 7,                 // Prioridad 0-10 (mayor = más prioritario)
    
    // Detector: función que recibe metadata y retorna boolean
    detector: (metadata) => {
      // Usar campos del metadata contract
      const { functionCount, exportCount } = metadata;
      
      // Lógica de detección
      return functionCount === 1 && exportCount === 1;
    },
    
    template: singletonTemplate,  // Template importado
    mergeKey: 'singletonAnalysis', // Clave en llmInsights
    
    // Campos esperados en la respuesta del LLM
    fields: [
      'instanceCount',
      'globalState', 
      'threadSafety',
      'initializationPattern'
    ]
  },
  
  // ... resto de arquetipos ...
];
```

**Campos del registro:**

| Campo | Descripción | Requerido |
|-------|-------------|-----------|
| `type` | Identificador único del arquetipo | Sí |
| `severity` | Prioridad 0-10 (mayor = más prioritario) | Sí |
| `detector` | Función `(metadata) => boolean` | Sí |
| `template` | Template de prompt importado | Sí |
| `mergeKey` | Clave donde se guarda en `llmInsights` | Sí |
| `fields` | Array de campos esperados del LLM | Sí |

### Paso 3: (Opcional) Agregar Detector de Metadatos

Si el arquetipo necesita detectar patrones específicos en el código, agregar en `src/layer-b-semantic/metadata-extractors.js`:

```javascript
/**
 * Detecta patrones Singleton
 * @param {string} code - Código fuente
 * @returns {Object} - Información de singleton
 */
export function extractSingletonPatterns(code) {
  const result = {
    hasSingletonPattern: false,
    instanceCount: 0,
    initializationPattern: null,
    all: []
  };
  
  // Detectar getInstance()
  const getInstancePattern = /getInstance\s*\(\s*\)/g;
  // Detectar static instance
  const staticInstancePattern = /static\s+instance/i;
  // Detectar private constructor
  const privateConstructorPattern = /private\s+constructor/i;
  
  if (getInstancePattern.test(code) || 
      staticInstancePattern.test(code) ||
      privateConstructorPattern.test(code)) {
    result.hasSingletonPattern = true;
    
    // Contar instancias
    const matches = code.match(getInstancePattern);
    result.instanceCount = matches ? matches.length : 0;
    
    // Detectar patrón de inicialización
    if (code.includes('new ')) {
      result.initializationPattern = 'eager';
    } else if (code.includes('lazy')) {
      result.initializationPattern = 'lazy';
    }
  }
  
  return result;
}
```

Luego actualizar `extractAllMetadata` para incluirlo:

```javascript
export function extractAllMetadata(filePath, code) {
  return {
    filePath,
    jsdoc: extractJSDocContracts(code),
    runtime: extractRuntimeContracts(code),
    async: extractAsyncPatterns(code),
    errors: extractErrorHandling(code),
    build: extractBuildTimeDependencies(code),
    cssInJS: extractCSSInJS(code),
    typescript: extractTypeScriptFeatures(code, filePath),
    singleton: extractSingletonPatterns(code),  // ← Nuevo
    timestamp: new Date().toISOString()
  };
}
```

### Paso 4: Actualizar el Contrato de Metadatos (Opcional)

Si agregaste nuevos detectores, actualizar `src/layer-b-semantic/metadata-contract.js`:

```javascript
export const OPTIONAL_METADATA_FIELDS = [
  // ... campos existentes ...
  'hasSingletonPattern',
  'singletonInstanceCount',
  'singletonInitializationPattern'
];
```

Y actualizar `buildStandardMetadata` si es necesario:

```javascript
export function buildStandardMetadata(fileAnalysis, filePath, semanticAnalysis) {
  // ... código existente ...
  
  return {
    // ... campos existentes ...
    
    // Nuevos campos para Singleton
    hasSingletonPattern: false, // Se actualiza desde metadata-extractors
    singletonInstanceCount: 0,
    singletonInitializationPattern: null
  };
}
```

## Ejemplo Completo: Singleton

### 1. Template (`singleton.js`)

```javascript
export default {
  systemPrompt: `<|im_start|>system
You are a specialized data extractor for Singleton pattern analysis. Return ONLY valid JSON.

Schema (root object, NO wrappers):
{
  "confidence": 0.0-1.0,
  "reasoning": "string",
  "instanceCount": 0,
  "globalState": ["string"],
  "threadSafety": "safe|unsafe|unknown",
  "initializationPattern": "eager|lazy|none"
}

Instructions:
- confidence: certainty of Singleton pattern detection (0.0-1.0)
- reasoning: 1 sentence explaining the assessment
- instanceCount: number of instances created (should be 0 or 1 for Singleton)
- globalState: array of global state variables managed by the singleton
- threadSafety: "safe" if thread-safe implementation, "unsafe" otherwise
- initializationPattern: how the instance is created (eager, lazy, or none)
- NO wrappers, NO extra objects, return root object directly<|im_end|>`,

  userPrompt: `<|im_start|>user
FILE: {filePath}
EXPORTS: {exportCount} ({exports})
FUNCTIONS: {functionCount}
HAS_SINGLETON_PATTERN: {hasSingletonPattern}

CODE:
{fileContent}

ANALYZE FOR SINGLETON PATTERN:
1. Verify getInstance() method exists
2. Check for static instance property
3. Identify global state managed
4. Assess thread safety
5. Determine initialization pattern

Extract Singleton analysis as JSON.<|im_end|>
<|im_start|>assistant`
};
```

### 2. Registro en PROMPT_REGISTRY.js

```javascript
import singletonTemplate from './prompt-templates/singleton.js';

export const ARCHETYPE_REGISTRY = [
  // ... otros arquetipos ...
  
  {
    type: 'singleton',
    severity: 7,
    detector: (metadata) => {
      // Detectar si tiene patrón de singleton
      return metadata.hasSingletonPattern === true ||
             (metadata.functionCount === 1 && 
              metadata.exportCount === 1 &&
              metadata.dependentCount > 5);
    },
    template: singletonTemplate,
    mergeKey: 'singletonAnalysis',
    fields: ['instanceCount', 'globalState', 'threadSafety', 'initializationPattern']
  }
];
```

### 3. Detector de Metadatos

```javascript
// En metadata-extractors.js
export function extractSingletonPatterns(code) {
  const result = {
    hasSingletonPattern: false,
    instanceCount: 0,
    initializationPattern: null
  };
  
  const patterns = [
    /getInstance\s*\(\s*\)/,
    /static\s+(?:get\s+)?instance/i,
    /private\s+constructor/i,
    /constructor\s*\(\s*\)\s*\{[^}]*if\s*\(\s*!\w+\s*\)/
  ];
  
  result.hasSingletonPattern = patterns.some(p => p.test(code));
  
  if (result.hasSingletonPattern) {
    const matches = code.match(/getInstance\s*\(\s*\)/g);
    result.instanceCount = matches ? matches.length : 0;
    
    if (code.includes('new ') && !code.includes('if')) {
      result.initializationPattern = 'eager';
    } else if (code.includes('if') || code.includes('??')) {
      result.initializationPattern = 'lazy';
    }
  }
  
  return result;
}
```

## Validación

Para verificar que el nuevo arquetipo funciona:

1. **Test de detección:**
```javascript
const metadata = {
  exportCount: 1,
  functionCount: 1,
  dependentCount: 8,
  hasSingletonPattern: true
};

const archetype = ARCHETYPE_REGISTRY.find(a => a.type === 'singleton');
console.log(archetype.detector(metadata)); // Debe retornar true
```

2. **Test de prompt:**
```javascript
const template = archetype.template;
console.log(template.systemPrompt); // Debe tener formato ChatML v3
```

3. **Test de merge:**
```javascript
const mergeConfig = getMergeConfig('singleton');
console.log(mergeConfig.mergeKey); // 'singletonAnalysis'
console.log(mergeConfig.fields); // ['instanceCount', ...]
```

## Convenciones

### Nombres
- **type:** `kebab-case` (ej: `god-object`, `dynamic-importer`)
- **mergeKey:** `camelCase` + `Analysis` (ej: `godObjectAnalysis`)
- **Template file:** `kebab-case.js` (ej: `god-object.js`)

### Severidad
- **10:** God Object (crítico arquitectónico)
- **8-9:** Orphan modules, high coupling
- **6-7:** Event hubs, state managers, singletons
- **4-5:** Dynamic imports, complex patterns
- **2-3:** TypeScript, CSS-in-JS
- **0:** Default (fallback)

### Campos de Respuesta
Siempre incluir:
- `confidence` (number 0.0-1.0)
- `reasoning` (string)

Campos específicos según el tipo de análisis.

## Troubleshooting

### El arquetipo no se detecta
- Verificar que el `detector` retorne `true` para los metadatos esperados
- Revisar que `severity` sea mayor que otros arquetipos si debe tener prioridad

### El merge no funciona
- Verificar que `mergeKey` coincida con la clave usada en el código
- Confirmar que `fields` incluya todos los campos de la respuesta LLM

### El prompt no se genera correctamente
- Verificar que el template tenga formato ChatML v3
- Revisar que las variables en `userPrompt` estén entre `{}`
- Confirmar que el template esté importado correctamente en PROMPT_REGISTRY.js

## Referencias

- [ChatML Format Specification](https://github.com/openai/openai-python/blob/main/chatml.md)
- [Metadata Contract](./metadata-contract.js)
- [PROMPT_REGISTRY.js](./prompt-engine/PROMPT_REGISTRY.js)
