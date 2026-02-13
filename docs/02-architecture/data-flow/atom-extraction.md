# Fase 1: Extracción Atómica (Implementado)

**Versión**: v0.7.1 - Data Flow v2  
**Estado**: ✅ 95% completo  
**Nivel**: Átomo (función individual)  
**Cobertura**: ~85%

---

## Resumen Ejecutivo

**Fase 1** implementa el rastreo de datos dentro de una **función individual** (átomo).

```javascript
// Input: Una función
function processOrder(order, userId) {
  const total = calculateTotal(order.items);
  const user = getUser(userId);
  const final = total * (1 - user.discount);
  return saveOrder({ total: final, user });
}

// Output: Grafo de transformaciones
{
  inputs: [{ name: 'order' }, { name: 'userId' }],
  transformations: [
    { from: 'order.items', to: 'total', via: 'calculateTotal' },
    { from: 'userId', to: 'user', via: 'getUser' },
    { from: ['total', 'user.discount'], to: 'final', operation: 'arithmetic' }
  ],
  outputs: [
    { type: 'side_effect', target: 'saveOrder' },
    { type: 'return', dependsOn: 'final' }
  ]
}
```

---

## Arquitectura v2 (12 Archivos)

```
src/layer-a-static/extractors/data-flow-v2/
│
├── core/                          # Sistema core (3 archivos)
│   ├── index.js                   # Entry point, orquestador
│   ├── graph-builder.js           # Constructor de grafo de transformaciones
│   └── transform-registry.js      # Catálogo de 50+ patrones
│
├── visitors/                      # AST visitors (4 archivos)
│   ├── expression-visitor.js     # Asignaciones, operadores, property access
│   ├── call-visitor.js            # Llamadas a funciones, await, new
│   ├── control-flow-visitor.js   # If/else, loops, try/catch
│   └── data-structures-visitor.js # Arrays, objetos, destructuring
│
├── analyzers/                     # Post-extracción (2 archivos)
│   ├── invariant-detector.js     # Detecta invariantes (⚠️ stub parcial)
│   └── type-inferrer.js           # Inferencia de tipos
│
├── output/                        # Formateadores (3 archivos)
│   ├── real-formatter.js          # Nombres reales (debugging)
│   ├── standardized-formatter.js # Tokenizado (ML training)
│   └── graph-formatter.js         # Grafo completo (nodes + edges)
│
└── utils/                         # Utilidades (2 archivos)
    ├── scope-manager.js           # Tracking de scope
    └── pattern-index-manager.js  # Índice de búsqueda de patrones
```

---

## Pipeline de Extracción

```
STEP 0: Extraer parámetros → INPUT nodes
STEP 1: Traverse AST con 4 visitors
STEP 2: Construir grafo de transformaciones
STEP 3: Detectar invariantes
STEP 4: Inferir tipos
STEP 5: Generar 3 formatos de output
STEP 6: Actualizar índice de patrones (async)
```

### Output (3 Formatos)

```javascript
{
  // Formato 1: Real (debugging)
  real: {
    inputs: [{ name: 'order', type: 'object' }],
    transformations: [...],
    outputs: [...],
    sideEffects: [...]
  },
  
  // Formato 2: Standardized (ML/pattern matching)
  standardized: {
    flowPattern: 'read-transform-persist',
    standardizedCode: 'TOKENS...',
    flowType: 'transform',
    semanticFingerprint: 'process:order:order'
  },
  
  // Formato 3: Graph (análisis completo)
  graph: {
    nodes: [...],
    edges: [...],
    meta: { complexity: 5, confidence: 0.85 }
  },
  
  _meta: {
    version: '2.0.0',
    confidence: 0.85,
    stats: { hasSideEffects: true, complexity: 5 }
  }
}
```

---

## Componentes Clave

### 1. Transform Registry (50+ Patrones)

Catálogo de transformaciones detectables:

| Categoría | Patrones | Ejemplos |
|-----------|----------|----------|
| **Side Effects** (10) | Network, DB, Storage, DOM | `fetch()`, `localStorage.set()`, `document.querySelector()` |
| **Functional** (15) | Array methods | `map`, `filter`, `reduce`, `find`, `some`, `every` |
| **Operators** (25+) | Aritméticos, lógicos, comparación | `+`, `-`, `&&`, `||`, `===`, `<` |

```javascript
import { detectSideEffectTransform, detectFunctionalTransform } 
  from './transform-registry.js';

// Detectar side effect
const t1 = detectSideEffectTransform('fetch');
// → { category: 'network', standardToken: 'HTTP_FETCH', isPure: false }

// Detectar transform funcional
const t2 = detectFunctionalTransform('map');
// → { category: 'array', standardToken: 'MAP', isPure: true }
```

### 2. Graph Builder

Construye grafo dirigido de transformaciones:

```javascript
const builder = new GraphBuilder();

// Agregar nodo
const nodeId = builder.addNode({
  type: 'TRANSFORM',
  category: 'arithmetic',
  standardToken: 'ADD',
  inputs: [{ name: 'a', type: 'number' }],
  output: { name: 'result', type: 'number' }
});

// Agregar edge
builder.addEdge(fromNodeId, toNodeId, {
  type: 'data-flow',
  variable: 'x'
});

const graph = builder.build();
```

### 3. Visitors

Cada visitor maneja tipos específicos de nodos AST:

| Visitor | Responsabilidad |
|---------|-----------------|
| `expression-visitor.js` | Binary ops, assignments, property access, ternary |
| `call-visitor.js` | Function/method calls, constructors, await |
| `control-flow-visitor.js` | If/else, switch, loops, try/catch |
| `data-structures-visitor.js` | Arrays, objects, spread, destructuring |

### 4. Analyzers

- **type-inferrer.js**: Inferir tipos de literales, anotaciones, operaciones
- **invariant-detector.js**: Detectar invariantes de tipo/rango/null-safety (⚠️ stub en línea 335)

### 5. Output Formatters

| Formatter | Propósito |
|-----------|-----------|
| `real-formatter.js` | Nombres originales para debugging |
| `standardized-formatter.js` | Tokenizado para ML/pattern matching |
| `graph-formatter.js` | Estructura completa de grafo |

---

## Uso

### Uso Básico

```javascript
import { extractDataFlow } from './extractors/data-flow-v2/core/index.js';
import * as parser from '@babel/parser';

// 1. Parsear código
const ast = parser.parse(code, {
  sourceType: 'module',
  plugins: ['typescript', 'jsx']
});

// 2. Extraer data flow
const result = await extractDataFlow(
  ast,
  code,
  'myFunction',
  '/path/to/file.js'
);

// 3. Usar resultados
console.log('Flow pattern:', result.standardized.flowPattern);
console.log('Confidence:', result._meta.confidence);
console.log('Side effects:', result._meta.stats.hasSideEffects);
```

### Integrado en Pipeline

Ya integrado en `atom-extraction-phase.js`:

```javascript
const dataFlow = await extractDataFlow(ast, code, functionName, filePath);

atom.dataFlow = {
  ...dataFlow.real,
  standardized: dataFlow.standardized,
  _meta: dataFlow._meta
};
```

### Vía MCP Tools

```javascript
// Usar get_function_details tool
const details = await get_function_details({
  filePath: 'src/utils.js',
  functionName: 'processUser'
});

console.log(details.dataFlow);
// {
//   inputs: [...],
//   transformations: [...],
//   outputs: [...],
//   standardized: { flowPattern: '...' }
// }
```

---

## v1 vs v2

| Aspecto | v1 (Legacy) | v2 (Actual) |
|---------|-------------|-------------|
| **Arquitectura** | 1 archivo | 12 archivos modulares |
| **Patrones** | ~15 patrones | 50+ patrones |
| **Outputs** | 1 formato | 3 formatos |
| **Type Inference** | ❌ No | ✅ Sí |
| **Scope Management** | ❌ No | ✅ Sí |
| **Invariant Detection** | ❌ No | 🟡 Parcial |
| **Extensibilidad** | Baja | Alta (visitor pattern) |
| **Performance** | ~30ms/función | ~50ms/función |
| **Estado** | ✅ Funcional (fallback) | 🟡 95% completo |

**Ubicación**:
- **v1**: `src/layer-a-static/extractors/data-flow/index.js`
- **v2**: `src/layer-a-static/extractors/data-flow-v2/`

---

## Estado Actual y Pendientes

### ✅ Implementado
- Extracción atómica completa
- 50+ patrones de transformación
- 3 formatos de output
- Type inference
- Scope management
- Integración con pipeline

### ⚠️ Pendiente (v0.7.2)
- Completar invariant-detector.js (stub línea 335)
- Agregar unit tests

---

## Ejemplo Real

```javascript
// Código fuente
async function createOrder(items, userId) {
  // Validación
  if (!items || items.length === 0) {
    throw new Error('Empty order');
  }
  
  // Cálculos
  const subtotal = items.reduce((sum, item) => sum + item.price, 0);
  const tax = subtotal * 0.18;
  const total = subtotal + tax;
  
  // Persistencia
  const order = await db.orders.create({
    userId,
    items,
    total,
    status: 'pending'
  });
  
  // Side effect
  await eventBus.emit('order:created', { orderId: order.id });
  
  return order;
}

// Output de Data Flow v2
{
  inputs: [
    { name: 'items', type: 'array', nullable: false },
    { name: 'userId', type: 'unknown' }
  ],
  transformations: [
    { from: 'items.length', operation: 'check', type: 'validation' },
    { from: 'items', via: 'reduce', to: 'subtotal', type: 'arithmetic' },
    { from: 'subtotal', operation: 'multiply', to: 'tax', value: 0.18 },
    { from: ['subtotal', 'tax'], operation: 'add', to: 'total' }
  ],
  outputs: [
    { type: 'side_effect', target: 'db.orders.create', data: { userId, items, total } },
    { type: 'side_effect', target: 'eventBus.emit', event: 'order:created' },
    { type: 'return', value: 'order' }
  ],
  sideEffects: ['database_write', 'event_emit'],
  standardized: {
    flowPattern: 'validate-calculate-persist-notify',
    flowType: 'write',
    complexity: 7
  },
  _meta: {
    confidence: 0.92,
    hasSideEffects: true,
    isAsync: true
  }
}
```

---

## Relación con Otros Sistemas

```
Data Flow v2
    ↓
Atom Extraction Phase (enriquece átomos con dataFlow)
    ↓
Shadow Registry (data flow forma parte del ADN)
    ↓
MCP Tools: get_function_details, explain_value_flow
```

---

**Siguiente paso**: [roadmap.md](./roadmap.md) para ver Fases 2-5 planificadas.
