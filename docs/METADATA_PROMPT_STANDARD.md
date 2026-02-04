# Estándar de Prompts por Metadatos

## Arquitectura: Metadatos → Prompt Type → LLM Analysis

```
┌─────────────────┐     ┌──────────────┐     ┌─────────────┐
│   Metadatos     │────▶│  Prompt      │────▶│   LLM       │
│   Detection     │     │  Selector    │     │   Analysis  │
└─────────────────┘     └──────────────┘     └─────────────┘
```

---

## 📋 Tipos de Metadatos Soportados

| Tipo | Metadatos | Prompt | Output Schema |
|------|-----------|--------|---------------|
| `god-object` | exportCount≥5 && dependentCount≥5 OR dependentCount≥10 | `god-object.js` | riskLevel, responsibilities, impactScore |
| `semantic-connections` | hasLocalStorage\|\|hasEvents | `semantic-connections.js` | localStorageKeys, eventNames, sharedState |
| `dynamic-imports` | hasDynamicImports | `dynamic-imports.js` | dynamicImports[], routeMapAnalysis |
| `css-in-js` | hasStyledComponents\|\|hasCSS | `css-in-js.js` | cssInJS[], globalStyles[], cssVariables[] |
| `typescript` | hasTypes\|\|hasInterfaces | `typescript.js` | interfaces[], types[], classes[], generics[] |
| `orphan-module` | dependentCount==0 | `orphan-module.js` | isOrphan, potentialUsage, confidence |

---

## 🔧 Implementación de Nuevo Tipo

### Paso 1: Detectar en `metadata-extractors.js`

```javascript
export function detectGodObjectPattern(metadata) {
  const { exportCount, dependentCount } = metadata;
  return (exportCount >= 5 && dependentCount >= 5) || dependentCount >= 10;
}
```

### Paso 2: Template de Prompt

Crear `prompt-templates/<tipo>.js`:

```javascript
export default {
  systemPrompt: `<|im_start|>system
Schema (root object, NO wrappers):
{
  "confidence": 0.0-1.0,
  "campo1": "tipo",
  "campo2": [],
  "reasoning": "string"
}

Instructions:
- Extract from <target_file>
- NO wrappers
<|im_end|>`,

  userPrompt: `<|im_start|>user
FILE: {filePath}
METADATA: {valor1}, {valor2}

CODE:
{fileContent}

Extract analysis.<|im_end|>
<|im_start|>assistant`
};
```

### Paso 3: Registro en Prompt Selector

En `prompt-selector.js`:

```javascript
// 1. Importar template
import godObjectTemplate from './prompt-templates/god-object.js';
import orphanModuleTemplate from './prompt-templates/orphan-module.js';

// 2. Mapear en getTemplate()
getTemplate(analysisType) {
  const templates = {
    'god-object': godObjectTemplate,
    'orphan-module': orphanModuleTemplate,
    // ...
  };
}

// 3. Detectar en selectAnalysisType()
selectAnalysisType(metadata) {
  if (isGodObject(metadata)) return 'god-object';
  if (isOrphanModule(metadata)) return 'orphan-module';
  // ...
  return 'default';
}
```

### Paso 4: Merge en `mergers.js`

```javascript
export function mergeAnalyses(staticAnalysis, llmAnalysis) {
  // ... código existente ...
  
  // Nuevo tipo
  if (isOrphanModuleByMetadata(staticAnalysis) || llmAnalysis.isOrphan) {
    merged.llmInsights.orphanModuleAnalysis = {
      isOrphan: llmAnalysis.isOrphan !== false, // default true if metadata detected
      potentialUsage: llmAnalysis.potentialUsage || [],
      confidence: llmAnalysis.confidence || 0.5
    };
  }
  
  return merged;
}
```

---

## ✅ Verificación de Implementación

### Test Rápido

```javascript
// test-llm-prompt.js
const TEST_CASES = {
  'god-object': 'test-cases/scenario-6-god-object/src/Core.js',
  'orphan-module': 'test-cases/scenario-X-orphan/src/Unused.js',
  // ...
};
```

### Checklist

- [ ] Detector de metadatos funciona
- [ ] Prompt template ChatML format
- [ ] Cliente LLM preserva campos (`...parsed`)
- [ ] Merger crea sección en llmInsights
- [ ] Datos persisten en JSON final

---

## 📁 Estructura de Archivos

```
prompt-engine/
├── prompt-templates/
│   ├── god-object.js          ✅ Implementado
│   ├── semantic-connections.js ✅ Implementado
│   ├── dynamic-imports.js      ✅ Implementado
│   ├── css-in-js.js            ✅ Implementado
│   ├── typescript.js           ✅ Implementado
│   ├── orphan-module.js        📝 Pendiente
│   └── default.js              ✅ Implementado
├── prompt-selector.js          ✅ Actualizado
└── index.js                    ✅ Funciona

enricher/
└── mergers.js                  ✅ Actualizado

ai/
└── llm-client.js               ✅ Fix aplicado
```

---

## 🎯 Próximos Pasos

1. **Orphan Module** - Archivos sin dependencias (potential dead code)
2. **State Manager** - Redux/Vuex/Pinia detection
3. **Event Hub** - Centralized event emitters
4. **API Client** - HTTP client patterns

**Prioridad:** Orphan Module (fácil, similar a God Object)

---

**Versión:** 1.0
**Última actualización:** 2026-02-04
