# Integración Completa: Flujo del Dato (v0.7.1)

**Desde que tocas un archivo hasta que se guardan todas las conexiones.**

---

## 🔄 Flujo Completo (Paso a Paso)

### PASO 1: File Watcher Detecta Cambio

```javascript
// Tocás src/api.js
// File: src/core/file-watcher/handlers.js

async handleFileModified(filePath, fullPath) {
  // 1. Analizar archivo
  await this.analyzeAndIndex(filePath, fullPath);
  
  // 2. Enriquecer con ancestry
  await this.enrichAtomsWithAncestry(filePath);
  
  this.emit('file:modified', { filePath });
}
```

**Output**: Evento disparado, archivo analizado.

---

### PASO 2: Pipeline de Análisis

```javascript
// File: src/layer-a-static/pipeline/phases/atom-extraction-phase.js

async extractAtomMetadata(functionInfo, functionCode, fileMetadata, filePath) {
  
  // 2.1 Extraer metadatos básicos
  const sideEffects = extractSideEffects(functionCode);
  const callGraph = extractCallGraph(functionCode);
  const dataFlowV2 = await extractDataFlowV2(...);
  
  // 2.2 EXTRAER 4 SISTEMAS NUEVOS
  const performanceMetrics = extractPerformanceMetrics(functionCode, performanceHints);
  const typeContracts = extractTypeContracts(functionCode, fileMetadata.jsdoc, functionInfo);
  const errorFlow = extractErrorFlow(functionCode, typeContracts);
  const temporalPatterns = extractTemporalConnections(functionCode, functionInfo);
  
  // 2.3 EXTRAER DNA
  const dna = extractDNA(atomMetadata);
  
  // 2.4 Construir átomo
  return {
    id: functionInfo.id,
    name: functionInfo.name,
    filePath: filePath,
    
    // Metadatos enriquecidos
    dataFlow: dataFlowV2,
    sideEffects: sideEffects,
    
    // 4 SISTEMAS NUEVOS
    performance: performanceMetrics,     // { complexity, expensiveOps, impactScore }
    typeContracts: typeContracts,        // { params, returns, throws, signature }
    errorFlow: errorFlow,                // { throws, catches, unhandledCalls }
    temporal: {                          // { patterns, executionOrder }
      patterns: temporalPatterns,
      executionOrder: null
    },
    
    // DNA para Shadow Registry
    dna: dna,                            // { structuralHash, patternHash, flowType }
    
    // Más metadatos...
    calls: functionInfo.calls,
    isExported: functionInfo.isExported,
    complexity: complexity
  };
}
```

**Output**: Array de átomos con TODA la metadata.

---

### PASO 3: Validación (Layer B)

```javascript
// File: src/layer-b-semantic/validators/lineage-validator.js

function validateForLineage(atom) {
  // 3.1 Validar estructura
  if (!atom.dataFlow) errors.push('Missing dataFlow');
  if (!atom.dna) errors.push('Missing DNA');
  if (!atom.typeContracts) errors.push('Missing typeContracts');
  if (!atom.errorFlow) errors.push('Missing errorFlow');
  if (!atom.performance) errors.push('Missing performance');
  
  // 3.2 Validar coherencia
  if (atom.typeContracts.throws.length !== atom.errorFlow.throws.length) {
    warnings.push('Type contracts y errorFlow no coinciden');
  }
  
  // 3.3 Validar DNA
  const dnaValidation = validateDNA(atom.dna);
  
  return {
    valid: errors.length === 0,
    confidence: calculateConfidence(errors, warnings),
    errors,
    warnings
  };
}
```

**Output**: Átomos validados con confianza.

---

### PASO 4: Shadow Registry (Ancestry)

```javascript
// File: src/layer-c-memory/shadow-registry/index.js

async enrichWithAncestry(atom) {
  // 4.1 Buscar sombras similares por DNA
  const matches = await this.findSimilar(atom, { minSimilarity: 0.85 });
  
  if (matches.length > 0) {
    const bestMatch = matches[0];
    
    // 4.2 Enriquecer con ancestry
    atom.ancestry = {
      replaced: bestMatch.shadow.shadowId,
      lineage: [bestMatch.shadow.shadowId, ...bestMatch.shadow.lineage.ancestors],
      generation: bestMatch.shadow.lineage.generation + 1,
      vibrationScore: bestMatch.shadow.inheritance.vibrationScore,
      strongConnections: bestMatch.shadow.inheritance.strongConnections,
      warnings: this.generateAncestryWarnings(bestMatch.shadow, atom)
    };
    
    // 4.3 Marcar sombra como reemplazada
    await this.markReplaced(bestMatch.shadow.shadowId, atom.id);
  } else {
    // Génesis
    atom.ancestry = { generation: 0 };
  }
  
  return atom;
}
```

**Output**: Átomos con historia y linaje.

---

### PASO 5: Connection Enricher (Cross-Reference)

```javascript
// File: src/layer-a-static/pipeline/enhancers/connection-enricher.js

async function enrichConnections(atoms) {
  const connections = [];
  
  // 5.1 Conexiones temporales
  connections.push(...extractTemporalConnections(atoms));
  connections.push(...extractCrossFileTemporalConnections(atoms));
  
  // 5.2 Conexiones de type contracts
  connections.push(...extractTypeContractConnections(atoms));
  
  // 5.3 Conexiones de error flow
  connections.push(...extractErrorFlowConnections(atoms));
  
  // 5.4 Conexiones de performance
  connections.push(...extractPerformanceImpactConnections(atoms));
  
  // 5.5 Conexiones de data flow
  connections.push(...extractDataFlowConnections(atoms));
  
  // 5.6 Conexiones heredadas de ancestry
  connections.push(...extractInheritedConnections(atoms));
  
  // 5.7 Calcular pesos
  const weightedConnections = connections.map(c => ({
    ...c,
    weight: calculateConnectionWeight(c),
    category: getConnectionCategory(c.weight)
  }));
  
  // 5.8 Detectar conflictos
  const conflicts = detectConnectionConflicts(weightedConnections);
  
  return { connections: weightedConnections, conflicts };
}
```

**Output**: Todas las conexiones entre átomos, con pesos y conflictos.

---

### PASO 6: Guardado en .omnysysdata/

```javascript
// File: src/layer-a-static/storage/storage-manager.js

async function saveAtom(rootPath, filePath, functionName, atomData) {
  const dataPath = path.join(rootPath, '.omnysysdata');
  
  // 6.1 Guardar átomo individual
  const atomPath = path.join(dataPath, 'atoms', safePath, `${functionName}.json`);
  await fs.writeFile(atomPath, JSON.stringify(atomData, null, 2));
  
  // Átomo incluye:
  // - dataFlow
  // - performance { complexity, impactScore, ... }
  // - typeContracts { params, returns, throws }
  // - errorFlow { throws, catches }
  // - temporal { patterns }
  // - ancestry { generation, vibrationScore, ... }
  // - dna { structuralHash, patternHash }
}

async function saveConnections(rootPath, connections) {
  // 6.2 Guardar conexiones enriquecidas
  const connectionsPath = path.join(rootPath, '.omnysysdata', 'connections-enriched.json');
  await fs.writeFile(connectionsPath, JSON.stringify(connections, null, 2));
}
```

**Output**: Todo guardado en .omnysysdata/

---

### PASO 7: Si el archivo se borra → Shadow

```javascript
// File: src/core/file-watcher/handlers.js

async handleFileDeleted(filePath) {
  // 7.1 Obtener átomos antes de borrar
  const atoms = await this.getAtomsForFile(filePath);
  
  for (const atom of atoms) {
    // 7.2 Crear sombra
    const shadow = await registry.createShadow(atom, {
      reason: 'file_deleted',
      diedAt: new Date()
    });
    
    // Sombra incluye TODO:
    // - dna (para matching futuro)
    // - metadata resumida
    // - lineage (ancestros)
    // - inheritance (datos heredables)
    // - death (razón, commits, riesgo)
  }
  
  // 7.3 Limpiar HOT storage
  await this.removeFileMetadata(filePath);
}
```

**Output**: Sombra creada en .omnysysdata/shadows/

---

## 📊 Estructura Final del Dato

### Átomo Vivo (HOT Storage)

```javascript
// .omnysysdata/atoms/src_api_js/processOrder.json
{
  // Identidad
  id: "src/api.js::processOrder",
  name: "processOrder",
  filePath: "src/api.js",
  line: 45,
  
  // Data Flow (v0.7)
  dataFlow: {
    inputs: [...],
    transformations: [...],
    outputs: [...]
  },
  
  // 4 SISTEMAS NUEVOS (v0.7.1)
  performance: {
    complexity: { cyclomatic: 12, bigO: 'O(n)' },
    expensiveOps: { nestedLoops: 1, heavyCalls: [...] },
    impactScore: 0.4,
    estimates: { executionTime: 'medium', blocking: false }
  },
  
  typeContracts: {
    params: [{ name: 'order', type: 'Order' }],
    returns: { type: 'Promise<OrderResult>' },
    throws: [{ type: 'ValidationError' }],
    signature: "(order: Order) => Promise<OrderResult>",
    confidence: 0.85
  },
  
  errorFlow: {
    throws: [
      { type: 'ValidationError', condition: '!order.items' }
    ],
    catches: [],
    unhandledCalls: ['JSON.parse'],
    propagation: 'full'
  },
  
  temporal: {
    patterns: {
      initialization: false,
      lifecycleHooks: [{ type: 'useEffect', phase: 'render' }],
      timers: [],
      asyncPatterns: { isAsync: true, hasAwait: true },
      executionOrder: { mustRunAfter: [...] }
    }
  },
  
  // Shadow Registry (Ancestry)
  ancestry: {
    replaced: "shadow_abc123",
    generation: 2,
    vibrationScore: 0.87,
    strongConnections: [
      { target: "routes.js", weight: 0.9 }
    ],
    warnings: ["3 conexiones históricas no migraron"]
  },
  
  // DNA
  dna: {
    id: "9ea059dc...",
    structuralHash: "abc123...",
    patternHash: "def456...",
    flowType: "read-transform-persist",
    operationSequence: ['receive', 'read', 'transform', 'persist', 'return'],
    complexityScore: 7
  },
  
  // Conexiones (del Connection Enricher)
  connections: {
    temporal: [...],
    typeContracts: [...],
    errorFlow: [...],
    performance: [...],
    inherited: [...]
  },
  
  // Metadata
  _meta: {
    extractedAt: "2026-02-09T...",
    validation: { valid: true, confidence: 'high' }
  }
}
```

### Sombra (COLD Storage)

```javascript
// .omnysysdata/shadows/shadow_abc123.json
{
  shadowId: "shadow_abc123",
  originalId: "src/api.js::processOrder",
  status: "replaced",
  diedAt: "2026-02-09T...",
  
  // ADN preservado
  dna: { /* igual que el átomo */ },
  
  // Metadata resumida
  metadata: {
    name: "processOrder",
    dataFlow: { inputCount: 2, outputCount: 1 },
    performance: { impactScore: 0.4 },
    typeContracts: { params: [...], returns: {...} }
  },
  
  // Linaje
  lineage: {
    parentShadowId: "shadow_parent",
    childShadowIds: ["shadow_child"],
    generation: 2,
    evolutionType: "refactor"
  },
  
  // Herencia
  inheritance: {
    connections: [...],
    vibrationScore: 0.87,
    rupturedConnections: []
  },
  
  // Muerte
  death: {
    reason: "refactor_business_logic",
    riskIntroduced: 0.3
  }
}
```

---

## ✅ Checklist de Integración

- [x] **Paso 1**: File Watcher detecta cambios
- [x] **Paso 2**: Pipeline extrae 4 sistemas nuevos
- [x] **Paso 3**: Layer B valida todo
- [x] **Paso 4**: Shadow Registry enriquece ancestry
- [x] **Paso 5**: Connection Enricher detecta conexiones
- [x] **Paso 6**: Storage Manager guarda todo
- [x] **Paso 7**: Si borra, crea sombra

**Todo integrado. Listo para probar.**
