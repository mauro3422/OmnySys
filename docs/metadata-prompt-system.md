# Metadata-Prompt System Architecture

## Overview

El sistema de **Metadata-Driven Prompting** permite seleccionar automáticamente el prompt de IA más apropiado basado en las características detectadas del código.

```
┌─────────────────┐     ┌──────────────────┐     ┌─────────────────┐
│   Code File     │────▶│ Metadata         │────▶│ Prompt Selector │
│                 │     │ Extraction       │     │                 │
└─────────────────┘     └──────────────────┘     └────────┬────────┘
                                                         │
                              ┌─────────────────────────┼─────────────────────────┐
                              │                         │                         │
                              ▼                         ▼                         ▼
                    ┌─────────────────┐      ┌─────────────────┐      ┌─────────────────┐
                    │  Dynamic Import │      │  God Object     │      │  Semantic Conn  │
                    │  Prompt         │      │  Prompt         │      │  Prompt         │
                    └─────────────────┘      └─────────────────┘      └─────────────────┘
```

## Metadata Sources

### 1. Static Analysis (Layer A)

Metadatos extraídos del grafo de dependencias:

```javascript
{
  // Estructura de archivos
  exports: ['function1', 'function2'],     // Qué exporta
  imports: [{source: './file', specifiers: ['x']}],  // Qué importa
  usedBy: ['Module1.js', 'Module2.js'],    // Quién lo usa
  
  // Métricas de coupling
  exportCount: 3,                          // Número de exports
  dependentCount: 10,                      // Cuántos archivos dependen
  inDegree: 10,                            // Conexiones entrantes
  outDegree: 2,                            // Conexiones salientes
  
  // Análisis semántico estático
  semanticAnalysis: {
    sharedState: {reads: [], writes: []},
    eventPatterns: {emitters: [], listeners: []},
    sideEffects: {...}
  }
}
```

### 2. Code Pattern Extractors (metadata-extractors.js)

Metadatos extraídos parseando el código:

```javascript
{
  jsdoc: {
    functions: [{name, params, returns, description}],
    types: [...],
    all: [...]
  },
  
  async: {
    asyncFunctions: [{name, line}],
    awaitExpressions: [{expression, line}],
    promiseChains: [...],
    raceConditions: [...],
    all: [...]
  },
  
  errors: {
    tryBlocks: [...],
    throwStatements: [...],
    customErrors: [...],
    all: [...]
  },
  
  runtime: {
    assertions: [...],
    validations: [...],
    nullChecks: [...],
    all: [...]
  },
  
  build: {
    envVars: [...],
    devFlags: [...],
    featureFlags: [...],
    all: [...]
  }
}
```

## Prompt Selection Rules

### Priority Order

1. **Dynamic Imports** (`hasDynamicImports`)
   - Trigger: `await import()` or `import()` expressions
   - Prompt: `dynamic-imports.js`
   - Why: Conexiones ocultas que estática no resuelve

2. **God Object** (`hasGodObjectPattern`)
   - Trigger: `exportCount > 5 && dependentCount > 5`
   - Prompt: `god-object.js`
   - Why: Detecta acoplamiento excesivo y riesgo arquitectónico

3. **Semantic Connections** (`hasSemanticConnections`)
   - Trigger: `localStorageKeys.length > 0 || eventNames.length > 0`
   - Prompt: `semantic-connections.js`
   - Why: Estado compartido entre archivos

4. **CSS-in-JS** (`hasCSSInJS`)
   - Trigger: `styled-components`, `emotion` patterns
   - Prompt: `css-in-js.js`

5. **TypeScript** (`hasTypeScript`)
   - Trigger: Interfaces, types, generics
   - Prompt: `typescript.js`

6. **Default**
   - Fallback para archivos sin patrones específicos
   - Prompt: `default.js`

### God Object Detection Criteria

```javascript
function hasGodObjectPattern(metadata) {
  const { exportCount, dependentCount, responsibilities } = metadata;
  
  // Criterios cuantitativos
  const manyExports = exportCount >= 5;
  const manyDependents = dependentCount >= 5;
  
  // Criterio de responsabilidades (mix de funciones no relacionadas)
  const mixedResponsibilities = responsibilities && responsibilities.length > 2;
  
  // Score de riesgo
  const riskScore = (
    (manyExports ? 0.4 : 0) +
    (manyDependents ? 0.4 : 0) +
    (mixedResponsibilities ? 0.2 : 0)
  );
  
  return riskScore >= 0.7;
}
```

## Creating New Prompt Templates

### 1. Create Template File

```javascript
// prompt-templates/my-pattern.js
export default {
  systemPrompt: `You are a code analyzer specializing in PATTERN_NAME.

ANALYZE FOR:
1. Specific pattern indicators
2. Risk assessment
3. Connection detection

RETURN JSON:
{
  "pattern": "detected_pattern",
  "confidence": 0.0-1.0,
  "risks": [...],
  "connections": [...],
  "reasoning": "explanation"
}`,

  userPrompt: `File: {filePath}

METRICS:
- Exports: {exportCount}
- Dependents: {dependentCount}

CODE:
{fileContent}

Analyze and return JSON.`
};
```

### 2. Create JSON Schema

```json
{
  "$schema": "http://json-schema.org/draft-07/schema#",
  "type": "object",
  "properties": {
    "pattern": { "type": "string" },
    "confidence": { "type": "number", "minimum": 0, "maximum": 1 },
    "risks": { "type": "array", "items": { "type": "string" } },
    "connections": { "type": "array" }
  },
  "required": ["pattern", "confidence"]
}
```

### 3. Register in Prompt Selector

```javascript
import myPatternTemplate from './prompt-templates/my-pattern.js';

// Add to selectAnalysisType()
if (this.hasMyPattern(metadata)) {
  return 'my-pattern';
}

// Add to getTemplate()
const templates = {
  'my-pattern': myPatternTemplate,
  // ... others
};
```

## Data Flow

```
indexer.js
    │
    ├──▶ graph-builder.js (crea systemMap con exports, usedBy)
    │
    ├──▶ generateEnhancedSystemMap()
    │       │
    │       ├──▶ metadata-extractors.js (JSDoc, async, errors, etc.)
    │       │       └─▶ fileMetadata[filePath] = {jsdoc, async, errors, ...}
    │       │
    │       └──▶ enrichSemanticAnalysis()
    │               │
    │               ├──▶ filesToAnalyze.push({
    │               │       metadata: fileMetadata[filePath]
    │               │    })
    │               │
    │               └──▶ llmAnalyzer.analyzeMultiple(files)
    │                       │
    │                       └──▶ buildPrompt(code, filePath, staticAnalysis, projectContext, metadata)
    │                               │
    │                               └──▶ promptEngine.generatePrompt(metadata, code)
    │                                       │
    │                                       ├──▶ selectAnalysisType(metadata)
    │                                       │       └─▶ 'god-object' | 'dynamic-imports' | ...
    │                                       │
    │                                       └──▶ getTemplate(analysisType)
    │                                               └─▶ god-object.js template
    │
    └──▶ savePartitionedSystemMap() (guarda resultados con llmInsights)
```

## Best Practices

### 1. Metadata-Driven Detection

Siempre usar metadatos para selección, no contenido del código:

```javascript
// ✅ BIEN: Usar metadatos
if (metadata.exportCount > 5 && metadata.dependentCount > 5) {
  return 'god-object';
}

// ❌ MAL: Parsear código
if (code.includes('export function') && code.split('export').length > 5) {
  return 'god-object';
}
```

### 2. Confidence Scoring

El LLM debe retornar confianza basada en evidencia:

```javascript
{
  "confidence": 0.85,
  "reasoning": "Detected 3 unrelated responsibilities: logging, config, and data access. 10 files depend on this module."
}
```

### 3. Separation of Concerns

- **Layer A (Static)**: Detecta conexiones explícitas (imports, exports)
- **Layer B (LLM)**: Detecta patrones arquitectónicos y riesgos
- **Prompt Engine**: Selección inteligente basada en metadatos

### 4. Extensibility

Para agregar nuevo patrón:
1. Agregar extractor de metadatos si es necesario
2. Crear template de prompt
3. Crear JSON schema
4. Agregar regla de selección
5. Documentar criterios de detección

## Current Gaps & TODOs

### Metadatos Extraídos pero NO Usados
- `jsdoc` - No hay prompt que use contratos JSDoc
- `runtime` - No hay prompt que use aserciones
- `errors` - No hay prompt que use manejo de errores
- `build` - No hay prompt que use feature flags

### Metadatos USADOS pero NO Extraídos
- `localStorageKeys` - Viene de semanticAnalysis, no de metadata-extractors
- `eventNames` - Viene de semanticAnalysis, no de metadata-extractors
- `cssInJS` - No existe extractor
- `typescript` - No existe extractor

### Action Items
1. Unificar fuentes de metadata (todo en extractAllMetadata)
2. Crear extractores faltantes (cssInJS, typescript)
3. Crear prompts que usen metadata no utilizado
4. Documentar cada metadata con ejemplos
