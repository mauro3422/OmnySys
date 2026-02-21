# Semantic Algebra: Fundamentos Matemáticos para Edición de Código

## Abstract

Este documento describe la base teórica para un sistema de edición de código basado en operaciones matemáticas determinísticas sobre grafos. El objetivo es transformar la edición de código de una operación text-based probabilística a una operación graph-based algebraica.

**Autor**: Mauro (creador de OmnySystem)  
**Fecha**: Febrero 2026  
**Estado**: Documento conceptual - Roadmap futuro

---

## 1. El Problema Fundamental

### 1.1 Edición de código actual (Text-based)

```
┌─────────────────────────────────────────────────────────────┐
│  IA → string oldString → string newString → archivo        │
│                                                             │
│  Problema: La IA manipula TEXTO, no ESTRUCTURA            │
│  - Operaciones no determinísticas                          │
│  - Propagación manual de cambios                           │
│  - Alto riesgo de errores en cascada                       │
└─────────────────────────────────────────────────────────────┘
```

### 1.2 La visión (Graph-based)

```
┌─────────────────────────────────────────────────────────────┐
│  IA → operación en grafo → propagación matemática → código │
│                                                             │
│  Ventajas:                                                  │
│  - Determinístico: misma operación → mismo resultado       │
│  - Propagación automática vía álgebra de grafos            │
│  - Verificable antes de ejecutar                           │
│  - Rollback matemático                                     │
└─────────────────────────────────────────────────────────────┘
```

---

## 2. El Grafo de Código

### 2.1 Definición formal

El **Grafo de Código** G = (V, E) donde:

- **V (Vértices)**: Átomos de código
  - Funciones
  - Clases
  - Variables
  - Módulos

- **E (Aristas)**: Relaciones entre átomos
  - `calls`: A llama a B
  - `imports`: A importa a B
  - `depends`: A depende de B
  - `emits`: A emite evento E
  - `handles`: A maneja evento E

### 2.2 Vector de Átomo

Cada átomo tiene una representación vectorial:

```javascript
AtomVector = {
  // Propiedades estructurales
  complexity: number,      // Complejidad ciclomática
  linesOfCode: number,     // Líneas de código
  parameterCount: number,  // Cantidad de parámetros
  
  // Propiedades relacionales
  callers: number,         // Cantidad de llamadores
  callees: number,         // Cantidad de llamados
  dependencyDepth: number, // Profundidad en el grafo de dependencias
  
  // Propiedades semánticas
  archetypeWeight: number, // Peso del arquetipo (0-1)
  cohesionScore: number,   // Cohesión interna (0-1)
  couplingScore: number,   // Acoplamiento externo (0-1)
  
  // Propiedades temporales
  changeFrequency: number, // Frecuencia de cambios en git
  age: number,             // Antigüedad del átomo
  lastModified: number     // Timestamp última modificación
}
```

### 2.3 Representación compacta

```
v(atom) = [c, loc, params, callers, callees, depth, arch, coh, coup, freq, age, mod]

Ejemplo:
v(processFile) = [12, 45, 3, 7, 4, 2, 0.89, 0.75, 0.32, 0.15, 180, 1708543200]
```

---

## 3. Operaciones Algebraicas

### 3.1 Operaciones sobre Vértices

#### Rename Node

```
rename(nodeId, newName) → Graph'

Efecto en el grafo:
1. ∀ edge e donde e.from = nodeId: actualizar referencias
2. ∀ edge e donde e.to = nodeId: actualizar call sites
3. Propagar a archivos dependientes

Fórmula de impacto:
impact(rename) = Σ (propagationScore × callerImportance) para cada caller
```

#### Move Node (mover a otro archivo)

```
move(nodeId, newFilePath) → Graph'

Efecto en el grafo:
1. Actualizar node.filePath
2. ∀ caller c: actualizar import path
3. Recalcular dependencyDepth para afectados

Fórmula:
impact(move) = affectedFiles × avgPropagationScore
```

#### Split Node

```
split(nodeId, newNodes[]) → Graph'

Efecto en el grafo:
1. Crear n nodos nuevos con partición de responsabilidades
2. Redistribuir edges según responsibility match
3. Actualizar todos los callers

Fórmula de partición:
responsibility(node, method) = cohesion(method, node.methods) / node.methodCount

La IA decide qué métodos van a cada nodo nuevo.
```

#### Merge Nodes

```
merge(nodeIds[], newNodeName) → Graph'

Efecto en el grafo:
1. Crear nodo combinado
2. Unificar edges de todos los nodos originales
3. Deduplicar callers
4. Eliminar nodos originales

Fórmula de compatibilidad:
compatibility(A, B) = cosineSimilarity(v(A), v(B)) × sharedCallersRatio
```

### 3.2 Operaciones sobre Aristas

#### Add Edge (agregar dependencia)

```
addEdge(fromId, toId, type) → Graph'

Efecto:
1. Agregar arista al grafo
2. Agregar import si es cross-file
3. Agregar call site en código

Fórmula:
edgeWeight = initialWeight × fromNode.importance × toNode.stability
```

#### Remove Edge (eliminar dependencia)

```
removeEdge(fromId, toId) → Graph'

Efecto:
1. Eliminar arista del grafo
2. Si no hay otras dependencias: eliminar import
3. Eliminar call site en código

Validación:
if (isOnlyDependency(fromId, toId)) {
  checkDeadCode(toId); // Alertar si el nodo queda sin callers
}
```

### 3.3 Operaciones Compuestas

#### Extract Pattern

```
extractPattern(nodeIds[], patternName) → Graph'

1. Encontrar código común entre nodos
2. Crear nueva función con el patrón
3. Reemplazar ocurrencias con llamadas a nueva función

Fórmula de similitud:
patternSimilarity = Σ cosineSimilarity(v(A), v(B)) / (n × (n-1) / 2)
```

---

## 4. Propagación de Cambios

### 4.1 Modelo de Propagación Ponderada (PageRank-like)

Ya implementado en `trace-variable-impact.js`:

```javascript
const DECAY = 0.75; // Factor de decaimiento por salto

// Fórmula de propagación
score(hop_n) = score(hop_n-1) × DECAY × usageBoost

donde:
- DECAY = 0.75 (cada salto reduce impacto 25%)
- usageBoost = min(1.0, usageCount / 5)
```

### 4.2 Interpretación de Scores

| Score | Impacto | Acción recomendada |
|-------|---------|-------------------|
| ≥ 0.75 | Alto | Cambio directo garantizado - revisar manualmente |
| 0.4 - 0.75 | Medio | Impacto probable - validar antes |
| 0.1 - 0.4 | Bajo | Impacto posible - revisar automáticamente |
| < 0.1 | Negligible | Ignorar - cambio no propaga |

### 4.3 Visualización del Grafo de Impacto

```
                    ┌─────────────┐
                    │ processFile │  (source, score=1.0)
                    └──────┬──────┘
                           │
           ┌───────────────┼───────────────┐
           │               │               │
           ▼               ▼               ▼
    ┌────────────┐  ┌────────────┐  ┌────────────┐
    │ parseCode  │  │ validate   │  │ transform  │
    │ score=0.75 │  │ score=0.75 │  │ score=0.60 │
    └─────┬──────┘  └─────┬──────┘  └────────────┘
          │               │
          ▼               ▼
    ┌────────────┐  ┌────────────┐
    │ tokenize   │  │ checkTypes │
    │ score=0.56 │  │ score=0.45 │
    └────────────┘  └────────────┘
```

---

## 5. Semantic Algebra

### 5.1 El concepto

**Semantic Algebra** = Operaciones algebraicas donde los operandos son conceptos representados como vectores, y las operaciones son transformaciones determinísticas.

```
Operaciones donde:
├── Operandos = Conceptos (como vectores)
├── Operadores = Transformaciones (como vectores)
├── Resultado = Nuevo concepto (determinístico)
└── No tokens, no probabilidad, solo MATEMÁTICA
```

### 5.2 Ejemplo: Extract Function

```
Estado inicial:
├── Atom A: complexity=15, loc=100, callers=3
└── Atom B: complexity=12, loc=85, callers=5

Operación: extractCommon(A, B)
├── similarity(A, B) = cosineSimilarity(v(A), v(B)) = 0.87
├── commonCode = intersect(A.body, B.body)
└── newAtom C = { complexity: 8, loc: 45, callers: 0 }

Estado final:
├── Atom A': complexity=10, loc=65, callers=3, calls=[C]
├── Atom B': complexity=8, loc=50, callers=5, calls=[C]
└── Atom C: complexity=8, loc=45, callers=2

Verificación algebraica:
v(A) + v(B) = v(A') + v(B') + v(C) - overhead
```

### 5.3 Operaciones vectoriales básicas

```javascript
// Diferencia entre átomos (qué cambió)
function atomDiff(A, B) {
  return v(A).map((val, i) => val - v(B)[i]);
  // [complexity_diff, loc_diff, callers_diff, ...]
}

// Similaridad de código
function atomSimilarity(A, B) {
  return cosineSimilarity(v(A), v(B));
  // 0.0 - 1.0 donde 1.0 = idénticos
}

// Proyección de refactoring
function refactorProjection(A, operationVector) {
  return vectorAdd(v(A), operationVector);
  // Predice el estado del átomo después de la operación
}
```

---

## 6. Arquitectura del Sistema

### 6.1 Capas actuales de OmnySystem

```
Layer A (Static)     → Extraer grafo del código
Layer B (Semantic)   → Enriquecer con tipos, patrones
Layer C (Memory)     → Mantener estado del grafo
```

### 6.2 Capa propuesta: Layer D (Graph Edit)

```
Layer D (Graph Edit) → Operaciones determinísticas en el grafo

Componentes:
├── OperationRegistry: Registro de operaciones algebraicas
├── PropagationEngine: Motor de propagación de cambios
├── ValidationEngine: Verificación pre-operación
├── CodeGenerator: Grafo → código (renderizado)
└── RollbackManager: Undo/Redo de operaciones
```

### 6.3 Flujo de operación

```
1. IA especifica operación: rename("processFile", "processAtom")
                              ↓
2. GraphEdit valida operación en el grafo
                              ↓
3. PropagationEngine calcula impacto
                              ↓
4. IA revisa preview (dryRun=true)
                              ↓
5. IA confirma (dryRun=false)
                              ↓
6. GraphEdit ejecuta operación
                              ↓
7. CodeGenerator actualiza archivos afectados
                              ↓
8. RollbackManager registra para undo
```

---

## 7. Comparación con Sistemas Existentes

| Sistema | Grafo Persistente | Propagación | Para IAs | Determinístico |
|---------|-------------------|-------------|----------|----------------|
| JetBrains IDE | ❌ Temporal | ✅ Local | ❌ | ✅ |
| TypeScript LSP | ❌ Temporal | ✅ Local | ❌ | ✅ |
| Sourcegraph | ✅ Persistente | ❌ Read-only | ❌ | N/A |
| Cursor IDE | ❌ Temporal | ⚠️ Vía IA | ✅ | ❌ |
| **OmnySystem** | ✅ Persistente | ✅ PageRank | ✅ | ✅ |

---

## 8. Roadmap de Implementación

### Fase 1: Fundamentos (actual) ✓
- [x] Grafo de código con metadata
- [x] Propagación ponderada
- [x] atomic_edit básico
- [x] Editor atómico con validación

### Fase 2: Graph Edit MVP
- [ ] Unificar atomic_edit + atomic_write
- [ ] Operación `rename` con propagación automática
- [ ] Operación `move` con actualización de imports
- [ ] dryRun mode para preview

### Fase 3: Operaciones Avanzadas
- [ ] split_node (dividir clase/función)
- [ ] merge_nodes (combinar átomos)
- [ ] extract_pattern (detectar y extraer patrones)
- [ ] Rollback completo de operaciones

### Fase 4: Semantic Algebra
- [ ] Representación vectorial completa de átomos
- [ ] Operaciones algebraicas directas
- [ ] Predicción de resultados antes de ejecutar
- [ ] Optimización automática de código vía álgebra

---

## 9. Fórmulas Matemáticas Clave

### 9.1 Propagación de Impacto

```
score(hop_n) = score(hop_n-1) × α × boost

donde:
α = 0.75 (factor de decaimiento)
boost = min(1.0, usageCount / 5)
```

### 9.2 Similaridad de Átomos

```
similarity(A, B) = (v(A) · v(B)) / (||v(A)|| × ||v(B)||)

Cosine similarity entre vectores de átomos
```

### 9.3 Cohesión de Clase

```
cohesion(class) = Σ similarity(m_i, m_j) / (n × (n-1) / 2)

para todos los pares de métodos en la clase
```

### 9.4 Peso de Arista

```
edgeWeight(e) = fromNode.couplingScore × toNode.stability × callFrequency

Ponderación de la importancia de una dependencia
```

### 9.5 Complejidad de Propagación

```
propagationComplexity(op) = Σ (affectedNode.complexity × propagationScore)

Suma ponderada de complejidad afectada por una operación
```

---

## 10. Principios Fundamentales

### 10.1 El código es una proyección del grafo

> **El grafo ES la verdad. El código es solo una representación serializada.**

Esto significa que:
1. Editar el grafo es la operación "correcta"
2. El código se regenera desde el grafo
3. Los tests verifican que la proyección es correcta

### 10.2 Determinismo sobre probabilidad

> **Las operaciones estructurales deben ser determinísticas.**

- Rename siempre produce el mismo resultado
- Move siempre actualiza los mismos imports
- La IA decide QUÉ, el sistema decide CÓMO

### 10.3 Validación antes de ejecución

> **Nunca escribir código sin validar antes.**

1. Calcular impacto en el grafo
2. Mostrar preview de cambios
3. Confirmar con IA
4. Ejecutar y actualizar grafo

### 10.4 La IA mantiene control total

> **El sistema es una herramienta, no un autómata.**

El flujo es:
```
IA analiza → IA decide → Sistema ejecuta → IA verifica
```

No:
```
Sistema detecta → Sistema decide → Sistema ejecuta ❌
```

---

## 11. Referencias y Antecedentes

### Conceptos relacionados

| Concepto | Campo | Aplicación |
|----------|-------|------------|
| AST-based refactoring | PL Theory | JetBrains, Eclipse |
| Graph databases | Data Modeling | Neo4j, Sourcegraph |
| PageRank | Graph Theory | Google, OmnySystem propagation |
| Embeddings | ML | Word2Vec, Transformers |
| Knowledge Graphs | AI/Semantic | Google Knowledge Graph |

### Inspiraciones

- **Smalltalk Browser** (1980s): Primer sistema de refactoring
- **Eclipse JDT** (2000s): AST-based refactoring para Java
- **Sourcegraph**: Code graph a escala
- **Cursor IDE**: IA + código

---

## 12. Conclusión

Este documento establece los fundamentos teóricos para un sistema de edición de código basado en operaciones algebraicas sobre grafos. El objetivo es hacer que la edición de código sea:

1. **Determinística**: Misma operación, mismo resultado
2. **Propagable**: Cambios fluyen automáticamente
3. **Verificable**: Validar antes de ejecutar
4. **Reversible**: Undo matemático

La implementación completa requeriría:
- Capa D (Graph Edit) en OmnySystem
- Motor de operaciones algebraicas
- Generador de código desde grafo
- Sistema de validación y rollback

---

*Documento creado: Febrero 2026*  
*Última actualización: Febrero 2026*  
*Estado: Conceptual - Roadmap futuro*