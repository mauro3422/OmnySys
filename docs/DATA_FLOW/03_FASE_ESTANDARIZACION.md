# FASE 3: Estandarización

**Estado**: Pre-implementación  
**Dependencias**: Fases 1 y 2 (necesita data flow + nombres semánticos)  
**Tiempo estimado**: 1-2 días

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
2. **Training de IA**: Entrenar modelos en ESTRUCTURA, no en nombres
3. **Detección de Anti-Patterns Universales**: "validation-without-error-handling"
4. **Recomendaciones**: "Esta función tiene el mismo patrón que X en el codebase"

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
