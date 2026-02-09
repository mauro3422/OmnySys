# FASE 2: Cross-Function Chaining (Nivel Molecular)

**Versión**: v0.7.0 - Fase 2  
**Estado**: Diseño  
**Dependencias**: Fase 1 completada (Data Flow Atómico)  
**Tiempo estimado**: 3-4 días

---

## 🎯 OBJETIVO

Conectar el **data flow entre funciones** (átomos) dentro de un archivo (molécula).

**La diferencia clave:**
- **Fase 1**: Analiza el flujo DENTRO de una función
- **Fase 2**: Conecta el flujo ENTRE funciones

**Ejemplo:**
```javascript
// Archivo: orderProcessor.js

// Función A (exportada)
function processOrder(order) {
  const total = calculateTotal(order.items);  // → llama a B
  const user = await getUser(order.userId);   // → llama a C
  return { total, user };
}

// Función B (interna)
function calculateTotal(items) {
  return items.reduce((sum, item) => sum + item.price, 0);
}

// Función C (interna)
async function getUser(userId) {
  return await db.users.findById(userId);
}
```

**Chain detectada:**
```
processOrder (input: order)
  ├── calls calculateTotal (with: order.items)
  │     └── returns: total
  │           └── used in: processOrder.return
  │
  └── calls getUser (with: order.userId)
        └── returns: user
              └── used in: processOrder.return
```

**Resultado final:**
```
order → processOrder
  ├── order.items → calculateTotal → total
  │                      └──→ processOrder.return.total
  │
  └── order.userId → getUser → user
                             └──→ processOrder.return.user
```

---

## 📊 ARQUITECTURA

### Pipeline Fase 2

```
┌─────────────────────────────────────────────────────────────┐
│  INPUT: Lista de átomos (de Fase 1)                         │
│  Cada átomo tiene: dataFlow.inputs, outputs, calls         │
└────────────────────┬────────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────────┐
│  PASO 1: Indexar todos los átomos                          │
│  - Map: atomId → átomo                                     │
│  - Map: functionName → átomo                               │
└────────────────────┬────────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────────┐
│  PASO 2: Resolver llamadas internas                        │
│  - Para cada call en un átomo                              │
│  - Buscar si hay un átomo con ese nombre                   │
│  - Si existe: es internal call                             │
└────────────────────┬────────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────────┐
│  PASO 3: Mapear argumentos a parámetros                    │
│  - order.items (arg de caller) → items (param de callee)   │
│  - order.userId (arg de caller) → userId (param de callee) │
└────────────────────┬────────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────────┐
│  PASO 4: Conectar returns a usages                         │
│  - total (return de B) → processOrder.return.total         │
│  - user (return de C) → processOrder.return.user           │
└────────────────────┬────────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────────┐
│  PASO 5: Construir molecular chains                        │
│  - Chains: [order.items] → calculateTotal → [total] → return│
│  - Cross-function data flow graph                          │
└────────────────────┬────────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────────┐
│  OUTPUT: Molécula enriquecida                              │
│  - molecularChains: array de chains                        │
│  - crossFunctionGraph: grafo de flujo entre funciones      │
│  - dataFlowCompleto: inputs → ...transforms... → outputs   │
└─────────────────────────────────────────────────────────────┘
```

---

## 🏗️ ESTRUCTURA DE DATOS

### Molecular Chain

```typescript
interface MolecularChain {
  // Identificación
  id: string;
  entryFunction: string;      // Función que inicia la chain
  exitFunction: string;       // Función donde termina
  
  // El camino
  steps: ChainStep[];
  
  // Metadata
  totalFunctions: number;
  totalTransforms: number;
  hasSideEffects: boolean;
  complexity: number;
}

interface ChainStep {
  function: string;           // Nombre de la función
  atomId: string;            // ID del átomo
  
  // Input a esta función
  input: {
    variable: string;
    source: 'caller_argument' | 'previous_return' | 'external';
    transform?: string;      // Ej: "order.items" (property access)
  };
  
  // Output de esta función
  output: {
    variable: string;
    type: 'return' | 'side_effect';
    usedBy: string[];        // Qué otras funciones usan esto
  };
  
  // Transforms internas (de Fase 1)
  internalTransforms: string[];
}
```

### Cross-Function Graph

```typescript
interface CrossFunctionGraph {
  nodes: CFNode[];
  edges: CFEdge[];
}

interface CFNode {
  id: string;                // atomId
  function: string;
  type: 'entry' | 'internal' | 'exit';
  
  // Datos del átomo
  inputs: Input[];
  outputs: Output[];
}

interface CFEdge {
  from: string;              // atomId origen
  to: string;                // atomId destino
  type: 'call' | 'data_flow';
  
  // Mapeo de datos
  dataMapping: {
    source: string;          // variable en función origen
    target: string;          // variable en función destino
    transform?: string;      // Ej: "property_access", "direct"
  }[];
}
```

---

## 🔧 IMPLEMENTACIÓN

### Componentes a Crear

```
src/layer-a-static/pipeline/
├── molecular-chains/
│   ├── index.js                    ← Entry point
│   ├── chain-builder.js            ← Construye chains
│   ├── cross-function-analyzer.js  ← Analiza flujo entre funciones
│   ├── argument-mapper.js          ← Mapea args a params
│   └── return-tracker.js           ← Trackea returns a usages
```

### Algoritmo Principal

```javascript
// chain-builder.js

export function buildMolecularChains(atoms) {
  // PASO 1: Indexar átomos
  const atomIndex = indexAtoms(atoms);
  
  // PASO 2: Resolver calls internos
  const resolvedCalls = resolveInternalCalls(atoms, atomIndex);
  
  // PASO 3: Mapear argumentos
  const argumentMappings = mapArgumentsToParams(resolvedCalls);
  
  // PASO 4: Trackear returns
  const returnFlows = trackReturnUsages(atoms, resolvedCalls);
  
  // PASO 5: Construir chains
  const chains = constructChains(
    atoms, 
    resolvedCalls, 
    argumentMappings, 
    returnFlows
  );
  
  // PASO 6: Construir grafo cross-function
  const graph = buildCrossFunctionGraph(
    atoms,
    chains
  );
  
  return {
    chains,
    graph,
    summary: generateSummary(chains)
  };
}
```

---

## 📋 EJEMPLOS DETALLADOS

### Ejemplo 1: Chain Simple

**Código:**
```javascript
function processOrder(order) {
  const total = calculateTotal(order.items);
  return { total, orderId: order.id };
}

function calculateTotal(items) {
  return items.reduce((sum, item) => sum + item.price, 0);
}
```

**Chains detectadas:**
```javascript
{
  id: "chain_001",
  entryFunction: "processOrder",
  exitFunction: "processOrder",
  steps: [
    {
      function: "processOrder",
      atomId: "order.js::processOrder",
      input: { variable: "order", source: "external" },
      internalTransforms: ["PROPERTY_ACCESS(order.items)"],
      output: { 
        variable: "order.items", 
        type: "intermediate",
        passedTo: ["calculateTotal"]
      }
    },
    {
      function: "calculateTotal",
      atomId: "order.js::calculateTotal",
      input: { 
        variable: "items", 
        source: "caller_argument",
        mappedFrom: "order.items" 
      },
      internalTransforms: ["REDUCE"],
      output: { 
        variable: "total", 
        type: "return",
        returnedTo: ["processOrder"]
      }
    },
    {
      function: "processOrder",
      atomId: "order.js::processOrder",
      input: { 
        variable: "total", 
        source: "previous_return",
        fromFunction: "calculateTotal"
      },
      internalTransforms: ["OBJECT_CREATE"],
      output: { 
        variable: "{ total, orderId }", 
        type: "return" 
      }
    }
  ]
}
```

### Ejemplo 2: Múltiples Chains

**Código:**
```javascript
async function checkout(cart, user) {
  const items = validateItems(cart.items);
  const total = calculateTotal(items);
  const discount = user.vip ? 0.1 : 0;
  const finalTotal = applyDiscount(total, discount);
  await saveOrder({ items, total: finalTotal, userId: user.id });
  return { orderId: generateId(), total: finalTotal };
}

function validateItems(items) {
  return items.filter(item => item.price > 0);
}

function calculateTotal(items) {
  return items.reduce((sum, item) => sum + item.price, 0);
}

function applyDiscount(total, discount) {
  return total * (1 - discount);
}
```

**Chains detectadas:**
```
Chain 1: cart.items → validateItems → items → calculateTotal → total
                                              ↓
Chain 2:                                     total → applyDiscount → finalTotal
                                                              ↑
Chain 3: user.vip → discount → applyDiscount -----------------┘
                                                              ↓
Chain 4:                                     finalTotal → saveOrder
                                                              ↓
Chain 5:                                     finalTotal → return
```

---

## 🎯 CASOS DE USO

### 1. Impact Analysis Mejorado

**Query:** "¿Qué pasa si modifico `calculateTotal`?"

**Respuesta Fase 1:**
```
calculateTotal usa: items
Modificar items afecta: total
```

**Respuesta Fase 2:**
```
calculateTotal recibe: items (de validateItems o processOrder)
calculateTotal retorna: total (usado por applyDiscount y 3 funciones más)

Upstream (quienes llaman a calculateTotal):
  - processOrder (line 45)
  - checkoutFlow (line 120)
  - previewCart (line 230)

Downstream (quiénes usan el return):
  - applyDiscount (total * (1 - discount))
  - formatPrice (format(total))
  - validateBudget (if total > limit)

Impacto: MODERADO
Riesgo: 5 funciones dependen de calculateTotal
```

### 2. Detección de Dead Code

**Fase 1:** Detecta funciones no exportadas sin callers.

**Fase 2:** Detecta funciones donde el return no se usa:
```javascript
function calculateTax(amount) {
  return amount * 0.16;  // ← Se calcula pero...
}

function processPayment(amount) {
  calculateTax(amount);   // ← ...return no se asigna!
  return amount;          // Dead computation
}
```

### 3. Optimización de Queries

Detectar N+1 queries:
```javascript
// Chain detectada:
getUsers() 
  → FOR_EACH(user → getOrders(user.id))  // ← N queries!
  
// Recomendación:
"Detectado patrón N+1. Considera:
 - Batch: getOrdersForUsers(userIds)
 - O usar Promise.all"
```

---

## ✅ CHECKLIST DE IMPLEMENTACIÓN

### Semana 1: Core ✅
- [x] Crear `molecular-chains/index.js`
- [x] Implementar `chain-builder.js`
- [x] Implementar `cross-function-graph-builder.js`
- [x] Implementar `argument-mapper.js`

### Semana 2: Integración ✅
- [x] Integrar en `molecular-extractor.js` (post-proceso)
- [ ] Actualizar `derivation-engine.js` (usar chains)
- [ ] Actualizar cache (incluir chains)

### Semana 3: Testing
- [ ] Test con archivo simple (2-3 funciones)
- [ ] Test con archivo complejo (10+ funciones)
- [ ] Test de impact analysis
- [ ] Validar performance

---

## 📊 OUTPUT ESPERADO

El átomo se enriquece con:

```javascript
{
  // ... campos existentes de Fase 1 ...
  
  // NUEVO Fase 2:
  molecularChains: [
    {
      id: "chain_001",
      entryFunction: "processOrder",
      steps: [...],
      complexity: 15
    }
  ],
  
  crossFunctionGraph: {
    nodes: [...],
    edges: [...]
  },
  
  // Metadata de conectividad
  connectivity: {
    callers: ["checkoutFlow", "previewCart"],      // Quiénes me llaman
    callees: ["calculateTotal", "validateItems"],  // A quiénes llamo
    upstreamData: ["order", "user"],               // Datos que recibo
    downstreamData: ["total", "orderId"]           // Datos que produzco
  }
}
```

---

**¿Empezamos con la implementación?**
