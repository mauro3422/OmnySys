# FASE 3: Estandarización

---

## ✅ IMPLEMENTADO EN DATA FLOW V2

**Estado**: ✅ **IMPLEMENTADO** en v0.7.1 (Data Flow v2)
**Ubicación**: `src/layer-a-static/extractors/data-flow-v2/`
**Dependencias**: Fases 1 y 2 (necesita data flow + nombres semánticos)

---

## 📋 Implementación Real

### Transform Registry - 50+ Patrones Registrados

**Ubicación**: `src/layer-a-static/extractors/data-flow-v2/core/transform-registry.js`

Este archivo implementa el registro centralizado de patrones de transformación mencionados en el diseño original.

**Categorías implementadas**:

1. **Side Effects** (10 patrones)
   - Network calls: `fetch`, `axios.get`, `XMLHttpRequest`
   - DOM manipulation: `document.querySelector`, `element.innerHTML`
   - Storage: `localStorage.set`, `sessionStorage.get`
   - Console: `console.log`, `console.error`

2. **Functional Transforms** (15 patrones)
   - Array methods: `map`, `filter`, `reduce`, `slice`, `concat`
   - String methods: `split`, `join`, `replace`, `trim`
   - Object methods: `Object.keys`, `Object.assign`

3. **Operators** (25+ patrones)
   - Arithmetic: `+`, `-`, `*`, `/`, `%`
   - Logical: `&&`, `||`, `!`
   - Comparison: `===`, `!==`, `<`, `>`, `<=`, `>=`
   - Bitwise: `&`, `|`, `^`, `<<`, `>>`

### Standardized Formatter

**Ubicación**: `src/layer-a-static/extractors/data-flow-v2/output/standardized-formatter.js`

Convierte código real a formato estandarizado usando tokens genéricos:

```javascript
// Input: Código real
function validateUser(user) {
  if (!user.email) throw new Error('Missing email');
  return { ...user, validated: true };
}

// Output: Formato estandarizado
{
  flowPattern: "VALIDATE_FUNC(ENTITY_PARAM) → CHECK → THROW_IF_INVALID → RETURN",
  standardizedCode: "VALIDATE_FUNC(ENTITY_PARAM) { if (!ENTITY_PARAM.PROP_1) throw ERROR_1; return { ...ENTITY_PARAM, FLAG_1: true }; }",
  flowType: "validation-gate",
  semanticFingerprint: "verb:validate domain:user entity:validation"
}
```

### Pattern Index Manager

**Ubicación**: `src/layer-a-static/extractors/data-flow-v2/utils/pattern-index-manager.js`

Mantiene un índice de patrones para búsqueda rápida de funciones similares:

```javascript
// Buscar funciones con mismo patrón
const similar = patternIndex.findByPattern('validation-gate');
// → [{ file: 'auth.js', function: 'validateUser', similarity: 0.95 }, ...]
```

### Ejemplo de Uso Real

```javascript
import { extractDataFlow } from './data-flow-v2/core/index.js';

const result = await extractDataFlow(ast, code, 'validateUser', 'auth.js');

// Resultado contiene AMBOS: real + standardized
console.log(result.real.inputs);
// → [{ name: 'user', type: 'object', source: 'param' }]

console.log(result.standardized.flowPattern);
// → "VALIDATE_FUNC(ENTITY_PARAM) → CHECK → THROW_IF_INVALID → RETURN"

console.log(result.standardized.flowType);
// → "validation-gate"
```

---

## 📚 Diseño Original (Referencia)

El contenido a continuación es el **diseño original** de Fase 3. Ver sección "Implementación Real" arriba para ver cómo se implementó en Data Flow v2.

---

## 🎯 Objetivo

Crear una **versión estandarizada** de cada función que oculte los nombres específicos de negocio, revelando solo la **estructura universal**.

**Para qué sirve**: Detectar que dos funciones de proyectos diferentes tienen el **mismo patrón estructural**.

---

## 📊 Ejemplo Real

### Proyecto A (E-commerce)

```javascript
function validateUser(user) {
  if (!user.email) throw new Error('Missing email');
  return { ...user, validated: true };
}
```

### Proyecto B (Reservas)

```javascript
function validateOrder(order) {
  if (!order.total) throw new Error('Missing total');
  return { ...order, validated: true };
}
```

### Estandarizado (Ambos son IGUALES)

```javascript
VALIDATE_FUNC(ENTITY_PARAM) {
  if (!ENTITY_PARAM.PROP_1) throw new Error(STRING_1);
  return { ...ENTITY_PARAM, FLAG_1: true };
}

// Patrón detectado: "validation-with-merge"
// Tipo: VALIDATION → THROW_IF_MISSING → MERGE_FLAG
```

---

## 🔧 Reglas de Tokenización

### Tabla de Conversión

| Tipo Original | Patrón | Token Estándar |
|---------------|--------|----------------|
| Función | `validateUser` | `VALIDATE_FUNC` (verbo se conserva) |
| Parámetro entidad | `user`, `order`, `payment` | `ENTITY_PARAM` |
| Property access | `.role`, `.total`, `.email` | `.PROP_N` |
| Función auxiliar | `checkPermissions`, `hashPassword` | `CHECK_FUNC`, `HASH_FUNC` |
| Literal string | `'No access'`, `'Missing email'` | `STRING_N` |
| Literal número | `42`, `100` | `NUMBER_N` |
| Flag booleano | `validated`, `active` | `FLAG_N` |
| Variable local | `total`, `discount` | `VAR_N` |

### Ejemplo Completo de Conversión

**Original**:
```javascript
function processOrder(order, userId) {
  const total = calculateTotal(order.items);
  const user = getUser(userId);
  const discount = user.discount || 0;
  const finalTotal = total - (total * discount);
  await saveOrder({ ...order, total: finalTotal, userId });
  return { orderId: order.id, total: finalTotal };
}
```

**Estandarizado**:
```javascript
PROCESS_FUNC(ENTITY_PARAM, ID_PARAM) {
  const VAR_1 = CALC_FUNC(ENTITY_PARAM.PROP_1);
  const VAR_2 = READ_FUNC(ID_PARAM);
  const VAR_3 = VAR_2.PROP_2 || NUMBER_1;
  const VAR_4 = VAR_1 - (VAR_1 * VAR_3);
  await PERSIST_FUNC({ ...ENTITY_PARAM, PROP_3: VAR_4, ID_PROP: ID_PARAM });
  return { ID_PROP: ENTITY_PARAM.ID, PROP_3: VAR_4 };
}

// Patrón: CALC → READ → TRANSFORM → PERSIST → RETURN
// FlowType: read-transform-persist
```

---

## 🔧 Implementación

### Paso 1: Motor de Estandarización

```javascript
// src/layer-b-semantic/standardizer/index.js

export function standardizeAtom(atom) {
  const { name, params, dataFlow, semantic } = atom;
  
  // 1. Tokenizar nombre de función
  const stdName = tokenizeFunctionName(semantic);
  
  // 2. Tokenizar parámetros
  const paramMap = {}; // original -> token
  const stdParams = params.map((p, i) => {
    const token = i === 0 ? 'ENTITY_PARAM' : `PARAM_${i}`;
    paramMap[p] = token;
    return token;
  });
  
  // 3. Tokenizar transformations
  const stdTransformations = dataFlow.transformations.map((t, i) => ({
    from: tokenizeVariable(t.from, paramMap),
    to: `VAR_${i + 1}`,
    via: tokenizeFunctionName({ verb: extractVerb(t.via) }),
    operation: t.operation
  }));
  
  // 4. Generar patrón de texto
  const pattern = generatePattern(stdName, stdParams, stdTransformations, dataFlow);
  
  return {
    pattern,                    // Versión textual estandarizada
    tokens: stdParams,         // Tokens usados
    flowType: detectFlowType(dataFlow),  // Tipo de flujo
    operations: dataFlow.transformations.map(t => t.operation)
  };
}

function tokenizeFunctionName(semantic) {
  const verb = semantic.verb.toUpperCase();
  return `${verb}_FUNC`;
}

function tokenizeVariable(varName, paramMap) {
  // Si es un parámetro conocido, usar su token
  if (paramMap[varName]) return paramMap[varName];
  
  // Si es property access (ej: order.items)
  if (varName.includes('.')) {
    const [obj, prop] = varName.split('.');
    const objToken = paramMap[obj] || 'ENTITY_PARAM';
    return `${objToken}.PROP_N`;
  }
  
  return 'VAR_N';
}

function detectFlowType(dataFlow) {
  const ops = dataFlow.transformations.map(t => t.operation);
  
  if (ops.includes('read') && ops.includes('persistence')) {
    return 'read-transform-persist';
  }
  if (ops.includes('validation')) {
    return 'validation-gate';
  }
  if (ops.every(o => o === 'read')) {
    return 'read-only';
  }
  return 'mixed';
}
```

---

## 🎁 Beneficios

1. **Cross-Project Pattern Matching**: Dos proyectos diferentes, mismos patrones
2. **Training de IA**: Entrenar modelos con ESTRUCTURA + NOMBRES (ambos juntos)
3. **Detección de Anti-Patterns Universales**: "validation-without-error-handling"
4. **Recomendaciones**: "Esta función tiene el mismo patrón que X en el codebase"

## ⚠️ Principio Crítico: Datos Complementarios

**NUNCA** reemplazar los nombres reales. Los datos son **COMPLEMENTARIOS**:

```javascript
// ✅ CORRECTO: Mantener AMBOS
{
  // Datos del proyecto (para contexto local)
  name: "validateUser",
  file: "src/auth.js",
  params: ["user"],
  
  // Patrón estandarizado (para ML/entrenamiento)
  standardized: {
    pattern: "VALIDATE_FUNC(ENTITY_PARAM)",
    hash: "a3f7d29c...",
    flowType: "validation-gate"
  }
}

// ❌ INCORRECTO: Perder nombres reales
{
  name: "VALIDATE_FUNC",  // ERROR: Perdimos contexto del proyecto!
  file: "src/auth.js",
  params: ["ENTITY_PARAM"]
}
```

### ¿Por qué juntos?

Un modelo entrenado con **AMBOS** aprende:
- **Estructura**: "Funciones que validan retornan boolean"
- **Naming**: "validateX suele validar entidades"
- **Contexto**: "validateUser se llama antes de processOrder"
- **Semántica**: Relación entre nombre y comportamiento

### Dataset de Entrenamiento Futuro

```javascript
// Ejemplo de entry de entrenamiento:
{
  // Identidad real (proyecto específico)
  realName: "validateUser",
  realEntity: "user",
  realProject: "ecommerce-app",
  
  // Patrón abstracto (cross-project)
  abstractPattern: "VALIDATE_FUNC(ENTITY_PARAM)",
  abstractFlow: "VALIDATION → THROW_IF_INVALID → RETURN_BOOLEAN",
  
  // Metadatos estructurales
  complexity: 12,
  hasSideEffects: false,
  returnType: "boolean",
  
  // Contexto social (quién llama a quién)
  calledBy: ["processOrder", "createAccount"],
  calls: ["isEmailValid", "checkAge"],
  
  // Resultado: Modelo aprende que "validateX" hace X
}
```

**Con muchos proyectos, el modelo aprende "folk wisdom" de código**: patrones culturales universales de programación.

### Para Inference (Uso Local)

La IA local SIEMPRE ve nombres reales:
- "La función `validateUser` valida que el usuario tenga email"
- No: "La función `VALIDATE_FUNC` valida la entidad"

El patrón estandarizado es **metadata adicional**, no reemplazo.

---

## ✅ Checklist de Implementación

- [ ] Crear motor de estandarización
- [ ] Implementar tokenización de nombres
- [ ] Implementar tokenización de parámetros
- [ ] Implementar tokenización de variables
- [ ] Generar patrón de texto estandarizado
- [ ] Detectar flowType automáticamente
- [ ] Agregar campo `standardized` a cada átomo
- [ ] Tests comparando funciones de diferentes proyectos

---

## 📚 Referencias

- [Documento Original - Sección 2.1](../architecture/DATA_FLOW_FRACTAL_DESIGN.md#21-variable-standardization)

---

**Siguiente**: [→ Fase 4: Cadenas Cross-Function](./04_FASE_CADENAS.md)
