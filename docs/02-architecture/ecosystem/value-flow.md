# Flujo de Valor - Conexiones que Crean Conexiones

**Versión**: v0.7.1  
**Principio**: El valor de un dato está en **quién lo consume**, no en quién lo genera.

> *"Una conexión asegura otra, y esa nueva conexión sirve en otro lado. Todo es simbiosis."*

---

## De Datos Crudos a Valor

### El Problema

Los datos crudos **solos** no tienen valor:

```javascript
// Datos crudos (bajo valor)
{
  cyclomaticComplexity: 12,
  operationSequence: ['receive', 'read', 'transform', 'persist'],
  nestedLoops: 2,
  generation: 3
}

// ¿Qué significa esto? ¿Qué hago con esto?
```

### La Solución: Conectar para Crear Valor

```javascript
// DATO 1: Cyclomatic Complexity
atom.metrics.cyclomaticComplexity = 15;
// Solo: "Es complejo"

// DATO 2: Ancestry Generation  
atom.ancestry.generation = 3;
// Solo: "Tiene historia"

// DATO 3: Archetype
atom.archetype.type = 'business-logic';
// Solo: "Es lógica de negocio"

// CONECTADOS: Criticality Calculator
criticality = calculateCriticality({
  complexity: atom.metrics.cyclomaticComplexity,  // 15
  generation: atom.ancestry.generation,           // 3
  archetype: atom.archetype.type,                 // 'business-logic'
  connections: atom.connections.length            // 12
});

// RESULTADO: Valor emergente
{
  score: 0.87,  // HIGH
  reason: "Complex business logic with lineage + many connections",
  risk: "Changes will have cascade effects",
  
  // NUEVO VALOR: Recomendación específica
  recommendation: {
    action: "refactor",
    strategy: "Extract validation logic (seen in 80% of gen 4)",
    confidence: 0.82
  }
}

// VALOR FINAL: Saber NO solo que es complejo, sino QUÉ hacer
```

---

## Ejemplos de Valor Emergente

### Ejemplo 1: Operation Sequence → Clan → Predicción → Warning

**Paso 1: Dato Generado**
```javascript
// Data Flow Extractor
atom.operationSequence = ['receive', 'read', 'transform', 'persist'];
// Valor: 0 (solo strings)
```

**Paso 2: Procesado**
```javascript
// Clan Registry
clan = findClanBySequence(atom.operationSequence);
// → Clan "read-transform-persist"

clan.historicalPatterns = {
  evolution: "67% agregaron validación en gen 2",
  commonMistakes: ["Olvidar error handling en 'read'"],
  avgComplexityGrowth: 1.4
};
// Valor: Medio (patrones históricos)
```

**Paso 3: Consumido**
```javascript
// Context Query
warning = {
  type: 'clan-pattern',
  message: "Funciones del clan 'read-transform-persist' suelen:",
  predictions: [
    "1. Agregar validación (67% probabilidad)",
    "2. Crecer en complejidad (avg +40%)"
  ],
  recommendation: "Considera agregar validación temprano"
};
// Valor: ALTO (acción concreta)
```

**Flujo de valor**:
- Generado: Data Flow (bajo)
- Procesado: Clan Registry (medio)
- Consumido: Warning útil (ALTO)

---

### Ejemplo 2: Type Contract + Error Flow + Performance

**Datos individuales**:
```javascript
// Dato A: Type Contract
atom.typeContracts.confidence = 0.4;
// Solo: "Tipos poco claros"

// Dato B: Error Flow
atom.errorFlow.throws = [
  { type: 'ValidationError', confidence: 1.0 },
  { type: 'NetworkError', confidence: 0.7 }
];
// Solo: "Lanza 2 errores"

// Dato C: Performance
atom.performance.impactScore = 0.75;
// Solo: "Es lento"
```

**Conectados**:
```javascript
// API Stability Analyzer
stability = analyzeAPIStability({
  typeConfidence: atom.typeContracts.confidence,      // 0.4
  errorCount: atom.errorFlow.throws.length,           // 2
  performance: atom.performance.impactScore,          // 0.75
  isExported: atom.isExported                         // true
});

// Resultado
{
  apiContract: 'unstable',
  riskLevel: 'high',
  
  // POR QUÉ es inestable
  reasons: [
    "Tipos poco claros (40% confianza) + múltiples errores = contrato débil",
    "Performance variable (0.75) + errores de red = comportamiento impredecible",
    "Función exportada = impacto amplio"
  ],
  
  // QUÉ arreglar primero
  priority: [
    "1. Agregar JSDoc (subir confianza a >0.8)",
    "2. Documentar errores posibles",
    "3. Agregar timeout handling consistente"
  ]
}
```

**Valor**: Entender por qué la API es frágil y cómo arreglarla.

---

## Presentación Contextual

### Contexto: "Voy a editar esta función"

**NO mostrar**:
- Cyclomatic complexity: 12
- operationSequence: ['a', 'b', 'c']
- DNA hash: abc123

**SÍ mostrar** (generado de esos datos):

```
📦 api.js (processOrder)

🔗 CONEXIONES GENERADAS AL VUELO:

1. [Criticality] HIGH
   └─ Fuente: complexity(12) × connections(15) × vibration(0.8)
   └─ Significado: Cambios impactan MUCHO

2. [Historical Pattern] REFACTOR LIKELY
   └─ Fuente: Clan("read-transform") + Generation(3)
   └─ Significado: Historia muestra que esta función crece

3. [Data Risk] TYPE MISMATCH
   └─ Fuente: Data Flow + Type Contracts
   └─ Significado: Output no coincide con input del consumidor

4. [Performance Chain] BLOCKING
   └─ Fuente: Performance + Call Graph
   └─ Significado: 3 funciones bloquean el render

5. [Error Leak] UNHANDLED
   └─ Fuente: Error Flow + Call Graph
   └─ Significado: Error puede escapar al usuario

💡 INSIGHTS GENERADOS:
   "Esta función es un punto crítico por múltiples razones:
    - Tiene historia de crecimiento (gen 3)
    - Es compleja (12) y conectada (15)
    - Tiene un type mismatch no resuelto
    - Bloquea la UI (150ms)
    - Puede lanzar errores no manejados"
```

---

## Transformaciones de Valor

### De Dato a Insight

| Dato Crudo | Transformación | Valor Final |
|------------|----------------|-------------|
| `complexity: 12` | × `connections: 15` × `generation: 3` | "Riesgo alto de refactor" |
| `operationSequence` | → Clan → Historia | "67% necesitan validación" |
| `nestedLoops: 2` | + `bigO: O(n²)` + `input: Array` | "Riesgo performance" |
| `typeConfidence: 0.4` | + `throws: 3` + `exported: true` | "API inestable - documentar" |
| `vibrationScore: 0.8` | + `generation: 3` | "Muchas conexiones históricas" |

---

## Simbiosis: Cómo los Sistemas se Alimentan

```
┌─────────────────────────────────────────────────────────────┐
│  Data Flow (A)                                              │
│  └─ Genera: operationSequence, inputs, outputs              │
│                                                             │
│  Usado por:                                                 │
│  ├──► DNA Extractor → structuralHash, patternHash           │
│  ├──► Clan Registry → clan membership                       │
│  └──► Type Contracts → input/output types                   │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│  Clan Registry (B)                                          │
│  └─ Genera: historicalPatterns, predictions                 │
│                                                             │
│  Usado por:                                                 │
│  ├──► Archetype Detector → clan-based classification        │
│  └──► Insight Generator → warnings basados en historia      │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│  Shadow Registry (C)                                        │
│  └─ Genera: ancestry, vibrationScore, lineage               │
│                                                             │
│  Usado por:                                                 │
│  ├──► Archetype Detector → confidence boost                 │
│  ├──► Insight Generator → historical risk warnings          │
│  └──► Criticality Calculator → generational impact          │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│  Insight Generator (D)                                      │
│  └─ Genera: actionable warnings, recommendations            │
│                                                             │
│  Usado por:                                                 │
│  ├──► Orchestrator → priorización de análisis               │
│  └──► MCP Tools → contexto para LLM                         │
└─────────────────────────────────────────────────────────────┘
```

**Cada flecha es un flujo de valor.**

---

## Reglas de Oro

### Para Presentar Datos

1. **Nunca mostrar datos crudos** sin contexto
2. **Siempre explicar el "por qué"** (qué significa)
3. **Incluir recomendación accionable** (qué hacer)
4. **Mostrar fuentes** (de dónde viene)

### Para Diseñar Sistemas

1. **Todo dato debe ser consumible** por otro sistema
2. **Emitir eventos** cuando se generan datos
3. **Permitir lazy evaluation** (no precalcular todo)
4. **Cachear conexiones** ya calculadas

---

## Ejemplo: Generación de Contexto para LLM

```javascript
// NO: Enviar datos crudos al LLM
const badPrompt = `
  Function: processOrder
  Complexity: 12
  Lines: 45
  Exports: 3
  Imports: ['lodash', 'react']
  DNA: abc123def456
`;

// SÍ: Enviar insights generados
const goodPrompt = `
  Function: processOrder
  
  CRITICALITY: HIGH
  - Complexity (12) × Connections (15) = High impact
  - Generation 3 in Shadow Registry = Historical growth pattern
  - 80% similar functions were refactored in gen 4
  
  RISKS DETECTED:
  1. Type mismatch between output and consumer (validateOrder)
  2. Performance bottleneck (150ms, blocks 3 UI components)
  3. Unhandled errors may leak to user (2 throw paths)
  
  RECOMMENDATIONS:
  - Consider splitting into smaller functions
  - Add validation layer (common in this clan: 67%)
  - Document error contract for consumers
`;
```

**El segundo prompt genera mejor respuesta porque el valor ya fue extraído.**

---

## Referencias

- [architecture.md](./architecture.md) - Cómo se conectan los sistemas
- [../data-flow/concepts.md](../data-flow/concepts.md) - Origen de datos
- [../shadow-registry/lifecycle.md](../shadow-registry/lifecycle.md) - Memoria histórica
