# FASE 1: Data Flow Atómico

**Estado**: Pre-implementación  
**Dependencias**: Ninguna (base del sistema)  
**Tiempo estimado**: 1-2 días

---

## 🎯 Objetivo

Cada función (átomo) debe saber:
1. **QUÉ recibe** (inputs)
2. **QUÉ transforma** (transformations)
3. **QUÉ devuelve** (outputs)

---

## 📊 Ejemplo Real

### Código Original

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

### Metadata Extraída (Objetivo)

**ENFOQUE HÍBRIDO**: Datos juntos en el átomo + Índice de patrones separado

#### 1. En el Átomo (runtime del sistema)

```javascript
{
  name: "processOrder",
  id: "src/api.js::processOrder",
  
  // Versión REAL (para debugging y uso del sistema)
  dataFlow: {
    // ============ A: INPUTS ============
    inputs: [
      {
        name: "order",
        position: 0,
        usages: [
          { type: "property_access", property: "items", line: 2, passedTo: "calculateTotal" },
          { type: "spread", line: 5, passedTo: "saveOrder" },
          { type: "property_access", property: "id", line: 6, passedTo: "return" }
        ]
      },
      {
        name: "userId",
        position: 1,
        usages: [
          { type: "direct_pass", line: 3, passedTo: "getUser" },
          { type: "spread_property", line: 5, passedTo: "saveOrder" }
        ]
      }
    ],

    // ============ B: TRANSFORMATIONS ============
    transformations: [
      {
        from: "order.items",
        to: "total",
        via: "calculateTotal",
        operation: "calculation",
        line: 2
      },
      {
        from: "userId",
        to: "user",
        via: "getUser",
        operation: "read",
        line: 3
      },
      {
        from: "user.discount",
        to: "discount",
        operation: "property_access_with_default",
        defaultValue: "0",
        line: 4
      },
      {
        from: ["total", "discount"],
        to: "finalTotal",
        operation: "arithmetic",
        line: 5
      }
    ],

    // ============ C: OUTPUTS ============
    outputs: [
      {
        type: "side_effect",
        target: "saveOrder",
        data: "{ ...order, total: finalTotal, userId }",
        operation: "persistence",
        line: 5
      },
      {
        type: "return",
        shape: "{ orderId: order.id, total: finalTotal }",
        properties: ["orderId", "total"],
        line: 6
      }
    ]
  },
  
  // Versión ESTANDARIZADA (para pattern matching y ML)
  standardized: {
    patternHash: "a3f7d29c1b5e...",
    pattern: "PROCESS_FUNC(ENTITY_PARAM, ID_PARAM) { CALC_FUNC(ENTITY_PARAM.PROP_1) → VAR_1 → READ_FUNC(ID_PARAM) → VAR_2 → TRANSFORM → PERSIST_FUNC → RETURN }",
    tokens: {
      function: "PROCESS_FUNC",
      params: ["ENTITY_PARAM", "ID_PARAM"],
      variables: ["VAR_1", "VAR_2", "VAR_3", "VAR_4"],
      operations: ["calculation", "read", "arithmetic", "persistence"]
    },
    flowType: "read-transform-persist"
  }
}
```

#### 2. En el Índice de Patrones (para ML y entrenamiento)

**Archivo**: `.omnysysdata/patterns/{patternHash}.json`

```javascript
{
  hash: "a3f7d29c1b5e...",
  pattern: "PROCESS_FUNC(ENTITY_PARAM, ID_PARAM) { CALC_FUNC(...) → VAR → READ_FUNC(...) → VAR → ... → RETURN }",
  standardized: {
    tokens: ["PROCESS_FUNC", "ENTITY_PARAM", "CALC_FUNC", ...],
    flowType: "read-transform-persist"
  },
  
  // TODAS las funciones con este patrón
  atoms: [
    "src/api.js::processOrder",
    "src/cart.js::processCart", 
    "src/orders.js::processPayment",
    // ... más funciones similares
  ],
  
  count: 15,  // Cuántas funciones coinciden
  
  // Estadísticas para entrenamiento
  statistics: {
    avgComplexity: 12.4,
    avgLines: 8,
    commonDomains: ["order", "payment", "cart"],
    commonOperations: ["calculation", "read", "persistence"],
    successRate: 0.94  // Porcentaje de funciones que funcionan correctamente
  },
  
  // Para exportar a otros proyectos
  exportable: true,
  trainingReady: true
}
```

### ¿Por qué híbrido?

| Aspecto | Datos en Átomo | Índice de Patrones |
|---------|---------------|-------------------|
| **Para qué** | Runtime del sistema | ML / Entrenamiento |
| **Uso** | "¿Qué hace esta función?" | "¿Qué funciones son similares?" |
| **Acceso** | Cache rápido | Batch / Dataset |
| **Persistencia** | Con cada átomo | Archivos separados |
| **Compartible** | No (específico del proyecto) | Sí (patrones universales) |

**Beneficios del híbrido**:
1. ✅ Sistema runtime accede a todo sin joins
2. ✅ Pattern matching rápido (comparar hashes)
3. ✅ Dataset de ML limpio y deduplicado
4. ✅ Puedes exportar patrones a otros proyectos
5. ✅ Estadísticas agregadas para mejores insights

---

## 🔧 Implementación Técnica

### Paso 1: AST Visitor

Usamos Babel (ya tenemos el AST) para recorrer el código:

```javascript
// Pseudo-código del visitor
const DataFlowVisitor = {
  // 1. Detectar parámetros
  FunctionDeclaration(path) {
    const params = path.node.params.map((p, index) => ({
      name: p.name,
      position: index,
      usages: []
    }));
    // Guardar en scope para uso posterior
  },

  // 2. Detectar property access: user.role
  MemberExpression(path) {
    const obj = path.node.object.name;      // "user"
    const prop = path.node.property.name;   // "role"
    // Registrar: "user" accede a propiedad "role"
  },

  // 3. Detectar assignments: const x = ...
  VariableDeclarator(path) {
    const name = path.node.id.name;         // "total"
    const init = path.node.init;            // calculateTotal(order.items)
    // Si init es CallExpression → transformación vía función
    // Si init es MemberExpression → property access
  },

  // 4. Detectar llamadas: calculateTotal(order.items)
  CallExpression(path) {
    const callee = path.node.callee.name;   // "calculateTotal"
    const args = path.node.arguments;       // [order.items]
    // Registrar: "order.items" se pasa a "calculateTotal"
  },

  // 5. Detectar returns: return { ... }
  ReturnStatement(path) {
    const arg = path.node.argument;         // { orderId: order.id, ... }
    // Extraer shape del return
  }
};
```

### Paso 2: Integrar con molecular-extractor.js

El archivo `src/layer-a-static/pipeline/molecular-extractor.js` ya llama a extractores:

```javascript
// YA EXISTE (no modificar):
- extractSideEffects(functionCode)
- extractCallGraph(functionCode)
- extractTypeInference(functionCode)

// REEMPLAZAR:
- extractDataFlow(functionCode)  // ← Nueva implementación
```

**Nota**: No se rompe nada existente. Solo mejoramos lo que retorna.

### Paso 3: Estructura del nuevo extractDataFlow()

```javascript
// src/layer-a-static/extractors/metadata/data-flow.js

export function extractDataFlow(functionCode, functionAst) {
  const dataFlow = {
    inputs: [],
    transformations: [],
    outputs: []
  };

  // Recorrer AST con visitor
  traverse(functionAst, {
    // Implementar visitors aquí
  });

  return dataFlow;
}
```

---

## ✅ Checklist de Implementación

- [ ] Crear visitor de Babel para cada tipo de nodo
- [ ] Extraer inputs (parámetros y sus usages)
- [ ] Extraer transformations (assignments y operaciones)
- [ ] Extraer outputs (returns y side effects)
- [ ] Manejar casos edge:
  - [ ] Destructuring: `const { name, email } = user`
  - [ ] Spread operator: `...order`
  - [ ] Array methods: `items.map(...)`
  - [ ] Ternarios: `const x = condition ? a : b`
- [ ] Tests con funciones reales del proyecto
- [ ] Integrar en molecular-extractor.js

---

## 📚 Referencias

- [Documento Original - Sección 4](../architecture/DATA_FLOW_FRACTAL_DESIGN.md#4-data-flow-tracker---nivel-atomo)
- [Babel Handbook - Writing Visitors](https://github.com/jamiebuilds/babel-handbook/blob/master/translations/en/plugin-handbook.md#writing-your-first-babel-plugin)

---

**Siguiente**: [→ Fase 2: Análisis Semántico](./02_FASE_SEMANTICA.md)
