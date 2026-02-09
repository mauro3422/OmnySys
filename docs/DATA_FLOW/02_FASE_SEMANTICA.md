# FASE 2: Análisis Semántico

**Estado**: Pre-implementación  
**Dependencias**: Fase 1 (necesita átomos extraídos)  
**Tiempo estimado**: 0.5-1 día

---

## 🎯 Objetivo

Extraer significado del nombre de cada función para entender:
- **Qué hace** (verbo)
- **A qué dominio pertenece** (dominio)
- **Sobre qué actúa** (entidad)
- **Qué tipo de operación es** (clasificación)

---

## 📊 Ejemplo Real

### Input

```javascript
"validateUserPayment"
```

### Output

```javascript
{
  verb: "validate",          // acción (qué hace)
  domain: "user",            // dominio (a qué pertenece)
  entity: "payment",         // entidad (sobre qué actúa)
  operationType: "validation" // clasificación
}
```

---

## 🔧 Implementación

### Paso 1: Taxonomía de Verbos

```javascript
// src/shared/verb-taxonomy.js

export const VERB_MAP = {
  // Read operations
  get: 'read', fetch: 'read', load: 'read', find: 'read', query: 'read',
  
  // Write operations
  create: 'write', add: 'write', save: 'write', store: 'write', insert: 'write',
  
  // Update operations
  update: 'update', set: 'update', modify: 'update', patch: 'update',
  
  // Delete operations
  delete: 'delete', remove: 'delete', clear: 'delete', destroy: 'delete',
  
  // Validation operations
  validate: 'validation', check: 'validation', verify: 'validation', ensure: 'validation',
  
  // Transformation operations
  transform: 'transformation', convert: 'transformation', map: 'transformation',
  parse: 'transformation', format: 'transformation', normalize: 'transformation',
  
  // Communication operations
  send: 'communication', emit: 'communication', notify: 'communication',
  publish: 'communication', dispatch: 'communication',
  
  // Processing operations
  process: 'processing', handle: 'processing', execute: 'processing', run: 'processing',
  
  // Initialization operations
  init: 'initialization', setup: 'initialization', configure: 'initialization',
  
  // Calculation operations
  calculate: 'calculation', compute: 'calculation', derive: 'calculation',
  count: 'calculation', sum: 'calculation',
  
  // Extraction operations
  extract: 'extraction', parse: 'extraction', detect: 'extraction'
};
```

### Paso 2: Parser de Nombres

```javascript
// src/layer-a-static/extractors/metadata/semantic-name.js

export function extractSemanticName(functionName) {
  // Ejemplo: "validateUserPayment" -> ["validate", "user", "payment"]
  const parts = splitCamelCase(functionName);
  
  if (parts.length === 0) {
    return { confidence: 0, reason: "empty_name" };
  }
  
  // 1. Extraer verbo (primera parte)
  const verb = parts[0];
  const operationType = VERB_MAP[verb.toLowerCase()] || 'unknown';
  
  // 2. Extraer dominio (segunda parte, si existe)
  const domain = parts.length > 1 ? parts[1] : null;
  
  // 3. Extraer entidad (última parte)
  const entity = parts.length > 2 ? parts[parts.length - 1] : domain;
  
  // 4. Calcular confidence
  const confidence = calculateConfidence(parts, operationType);
  
  return {
    verb,
    domain,
    entity,
    operationType,
    confidence,
    rawParts: parts
  };
}

function splitCamelCase(str) {
  // "validateUserPayment" -> ["validate", "user", "payment"]
  return str
    .replace(/([a-z])([A-Z])/g, '$1 $2')
    .split(/\s+/)
    .map(s => s.toLowerCase());
}

function calculateConfidence(parts, operationType) {
  let confidence = 1.0;
  
  // Penalizar si no conocemos el verbo
  if (operationType === 'unknown') {
    confidence -= 0.3;
  }
  
  // Penalizar nombres muy cortos o muy largos
  if (parts.length < 2) confidence -= 0.2;
  if (parts.length > 5) confidence -= 0.1;
  
  return Math.max(0, confidence);
}
```

---

## 📊 Casos de Uso

| Nombre de Función | Verb | Domain | Entity | OperationType | Confidence |
|-------------------|------|--------|--------|---------------|------------|
| `getUser` | get | user | user | read | 1.0 |
| `validateUserPayment` | validate | user | payment | validation | 0.9 |
| `calculateTotal` | calculate | - | total | calculation | 0.9 |
| `processOrder` | process | - | order | processing | 0.8 |
| `abc123` | abc | - | - | unknown | 0.2 |

---

## 🎁 Beneficios

1. **Pattern Detection**: Podemos agrupar funciones por tipo de operación
2. **Business Flow Detection**: "validation → processing → persistence"
3. **Cross-Project Matching**: Dos proyectos diferentes, mismos patrones semánticos
4. **LLM Bypass**: Si confidence = 1.0, no necesitamos preguntarle a un LLM

---

## ✅ Checklist de Implementación

- [ ] Crear archivo `verb-taxonomy.js` con todos los verbos mapeados
- [ ] Implementar `extractSemanticName()` con parsing de camelCase
- [ ] Manejar casos edge:
  - [ ] snake_case: `get_user`
  - [ ] Prefijos: `handleClick`, `onSubmit`
  - [ ] Sufijos: `Async`, `Sync`
- [ ] Agregar campo `semantic` a cada átomo en `molecular-extractor.js`
- [ ] Tests con funciones reales

---

## 📚 Referencias

- [Documento Original - Sección 2.4](../architecture/DATA_FLOW_FRACTAL_DESIGN.md#24-extraccion-semantica-del-nombre)

---

**Siguiente**: [→ Fase 3: Estandarización](./03_FASE_ESTANDARIZACION.md)
