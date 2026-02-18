# Layer Graph - Sistema de Grafos

**Versión**: 1.0.0  
**Estado**: Activo  
**Creado**: 2026-02-18  

---

## Por qué se creó Layer Graph

### El Problema

El sistema de grafos estaba **disperso en 9 ubicaciones diferentes**:

```
src/core/graph/                              ← núcleo pero incompleto
src/layer-a-static/pipeline/graph.js
src/layer-a-static/pipeline/phases/.../call-graph.js
src/layer-a-static/module-system/builders/system-graph-builder.js
src/layer-a-static/extractors/metadata/call-graph.js
src/layer-a-static/extractors/data-flow/.../graph-builder.js
src/layer-c-memory/mcp/tools/.../call-graph-analyzer.js
src/layer-c-memory/mcp/tools/get-call-graph.js
src/shared/ground-truth-validator/.../call-graph-validator.js
```

Esto causaba:
- Duplicación de lógica
- Confusión sobre dónde agregar nueva funcionalidad
- Imports circulares
- Difícil mantenimiento

### La Solución

Crear **Layer Graph** como una capa dedicada que centraliza TODA la lógica de grafos:

```
src/layer-graph/
├── index.js           # API pública única
├── core/              # Tipos (SSOT)
├── algorithms/        # DFS, ciclos, impacto
├── builders/          # Construcción de grafos
├── query/             # Consultas
├── resolvers/         # Resolución de símbolos
├── persistence/       # Serialización
└── utils/             # Utilidades
```

### Decisión Arquitectónica

Se decidió crear Layer Graph como **una capa propia** (no en core) porque:

1. **Es el corazón matemático del sistema** - Todo pasa por el grafo
2. **Tiene vida propia** - Crece con algoritmos, ML, visualización
3. **API clara** - Un solo punto de entrada para todas las operaciones
4. **Independencia** - Puede evolucionar sin afectar otras capas

---

## Arquitectura de Layers Actualizada

```
┌─────────────────────────────────────────────────────────────────────────┐
│                         LAYER GRAPH (Nivel 0)                           │
│    "El cerebro matemático - grafo de conocimiento"                      │
│                                                                          │
│    • Algoritmos: BFS, DFS, ciclos, shortest path                        │
│    • Estructuras: Nodes, Edges, Links                                   │
│    • Queries: Dependencias, impacto, call sites                         │
│    • Persistencia: Serialize, deserialize, delta                        │
│    • PESOS Y VALORES DINÁMICOS (ver más abajo)                          │
└─────────────────────────────────────────────────────────────────────────┘
                                    ↓
┌─────────────────────────────────────────────────────────────────────────┐
│                    LAYER A: STATIC (Nivel 1)                            │
│    "Qué puedo saber SIN ejecutar el código"                             │
│    Usa Graph para: construir, analizar dependencias                     │
└─────────────────────────────────────────────────────────────────────────┘
                                    ↓
┌─────────────────────────────────────────────────────────────────────────┐
│                    LAYER B: SEMANTIC (Nivel 2)                          │
│    "Qué SIGNIFICA lo que encontré en A"                                 │
│    Usa Graph para: enriquecer conexiones semánticas                     │
└─────────────────────────────────────────────────────────────────────────┘
                                    ↓
┌─────────────────────────────────────────────────────────────────────────┐
│                    LAYER C: MEMORY (Nivel 3)                            │
│    "Cómo exponer y persistir el conocimiento"                           │
│    Usa Graph para: servir consultas complejas via MCP                   │
└─────────────────────────────────────────────────────────────────────────┘
```

---

## El Grafo como Sistema Matemático Vivo

### Concepto: Pesos y Valores Dinámicos

El grafo **no es estático**. Cada nodo y conexión tiene **pesos** que cambian:

```javascript
// Un nodo (archivo) tiene peso
node = {
  path: 'src/utils.js',
  
  // PESOS DINÁMICOS
  weight: {
    base: 1.0,              // Peso base
    connectionStrength: 0.8, // Fuerza de conexiones
    impactScore: 0.6,       // Impacto en el sistema
    volatility: 0.3,        // Cuánto cambia
    stability: 0.9          // Qué tan estable es
  },
  
  // Las conexiones también tienen peso
  edges: [
    { to: 'src/main.js', strength: 0.9, frequency: 15 },
    { to: 'src/api.js', strength: 0.7, frequency: 8 }
  ]
}
```

### Ecuaciones del Sistema

```
CUANDO SE AGREGA UNA CONEXIÓN:
┌─────────────────────────────────────────────────────────┐
│  node.weight.connectionStrength += Δ                    │
│  node.weight.impactScore = calculateImpact(node)        │
│  affectedNodes.forEach(n => n.updateEquations())        │
└─────────────────────────────────────────────────────────┘

CUANDO SE ELIMINA UNA CONEXIÓN:
┌─────────────────────────────────────────────────────────┐
│  node.weight.connectionStrength -= Δ                    │
│  node.weight.stability -= penalty                       │
│  propagateChangeToDependents(node)                      │
└─────────────────────────────────────────────────────────┘
```

### Ejemplo: Efecto Cascada

```javascript
// Usuario elimina una conexión
graph.removeEdge('src/utils.js', 'src/api.js');

// El sistema recalcula automáticamente:
// 1. utils.js pierde fuerza (una conexión menos)
// 2. api.js pierde peso (una dependencia menos)
// 3. Todos los que dependen de api.js reciben alerta
// 4. El sistema detecta posible "dead code"

// Efecto en tiempo real:
utils.weight.connectionStrength: 0.8 → 0.72  // -10%
api.weight.impactScore: 0.6 → 0.45          // -25%
dependents.alertLevel: 'low' → 'medium'     // Sube
```

### Depurador en Vivo

Esto permite un **depurador matemático en tiempo real**:

```javascript
// Antes de hacer un cambio, el sistema te dice:
const prediction = graph.predictChange({
  action: 'remove',
  from: 'src/utils.js',
  to: 'src/api.js'
});

// Resultado:
{
  affectedNodes: ['src/utils.js', 'src/api.js', 'src/main.js'],
  impactScore: 0.72,
  riskLevel: 'medium',
  equationsAffected: 5,
  recommendedActions: [
    'Check src/main.js imports',
    'Verify tests still pass',
    'Consider refactoring api.js'
  ]
}
```

---

## Fórmulas Matemáticas

### 1. Peso de Nodo (Node Weight)

```
W(node) = α × connectionCount + β × dependentCount + γ × stability

Donde:
- α, β, γ son coeficientes configurables
- connectionCount = número de conexiones
- dependentCount = archivos que dependen de este
- stability = 1 - (cambiosRecientes / totalCambios)
```

### 2. Fuerza de Conexión (Edge Strength)

```
S(edge) = base × frequency × trust × recency

Donde:
- base = 1.0 para conexiones estáticas
- frequency = veces que se usa la conexión
- trust = confianza en la detección (0-1)
- recency = factor de tiempo (decae con inactividad)
```

### 3. Impacto de Cambio (Change Impact)

```
I(change) = Σ(affectedNodes.W × propagationFactor^n)

Donde:
- n = distancia en el grafo
- propagationFactor = 0.5 (cada nivel afecta la mitad)
```

### 4. Alerta de Sistema (System Alert)

```
Alert(node) = {
  low:    I(node) < 0.3,
  medium: 0.3 ≤ I(node) < 0.7,
  high:   I(node) ≥ 0.7
}
```

---

## Implementación Futura

### Phase 1: Weighted Graph (v1.1)

```javascript
// src/layer-graph/core/weighted-node.js
export class WeightedNode {
  constructor(path) {
    this.path = path;
    this.weights = {
      connectionStrength: 0,
      impactScore: 0,
      stability: 1.0
    };
  }
  
  addEdge(target, metadata = {}) {
    this.edges.push({
      to: target,
      strength: metadata.strength || 1.0,
      frequency: metadata.frequency || 1
    });
    this.recalculateWeights();
  }
  
  removeEdge(target) {
    this.edges = this.edges.filter(e => e.to !== target);
    this.recalculateWeights();
    this.propagateChange();
  }
  
  recalculateWeights() {
    this.weights.connectionStrength = this.edges.reduce(
      (sum, e) => sum + e.strength, 0
    ) / Math.max(this.edges.length, 1);
    
    this.weights.impactScore = this.calculateImpact();
  }
  
  propagateChange() {
    // Notificar a todos los dependientes
    for (const dependent of this.usedBy) {
      dependent.receiveChange(this);
    }
  }
}
```

### Phase 2: Live Debugger (v1.2)

```javascript
// src/layer-graph/query/live-debugger.js
export class LiveDebugger {
  constructor(graph) {
    this.graph = graph;
    this.subscribers = new Map();
  }
  
  // Suscribirse a cambios
  subscribe(nodePath, callback) {
    if (!this.subscribers.has(nodePath)) {
      this.subscribers.set(nodePath, new Set());
    }
    this.subscribers.get(nodePath).add(callback);
  }
  
  // Predecir impacto antes de cambio
  predict(action) {
    const simulation = this.graph.clone();
    simulation.apply(action);
    return simulation.diff(this.graph);
  }
  
  // Ejecutar con validación
  async executeWithValidation(action, validationFn) {
    const prediction = this.predict(action);
    const isValid = await validationFn(prediction);
    
    if (isValid) {
      this.graph.apply(action);
      this.notifySubscribers(action);
    }
    
    return { applied: isValid, prediction };
  }
}
```

---

## API de Pesos (Propuesta)

```javascript
import { WeightedGraph, LiveDebugger } from '#layer-graph/index.js';

// Crear grafo con pesos
const graph = new WeightedGraph();

// Agregar conexiones con metadata
graph.addEdge('utils.js', 'main.js', { strength: 0.9, type: 'import' });

// Consultar pesos
const weight = graph.getNodeWeight('utils.js');
// { connectionStrength: 0.9, impactScore: 0.72, stability: 0.95 }

// Predecir cambio
const impact = graph.predictRemove('utils.js', 'main.js');
// { affectedNodes: 5, riskLevel: 'medium', recommendations: [...] }

// Depurador en vivo
const debugger = new LiveDebugger(graph);
debugger.subscribe('utils.js', (change) => {
  console.log('Change detected:', change);
});
```

---

## Referencias

- [README.md](../../src/layer-graph/README.md) - Documentación técnica
- [archetypes.md](./archetypes.md) - Sistema de arquetipos con confianza
- [core.md](./core.md) - Arquitectura general
