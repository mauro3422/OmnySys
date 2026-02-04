# Sistema de Arquetipos Plug & Play

## 🎯 Concepto

Sistema modular donde agregar un nuevo tipo de análisis requiere **mínimos cambios**.

```
Metadatos → Prompt Selector → LLM → Merger (automático)
```

---

## 📁 Archivos del Sistema

| Archivo | Propósito |
|---------|-----------|
| `PROMPT_REGISTRY.js` | **Único lugar de registro** - Define detectores, templates, merge keys |
| `prompt-selector.js` | Usa el registry para seleccionar prompts |
| `mergers.js` | Merge genérico basado en registry |
| `prompt-templates/*.js` | Templates ChatML v3 |

---

## 🔧 Agregar Nuevo Tipo (3 Pasos)

### Paso 1: Crear Template

Crear `prompt-templates/mi-tipo.js`:

```javascript
export default {
  systemPrompt: `<|im_start|>system
Schema (root object, NO wrappers):
{
  "confidence": 0.0-1.0,
  "miCampo": "string",
  "miArray": [],
  "reasoning": "string"
}

Instructions:
- Extract from code
- NO wrappers
<|im_end|>`,

  userPrompt: `<|im_start|>user
FILE: {filePath}
METADATA: {valor1}

CODE:
{fileContent}

Extract analysis.<|im_end|>
<|im_start|>assistant`
};
```

### Paso 2: Registrar en PROMPT_REGISTRY.js

```javascript
import miTipoTemplate from './prompt-templates/mi-tipo.js';

export const ARCHETYPE_REGISTRY = [
  // ... existentes ...
  
  {
    type: 'mi-tipo',
    severity: 5, // 0-10
    detector: (metadata) => {
      // Retorna true si los metadatos indican este tipo
      return metadata.hasMiTipo === true;
    },
    template: miTipoTemplate,
    mergeKey: 'miTipoAnalysis', // Clave en llmInsights
    fields: ['miCampo', 'miArray'] // Campos a extraer del LLM
  }
];
```

### Paso 3: Agregar detector de metadatos

En `metadata-extractors.js`:

```javascript
export function extractMiTipoMetadata(code, ast) {
  // Detectar si el archivo tiene este patrón
  const hasMiTipo = code.includes('patron-especifico');
  
  return {
    hasMiTipo,
    // otros metadatos...
  };
}
```

**¡Listo!** El sistema automáticamente:
- Detectará el tipo por metadatos
- Usará el prompt correcto
- Mergeará el resultado en `llmInsights.miTipoAnalysis`

---

## 📊 Arquetipos Actuales

| Tipo | Severidad | Detector | Merge Key |
|------|-----------|----------|-----------|
| `god-object` | 10 | exportCount≥5 && dependentCount≥5 OR dependentCount≥10 | `godObjectAnalysis` |
| `orphan-module` | 8 | dependentCount === 0 | `orphanAnalysis` |
| `dynamic-importer` | 7 | hasDynamicImports | `dynamicImportAnalysis` |
| `event-hub` | 6 | hasEvents | `eventHubAnalysis` |
| `state-manager` | 6 | hasLocalStorage OR hasSharedState | `stateManagerAnalysis` |
| `styled-component` | 3 | hasCSSInJS | `cssInJSAnalysis` |
| `type-definer` | 2 | hasTypeScript | `typescriptAnalysis` |
| `default` | 0 | fallback | `generalAnalysis` |

---

## 🧪 Testing

```javascript
// test-llm-prompt.js
const TEST_CASES = {
  'god-object': 'test-cases/scenario-6-god-object/src/Core.js',
  'mi-tipo': 'test-cases/scenario-X-mi-tipo/src/Ejemplo.js'
};
```

---

## ⚠️ Reglas Importantes

1. **Cliente LLM**: Siempre usar `return { ...parsed, ... }` para no perder campos
2. **ChatML v3**: Todos los templates deben usar formato ChatML
3. **NO Wrappers**: Schema debe especificar "root object, NO wrappers"
4. **Severity**: Mayor número = mayor prioridad arquitectónica

---

## 🔍 Debugging

Si un tipo no funciona:

```bash
# 1. Verificar que el detector funciona
node -e "const { detectArchetypes } = require('./PROMPT_REGISTRY.js'); console.log(detectArchetypes({ exportCount: 3, dependentCount: 10 }));"

# 2. Verificar que el template existe
cat prompt-templates/tu-tipo.js

# 3. Verificar que el merge funciona
cat .OmnySysData/files/src/TuArchivo.js.json | jq .llmInsights
```

---

**Versión:** 1.0 (Sistema Plug & Play)
**Última actualización:** 2026-02-04
