# Data Flow v2 - Sistema de Extracción de Flujo de Datos

**Estado**: ✅ IMPLEMENTED (v0.7.1)
**Ubicación**: `src/layer-a-static/extractors/data-flow-v2/`
**Versión**: 2.0.0

---

## 🎯 Visión General

Data Flow v2 es un sistema completo de extracción y análisis de flujo de datos a nivel atómico (función por función). Reemplaza el extractor básico v1 con una arquitectura modular basada en visitors del patrón AST.

### Propósito

Extraer el **flujo completo de transformación de datos** dentro de una función:
- **Inputs**: Parámetros, variables capturadas, estado global
- **Transformations**: Operaciones que modifican los datos
- **Outputs**: Returns, side effects, mutaciones

### Valor

- **Para Developers**: Entender qué hace una función sin leer código
- **Para AI**: Detectar patrones de transformación universal
- **Para ML**: Dataset estandarizado de patrones estructurales
- **Para Shadow Registry**: DNA fingerprinting preciso

---

## 📁 Estructura del Sistema (12 Archivos)

```
src/layer-a-static/extractors/data-flow-v2/
├── core/                           # Núcleo del sistema (3 archivos)
│   ├── index.js                    # Entry point y orquestador
│   ├── graph-builder.js            # Constructor de grafo de transformaciones
│   └── transform-registry.js       # Registro de 50+ patrones
│
├── visitors/                       # Visitantes AST especializados (4 archivos)
│   ├── expression-visitor.js      # Asignaciones, operadores, property access
│   ├── call-visitor.js             # Llamadas a funciones
│   ├── control-flow-visitor.js    # If/else, loops, try/catch
│   └── data-structures-visitor.js # Arrays, objects, destructuring
│
├── analyzers/                      # Analizadores post-extracción (2 archivos)
│   ├── invariant-detector.js      # Detecta invariantes (⚠️ stub parcial)
│   └── type-inferrer.js            # Infiere tipos de variables
│
├── output/                         # Formateadores de output (3 archivos)
│   ├── real-formatter.js           # Formato "real" (nombres originales)
│   ├── standardized-formatter.js  # Formato estandarizado (tokens)
│   └── graph-formatter.js          # Grafo completo (nodos + edges)
│
└── utils/                          # Utilidades (2 archivos)
    ├── scope-manager.js            # Gestión de scopes (variables disponibles)
    └── pattern-index-manager.js   # Índice de patrones para búsqueda
```

---

## 🔧 Core Components

### 1. Core (3 archivos)

#### `index.js` - Orquestador Principal

**Responsabilidad**: Coordinar el pipeline completo de extracción.

```javascript
import { extractDataFlow } from './data-flow-v2/core/index.js';

const result = await extractDataFlow(ast, code, functionName, filePath);
```

**Pipeline**:
```
PASO 0: Extraer parámetros → INPUT nodes
PASO 1: Recorrer AST con 4 visitors
PASO 2: Construir grafo de transformaciones
PASO 3: Detectar invariantes
PASO 4: Inferir tipos
PASO 5: Generar 3 formatos de output
PASO 6: Actualizar índice de patrones (async)
```

**Output**:
```javascript
{
  real: { ... },           // Formato humano
  standardized: { ... },   // Formato ML
  graph: { ... },          // Grafo completo
  _meta: {
    version: '2.0.0',
    confidence: 0.85,
    stats: { totalTransforms: 12, ... }
  }
}
```

#### `graph-builder.js` - Constructor de Grafo

**Responsabilidad**: Construir el grafo de transformaciones.

**API**:
```javascript
const builder = new GraphBuilder();

// Agregar nodo
const nodeId = builder.addNode({
  type: 'TRANSFORM',
  category: 'arithmetic',
  standardToken: 'ADD',
  inputs: [{ name: 'a', type: 'number' }],
  output: { name: 'result', type: 'number' },
  properties: { isPure: true }
});

// Agregar edge
builder.addEdge(fromNodeId, toNodeId, {
  type: 'data-flow',
  variable: 'x'
});

// Obtener grafo
const graph = builder.build();
```

**Estructura del Grafo**:
```javascript
{
  nodes: Map {
    'node_1' => {
      id: 'node_1',
      type: 'TRANSFORM',
      category: 'arithmetic',
      standardToken: 'ADD',
      inputs: [...],
      output: { name: 'result', type: 'number' }
    }
  },
  edges: [
    { from: 'node_1', to: 'node_2', type: 'data-flow', variable: 'x' }
  ],
  meta: {
    totalNodes: 12,
    totalEdges: 15,
    hasSideEffects: true,
    hasAsync: false
  }
}
```

#### `transform-registry.js` - Registro de Patrones

**Responsabilidad**: Mantener registry de 50+ transform patterns.

**Categorías**:
1. **Side Effects** (10 patrones)
   - Network calls, DOM manipulation, console, localStorage, etc.

2. **Functional Transforms** (15 patrones)
   - map, filter, reduce, slice, concat, etc.

3. **Operators** (25+ patrones)
   - Arithmetic: +, -, *, /, %
   - Logical: &&, ||, !
   - Comparison: ===, !==, <, >
   - Bitwise: &, |, ^, <<, >>

**API**:
```javascript
import { detectSideEffectTransform, detectFunctionalTransform, getTransformByOperator } from './transform-registry.js';

// Detectar side effect
const transform = detectSideEffectTransform('fetch');
// → { category: 'network', standardToken: 'HTTP_FETCH', ... }

// Detectar functional transform
const transform = detectFunctionalTransform('map');
// → { category: 'array', standardToken: 'MAP', isPure: true }

// Obtener por operador
const transform = getTransformByOperator('+');
// → { category: 'arithmetic', standardToken: 'ADD', ... }
```

---

### 2. Visitors (4 archivos)

Cada visitor implementa el patrón Visitor para recorrer el AST y extraer patrones específicos.

#### `expression-visitor.js` - Expresiones

**Detecta**:
- Asignaciones: `const x = y`
- Operadores: `a + b`, `x && y`
- Property access: `obj.prop`
- Array access: `arr[i]`
- Ternarios: `condition ? a : b`

#### `call-visitor.js` - Llamadas a Funciones

**Detecta**:
- Function calls: `foo(x, y)`
- Method calls: `obj.method(x)`
- Constructor calls: `new MyClass()`
- Await calls: `await asyncFn()`
- Chained calls: `arr.map().filter()`

#### `control-flow-visitor.js` - Control de Flujo

**Detecta**:
- If/else statements
- Switch/case
- For/while loops
- Try/catch/finally
- Return statements
- Break/continue

#### `data-structures-visitor.js` - Estructuras de Datos

**Detecta**:
- Array literals: `[1, 2, 3]`
- Object literals: `{ a: 1, b: 2 }`
- Destructuring: `const { x, y } = obj`
- Spread: `[...arr]`, `{ ...obj }`
- Template literals: `` `Hello ${name}` ``

---

### 3. Analyzers (2 archivos)

#### `invariant-detector.js` - Detector de Invariantes

**Estado**: ⚠️ **MEDIUM SEVERITY** - Stub parcial en línea 335

**Propósito**: Detectar invariantes del código (condiciones que siempre se cumplen).

**Ejemplo**:
```javascript
function process(x) {
  if (x < 0) throw new Error();
  const y = Math.sqrt(x);  // Invariante: x >= 0
  return y;
}
```

**Estado actual**:
- Detección básica funciona
- Invariantes avanzados (línea 335) son stub
- No impacta funcionalidad principal

#### `type-inferrer.js` - Inferencia de Tipos

**Propósito**: Inferir tipos de variables desde el código.

**Estrategias**:
1. Literal inference: `const x = 5` → number
2. TypeScript annotations: `x: string` → string
3. Default values: `function(x = 'hi')` → string
4. Operation inference: `a + b` donde `a: number` → number
5. Return type propagation

---

### 4. Output (3 archivos)

#### `real-formatter.js` - Formato Real

**Propósito**: Output con nombres originales para debugging.

```javascript
{
  inputs: [
    { name: 'userId', type: 'string', source: 'param' }
  ],
  transformations: [
    { from: 'userId', to: 'user', operation: 'fetch' }
  ],
  outputs: [
    { name: 'user', type: 'User', destination: 'return' }
  ],
  sideEffects: ['database.query']
}
```

#### `standardized-formatter.js` - Formato Estandarizado

**Propósito**: Output tokenizado para ML training.

```javascript
{
  flowPattern: "INPUT_PARAM → READ_FUNC → RETURN",
  standardizedCode: "PROCESS_FUNC(ID_PARAM) { VAR_1 = READ_FUNC(ID_PARAM); return VAR_1; }",
  flowType: "read-passthrough",
  semanticFingerprint: "verb:fetch domain:user entity:data"
}
```

#### `graph-formatter.js` - Formato Grafo

**Propósito**: Grafo completo con nodos y edges.

```javascript
{
  nodes: [
    { id: 'n1', type: 'INPUT', output: { name: 'userId' } },
    { id: 'n2', type: 'TRANSFORM', standardToken: 'READ_FUNC', inputs: ['userId'] },
    { id: 'n3', type: 'OUTPUT', input: { name: 'user' } }
  ],
  edges: [
    { from: 'n1', to: 'n2', type: 'data-flow', variable: 'userId' },
    { from: 'n2', to: 'n3', type: 'data-flow', variable: 'user' }
  ]
}
```

---

## 📊 Comparación v1 vs v2

| Feature | v1 (data-flow.js) | v2 (data-flow-v2/) | Mejora |
|---------|-------------------|---------------------|---------|
| **Arquitectura** | Monolítico (1 archivo) | Modular (12 archivos) | +1100% |
| **Patterns Detectados** | ~15 patrones | 50+ patrones | +233% |
| **Output Formats** | 1 formato (básico) | 3 formatos (real/std/graph) | +200% |
| **Type Inference** | ❌ No | ✅ Si | New |
| **Invariant Detection** | ❌ No | 🟡 Parcial | New |
| **Scope Management** | ❌ No | ✅ Si | New |
| **Pattern Index** | ❌ No | ✅ Si (async) | New |
| **Extensibilidad** | Difícil | Fácil (visitor pattern) | Alta |
| **Testability** | Baja | Alta (modular) | Alta |
| **Performance** | N/A | Similar (~50ms/función) | Similar |

---

## 🚀 Usage

### Uso Básico

```javascript
import { extractDataFlow } from './layer-a-static/extractors/data-flow-v2/core/index.js';
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
console.log('Has side effects:', result._meta.stats.hasSideEffects);
```

### Integración en Pipeline

Ya está integrado en `atom-extraction-phase.js`:

```javascript
// En atom-extraction-phase.js
const dataFlow = await extractDataFlow(ast, code, functionName, filePath);

atom.dataFlow = {
  ...dataFlow.real,
  standardized: dataFlow.standardized,
  _meta: dataFlow._meta
};
```

### Acceso desde MCP

```javascript
// Via get_function_details
const details = await get_function_details({
  filePath: 'src/utils.js',
  functionName: 'processUser'
});

console.log(details.dataFlow);
// {
//   inputs: [...],
//   transformations: [...],
//   outputs: [...],
//   flowPattern: "INPUT → TRANSFORM → OUTPUT"
// }
```

---

## 🐛 Known Issues

### Issue #1: Invariant Detector Stub (MEDIUM Severity)

**Archivo**: `src/layer-a-static/extractors/data-flow-v2/analyzers/invariant-detector.js`
**Línea**: 335
**Descripción**: Detección avanzada de invariantes es stub (placeholder)

**Impacto**:
- ✅ Funcionalidad básica operativa
- ⚠️ Invariantes complejos no detectados
- ✅ No bloquea extracción de data flow

**Workaround**:
```javascript
// Funciona para casos básicos
const invariants = invariantDetector.detect();
// [{ type: 'non-null', variable: 'x', confidence: 0.9 }]

// Invariantes avanzados (ej: ranges, relationships) retornan stub
// → Mejorar en v0.7.2
```

**Roadmap**: Completar en v0.7.2

---

## 📈 Casos de Uso

### 1. DNA Fingerprinting (Shadow Registry)

```javascript
const dataFlow = await extractDataFlow(...);
const dna = {
  structuralHash: hash(dataFlow.graph),
  patternHash: hash(dataFlow.standardized.flowPattern),
  flowType: dataFlow.standardized.flowType,
  semanticFingerprint: dataFlow.standardized.semanticFingerprint
};
```

### 2. Detectar Patrones Universales

```javascript
// Buscar todos los "read-transform-persist" en el proyecto
const atoms = getAllAtoms();
const readTransformPersist = atoms.filter(atom =>
  atom.dataFlow.standardized.flowType === 'read-transform-persist'
);
```

### 3. ML Training Data

```javascript
// Exportar dataset estandarizado
const dataset = atoms.map(atom => ({
  pattern: atom.dataFlow.standardized.flowPattern,
  code: atom.dataFlow.standardized.standardizedCode,
  flowType: atom.dataFlow.standardized.flowType,
  complexity: atom.complexity,
  archetype: atom.archetype
}));

fs.writeFileSync('training-data.json', JSON.stringify(dataset));
```

### 4. Detección de Code Smells

```javascript
// Detectar funciones con muchos side effects
const smelly = atoms.filter(atom =>
  atom.dataFlow._meta.stats.hasSideEffects &&
  atom.dataFlow.sideEffects.length > 3
);
```

---

## 🔮 Roadmap

### v0.7.2 (Short-term)
- ✅ Completar invariant-detector.js (línea 335)
- ✅ Tests unitarios para cada visitor
- ✅ Documentar transform-registry completo

### v0.8.0 (Mid-term)
- ✅ Data Flow Fase 2: Cross-function chains
- ✅ Detección de ciclos en grafo
- ✅ Optimización de performance (caching)

### v0.9.0 (Long-term)
- ✅ Data Flow Fase 3: Module-level flows
- ✅ Simulation engine (ejecutar flow virtualmente)
- ✅ Auto-fix de dead code

---

## 📚 Referencias

- **Diseño**: `docs/DATA_FLOW/03_FASE_ESTANDARIZACION.md`
- **Implementación**: `docs/DATA_FLOW/PLAN_FASE_1_IMPLEMENTADO.md`
- **Changelog**: `changelog/v0.7.1.md`
- **Tests**: `src/layer-a-static/extractors/data-flow-v2/__tests__/` (pendiente)

---

**Última actualización**: 2026-02-09
**Versión del documento**: 1.0.0
**Estado**: Production Ready
