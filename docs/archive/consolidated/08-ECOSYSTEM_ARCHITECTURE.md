---
⚠️  DOCUMENTO ARCHIVADO - Ver nueva ubicación
---
Este documento ha sido consolidado en la nueva estructura de documentación.

📍 Nueva ubicación: Ver docs/archive/consolidated/README.md para el mapa completo

🚀 Usar en su lugar:
- docs/01-core/ (fundamentos)
- docs/02-architecture/ (sistemas)
- docs/04-guides/ (guías prácticas)

---
Documento original (mantenido para referencia histórica):
# Arquitectura de Ecosistema - Todo se Alimenta de Todo

**VisiÃ³n**: OmnySys no es un pipeline (Aâ†’Bâ†’C), es un **ecosistema de datos** donde cada sistema se alimenta de los demÃ¡s.

> *"No hay ruido, solo datos esperando ser conectados"*

---

## ðŸŒ El Ecosistema en Lugar del Pipeline

### Mentalidad Pipeline (incorrecta)
```
ExtracciÃ³n â†’ ValidaciÃ³n â†’ Almacenamiento â†’ Uso
     A    â†’     B      â†’       C        â†’  D
```

### Mentalidad Ecosistema (correcta)
```
                    â”Œâ”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”
                    â”‚   Shadow Registryâ”‚
                    â”‚   (Memoria)      â”‚
                    â””â”€â”€â”€â”€â”€â”€â”€â”€â”¬â”€â”€â”€â”€â”€â”€â”€â”€â”˜
                             â”‚
        â”Œâ”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”¼â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”
        â”‚                    â”‚                    â”‚
        â–¼                    â–¼                    â–¼
â”Œâ”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”   â”Œâ”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”   â”Œâ”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”
â”‚  Data Flow    â”‚â—„â”€â–ºâ”‚   Archetype   â”‚â—„â”€â–ºâ”‚   Performance â”‚
â”‚  Analyzer     â”‚   â”‚   Detector    â”‚   â”‚   Impact      â”‚
â””â”€â”€â”€â”€â”€â”€â”€â”¬â”€â”€â”€â”€â”€â”€â”€â”˜   â””â”€â”€â”€â”€â”€â”€â”€â”¬â”€â”€â”€â”€â”€â”€â”€â”˜   â””â”€â”€â”€â”€â”€â”€â”€â”¬â”€â”€â”€â”€â”€â”€â”€â”˜
        â”‚                   â”‚                   â”‚
        â””â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”¼â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”˜
                            â”‚
                            â–¼
                    â”Œâ”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”
                    â”‚  Clan Registry â”‚
                    â”‚  (Patrones)    â”‚
                    â””â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”˜
```

**Cada sistema consume datos de TODOS los demÃ¡s**.

---

## ðŸ”„ Ciclos de AlimentaciÃ³n Mutua

### Ciclo 1: Cyclomatic Complexity â†’ God-Object Detection

```javascript
// "Ruido": Cyclomatic complexity = 7
// En realidad es INPUT para otro sistema

atom.metrics = {
  cyclomaticComplexity: 7,
  nestedLoops: 2
};

// Archetype Detector consume esto:
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
  shadow.inheritance.vibrationScore *= 1.2; // MÃ¡s "peso"
}

// Performance Impact consume el archetype + complexity:
if (archetype.type === 'god-function' && 
    atom.metrics.nestedLoops > 0) {
  performance.impact = 'blocking';
  performance.recommendation = 'Consider splitting this god-function';
}
```

**Todo es Ãºtil. Todo fluye.**

---

### Ciclo 2: Operation Sequence â†’ Clan Registry â†’ PredicciÃ³n

```javascript
// "Ruido": operationSequence = ['receive', 'read', 'transform', 'emit']
// En realidad es FIRMA del comportamiento

atom.dna.operationSequence = ['receive', 'read', 'transform', 'emit'];

// Clan Registry detecta similitud:
const clan = findClanBySequence(atom.dna.operationSequence);
// â†’ Clan "read-transform-persist"

// Archetype usa el clan:
atom.archetype = {
  ...atom.archetype,
  clan: clan.id,
  similarFunctions: clan.members
};

// Cuando editÃ¡s esta funciÃ³n, el sistema predice:
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

**La operationSequence no es ruido, es ADN comportamental.**

---

### Ciclo 3: TODOS los Datos â†’ Context Query Inteligente

```javascript
// Cuando levantÃ¡s una caja, NO es "mostrar todo vs filtrar"
// Es "conectar todo para generar insights"

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
    criticality,
    dataRisks,
    executionProfile,
    // Todo conectado, todo generado de todo
  };
}
```

---

## ðŸ“Š Matriz de AlimentaciÃ³n (QuiÃ©n consume quÃ©)

| Sistema | Consume de | Produce para |
|---------|-----------|--------------|
| **DNA Extractor** | Data Flow, Semantic | Shadow Registry, Clan Registry |
| **Shadow Registry** | DNA, Metadata | Archetype Detector, Context Queries |
| **Archetype Detector** | Metrics, Connections, Ancestry | Performance, Warnings, LLM Bypass |
| **Performance Impact** | Archetype, Metrics, Complexity | Warnings, Critical Path Detection |
| **Type Contracts** | JSDoc, Code, Data Flow | Error Flow, Connection Validation |
| **Error Flow** | Type Contracts, Calls | Unhandled Error Detection, Risk Score |
| **Temporal** | Lifecycle, Async | Race Detection, Init Order |
| **Clan Registry** | DNA, Operation Sequence | Pattern Prediction, Recommendations |

**Nada es ruido. Todo es input para algo.**

---

## ðŸ’¡ Ejemplos de Conexiones Invisibles

### Ejemplo 1: Complexity + Ancestry + Archetype
```javascript
// Atom: processOrder
{
  metrics: { cyclomaticComplexity: 12 },
  ancestry: { generation: 3, vibrationScore: 0.8 },
  archetype: { type: 'business-logic' }
}

// ConexiÃ³n invisible detectada:
"Esta funciÃ³n es compleja (12) Y tiene historia (gen 3) 
 Y es business-logic. 
 
 Funciones similares en el pasado:
 - 80% fueron refactorizadas en gen 4
 - 60% se dividieron en 2 funciones
 - Riesgo de 'god-function' aumenta con generaciÃ³n"
```

### Ejemplo 2: Nested Loops + Performance + Data Flow
```javascript
// Atom: calculateStats
{
  metrics: { nestedLoops: 2 },
  performance: { bigO: 'O(nÂ²)' },
  dataFlow: { 
    inputs: [{ name: 'items', type: 'Array' }],
    outputs: [{ type: 'return' }]
  }
}

// ConexiÃ³n invisible:
"O(nÂ²) + input 'items' (Array) + nested loops = 
 Riesgo de performance si 'items' crece.
 
 Detectado: 3 funciones llaman a calculateStats
 con arrays de >1000 items.
 
 RecomendaciÃ³n: Agregar early return o memoization"
```

### Ejemplo 3: Operation Sequence + Clan + Error Flow
```javascript
// Clan: "read-transform-persist"
// Miembros: [validateOrder, processPayment, saveUser]

// PatrÃ³n detectado en el clan:
"67% de funciones en este clan agregaron 
 error handling despuÃ©s de 'read' en gen 2.

 Tu funciÃ³n (gen 1) no tiene error handling en 'read'.
 PredicciÃ³n: 78% probabilidad de necesitarlo."
```

---

## ðŸŽ¯ La Nueva VisiÃ³n del "Contexto"

Cuando levantÃ¡s una caja, no ves "datos crudos" ni "datos filtrados".

**Ves conexiones generadas dinÃ¡micamente de TODOS los datos:**

```javascript
ðŸ“¦ api.js (processOrder)

ðŸ”— CONEXIONES GENERADAS AL VUELO:

1. [Criticality] HIGH
   â””â”€ Fuente: complexity(12) Ã— connections(15) Ã— vibration(0.8)
   â””â”€ Significado: Cambios impactan MUCHO

2. [Historical Pattern] REFACTOR LIKELY
   â””â”€ Fuente: Clan("read-transform") + Generation(3)
   â””â”€ Significado: Historia muestra que esta funciÃ³n crece

3. [Data Risk] TYPE MISMATCH
   â””â”€ Fuente: Data Flow + Type Contracts
   â””â”€ Significado: Output no coincide con input del consumidor

4. [Performance Chain] BLOCKING
   â””â”€ Fuente: Performance + Call Graph
   â””â”€ Significado: 3 funciones bloquean el render

5. [Error Leak] UNHANDLED
   â””â”€ Fuente: Error Flow + Call Graph
   â””â”€ Significado: Error puede escapar al usuario

ðŸ’¡ INSIGHTS GENERADOS:
   "Esta funciÃ³n es un punto crÃ­tico por mÃºltiples razones:
    - Tiene historia de crecimiento (gen 3)
    - Es compleja (12) y conectada (15)
    - Tiene un type mismatch no resuelto
    - Bloquea la UI (150ms)
    - Puede lanzar errores no manejados"
```

**Cada insight viene de conectar mÃºltiples datos.**

---

## ðŸ”§ ImplementaciÃ³n: Sistema de Insights

```javascript
// Nuevo mÃ³dulo: insight-generator.js

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
  
  // Conectar performance + data flow + temporal
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

## âœ… ConclusiÃ³n

**Todo es Ãºtil. Todo estÃ¡ conectado. Todo se alimenta de todo.**

- **Cyclomatic complexity** â†’ Input para archetype detection + criticality
- **Nested loops** â†’ Input para performance prediction
- **Operation sequence** â†’ Input para clan registry + pattern matching
- **42 lÃ­neas de cÃ³digo** â†’ Input para complexity normalization
- **DNA completo** â†’ Input para Shadow Registry + matching

El sistema no es: **Extraer â†’ Filtrar â†’ Mostrar**

El sistema es: **Extraer â†’ Conectar TODO â†’ Generar Insights**

**Cada dato es una pieza del rompecabezas. Solo tiene sentido cuando se conecta.**

