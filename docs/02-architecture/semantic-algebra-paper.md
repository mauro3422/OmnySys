# Semantic Algebra: Fundamentos Matemáticos para Edición de Código

## Abstract

Este documento describe la base teórica para un sistema de edición de código basado en operaciones matemáticas determinísticas sobre grafos. El objetivo es transformar la edición de código de una operación text-based probabilística a una operación graph-based algebraica.

**Autor**: Mauro (creador de OmnySystem)  
**Fecha**: Febrero 2026  
**Estado**: ✅ **IMPLEMENTADO EN PRODUCCIÓN** (v0.9.61+)

> **Nota importante**: Este documento describe la teoría que fundamenta OmnySys. **Las operaciones descritas ya están implementadas** en el sistema SQLite como vectores matemáticos determinísticos. Este no es un roadmap conceptual — es la base técnica del sistema actual.

---

## 0. Implementación Actual: SQLite + Vectores Determinísticos

> **Estado**: ✅ Producción activa (v0.9.61+)

A partir de v0.9.61, el sistema de álgebra semántica está **100% implementado** usando SQLite como storage determinístico. No hay random — cada query produce el mismo resultado.

### Storage SQLite con Vectores

**Schema REAL** (`src/layer-c-memory/storage/database/schema.sql`):

```sql
-- Tabla atoms con vectores matemáticos
atoms (
    -- Vectores estructurales
    importance_score REAL DEFAULT 0,    -- PageRank-like (0-1)
    coupling_score REAL DEFAULT 0,      -- Acoplamiento externo (0-1)
    cohesion_score REAL DEFAULT 0,      -- Cohesión interna (0-1)
    stability_score REAL DEFAULT 1,     -- 1 - change_frequency (0-1)
    propagation_score REAL DEFAULT 0,   -- Impacto de cambios (0-1)
    fragility_score REAL DEFAULT 0,     -- Probabilidad de romperse (0-1)
    testability_score REAL DEFAULT 0,   -- Facilidad de testing (0-1)

    -- Grafos: vectores de Algebra de Grafos
    in_degree INTEGER DEFAULT 0,       -- Número de callers (entrada)
    out_degree INTEGER DEFAULT 0,      -- Número de callees (salida)
    centrality_score REAL DEFAULT 0,   -- centrality = in_degree / (out_degree + 1)
    centrality_classification TEXT,    -- 'HUB', 'BRIDGE', 'LEAF'
    
    -- Temporales
    change_frequency REAL DEFAULT 0,   -- Cambios por día
    age_days INTEGER DEFAULT 0,        -- Días desde creación
    generation INTEGER DEFAULT 1       -- Generación del átomo
)
```

### Cálculo de Vectores (Código REAL)

**Implementación**: `src/layer-c-memory/storage/repository/utils/vector-calculator.js`

```javascript
// calculateAtomVectors(atom, context)
export function calculateAtomVectors(atom, context = {}) {
  const { callers = [], callees = [] } = context;
  
  return {
    // Vectores estructurales
    linesOfCode: calculateLinesOfCode(atom),
    parameterCount: atom.signature?.params?.length || 0,
    
    // Vectores relacionales
    callersCount: callers.length,
    calleesCount: callees.length,
    dependencyDepth: calculateDependencyDepth(atom, context),
    externalCallCount: atom.externalCalls?.length || 0,
    
    // Vectores semánticos
    archetypeWeight: calculateArchetypeWeight(atom),
    cohesionScore: calculateCohesion(atom),
    couplingScore: calculateCoupling(atom, context),
    
    // Vectores temporales (sin git - usa extractedAt/updatedAt)
    changeFrequency: calculateChangeFrequency(atom),
    ageDays: calculateAgeDays(atom),
    
    // Vectores para Semantic Algebra
    importance: calculateImportance(atom, context),
    stability: calculateStability(atom),
    propagationScore: calculatePropagation(atom, context),
    fragilityScore: calculateFragility(atom, context),
    testabilityScore: calculateTestability(atom, context)
  };
}
```

### Enriquecimiento de Átomos

**Implementación**: `src/layer-c-memory/storage/enrichers/atom-enricher.js`

```javascript
// enrichAtom(atom, context)
export function enrichAtom(atom, context = {}) {
  // Calcular vectores matemáticos
  const vectors = calculateAtomVectors(atom, context);
  
  // Crear átomo enriquecido
  const enrichedAtom = {
    ...atom,
    
    // Vectores relacionales
    callersCount: vectors.callersCount,
    calleesCount: vectors.calleesCount,
    dependencyDepth: vectors.dependencyDepth,
    externalCallCount: vectors.externalCallCount,
    
    // Vectores semánticos
    archetypeWeight: vectors.archetypeWeight,
    cohesionScore: vectors.cohesionScore,
    couplingScore: vectors.couplingScore,
    
    // Vectores temporales
    changeFrequency: vectors.changeFrequency,
    ageDays: vectors.ageDays,
    
    // Vectores para Semantic Algebra
    importanceScore: vectors.importance,
    stabilityScore: vectors.stability,
    propagationScore: vectors.propagation,
    fragilityScore: vectors.fragility,
    testabilityScore: vectors.testability,
    
    // Derived completo
    derived: {
      fragilityScore: vectors.fragility,
      testabilityScore: vectors.testability,
      couplingScore: vectors.coupling,
      changeRisk: vectors.propagation
    }
  };
  
  return enrichedAtom;
}
```

### Derivación Molecular (Composición)

**Implementación**: `src/shared/derivation-engine/composer.js`

```javascript
// composeMolecularMetadata(moleculeId, atoms)
export function composeMolecularMetadata(moleculeId, atoms) {
  return {
    // Identity
    id: moleculeId,
    type: 'molecule',
    atomCount: atoms.length,
    
    // Derived archetype
    archetype: derive('moleculeArchetype'),
    
    // Derived complexity metrics
    totalComplexity: derive('moleculeComplexity'),
    riskScore: derive('moleculeRisk'),
    
    // Derived exports
    exports: derive('moleculeExports'),
    exportCount: derive('moleculeExportCount'),
    
    // Derived side effects
    hasSideEffects: derive('moleculeHasSideEffects'),
    hasNetworkCalls: derive('moleculeHasNetworkCalls'),
    hasDomManipulation: derive('moleculeHasDomManipulation'),
    hasStorageAccess: derive('moleculeHasStorageAccess'),
    
    // Derived error handling
    hasErrorHandling: derive('moleculeHasErrorHandling'),
    
    // References
    atoms: atoms.map(a => a.id)
  };
}
```

---

## 1. Operaciones de Álgebra Semántica

### 1.1 PageRank Propagation (Importancia)

**Implementado**: ✅ `src/layer-c-memory/mcp/tools/trace-variable-impact.js`

**Fórmula**:
```javascript
importance(atom) = Σ(importance(caller) / out_degree(caller))
                   para todo caller que llama a atom
```

**Código REAL**:
```javascript
// calculateImportance(atom, context)
function calculateImportance(atom, { callers = [] }) {
  if (callers.length === 0) return 0;
  
  // PageRank simplificado: importancia basada en callers
  const callerImportance = callers.reduce((sum, caller) => {
    const callerOutDegree = caller.calls?.length || 1;
    return sum + (1 / callerOutDegree);
  }, 0);
  
  // Normalizar a 0-1
  return Math.min(1, callerImportance / callers.length);
}
```

**Query SQL**:
```sql
-- Átomos con mayor importancia
SELECT name, file_path, importance_score
FROM atoms
WHERE importance_score > 0.5
ORDER BY importance_score DESC
LIMIT 10;
```

---

### 1.2 Cohesión / Coupling

**Implementado**: ✅ `vector-calculator.js`

**Fórmulas**:
```javascript
// Cohesión: inversamente proporcional a complejidad/LOC
cohesion(atom) = 1 - (complejidad / LOC) * 2

// Coupling: proporcional a dependencias externas
coupling(atom) = external_calls / total_connections
```

**Código REAL**:
```javascript
// calculateCohesion(atom)
function calculateCohesion(atom) {
  const loc = calculateLinesOfCode(atom);
  const complexity = atom.complexity || 1;
  
  if (loc === 0) return 1;
  
  // Cohesión inversamente proporcional a complejidad/loc
  const ratio = complexity / loc;
  const cohesion = Math.max(0, Math.min(1, 1 - (ratio * 2)));
  
  return Math.round(cohesion * 100) / 100;
}

// calculateCoupling(atom, context)
function calculateCoupling(atom, { callers = [], callees = [] }) {
  const externalCalls = atom.externalCalls?.length || 0;
  const totalCalls = atom.calls?.length || 0;
  const totalConnections = callers.length + callees.length + totalCalls;
  
  if (totalConnections === 0) return 0;
  
  return externalCalls / totalConnections;
}
```

---

### 1.3 Estabilidad Temporal

**Implementado**: ✅ `vector-calculator.js` (sin git - usa extractedAt/updatedAt)

**Fórmula**:
```javascript
stability(atom) = 1 - change_frequency
change_frequency = (updated_at - extracted_at) > threshold ? 1 : 0
age_days = now - extracted_at
```

**Código REAL**:
```javascript
// calculateTemporalVectors(atom) - SIN GIT
function calculateTemporalVectors(atom) {
  const now = new Date();
  const extractedAt = atom.extractedAt || atom._meta?.extractedAt;
  
  // Calcular ageDays
  let ageDays = 0;
  if (extractedAt) {
    const extracted = new Date(extractedAt);
    const diffMs = now - extracted;
    ageDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  }
  
  // Calcular changeFrequency
  const updatedAt = atom.updatedAt;
  let changeFrequency = 0;
  if (extractedAt && updatedAt) {
    const extracted = new Date(extractedAt);
    const updated = new Date(updatedAt);
    // Si updated es significativamente diferente de extracted, hubo cambios
    if (updated - extracted > 1000) {
      changeFrequency = 1;
    }
  }
  
  return { ageDays, changeFrequency };
}

// calculateStability(atom)
function calculateStability(atom) {
  const changeFrequency = atom.changeFrequency || 0;
  return 1 - changeFrequency;
}
```

---

### 1.4 Propagación de Impacto

**Implementado**: ✅ `get_impact_map`, `analyze_change`

**Fórmula**:
```javascript
propagation(atom) = Σ(propagation(callee) * weight)
                    para todo callee que atom llama
```

**Código REAL**:
```javascript
// calculatePropagation(atom, context)
function calculatePropagation(atom, { callees = [] }) {
  if (callees.length === 0) return 0;
  
  // Propagación basada en impacto de callees
  const calleePropagation = callees.reduce((sum, callee) => {
    const calleeProp = callee.propagationScore || 0;
    return sum + calleeProp;
  }, 0);
  
  return Math.min(1, calleePropagation / callees.length);
}
```

---

### 1.5 Fragilidad

**Implementado**: ✅ `vector-calculator.js`

**Fórmula**:
```javascript
fragility(atom) = (complejidad * coupling) / (cohesion * stability)
```

**Código REAL**:
```javascript
// calculateFragility(atom, context)
function calculateFragility(atom, { callers = [] }) {
  const complexity = atom.complexity || 1;
  const coupling = calculateCoupling(atom, { callers });
  const cohesion = calculateCohesion(atom);
  const stability = calculateStability(atom);
  
  // Fragilidad: alta complejidad + alto coupling / alta cohesion + alta stability
  const numerator = complexity * coupling;
  const denominator = Math.max(0.1, cohesion * stability);
  
  return Math.min(1, numerator / denominator);
}
```

---

### 1.6 Testabilidad

**Implementado**: ✅ `vector-calculator.js`

**Fórmula**:
```javascript
testability(atom) = (cohesion * stability) / (complejidad * external_calls)
```

**Código REAL**:
```javascript
// calculateTestability(atom, context)
function calculateTestability(atom, { callers = [] }) {
  const complexity = atom.complexity || 1;
  const cohesion = calculateCohesion(atom);
  const stability = calculateStability(atom);
  const externalCalls = atom.externalCalls?.length || 1;
  
  // Testabilidad: alta cohesion + alta stability / alta complejidad * external calls
  const numerator = cohesion * stability;
  const denominator = Math.max(1, complexity * externalCalls);
  
  return Math.min(1, numerator / denominator);
}
```

---

## 2. Operaciones de Álgebra de Grafos

### 2.1 Centralidad de Nodos

**Implementado**: ✅ Schema SQLite + índices

**Fórmula**:
```javascript
centrality(atom) = in_degree / (out_degree + 1)
classification = 
  if centrality > 0.3 → 'HUB'
  else if centrality > 0.1 → 'BRIDGE'
  else → 'LEAF'
```

**Código REAL**:
```javascript
// En repository-factory.js al guardar
const inDegree = callers.length;
const outDegree = atom.calls?.length || 0;
const centrality = inDegree / (outDegree + 1);

let classification = 'LEAF';
if (centrality > 0.3) classification = 'HUB';
else if (centrality > 0.1) classification = 'BRIDGE';

// Guardar en SQLite
await db.run(`
  UPDATE atoms 
  SET centrality_score = ?, centrality_classification = ?
  WHERE id = ?
`, [centrality, classification, atom.id]);
```

**Índices SQL**:
```sql
CREATE INDEX idx_atoms_centrality ON atoms(centrality_score DESC);
CREATE INDEX idx_atoms_classification ON atoms(centrality_classification);
```

---

### 2.2 Impact Analysis (BFS)

**Implementado**: ✅ `get_impact_map`, `analyze_change`

**Algoritmo**:
```javascript
function analyzeImpact(targetAtom) {
  const directDependents = getCallers(targetAtom);
  const transitiveDependents = new Set();
  
  // BFS
  const queue = [...directDependents];
  const visited = new Set(directDependents);
  
  while (queue.length > 0) {
    const atom = queue.shift();
    transitiveDependents.add(atom);
    
    const callers = getCallers(atom);
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

---

## 3. Estado Actual (v0.9.61)

### Vectores Implementados

| Vector | Estado | Tabla SQL | Función |
|--------|--------|-----------|---------|
| **importance_score** | ✅ | atoms | `calculateImportance()` |
| **coupling_score** | ✅ | atoms | `calculateCoupling()` |
| **cohesion_score** | ✅ | atoms | `calculateCohesion()` |
| **stability_score** | ✅ | atoms | `calculateStability()` |
| **propagation_score** | ✅ | atoms | `calculatePropagation()` |
| **fragility_score** | ✅ | atoms | `calculateFragility()` |
| **testability_score** | ✅ | atoms | `calculateTestability()` |
| **centrality_score** | ✅ | atoms | Calculado en save |
| **centrality_classification** | ✅ | atoms | HUB/BRIDGE/LEAF |
| **in_degree** | ✅ | atoms | callers.length |
| **out_degree** | ✅ | atoms | calls.length |
| **change_frequency** | ✅ | atoms | Sin git (extractedAt/updatedAt) |
| **age_days** | ✅ | atoms | Sin git (extractedAt) |

### MCP Tools que Usan Semantic Algebra

| Tool | Vectores que usa |
|------|------------------|
| `get_impact_map` | propagation_score, centrality_score |
| `analyze_change` | importance_score, fragility_score |
| `trace_variable_impact` | importance_score (PageRank) |
| `get_health_metrics` | cohesion_score, coupling_score |
| `detect_patterns` | Todos los vectores |
| `get_risk_assessment` | fragility_score, propagation_score |

---

## 4. Diferencia: Antes vs Ahora

### Antes (v0.9.57-)

```
┌─────────────────────────────────────────┐
│  JSON files scattered (.omnysysdata/)   │
│  ├── atoms/*.json                      │
│  ├── files/*.json                      │
│  └── system-map-enhanced.json           │
│                                         │
│  Problema:                             │
│  - O(n) para búsquedas                 │
│  - Inconsistencias entre archivos       │
│  - Sin atomicidad                       │
│  - Vectores calculados en memoria       │
└─────────────────────────────────────────┘
```

### Ahora (v0.9.61+)

```
┌─────────────────────────────────────────┐
│  SQLite + WAL mode (.omnysysdata.db)   │
│                                         │
│  ├── 10+ tablas con foreign keys        │
│  ├── Índices para queries frecuentes   │
│  ├── Triggers para atomicidad          │
│  ├── Vistas para análisis rápido       │
│  └── Vectores PERSISTIDOS en DB        │
│                                         │
│  Ventajas:                             │
│  - O(1) para búsquedas por índice      │
│  - Transacciones ACID                  │
│  - Determinístico: misma query → mismo resultado │
│  - Vectores pre-calculados y persistidos │
└─────────────────────────────────────────┘
```

---

## 5. Ejemplos de Queries Reales

### Encontrar átomos de alto impacto

```sql
-- Átomos con mayor capacidad de propagación
SELECT name, file_path, importance_score, propagation_score
FROM atoms
WHERE importance_score > 0.5
ORDER BY propagation_score DESC
LIMIT 10;
```

### Encontrar código frágil

```sql
-- Átomos frágiles (alta complejidad + bajo testing)
SELECT name, file_path, complexity, fragility_score, testability_score
FROM atoms
WHERE fragility_score > 0.7 AND testability_score < 0.3
ORDER BY fragility_score DESC;
```

### Análisis de acoplamiento

```sql
-- Archivos con mayor acoplamiento externo
SELECT 
  file_path,
  AVG(coupling_score) as avg_coupling,
  COUNT(*) as atom_count
FROM atoms
GROUP BY file_path
HAVING avg_coupling > 0.5
ORDER BY avg_coupling DESC;
```

---

**Última actualización**: 2026-02-25 (v0.9.61)  
**Estado**: ✅ **100% Implementado en SQLite**  
**Próximo**: 🚧 Tree-sitter integration (Q2 2026)
