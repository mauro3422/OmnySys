# Visión: Código como Sistema Físico

**Versión**: 2.0.0  
**Estado**: ✅ **100% Estático, 0% LLM** - Semantic Algebra en Producción  
**Creado**: 2026-02-18  
**Última actualización**: 2026-02-25 (v0.9.61)  
**Próximo**: 🚧 Migración a Tree-sitter (Q2 2026)

---

## La Idea Central

> **El código no es solo texto. Es un sistema físico observable con propiedades medibles, patrones predecibles, y leyes que lo gobiernan.**

Si la física estudia partículas y sus interacciones, OmnySys estudia funciones y sus conexiones. Y al igual que la física, podemos:

1. **Medir** propiedades (complejidad, impacto, entropía)
2. **Predecir** comportamientos (si cambio X, pasa Y)
3. **Reparar** automáticamente (recalcular conexiones)
4. **Detectar** anomalías (entropía alta = código enfermo)

**IMPORTANTE**: Todo el análisis es **100% ESTÁTICO, 0% LLM**. No usamos inteligencia artificial para extraer metadata, solo AST + regex + álgebra de grafos.

---

## Los Datos que Tenemos

### Layer A Extrae (por archivo)

```
┌─────────────────────────────────────────────────────────────────────────┐
│                    17 EXTRACTORES ACTIVOS (100% ESTÁTICOS)              │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│  CONTRATOS              PATRONES              AVANZADOS                 │
│  ─────────              ─────────              ─────────                │
│  • jsdoc                • async patterns       • side effects           │
│  • runtime              • error handling       • call graph             │
│                         • build deps           • data flow              │
│                                                • type inference         │
│                                                • temporal patterns      │
│                                                • dependency depth       │
│                                                • performance hints      │
│                                                • historical metadata    │
│                                                • DNA                    │
│                                                • error flow             │
│                                                • performance metrics    │
│                                                • type contracts         │
│                                                • caller patterns        │
│                                                • file culture           │
│                                                                         │
│  NOTA: Todos los extractores son 100% estáticos (AST + regex).         │
│        CERO uso de LLM.                                                │
│                                                                         │
└─────────────────────────────────────────────────────────────────────────┘
```

### Lo que Podemos Calcular

```
DADO un átomo (función), podemos saber:

┌─────────────────────────────────────────────────────────────────────────┐
│  PROPIEDAD           │  CÓMO SE CALCULA           │  QUÉ NOS DICE       │
├─────────────────────────────────────────────────────────────────────────┤
│  Complejidad         │  AST + McCabe              │  Dificultad mental  │
│  Impacto             │  usedBy + transitive       │  Blast radius       │
│  Estabilidad         │  cambiosRecientes / total  │  Probabilidad bug   │
│  Entropía            │  conexionesRotas / total   │  Salud del código   │
│  Confianza           │  patronesDetectados        │  Calidad metadata   │
│  Peso                │  α×complejidad + β×impacto │  Importancia        │
│  Cohesión            │  internal / total calls    │  Acoplamiento       │
│  Antigüedad          │  file.mtime                │  Deuda técnica      │
└─────────────────────────────────────────────────────────────────────────┘

Todos los cálculos son 100% determinísticos. Misma entrada → misma salida.
```

---

## Concepto 1: Entropía del Código

### Definición

La **entropía** mide qué tan "desordenado" está el código. Igual que en termodinámica:

- **Entropía baja** = Código ordenado, predecible, mantenible
- **Entropía alta** = Código caótico, impredecible, propenso a bugs

### Cálculo (v0.9.61)

```javascript
// src/layer-a-static/analyses/metrics.js

function calculateEntropy(file) {
  const connections = file.semanticConnections || [];
  const totalConnections = connections.length;
  
  if (totalConnections === 0) return 0;
  
  const healthyConnections = connections.filter(c => 
    c.confidence >= 0.8 && !c.isBroken
  ).length;
  
  const healthRatio = healthyConnections / totalConnections;
  
  // Entropía = 1 - salud (más saludable = menos entropía)
  return 1 - healthRatio;
}
```

### Ejemplo

```javascript
// Archivo con baja entropía (saludable)
const lowEntropy = {
  connections: [
    { to: 'utils.js', confidence: 0.95, status: 'healthy' },
    { to: 'config.js', confidence: 0.92, status: 'healthy' },
    { to: 'types.js', confidence: 0.88, status: 'healthy' }
  ]
};
// Entropía ≈ 0.1 (muy ordenado)

// Archivo con alta entropía (enfermo)
const highEntropy = {
  connections: [
    { to: 'utils.js', confidence: 0.3, status: 'broken' },
    { to: 'deleted.js', confidence: 0.0, status: 'broken' },
    { to: 'mystery.js', confidence: 0.2, status: 'unknown' }
  ]
};
// Entropía ≈ 0.9 (caótico)
```

---

## Concepto 2: Vectores Matemáticos

### Los 6 Vectores Principales

Cada átomo tiene 6 vectores matemáticos que lo describen:

```javascript
// src/layer-c-memory/storage/enrichers/atom-enricher.js

const vectors = {
  // 1. Importancia: qué tan central es el átomo
  importance_score: calculateImportance(atom),
  
  // 2. Acoplamiento: cuántas dependencias tiene
  coupling_score: calculateCoupling(atom),
  
  // 3. Cohesión: qué tan relacionadas están sus responsabilidades
  cohesion_score: calculateCohesion(atom),
  
  // 4. Estabilidad: qué tan probable es que cambie
  stability_score: calculateStability(atom),
  
  // 5. Propagación: qué tan lejos llega su impacto
  propagation_score: calculatePropagation(atom),
  
  // 6. Fragilidad: qué tan propenso es a romperse
  fragility_score: calculateFragility(atom)
};
```

### Cálculos

```javascript
// Importancia = centralidad en el grafo
function calculateImportance(atom) {
  const centrality = atom.graph?.centrality || 0;
  const calledBy = atom.calledBy?.length || 0;
  return (centrality * 0.7) + (Math.min(calledBy / 10, 1) * 0.3);
}

// Acoplamiento = dependencias externas
function calculateCoupling(atom) {
  const calls = atom.calls?.length || 0;
  const externalCalls = atom.calls?.filter(c => c.isExternal) || 0;
  return externalCalls / Math.max(calls, 1);
}

// Cohesión = responsabilidades relacionadas
function calculateCohesion(atom) {
  const internalCalls = atom.calls?.filter(c => !c.isExternal) || 0;
  const totalCalls = atom.calls?.length || 1;
  return internalCalls.length / totalCalls;
}

// Estabilidad = 1 / frecuencia de cambios
function calculateStability(atom) {
  const ageDays = atom.ageDays || 1;
  const changes = atom.changeFrequency || 0;
  return Math.min(1, ageDays / (changes * 10 + 1));
}

// Propagación = blast radius
function calculatePropagation(atom) {
  const graph = atom.graph || {};
  return graph.propagationScore || 0;
}

// Fragilidad = riesgo de romperse
function calculateFragility(atom) {
  const complexity = atom.complexity || 1;
  const calledBy = atom.calledBy?.length || 0;
  return Math.min(1, (complexity / 20) * (calledBy / 10));
}
```

---

## Concepto 3: Sociedad de Átomos

### Arquetipos Detectados (100% Estático)

```javascript
// src/layer-a-static/pipeline/phases/atom-extraction/metadata/archetype-rules.js

const ATOM_ARCHETYPES = {
  // Arquetipos estructurales
  'hot-path': {
    detector: (atom) => atom.isExported && atom.calledBy?.length > 5,
    severity: 7
  },
  'utility': {
    detector: (atom) => !atom.hasSideEffects && atom.complexity < 5,
    severity: 2
  },
  'god-function': {
    detector: (atom) => atom.complexity > 20 || atom.linesOfCode > 100,
    severity: 9
  },
  'dead-function': {
    detector: (atom) => !atom.isExported && atom.calledBy?.length === 0,
    severity: 5
  },
  'fragile-network': {
    detector: (atom) => atom.hasNetworkCalls && !atom.hasErrorHandling,
    severity: 8
  },
  
  // Arquetipos de propósito
  'factory': {
    detector: (atom) => atom.name.startsWith('create') || atom.name.startsWith('build'),
    severity: 4
  },
  'validator': {
    detector: (atom) => atom.name.startsWith('validate') || atom.name.startsWith('check'),
    severity: 6
  },
  'transformer': {
    detector: (atom) => atom.dataFlow?.operationSequence?.includes('transform'),
    severity: 5
  },
  'persister': {
    detector: (atom) => atom.dataFlow?.operationSequence?.includes('persist'),
    severity: 6
  }
};
```

### Propósitos Detectados

```javascript
// src/layer-a-static/pipeline/phases/atom-extraction/metadata/purpose-enricher.js

const ATOM_PURPOSES = {
  API_EXPORT:       '📤 Exportado - API pública',
  EVENT_HANDLER:    '⚡ Maneja eventos/lifecycle',
  TEST_HELPER:      '🧪 Función en test',
  TIMER_ASYNC:      '⏱️ Timer o async pattern',
  NETWORK_HANDLER:  '🌐 Hace llamadas de red',
  INTERNAL_HELPER:  '🔧 Helper interno',
  CONFIG_SETUP:     '⚙️ Configuración',
  SCRIPT_MAIN:      '🚀 Entry point de script',
  CLASS_METHOD:     '📦 Método de clase',
  DEAD_CODE:        '💀 Sin evidencia de uso'
};
```

---

## Concepto 4: Culturas de Archivos

### Clasificación (ZERO LLM)

```javascript
// src/layer-a-static/analysis/file-culture-classifier.js

const FILE_CULTURES = {
  'laws': {
    detector: (file) => 
      file.path.includes('/config/') || 
      file.atoms?.some(a => a.name === a.name.toUpperCase()),
    description: 'Configuración, constantes, tipos'
  },
  'gatekeepers': {
    detector: (file) => 
      file.atoms?.some(a => a.archetype?.type === 'validator') ||
      file.path.includes('/middleware/'),
    description: 'Validadores, auth, middlewares'
  },
  'citizens': {
    detector: (file) => 
      file.atoms?.some(a => a.archetype?.type === 'standard' && a.hasSideEffects),
    description: 'Componentes UI, lógica de negocio'
  },
  'auditors': {
    detector: (file) => 
      file.path.includes('/test/') || 
      file.path.includes('/audit/'),
    description: 'Tests, análisis, reporting'
  },
  'entrypoints': {
    detector: (file) => 
      file.atoms?.some(a => a.archetype?.type === 'entry-point') ||
      file.path.includes('/cli/'),
    description: 'CLI, routes, main files'
  },
  'scripts': {
    detector: (file) => file.path.startsWith('scripts/'),
    description: 'Scripts de build, migración'
  }
};
```

### Estadísticas Típicas (v0.9.61)

```javascript
{
  citizen: 800,      // 43% - Lógica de negocio
  auditor: 400,      // 22% - Tests y análisis
  gatekeeper: 200,   // 11% - Validadores
  laws: 150,         // 8%  - Configuración
  entrypoint: 50,    // 3%  - Entry points
  script: 100,       // 5%  - Scripts
  unknown: 150       // 8%  - Sin clasificar
}
```

---

## Concepto 5: Grafo de Dependencias

### Nodos y Aristas

```
Nodos:
  - Átomos (funciones): 13,485
  - Archivos (moléculas): 1,860
  - Módulos (galaxias): 20

Aristas:
  - Llamadas directas: atom.calls[]
  - CalledBy: atom.calledBy[]
  - Imports: file.imports[]
  - Dependencias semánticas: file.semanticConnections[]
```

### Métricas del Grafo

```javascript
// src/shared/derivation-engine/graph-metrics.js

const graphMetrics = {
  // Hubs: funciones muy conectadas
  hubs: atoms.filter(a => a.graph?.centralityClassification === 'HUB').length,
  
  // Bridges: conectan módulos
  bridges: atoms.filter(a => a.graph?.centralityClassification === 'BRIDGE').length,
  
  // Leaves: funciones aisladas
  leaves: atoms.filter(a => a.graph?.centralityClassification === 'LEAF').length,
  
  // Centrality promedio
  avgCentrality: atoms.reduce((sum, a) => sum + (a.graph?.centrality || 0), 0) / atoms.length,
  
  // Riesgo alto
  highRisk: atoms.filter(a => a.graph?.riskLevel === 'HIGH').length,
  
  // Propagación promedio
  avgPropagationScore: atoms.reduce((sum, a) => sum + (a.graph?.propagationScore || 0), 0) / atoms.length
};
```

### Valores Reales (v0.9.61)

```javascript
{
  hubs: 9,
  bridges: 29,
  leaves: 13,408,
  avgCentrality: 0.165,
  highRisk: 2,834,
  avgPropagationScore: 0.334
}
```

---

## Concepto 6: Dead Code Detection (Mejora v0.9.61)

### Algoritmo (100% Estático)

```javascript
// src/layer-c-memory/mcp/tools/patterns/dead-code.js

function shouldSkipAtom(atom) {
  // 1. Tests y scripts de análisis
  if (isTestCallback(atom)) return true;
  if (isAnalysisScript(atom)) return true;
  
  // 2. Purpose explícito
  if (atom.purpose?.isDeadCode === false) return true;
  if (['API_EXPORT', 'TEST_HELPER'].includes(atom.purpose)) return true;
  
  // 3. Exportados o llamados
  if (atom.isExported === true) return true;
  if (atom.calledBy?.length > 0) return true;
  
  // 4. Dinámicamente usados
  if (isDynamicallyUsed(atom)) return true;
  
  // 5. Event handlers
  if (atom.name?.startsWith('on') || atom.name?.startsWith('handle')) return true;
  
  // 6. Constantes y variables
  if (atom.type === 'variable' || atom.type === 'constant') return true;
  
  // 7. Constructores y métodos de clase
  if (atom.name === 'constructor' || atom.archetype?.type === 'class-method') return true;
  
  // 8. Funciones muy cortas
  if ((atom.linesOfCode || 0) <= 5) return true;
  
  // 9. Detectores/estrategias (se pasan como callbacks)
  if (['detector', 'strategy', 'validator'].includes(atom.archetype?.type)) return true;
  
  // 10. Builder pattern
  if (atom.name?.startsWith('with') && atom.className) return true;
  
  // 11. Archivos que no existen
  if (atom.filePath && !fileExists(atom.filePath)) return true;
  
  return false;
}
```

### Resultados

| Métrica | Antes | Después | Mejora |
|---------|-------|---------|--------|
| Casos detectados | 273 | 42 | ⬇️ 85% |
| Falsos positivos | ~231 | ~0 | ✅ 100% |
| Reales | 42 | 42 | - |

---

## Concepto 7: Simulación de Impacto

### Flujo de Datos

```javascript
// src/layer-c-memory/mcp/tools/trace-data-journey.js

function traceDataJourney(filePath, symbolName, maxDepth = 5) {
  const journey = {
    entry: { filePath, symbolName },
    steps: [],
    sideEffects: [],
    securityRisks: []
  };
  
  // BFS sobre el grafo de llamadas
  const queue = [{ filePath, symbolName, depth: 0 }];
  const visited = new Set();
  
  while (queue.length > 0 && queue[0].depth < maxDepth) {
    const current = queue.shift();
    const key = `${current.filePath}::${current.symbolName}`;
    
    if (visited.has(key)) continue;
    visited.add(key);
    
    // Obtener detalles de la función
    const details = getFunctionDetails(current.filePath, current.symbolName);
    
    // Registrar paso
    journey.steps.push({
      filePath: current.filePath,
      symbolName: current.symbolName,
      depth: current.depth,
      calls: details.calls,
      sideEffects: details.sideEffects
    });
    
    // Detectar side effects
    if (details.sideEffects?.hasStorageAccess) {
      journey.sideEffects.push({
        type: 'storage',
        file: current.filePath,
        function: current.symbolName
      });
    }
    
    // Detectar riesgos de seguridad
    if (details.securityRisks?.unvalidatedSinks) {
      journey.securityRisks.push(...details.securityRisks.unvalidatedSinks);
    }
    
    // Agregar llamadas a la cola
    details.calls.forEach(call => {
      queue.push({
        filePath: call.filePath,
        symbolName: call.name,
        depth: current.depth + 1
      });
    });
  }
  
  return journey;
}
```

---

## Leyes de la Física del Software

### Ley 1: Conservación de la Complejidad

> La complejidad total de un sistema tiende a permanecer constante, a menos que se refactorice activamente.

```
Complejidad_total = Σ(complejidad_de_cada_función)

Si no se refactoriza:
  Complejidad_total(t+1) ≈ Complejidad_total(t)

Si se agrega feature sin refactorizar:
  Complejidad_total(t+1) = Complejidad_total(t) + complejidad_del_feature
```

### Ley 2: Entropía Creciente

> La entropía del código tiende a aumentar con el tiempo, a menos que se mantenga activamente.

```
dE/dt = k × (nuevas_features - refactorización)

Donde:
- E = entropía
- k = constante de proporcionalidad
- nuevas_features = velocidad de agregar código
- refactorización = velocidad de limpiar código
```

### Ley 3: Gravedad del Código

> Las funciones con mayor importancia atraen más cambios.

```
Fuerza_de_atracción = (importancia_score × calledBy.length) / distancia²

Donde:
- importancia_score = vector de importancia (0-1)
- calledBy.length = cantidad de funciones que la llaman
- distancia = distancia en el grafo de llamadas
```

### Ley 4: Inercia del Código

> Un archivo en movimiento (muchos cambios) tiende a permanecer en movimiento.

```
Probabilidad_de_cambio(t+1) = 
  α × cambios_recientes + 
  β × complejidad + 
  γ × acoplamiento

Donde:
- α = 0.5 (peso de cambios recientes)
- β = 0.3 (peso de complejidad)
- γ = 0.2 (peso de acoplamiento)
```

---

## Métricas de Salud del Sistema

### Health Score (v0.9.61)

```javascript
// src/layer-c-memory/mcp/tools/health-metrics.js

function calculateHealthScore(atoms) {
  const grades = {
    A: atoms.filter(a => a.healthScore >= 90).length,
    B: atoms.filter(a => a.healthScore >= 75 && a.healthScore < 90).length,
    C: atoms.filter(a => a.healthScore >= 50 && a.healthScore < 75).length,
    D: atoms.filter(a => a.healthScore >= 25 && a.healthScore < 50).length,
    F: atoms.filter(a => a.healthScore < 25).length
  };
  
  const total = atoms.length;
  
  // Health score = promedio ponderado
  const score = (
    grades.A * 100 +
    grades.B * 80 +
    grades.C * 60 +
    grades.D * 40 +
    grades.F * 20
  ) / total;
  
  return {
    score: Math.round(score),
    grade: score >= 90 ? 'A' : score >= 75 ? 'B' : score >= 50 ? 'C' : score >= 25 ? 'D' : 'F',
    distribution: grades
  };
}
```

### Valores Reales (v0.9.61)

```javascript
{
  score: 99,
  grade: 'A',
  distribution: {
    A: 13093,  // 97.1%
    B: 171,    // 1.3%
    C: 81,     // 0.6%
    D: 33,     // 0.2%
    F: 27      // 0.2%
  }
}
```

---

## Referencias

- [DATA_FLOW.md](./DATA_FLOW.md) - Flujo de datos detallado
- [core.md](./core.md) - Arquitectura unificada
- [principles.md](../01-core/principles.md) - Los 4 Pilares
- [ISSUES_AND_IMPROVEMENTS.md](./ISSUES_AND_IMPROVEMENTS.md) - Issues conocidos

---

**Última actualización**: 2026-02-25 (v0.9.61)  
**Estado**: ✅ 100% Estático, 0% LLM  
**Próximo**: 🚧 Migración a Tree-sitter (Q2 2026)
