# IA Test Cases - Guía de Uso

## Test Cases Creados

### 1. `scenario-ia-dynamic-imports`
**Patrón**: Dynamic imports con variables
- Router.js usa `import(`./modules/${moduleName}.js`)`
- Los valores posibles están en un mapa estático
- **IA debe inferir**: moduleName ∈ {'UserModule', 'AdminModule', 'DashboardModule'}

### 2. `scenario-ia-orphan-effects`
**Patrón**: Archivo huérfano con side effects
- LegacyAnalytics.js no es importado por nadie
- Tiene localStorage y global mutations
- **IA debe verificar**: ¿Código muerto o conexión oculta?

### 3. `scenario-ia-ambiguous-events`
**Patrón**: Eventos con nombres similares
- 'user:updated' vs 'user:change' vs 'admin:user:updated'
- **IA debe determinar**: ¿Son eventos relacionados o diferentes?

## Cómo Ejecutar

### Opción 1: Script de test (recomendado)

```bash
# Test específico
node test-ia-cases.js scenario-ia-dynamic-imports

# Test todos
node test-ia-cases.js
```

### Opción 2: MCP Server con IA habilitada

Primero, asegúrate de que la IA esté habilitada en la config:

```javascript
// src/ai/llm-client.js - línea 283
llm: { enabled: true }  // Cambiar de false a true
```

Luego ejecuta:

```bash
node src/layer-c-memory/mcp/index.js ./test-cases/scenario-ia-dynamic-imports
```

### Opción 3: Directo con indexProject

```javascript
import { indexProject } from './src/layer-a-static/indexer.js';

await indexProject('./test-cases/scenario-ia-dynamic-imports', {
  verbose: true,
  skipLLM: false  // ← Activa IA
});
```

## Qué Esperar

### Si IA se activa correctamente:
```
🤖 LLM enrichment phase...
📊 Analyzing 2 complex files with LLM...
✓ Enhanced 2/2 files with LLM insights
```

### Si IA no se activa:
```
✓ No files need LLM analysis (static analysis sufficient)
```

Esto significa que el análisis estático fue suficiente (los casos son muy simples).

## Debugging

Para ver por qué la IA no se activa:

```javascript
// En src/layer-b-semantic/llm-analyzer.js
// Agregar console.log en needsLLMAnalysis():
console.log({
  file: filePath,
  isOrphan,
  hasSharedState,
  hasEvents,
  hasDynamicCode,
  hasSuspiciousSideEffects,
  shouldAnalyze: isOrphan || hasSharedState || hasEvents || ...
});
```

## Cobertura de Casos IA

| Criterio | scenario-ia-dynamic-imports | scenario-ia-orphan-effects | scenario-ia-ambiguous-events |
|----------|----------------------------|---------------------------|------------------------------|
| isOrphan | ❌ | ✅ | ❌ |
| hasSharedState | ❌ | ✅ (global) | ❌ |
| hasEvents | ❌ | ❌ | ✅ |
| hasDynamicCode | ✅ | ❌ | ⚠️ (template literal) |
| hasSuspiciousSideEffects | ❌ | ✅ | ❌ |

**Nota**: Para activar la IA, al menos UN criterio debe ser true.
