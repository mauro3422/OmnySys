# Layer Graph - Sistema de Grafos

**Versión**: v0.9.61  
**Estado**: ✅ **100% Estático, 0% LLM** - SQLite + Semantic Algebra  
**Creado**: 2026-02-18  
**Última actualización**: 2026-02-25

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

**Separación de responsabilidades**:
- **Layer A**: Solo extrae metadata (AST + regex)
- **Layer Graph**: Construye y consulta grafos
- **Layer C**: Persiste en SQLite y expone vía MCP

---

## Arquitectura Actual (v0.9.61)

### Componentes Principales

```
layer-graph/
├── core/
│   ├── types.js           # Tipos de grafos (SSOT)
│   └── constants.js       # Constantes de grafos
├── algorithms/
│   ├── dfs.js             # Depth-first search
│   ├── cycles.js          # Detección de ciclos
│   └── impact.js          # Análisis de impacto
├── builders/
│   ├── call-graph.js      # Construye call graph
│   └── dependency-graph.js # Construye dependency graph
├── query/
│   ├── callers.js         # Query de callers
│   └── callees.js         # Query de callees
├── resolvers/
│   ├── symbols.js         # Resolución de símbolos
│   └── imports.js         # Resolución de imports
├── persistence/
│   ├── sqlite.js          # Persistencia en SQLite
│   └── json.js            # Serialización JSON (legacy)
└── utils/
    ├── metrics.js         # Métricas de grafos
    └── validation.js      # Validación de grafos
```

### Estado Actual

**IMPORTANTE (v0.9.61)**: Todo el análisis de grafos es **100% ESTÁTICO, 0% LLM**.

---

## Métricas de Grafos (v0.9.61)

```
┌─────────────────────────────────────────────────────────────┐
│  Graph Metrics — v0.9.61                                   │
├─────────────────────────────────────────────────────────────┤
│  Hubs:           9 (funciones muy conectadas)              │
│  Bridges:        29 (conectan módulos)                     │
│  Leaves:         13,408 (funciones aisladas)               │
│  Avg Centrality: 0.165                                     │
│  High Risk:      2,834 (funciones de alto riesgo)          │
│  Avg Propagation: 0.334                                    │
└─────────────────────────────────────────────────────────────┘
```

### Distribución de Nodos

| Tipo | Cantidad | % |
|------|----------|---|
| **Functions** | 13,485 | 100% |
| **Hubs** | 9 | 0.07% |
| **Bridges** | 29 | 0.22% |
| **Leaves** | 13,408 | 99.43% |
| **High Risk** | 2,834 | 21.02% |

---

## Algoritmos Implementados

### 1. Depth-First Search (DFS)

```javascript
// src/layer-graph/algorithms/dfs.js

function dfs(graph, startNode, visitFn) {
  const visited = new Set();
  const stack = [startNode];
  
  while (stack.length > 0) {
    const node = stack.pop();
    if (visited.has(node)) continue;
    
    visited.add(node);
    visitFn(node);
    
    const neighbors = graph.getNeighbors(node);
    for (const neighbor of neighbors) {
      if (!visited.has(neighbor)) {
        stack.push(neighbor);
      }
    }
  }
  
  return visited;
}
```

**Uso**: Impact analysis, cycle detection, reachability

---

### 2. Cycle Detection

```javascript
// src/layer-graph/algorithms/cycles.js

function detectCycles(graph) {
  const cycles = [];
  const visited = new Set();
  const recursionStack = new Set();
  
  function dfs(node, path) {
    if (recursionStack.has(node)) {
      // Cycle detected
      const cycleStart = path.indexOf(node);
      cycles.push(path.slice(cycleStart));
      return;
    }
    
    if (visited.has(node)) return;
    
    visited.add(node);
    recursionStack.add(node);
    path.push(node);
    
    const neighbors = graph.getNeighbors(node);
    for (const neighbor of neighbors) {
      dfs(neighbor, [...path]);
    }
    
    recursionStack.delete(node);
  }
  
  for (const node of graph.getNodes()) {
    if (!visited.has(node)) {
      dfs(node, []);
    }
  }
  
  return cycles;
}
```

**Uso**: Circular dependency detection

---

### 3. Impact Analysis

```javascript
// src/layer-graph/algorithms/impact.js

function analyzeImpact(graph, targetNode) {
  const directDependents = graph.getCallers(targetNode);
  const transitiveDependents = new Set();
  
  // BFS para encontrar todos los dependientes transitivos
  const queue = [...directDependents];
  const visited = new Set(directDependents);
  
  while (queue.length > 0) {
    const node = queue.shift();
    transitiveDependents.add(node);
    
    const callers = graph.getCallers(node);
    for (const caller of callers) {
      if (!visited.has(caller)) {
        visited.add(caller);
        queue.push(caller);
      }
    }
  }
  
  return {
    directDependents,
    transitiveDependents: Array.from(transitiveDependents),
    totalAffected: directDependents.length + transitiveDependents.size,
    riskLevel: calculateRiskLevel(directDependents.length, transitiveDependents.size)
  };
}
```

**Uso**: `get_impact_map` MCP tool

---

## Persistencia en SQLite (v0.9.61)

### Tablas de Grafos

```sql
-- Atom relations (grafo de llamadas)
atom_relations (
    source_id TEXT,
    target_id TEXT,
    relation_type TEXT,
    weight REAL,
    context TEXT,
    PRIMARY KEY (source_id, target_id, relation_type)
);

-- Índices para queries rápidas
CREATE INDEX idx_relations_caller ON atom_relations(source_id);
CREATE INDEX idx_relations_callee ON atom_relations(target_id);
```

### Queries de Grafos

```javascript
// src/layer-graph/persistence/sqlite.js

async function getCallers(atomId) {
  const db = getDatabase();
  const stmt = db.prepare(`
    SELECT source_id, relation_type, context
    FROM atom_relations
    WHERE target_id = ?
  `);
  
  return stmt.all(atomId);
}

async function getCallees(atomId) {
  const db = getDatabase();
  const stmt = db.prepare(`
    SELECT target_id, relation_type, context
    FROM atom_relations
    WHERE source_id = ?
  `);
  
  return stmt.all(atomId);
}
```

---

## MCP Tools de Grafos

### `get_call_graph`

```bash
curl -X POST http://localhost:9999/tools/get_call_graph \
  -H "Content-Type: application/json" \
  -d '{"filePath": "src/utils.js", "symbolName": "processOrder"}'
```

**Retorna**:
```json
{
  "symbol": "processOrder",
  "graph": {
    "centrality": 0.25,
    "centralityClassification": "HUB",
    "inDegree": 12,
    "outDegree": 5,
    "propagationScore": 0.45,
    "riskScore": 0.6,
    "riskLevel": "MEDIUM"
  },
  "callSites": [
    {
      "file": "src/api.js",
      "function": "handleRequest",
      "line": 42,
      "context": "const result = await processOrder(order)"
    }
  ],
  "summary": {
    "totalCallSites": 12,
    "uniqueFiles": 8,
    "isWidelyUsed": true
  }
}
```

### `get_impact_map`

```bash
curl -X POST http://localhost:9999/tools/get_impact_map \
  -H "Content-Type: application/json" \
  -d '{"filePath": "src/utils.js"}'
```

**Retorna**:
```json
{
  "file": "src/utils.js",
  "directlyAffects": ["src/api.js", "src/controllers.js"],
  "transitiveAffects": ["src/routes.js", "src/app.js"],
  "totalAffected": 15,
  "riskLevel": "medium",
  "riskScore": 0.5
}
```

---

## Métricas de Performance

### Actuales (v0.9.61)

| Métrica | Valor |
|---------|-------|
| **Query de callers** | <10ms |
| **Query de callees** | <10ms |
| **Impact analysis** | <50ms |
| **Cycle detection** | <100ms |
| **Full graph build** | <1s |

### Objetivos Q2 2026

- [ ] Query de callers <5ms
- [ ] Impact analysis <25ms
- [ ] Full graph build <500ms

---

## Próximas Mejoras

### Q2 2026 - Tree-sitter Integration

**Qué**: Usar Tree-sitter para construir grafos más precisos

**Beneficios**:
- Mejor resolución de símbolos
- Tipos más precisos
- Performance mejorado

### Q3 2026 - Incremental Graph Updates

**Qué**: Actualizar solo partes del grafo que cambiaron

**Beneficios**:
- Análisis incremental más rápido
- Menor uso de memoria
- Mejor experiencia de desarrollo

---

**Última actualización**: 2026-02-25 (v0.9.61)  
**Estado**: ✅ **100% Estático, 0% LLM**  
**Próximo**: 🚧 Tree-sitter integration (Q2 2026)
