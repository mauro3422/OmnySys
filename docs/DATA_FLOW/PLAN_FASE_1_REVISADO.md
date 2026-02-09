# PLAN FASE 1 REVISADO: Data Flow Exhaustivo v0.7

**Versión**: 2.0 (Enfoque Exhaustivo)  
**Estado**: Reimplementación completa  
**Principio**: "No detectar que hay transformación, detectar QUÉ transformación específica"

---

## 🎯 VISIÓN: El Sistema de Intuición Perfecta

### La Diferencia Real

| v0.6 (Call Graph) | v0.7 (Data Flow Exhaustivo) |
|-------------------|----------------------------|
| "processOrder llama a calculateTotal" | "processOrder toma order.items, los multiplica por prices, aplica descuento user.discount condicionalmente, persiste en DB, y retorna {orderId, total}" |
| Sabe QUÉ existe | Entiende QUÉ HACE |
| Mapa de carreteras | GPS con tráfico en tiempo real |

### El Valor Real

Con v0.7 completo, podemos responder:

```
Query: "¿Es seguro modificar order.total?"

Respuesta:
┌──────────────────────────────────────────────────────┐
│ IMPACT ANALYSIS (OmnySys v0.7)                       │
├──────────────────────────────────────────────────────┤
│ Target: order.total                                  │
│ Type: number                                         │
│ Used in: 8 transformations                           │
│                                                      │
│ Transformation Chain:                                │
│ order.total                                          │
│   → [0] MULTIPLY (× taxRate)                         │
│   → [1] ADD (+ total)                                │
│   → [2] CONDITIONAL (vip?)                           │
│   → [3] MULTIPLY (× 0.9 OR × 1.0)                   │
│   → [4] ASSIGN (to finalTotal)                       │
│   → [5] DB_WRITE (orders.total)                      │
│                                                      │
│ Invariants Preserved:                                │
│ ✅ Type: number → number → number...                │
│ ✅ Range: positive through all transforms           │
│                                                      │
│ Breaking Risk: MEDIUM                                │
│ Reason: 3 functions depend on this chain             │
│                                                        │
│ Recommendation:                                      │
│ "Modificar el tipo de order.total afectaría 8        │
│  transformaciones. Mantén number o actualiza:        │
│   - calculateTax() en src/tax/calculator.js          │
│   - applyDiscount() en src/discounts/vip.js          │
│   - saveOrder() en src/db/orders.js"                 │
└──────────────────────────────────────────────────────┘
```

---

## 🔬 PrimitiveTransforms: El Catalogo Completo

### Transformaciones Aritméticas

```javascript
const ArithmeticTransforms = {
  ADD: (a, b) => a + b,
  SUBTRACT: (a, b) => a - b,
  MULTIPLY: (a, b) => a * b,
  DIVIDE: (a, b) => a / b,
  MODULO: (a, b) => a % b,
  POWER: (a, b) => a ** b,
  UNARY_PLUS: (a) => +a,
  UNARY_MINUS: (a) => -a,
  INCREMENT: (a) => a + 1,
  DECREMENT: (a) => a - 1
};
```

### Transformaciones Lógicas

```javascript
const LogicalTransforms = {
  AND: (a, b) => a && b,
  OR: (a, b) => a || b,
  NOT: (a) => !a,
  EQUALS: (a, b) => a === b,
  NOT_EQUALS: (a, b) => a !== b,
  GREATER_THAN: (a, b) => a > b,
  LESS_THAN: (a, b) => a < b,
  GREATER_EQUAL: (a, b) => a >= b,
  LESS_EQUAL: (a, b) => a <= b
};
```

### Transformaciones Estructurales

```javascript
const StructuralTransforms = {
  PROPERTY_ACCESS: (obj, prop) => obj[prop],
  ARRAY_INDEX: (arr, i) => arr[i],
  OBJECT_CREATE: (props) => ({...props}),
  ARRAY_CREATE: (items) => [...items],
  SPREAD: (...args) => [...args],
  DESTRUCTURE_OBJECT: (obj, keys) => /* extrae keys */,
  DESTRUCTURE_ARRAY: (arr, indices) => /* extrae indices */
};
```

### Transformaciones Funcionales (Array Methods)

```javascript
const FunctionalTransforms = {
  MAP: (arr, fn) => arr.map(fn),
  FILTER: (arr, fn) => arr.filter(fn),
  REDUCE: (arr, fn, init) => arr.reduce(fn, init),
  FIND: (arr, fn) => arr.find(fn),
  SOME: (arr, fn) => arr.some(fn),
  EVERY: (arr, fn) => arr.every(fn),
  SORT: (arr, fn) => arr.sort(fn),
  SLICE: (arr, start, end) => arr.slice(start, end),
  CONCAT: (a, b) => a.concat(b),
  JOIN: (arr, sep) => arr.join(sep)
};
```

### Transformaciones de Control

```javascript
const ControlTransforms = {
  CONDITIONAL: (cond, thenVal, elseVal) => cond ? thenVal : elseVal,
  NULL_COALESCE: (a, b) => a ?? b,
  OPTIONAL_CHAIN: (obj, prop) => obj?.[prop],
  TRY_CATCH: (tryFn, catchFn) => /* try/catch block */
};
```

### Side Effects (Transformaciones con Efecto Externo)

```javascript
const SideEffectTransforms = {
  NETWORK_CALL: { type: 'http', mutates: false, async: true },
  DB_READ: { type: 'database', mutates: false, async: true },
  DB_WRITE: { type: 'database', mutates: true, async: true },
  STORAGE_READ: { type: 'storage', mutates: false, async: false },
  STORAGE_WRITE: { type: 'storage', mutates: true, async: false },
  EVENT_EMIT: { type: 'event', mutates: true, async: false },
  EVENT_LISTEN: { type: 'event', mutates: false, async: false },
  LOG_WRITE: { type: 'logging', mutates: false, async: false },
  FILE_READ: { type: 'filesystem', mutates: false, async: true },
  FILE_WRITE: { type: 'filesystem', mutates: true, async: true }
};
```

---

## 📐 Estructura del Grafo de Transformaciones

### Nodo

```javascript
{
  id: "transform_001",
  type: "MULTIPLY",
  category: "arithmetic",
  
  // Entradas
  inputs: [
    { source: "input_order_total", type: "number", value: 100 },
    { source: "constant_taxRate", type: "number", value: 0.16 }
  ],
  
  // Salida
  output: {
    name: "taxAmount",
    type: "number",
    inferredType: "positive_number"
  },
  
  // Metadata
  location: {
    file: "src/orders/calculate.js",
    line: 45,
    column: 12
  },
  
  // Propiedades
  properties: {
    isPure: true,
    hasSideEffects: false,
    isAsync: false,
    throws: false
  }
}
```

### Grafo Completo

```javascript
{
  // Nodos (transformaciones)
  nodes: [
    { id: "input_order_total", type: "input", dataType: "number" },
    { id: "const_taxRate", type: "constant", value: 0.16 },
    { id: "transform_1", type: "MULTIPLY", inputs: ["input_order_total", "const_taxRate"] },
    { id: "transform_2", type: "ADD", inputs: ["input_order_total", "transform_1"] },
    { id: "condition_1", type: "CONDITIONAL", condition: "user.vip" },
    { id: "transform_3a", type: "MULTIPLY", inputs: ["transform_2", 0.9] },
    { id: "transform_3b", type: "PASS", inputs: ["transform_2"] },
    { id: "output_db", type: "DB_WRITE", target: "orders" }
  ],
  
  // Aristas (flujo de datos)
  edges: [
    { from: "input_order_total", to: "transform_1" },
    { from: "const_taxRate", to: "transform_1" },
    { from: "transform_1", to: "transform_2" },
    { from: "input_order_total", to: "transform_2" },
    { from: "transform_2", to: "condition_1" },
    { from: "condition_1", to: "transform_3a", label: "true" },
    { from: "condition_1", to: "transform_3b", label: "false" },
    { from: "transform_3a", to: "output_db" },
    { from: "transform_3b", to: "output_db" }
  ],
  
  // Metadata del grafo
  meta: {
    entryPoints: ["input_order_total", "const_taxRate"],
    exitPoints: ["output_db"],
    totalTransforms: 8,
    hasAsync: true,
    hasSideEffects: true
  }
}
```

---

## 🔍 Detección de Invariantes

### Tipos de Invariantes

#### 1. Invariante de Tipo

```javascript
// Ejemplo: "total siempre es number"
{
  variable: "total",
  invariant: "TYPE_NUMBER",
  evidence: [
    { line: 12, operation: "MULTIPLY", leftType: "number", rightType: "number" },
    { line: 15, operation: "ADD", leftType: "number", rightType: "number" }
  ],
  confidence: 1.0  // Total certeza
}
```

#### 2. Invariante de Rango

```javascript
// Ejemplo: "total siempre >= 0"
{
  variable: "total",
  invariant: "RANGE_POSITIVE",
  evidence: [
    { line: 12, check: "price >= 0" },
    { line: 12, check: "quantity >= 0" },
    { line: 12, operation: "MULTIPLY", preserves: "positive × positive = positive" }
  ],
  confidence: 0.95
}
```

#### 3. Invariante de Pureza

```javascript
// Ejemplo: "calculateTax es pura"
{
  function: "calculateTax",
  invariant: "PURE_FUNCTION",
  evidence: [
    { check: "no_side_effects", passed: true },
    { check: "deterministic", passed: true },
    { check: "no_external_state", passed: true }
  ],
  confidence: 1.0
}
```

#### 4. Invariante de Idempotencia

```javascript
// Ejemplo: "formatCurrency es idempotente"
{
  function: "formatCurrency",
  invariant: "IDEMPOTENT",
  evidence: [
    { check: "format(format(x)) === format(x)", passed: true }
  ],
  confidence: 0.9
}
```

---

## 🏗️ NUEVA Estructura de Archivos

```
src/layer-a-static/extractors/data-flow-v2/    ← REEMPLAZO total
├── core/
│   ├── index.js                      ← Entry point
│   ├── transform-registry.js         ← Catalogo de PrimitiveTransforms
│   └── graph-builder.js              ← Construye grafo de transformaciones
├── visitors/
│   ├── ast-traverser.js              ← Recorre AST completo
│   ├── expression-visitor.js         ← BinaryExpression, UnaryExpression
│   ├── call-visitor.js               ← CallExpression, side effects
│   ├── control-flow-visitor.js       ← If, Try/Catch, Loops
│   └── data-structures-visitor.js    ← Object, Array, Destructuring
├── analyzers/
│   ├── chain-analyzer.js             ← Conecta transforms en cadenas
│   ├── invariant-detector.js         ← Detecta invariantes
│   ├── type-inferrer.js              ← Infiere tipos a través del grafo
│   └── purity-analyzer.js            ← Detecta funciones puras
├── output/
│   ├── real-formatter.js             ← Formato para humanos
│   ├── standardized-formatter.js     ← Tokens para ML
│   └── graph-formatter.js            ← Grafo completo
└── utils/
    ├── type-system.js                ← Sistema de tipos ligero
    ├── scope-manager.js              ← Manejo de scopes complejos
    └── validation-engine.js          ← Valida invariantes

src/layer-b-semantic/enrichers/
├── data-flow-enricher.js             ← Enriquece con semántica
├── cross-function-analyzer.js        ← Conecta funciones
└── impact-analyzer.js                ← Análisis de impacto

src/layer-c-memory/
├── storage/
│   ├── transform-graph-store.js      ← Almacena grafos
│   └── invariant-store.js            ← Almacena invariantes detectados
└── queries/
    ├── impact-query.js               ← "¿Qué pasa si cambio X?"
    ├── flow-query.js                 ← "¿Cómo llega este dato a Y?"
    └── invariant-query.js            ← "¿Qué garantías tengo sobre Z?"
```

---

## ✅ CHECKLIST DE IMPLEMENTACIÓN

### Semana 1: AST Visitor Completo

- [ ] Crear transform-registry.js con todas las PrimitiveTransforms
- [ ] Implementar expression-visitor.js (Binary, Unary, Logical)
- [ ] Implementar call-visitor.js (CallExpression, side effects)
- [ ] Implementar data-structures-visitor.js (Object, Array, Spread)
- [ ] Implementar control-flow-visitor.js (If, Ternary, Try/Catch)
- [ ] Tests: Extraer transforms de 10 funciones reales

### Semana 2: Cadenas y Grafos

- [ ] Implementar graph-builder.js
- [ ] Conectar transforms en grafo dirigido
- [ ] Detectar entry points y exit points
- [ ] Resolver dependencias entre nodos
- [ ] Tests: Validar grafo de función compleja

### Semana 3: Invariantes

- [ ] Implementar type-inferrer.js
- [ ] Implementar invariant-detector.js
- [ ] Detectar invariantes de tipo, rango, pureza
- [ ] Calcular confidence scores
- [ ] Tests: Validar invariantes detectadas

### Semana 4: Integración

- [ ] Integrar en molecular-extractor.js
- [ ] Actualizar analysis-decider.js (usar invariantes para confidence)
- [ ] Implementar queries de impacto
- [ ] Documentación completa
- [ ] Tests E2E

---

## 📊 ESTIMACIÓN REALISTA

| Componente | Tiempo | Complejidad |
|------------|--------|---------------|
| Transform Registry | 2h | ⭐⭐ Medio |
| Expression Visitor | 4h | ⭐⭐⭐ Complejo |
| Call Visitor | 3h | ⭐⭐⭐ Complejo |
| Control Flow Visitor | 4h | ⭐⭐⭐⭐ Muy complejo |
| Graph Builder | 6h | ⭐⭐⭐⭐ Muy complejo |
| Invariant Detector | 8h | ⭐⭐⭐⭐⭐ Extremo |
| Type Inference | 6h | ⭐⭐⭐⭐ Muy complejo |
| Integración | 4h | ⭐⭐ Medio |
| Tests | 6h | ⭐⭐⭐ Complejo |
| **TOTAL** | **~43 horas** | **~5-6 semanas** |

---

## 🎯 DEFINICIÓN DE "HECHO" (Revisada)

La Fase 1 está completa cuando:

1. ✅ Detectamos **TODAS** las PrimitiveTransforms en código real
2. ✅ Construimos **grafos completos** con nodos y aristas
3. ✅ Detectamos **al menos 3 tipos de invariantes** con confidence > 0.8
4. ✅ Respondemos query: "¿Qué pasa si modifico X?" con cadena completa
5. ✅ Validamos que type inference funciona en 80% de casos
6. ✅ Performance: < 100ms por función compleja
7. ✅ Documentación de arquitectura actualizada

---

**¿Empezamos con el transform-registry.js?**
