# Flujo Actual del Sistema (v0.7.1) - SIMPLIFICADO

**Estado**: Fases 0-2 implementadas, listo para probar extracción.

---

## 🔄 ¿Qué pasa cuando analizás un archivo?

### Paso 1: File Watcher detecta cambio
```javascript
// Tocás: src/api.js

fileWatcher.on('modified', 'src/api.js')
  ↓
// Dispara análisis
```

---

### Paso 2: Layer A extrae datos BRUTOS

```javascript
// src/layer-a-static/pipeline/phases/atom-extraction-phase.js

for (cada función en api.js) {
  
  // 2.1 Data Flow (v0.7)
  atom.dataFlow = {
    inputs: [{ name: 'order', type: 'object' }],
    transformations: [
      { from: 'order.items', to: 'total', operation: 'calculation' }
    ],
    outputs: [{ type: 'return' }, { type: 'side_effect' }]
  }
  
  // 2.2 Side Effects
  atom.sideEffects = {
    networkCalls: [{ url: '/api/orders' }],
    storageAccess: [{ key: 'cart', type: 'write' }]
  }
  
  // 2.3 DNA (NUEVO)
  atom.dna = {
    structuralHash: "abc123...",     // Fingerprint de I/O
    patternHash: "def456...",        // Patrón estandarizado
    flowType: "read-transform-persist",
    operationSequence: ['receive', 'read', 'transform', 'persist', 'return'],
    complexityScore: 7
  }
  
  // 2.4 Temporal (NUEVO)
  atom.temporal = {
    isAsync: true,
    lifecycleHooks: ['useEffect'],
    timers: [{ type: 'setTimeout', delay: 100 }],
    initialization: false
  }
  
  // 2.5 Type Contracts (NUEVO)
  atom.typeContracts = {
    params: [{ name: 'order', type: 'Order' }],
    returns: { type: 'Promise<OrderResult>' },
    throws: [{ type: 'ValidationError' }]
  }
  
  // 2.6 Error Flow (NUEVO)
  atom.errorFlow = {
    throws: [
      { type: 'ValidationError', condition: '!order.items' }
    ],
    catches: [],
    unhandledCalls: ['JSON.parse']
  }
  
  // 2.7 Performance (NUEVO)
  atom.performance = {
    complexity: { cyclomatic: 12, bigO: 'O(n)' },
    expensiveOps: { nestedLoops: 1 },
    impactScore: 0.4
  }
}
```

**Resultado**: Array de átomos con metadata enriquecida.

---

### Paso 3: Layer B valida y enriquece

```javascript
// src/layer-b-semantic/validators/lineage-validator.js

for (cada atom) {
  
  // 3.1 Validar que tiene sentido
  validation = validateForLineage(atom)
  // → { valid: true, confidence: 'high', errors: [], warnings: [] }
  
  // 3.2 Buscar ancestros (Shadow Registry)
  // src/layer-c-memory/shadow-registry/index.js
  
  similar = registry.findSimilar(atom)
  // → [{ shadow: {...}, similarity: 0.92 }]
  
  if (similar.length > 0) {
    // Enriquecer con ancestry
    atom.ancestry = {
      replaced: similar[0].shadow.shadowId,
      generation: similar[0].shadow.lineage.generation + 1,
      vibrationScore: similar[0].shadow.inheritance.vibrationScore,
      strongConnections: [...],
      warnings: ["3 conexiones históricas no migraron"]
    }
  } else {
    atom.ancestry = { generation: 0 }  // Génesis
  }
}
```

**Resultado**: Átomos validados + enriquecidos con historia.

---

### Paso 4: Layer C guarda todo

```javascript
// Guardar en HOT storage (archivos vivos)
.omnysysdata/
├── atoms/
│   └── src_api_js/
│       ├── processOrder.json      # Átomo con TODA la metadata
│       ├── validateOrder.json
│       └── calculateTotal.json
├── files/
│   └── src_api_js.json           # Metadata del archivo
└── index.json                     # Índice actualizado

// Si el archivo se borró:
└── shadows/                       # COLD storage (muertos)
    └── shadow_abc123.json        # Sombra con ADN preservado
```

---

## 🎯 ¿Qué TENEMOS ahora (listo para usar)?

### ✅ Datos disponibles para cada función:

| Dato | Qué es | Para qué sirve AHORA |
|------|--------|---------------------|
| `dataFlow` | Inputs → Transforms → Outputs | Ver cómo fluyen los datos |
| `dna` | Fingerprint estructural | Identificar funciones similares |
| `ancestry` | Historia, generación, vibration | Saber si tiene "pasado" |
| `sideEffects` | Network, storage, DOM | Detectar dependencias ocultas |
| `temporal` | Async, timers, lifecycle | Orden de ejecución |
| `typeContracts` | JSDoc + inferencia | Validar contratos |
| `errorFlow` | Throws, catches | Detectar errores no manejados |
| `performance` | Complejidad, Big O | Identificar bottlenecks |

---

## ❌ ¿Qué NO tenemos todavía?

| Feature | Estado | Cuándo |
|---------|--------|--------|
| ML entrenado | ❌ No | Fase 3 (meses de datos) |
| Predicciones | ❌ No | Fase 3 |
| Sugerencias automáticas | ❌ No | Fase 3 |
| "Considera agregar X" | ❌ No | Fase 3 |

---

## 🔧 ¿Qué falta para empezar a probar?

### 1. Integrar los nuevos extractores al pipeline

```javascript
// En: src/layer-a-static/pipeline/phases/atom-extraction-phase.js

// YA ESTÁ:
atom.dataFlow = await extractDataFlow(...)
atom.dna = extractDNA(atom)

// FALTA AGREGAR:
atom.temporal = extractTemporalPatterns(code, functionInfo)
atom.typeContracts = extractTypeContracts(code, jsdoc)
atom.errorFlow = extractErrorFlow(code, atom.typeContracts)
atom.performance = extractPerformanceMetrics(code, performanceHints)
```

### 2. Correr el Connection Enricher post-análisis

```javascript
// Después de analizar TODOS los archivos:
// src/layer-a-static/pipeline/enhancers/connection-enricher.js

connections = await enrichConnections(allAtoms)
// → Detecta conexiones temporales, type, error, performance
```

### 3. Guardar todo en .omnysysdata/

Ya está implementado en storage-manager.js

---

## 🧪 Prueba Rápida (qué podés hacer ahora)

### Test 1: Crear archivo nuevo y ver ancestry
```bash
# 1. Crear archivo simple
echo "function test(x) { return x * 2; }" > src/test.js

# 2. File watcher detecta y analiza
# → Crea átomo en .omnysysdata/atoms/
# → Como no hay sombras similares: ancestry.generation = 0

# 3. Borrar archivo
rm src/test.js

# 4. File watcher crea sombra
# → .omnysysdata/shadows/shadow_xxx.json

# 5. Crear archivo similar
echo "function test(x) { return x * 3; }" > src/test2.js

# 6. File watcher detecta similaridad
# → ancestry.replaced = shadow_xxx
# → ancestry.generation = 1
```

### Test 2: Ver conexiones detectadas
```javascript
// Después de analizar el proyecto:
const connections = await enrichConnections(atoms);

console.log(connections.filter(c => c.type === 'temporal'));
// → [{ from: 'init.js', to: 'api.js', relationship: 'must-run-before' }]

console.log(connections.filter(c => c.type === 'error-flow-unhandled'));
// → [{ from: 'validate.js', errorType: 'ValidationError', risk: 'high' }]
```

---

## 🎯 Resumen Ejecutivo

**EL SISTEMA HOY**:
1. Detecta cambios en archivos
2. Extrae metadata enriquecida (data flow, DNA, temporal, types, errors, performance)
3. Valida y enriquece con ancestry (Shadow Registry)
4. Guarda en .omnysysdata/
5. Detecta conexiones entre funciones

**PARA EMPEZAR A PROBAR**:
1. Integrar los nuevos extractores (temporal, type, error, performance) al pipeline
2. Correr análisis en proyecto de prueba
3. Verificar que las conexiones se detectan

**¿Empezamos con eso?**
