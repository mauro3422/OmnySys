# Variable Standardization (Normalizacion Estructural)

---

## ✅ IMPLEMENTADO EN DATA FLOW V2

**Status**: ✅ **IMPLEMENTADO** en v0.7.1 (Data Flow v2)
**Origen**: Conversacion con Gemini (2026-02-08)
**Prioridad**: Media-Alta (necesario para entrenar modelos de prediccion)

---

## 📋 Implementación Real

### Transform Registry (50+ Patterns)

**Ubicación**: `src/layer-a-static/extractors/data-flow-v2/core/transform-registry.js`

Implementa el registro centralizado de patrones de transformación con tokens estandarizados.

**Ejemplo de estandarización**:

```javascript
// Función real
function validateUser(user) {
  const email = user.email;
  if (!email) throw new Error('Missing');
  return { ...user, validated: true };
}

// Formato estandarizado (via standardized-formatter.js)
{
  standardizedCode: "VALIDATE_FUNC(ENTITY_PARAM) { const VAR_1 = ENTITY_PARAM.PROP_1; if (!VAR_1) throw ERROR_1; return { ...ENTITY_PARAM, FLAG_1: true }; }",
  flowPattern: "VALIDATE_FUNC(ENTITY_PARAM) → READ_PROP → CHECK → THROW_IF_INVALID → RETURN",
  flowType: "validation-gate",
  tokens: {
    functions: ['VALIDATE_FUNC'],
    params: ['ENTITY_PARAM'],
    variables: ['VAR_1'],
    properties: ['PROP_1'],
    flags: ['FLAG_1']
  }
}
```

### Standardized Formatter

**Ubicación**: `src/layer-a-static/extractors/data-flow-v2/output/standardized-formatter.js`

Convierte código real a formato normalizado manteniendo estructura:

**Reglas de tokenización implementadas**:
- Funciones: `validateUser` → `VALIDATE_FUNC`
- Parámetros: `user`, `order` → `ENTITY_PARAM`
- Properties: `.email`, `.total` → `.PROP_N`
- Variables locales: `email`, `result` → `VAR_N`
- Flags: `validated`, `active` → `FLAG_N`

### Pattern Index Manager

**Ubicación**: `src/layer-a-static/extractors/data-flow-v2/utils/pattern-index-manager.js`

Mantiene índice de patrones estandarizados para:
- Búsqueda de funciones estructuralmente similares
- Cross-project pattern matching
- ML training data generation

```javascript
// Buscar por patrón estandarizado
const similar = patternIndex.findByPattern('validation-gate');
// → Encuentra todas las funciones con estructura de validación,
//   independiente de nombres usados
```

### Dual Data Strategy (CRÍTICO)

**Ambos formatos se preservan**:

```javascript
{
  real: {
    name: 'validateUser',
    inputs: [{ name: 'user', type: 'object' }],
    // ... nombres reales del proyecto
  },
  standardized: {
    flowPattern: 'VALIDATE_FUNC(ENTITY_PARAM) → ...',
    standardizedCode: 'VALIDATE_FUNC(ENTITY_PARAM) { ... }',
    flowType: 'validation-gate'
    // ... tokens genéricos para ML
  },
  _meta: {
    version: '2.0.0',
    confidence: 0.85
  }
}
```

**Beneficios implementados**:
- ✅ Cross-project pattern matching (mismo patrón en diferentes proyectos)
- ✅ ML training data (estructura + nombres juntos)
- ✅ Detección de anti-patterns universales
- ✅ Recomendaciones basadas en patrones similares

---

## 📚 Concepto Original (Diseño)

Normalizar nombres de variables, funciones y eventos a formas genericas (`VAR_1`, `FUNC_1`, `EVENT_1`) para que un modelo de prediccion aprenda **patrones estructurales** independientes del naming humano.

## Por Que Funciona

Un sistema de autenticacion en Node.js y uno en Python tienen la **misma forma** de grafo:

```
Entrada → Validacion → Hash → Comparacion → Sesion
```

Si normalizamos:
```
FUNC_1(VAR_1) → FUNC_2(VAR_1) → FUNC_3(VAR_2) → FUNC_4(VAR_3) → ACTION_1(VAR_4)
```

El modelo aprende la "fisica" del patron sin depender de que el programador llamo a la funcion `loginUser` o `autenticarUsuario`.

## Implementacion Sugerida

1. Tomar los metadatos atomicos existentes
2. Reemplazar nombres por tokens genericos manteniendo la estructura
3. Preservar: tipos de conexion, arquetipos, complejidad, side effects
4. Generar pares `{estructura_normalizada} → {impacto_conocido}`
5. Usar estos pares para entrenar el Semantic Pattern Engine (Idea 21)

## Beneficios

- Prediccion cross-language (mismo patron en JS y Python)
- Modelos mas chicos pueden aprender patrones complejos
- Elimina sesgo de naming conventions
- Base para el "lenguaje intermedio" de OmnySys

## Conexion con Otras Ideas

- Alimenta el [Semantic Pattern Engine](../FUTURE_IDEAS.md) (Idea 21)
- Complementa [Semantic Intent Enrichment](SEMANTIC_INTENT_ENRICHMENT.md)
- Necesario para [Data Collection Strategy](DATA_COLLECTION_STRATEGY.md)
