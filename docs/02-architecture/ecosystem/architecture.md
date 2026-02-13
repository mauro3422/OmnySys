# Arquitectura del Ecosistema

**Versión**: v0.7.1  
**Propósito**: Cómo los sistemas se alimentan mutuamente

---

## El Ecosistema vs El Pipeline

### ❌ Mentalidad Pipeline
```
Extracción → Validación → Almacenamiento → Uso
     A    →     B      →       C        →  D
```

Problemas:
- Datos "desaparecen" después de usarse
- No hay retroalimentación
- Cada etapa trabaja en aislamiento

### ✅ Mentalidad Ecosistema
```
                    ┌─────────────────┐
                    │   Shadow Registry│
                    │   (Memoria)      │
                    └────────┬────────┘
                             │
        ┌────────────────────┼────────────────────┐
        │                    │                    │
        ▼                    ▼                    ▼
┌───────────────┐   ┌───────────────┐   ┌───────────────┐
│  Data Flow    │◄─►│   Archetype   │◄─►│   Performance │
│  Analyzer     │   │   Detector    │   │   Impact      │
└───────┬───────┘   └───────┬───────┘   └───────┬───────┘
        │                   │                   │
        └───────────────────┼───────────────────┘
                            │
                            ▼
                    ┌───────────────┐
                    │  Clan Registry │
                    │  (Patrones)    │
                    └───────────────┘
```

Ventajas:
- Todo dato es reusable
- Conexiones emergentes
- Insights multiplicativos

---

## Ciclos de Alimentación Mutua

### Ciclo 1: Complexity → God-Object → Performance

```javascript
// "Dato simple": Cyclomatic complexity = 12
atom.metrics = {
  cyclomaticComplexity: 12,
  nestedLoops: 2
};

// Archetype Detector consume:
if (atom.metrics.cyclomaticComplexity > 10 && 
    atom.connections.length > 15) {
  archetype = {
    type: 'god-function',
    confidence: 0.85,
    evidence: ['high-complexity', 'many-connections']
  };
}

// Shadow Registry consume el archetype:
if (archetype.type === 'god-function') {
  // Más "peso" en la vibración
  shadow.inheritance.vibrationScore *= 1.2;
}

// Performance Impact consume todo:
if (archetype.type === 'god-function' && 
    atom.metrics.nestedLoops > 0) {
  performance.impact = 'blocking';
  performance.recommendation = 'Consider splitting this god-function';
}
```

**Flujo**: Complexity → Archetype → Shadow → Performance

---

### Ciclo 2: Operation Sequence → Clan → Predicción

```javascript
// "Dato simple": operationSequence
atom.dna.operationSequence = [
  'receive', 'read', 'transform', 'persist'
];

// Clan Registry detecta similitud:
const clan = findClanBySequence(atom.dna.operationSequence);
// → Clan "read-transform-persist"

// Archetype usa el clan:
atom.archetype = {
  ...atom.archetype,
  clan: clan.id,
  similarFunctions: clan.members
};

// Predicción basada en historia del clan:
prediction = {
  basedOn: clan.historicalChanges,
  suggestion: "Functions in clan 'read-transform-persist' often need:",
  recommendations: [
    "1. Add validation after 'read'",
    "2. Consider caching before 'persist'",
    "3. 67% added error handling in phase 2"
  ]
};
```

**Flujo**: Operation Sequence → Clan → Archetype → Predicción

---

### Ciclo 3: Todos los Datos → Context Query Inteligente

```javascript
function generateContext(filePath) {
  const atom = getAtom(filePath);
  
  // Conectar complexity + connections + ancestry
  const criticality = calculateCriticality({
    complexity: atom.metrics.cyclomaticComplexity,
    connections: atom.connections.length,
    vibration: atom.ancestry?.vibrationScore,
    generation: atom.ancestry?.generation
  });
  
  // Conectar data flow + type contracts + error flow
  const dataRisks = analyzeDataFlowRisks({
    inputs: atom.dataFlow.inputs,
    outputs: atom.dataFlow.outputs,
    typeContracts: atom.typeContracts,
    errorFlows: atom.errorFlow.throws
  });
  
  // Conectar performance + temporal + archetype
  const executionProfile = analyzeExecution({
    performance: atom.performance,
    temporal: atom.temporal,
    archetype: atom.archetype
  });
  
  return {
    criticality,      // Qué tan crítico es cambiar esto
    dataRisks,        // Riesgos de flujo de datos
    executionProfile  // Perfil de ejecución
  };
}
```

**Flujo**: Todos los datos → Contexto integrado

---

## Matriz de Alimentación Completa

| Sistema | Consume de | Produce para | Valor Generado |
|---------|-----------|--------------|----------------|
| **DNA Extractor** | Data Flow, Semantic | Shadow Registry, Clan Registry | Fingerprint estructural |
| **Shadow Registry** | DNA, Metadata | Archetype Detector, Context Queries | Historia + Linaje |
| **Archetype Detector** | Metrics, Connections, Ancestry | Performance, Warnings, LLM Decision | Clasificación de riesgo |
| **Performance Impact** | Archetype, Metrics, Complexity | Warnings, Critical Path | Recomendaciones de optimización |
| **Type Contracts** | JSDoc, Code, Data Flow | Error Flow, Connection Validation | Contratos de tipo |
| **Error Flow** | Type Contracts, Calls | Unhandled Error Detection, Risk Score | Riesgo de errores |
| **Temporal** | Lifecycle, Async | Race Detection, Init Order | Detección de races |
| **Clan Registry** | DNA, Operation Sequence | Pattern Prediction, Recommendations | Predicciones basadas en historia |

---

## Conexiones Invisibles (Ejemplos)

### Ejemplo 1: Complexity + Ancestry + Archetype

```javascript
// Atom: processOrder
{
  metrics: { cyclomaticComplexity: 12 },
  ancestry: { generation: 3, vibrationScore: 0.8 },
  archetype: { type: 'business-logic' }
}

// Conexión invisible detectada:
"Esta función es compleja (12) Y tiene historia (gen 3) 
 Y es business-logic. 
 
 Funciones similares en el pasado:
 - 80% fueron refactorizadas en gen 4
 - 60% se dividieron en 2 funciones
 - Riesgo de 'god-function' aumenta con generación"
```

### Ejemplo 2: Nested Loops + Performance + Data Flow

```javascript
// Atom: calculateStats
{
  metrics: { nestedLoops: 2 },
  performance: { bigO: 'O(n²)' },
  dataFlow: { 
    inputs: [{ name: 'items', type: 'Array' }],
    outputs: [{ type: 'return' }]
  }
}

// Conexión invisible:
"O(n²) + input 'items' (Array) + nested loops = 
 Riesgo de performance si 'items' crece.
 
 Detectado: 3 funciones llaman a calculateStats
 con arrays de >1000 items.
 
 Recomendación: Agregar early return o memoization"
```

### Ejemplo 3: Operation Sequence + Clan + Error Flow

```javascript
// Clan: "read-transform-persist"
// Miembros: [validateOrder, processPayment, saveUser]

// Patrón detectado en el clan:
"67% de funciones en este clan agregaron 
 error handling después de 'read' en gen 2.

 Tu función (gen 1) no tiene error handling en 'read'.
 Predicción: 78% probabilidad de necesitarlo."
```

---

## Implementación: Sistema de Insights

```javascript
// insight-generator.js

export function generateInsights(atom, ecosystem) {
  const insights = [];
  
  // Conectar complexity + ancestry
  if (atom.metrics.cyclomaticComplexity > 10 && 
      atom.ancestry?.generation > 2) {
    insights.push({
      type: 'historical-risk',
      severity: 'high',
      message: 'Complex function with long lineage - refactor likely needed',
      evidence: {
        complexity: atom.metrics.cyclomaticComplexity,
        generation: atom.ancestry.generation,
        similarRefactors: ecosystem.clan.getHistoricalRefactors(atom.dna.clan)
      }
    });
  }
  
  // Conectar performance + temporal
  if (atom.performance?.impactScore > 0.6 &&
      atom.temporal?.patterns?.isInitializer) {
    insights.push({
      type: 'startup-performance',
      severity: 'critical',
      message: 'Slow initialization will delay app startup',
      evidence: {
        impactScore: atom.performance.impactScore,
        isInitializer: true,
        dependentCount: atom.calledBy?.length
      }
    });
  }
  
  // Conectar type contracts + error flow
  if (atom.typeContracts?.confidence < 0.5 &&
      atom.errorFlow?.throws?.length > 0) {
    insights.push({
      type: 'api-stability-risk',
      severity: 'medium',
      message: 'Poorly typed function that throws errors - API contract unclear',
      evidence: {
        typeConfidence: atom.typeContracts.confidence,
        throwCount: atom.errorFlow.throws.length
      }
    });
  }
  
  return insights;
}
```

---

## Patrones de Diseño del Ecosistema

### 1. Todo es Evento

Cuando un sistema produce datos, emite eventos:

```javascript
// DNA Extractor
emitter.emit('dna:extracted', { atomId, dna });

// Shadow Registry escucha
emitter.on('dna:extracted', ({ atomId, dna }) => {
  registry.findSimilar(dna);
});

// Archetype Detector escucha
emitter.on('dna:extracted', ({ atomId, dna }) => {
  detector.classify(dna);
});
```

### 2. Lazy Evaluation

Los insights se generan bajo demanda:

```javascript
// No precalculamos todo
const insights = {
  // Getter lazy
  get criticality() {
    return calculateCriticality(this.atom);
  },
  get dataRisks() {
    return analyzeDataFlowRisks(this.atom);
  }
};
```

### 3. Cache de Conexiones

Las conexiones calculadas se cachean:

```javascript
const connectionCache = new Map();

function getConnectedInsights(atom) {
  const key = atom.id;
  if (connectionCache.has(key)) {
    return connectionCache.get(key);
  }
  
  const insights = generateInsights(atom);
  connectionCache.set(key, insights);
  return insights;
}
```

---

## Referencias

- [value-flow.md](./value-flow.md) - Cómo fluye el valor
- [../data-flow/concepts.md](../data-flow/concepts.md) - Origen de datos
- [../archetypes/system.md](../archetypes/system.md) - Clasificación
- [../shadow-registry/dna-system.md](../shadow-registry/dna-system.md) - Memoria
