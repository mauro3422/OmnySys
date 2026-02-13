# Flujo de Vida de un Archivo

**Documento**: 01-FLUSO-VIDA-ARCHIVO.md  
**Versión**: v0.7.1  
**Descripción**: Pipeline completo desde que se toca un archivo hasta que está disponible para las tools MCP

---

## 🎯 Casos de Uso Cubiertos

Este documento describe dos flujos:
1. **Caso A**: Archivo simple que NO necesita LLM (90% de archivos)
2. **Caso B**: Archivo complejo que SÍ necesita LLM (10% de archivos)

---

## CASO A: Archivo Simple (NO necesita LLM)

### Ejemplo
```javascript
// src/utils/helpers.js
export function formatDate(date) {
  return new Date(date).toLocaleDateString();
}
```

**Características**:
- ✅ Función pura
- ✅ Sin side effects
- ✅ Sin estado global
- ✅ Arquetipo: `utility`
- ✅ `requiresLLM: false`

---

### Paso 1: File Watcher Detecta Cambio

**Archivo**: `src/core/file-watcher/handlers.js`

```javascript
async handleFileModified(filePath) {
  // 1. Invalidar cache inmediatamente
  const invalidator = getCacheInvalidator();
  await invalidator.invalidateSync(filePath);
  
  // 2. Agregar a cola del orchestrator
  this.orchestrator.queue.enqueue(filePath, 'normal');
}
```

**Output**: Archivo en cola, cache invalidado.

---

### Paso 2: Layer A - Análisis Estático

**Archivo**: `src/layer-a-static/indexer.js` → `src/layer-a-static/pipeline/single-file.js`

```javascript
// 1. Parsear AST
const ast = parseCode(code);

// 2. Extraer metadata
const analysis = {
  path: 'src/utils/helpers.js',
  exports: ['formatDate'],
  imports: [],
  definitions: [{
    name: 'formatDate',
    type: 'FunctionDeclaration',
    isExported: true,
    parameters: [{ name: 'date', type: 'any' }],
    returns: 'string'
  }],
  semanticAnalysis: {
    complexity: 'low',
    archetypes: [{ type: 'utility', requiresLLM: false }],
    hasSideEffects: false,
    isPure: true
  }
  // NOTA: NO tiene llmInsights
};

// 3. Guardar en disco
await saveFileAnalysis(rootPath, 'src/utils/helpers.js', analysis);
```

**Guardado en**: `.omnysysdata/files/src/utils/helpers.js.json`

---

### Paso 3: Orchestrator - Decisión

**Archivo**: `src/core/orchestrator/llm-analysis.js` → `_analyzeComplexFilesWithLLM()`

```javascript
// 1. Leer metadata de Layer A
const fileAnalysis = await getFileAnalysis(projectPath, 'helpers.js');

// 2. Detectar arquetipos
const archetypes = detectArchetypes(fileAnalysis);
// → [{ type: 'utility', requiresLLM: false }]

// 3. GATE 3: ¿Todos los arquetipos tienen requiresLLM = false?
const allBypass = archetypes.every(a => a.requiresLLM === false);
// → TRUE

// 4. Loguear bypass
logger.info('Layer A analysis sufficient. Arquetipos: utility');

// 5. NO agregar a cola LLM
// Resultado: Archivo listo sin pasar por LLM
```

**Output**: Archivo "bypasseado", sin llmInsights.

---

### Paso 4: Disponible para Tools

```javascript
// Cuando Claude pregunta: "¿Qué hace helpers.js?"

// Tool "get_molecule_summary":
const analysis = await getFileAnalysis(projectPath, 'helpers.js');

// Retorna:
{
  "path": "src/utils/helpers.js",
  "exports": ["formatDate"],
  "semanticAnalysis": {
    "archetypes": ["utility"],
    "isPure": true
  }
  // NO tiene llmInsights (no lo necesitó)
}
```

---

## CASO B: Archivo Complejo (SÍ necesita LLM)

### Ejemplo
```javascript
// src/state/GlobalStore.js
export const store = {
  data: window.gameState || {},
  
  init() {
    window.addEventListener('storage', (e) => {
      this.data = JSON.parse(e.newValue);
    });
  },
  
  save() {
    localStorage.setItem('game', JSON.stringify(this.data));
  }
};
```

**Características**:
- ⚠️ Acceso a `window.*` (global state)
- ⚠️ `localStorage` (storage)
- ⚠️ Event listeners
- ⚠️ Arquetipo: `state-manager`, `god-object`
- ⚠️ `requiresLLM: true` o `conditional`

---

### Paso 1-2: Igual que Caso A (File Watcher + Layer A)

```javascript
// Layer A detecta:
{
  path: 'src/state/GlobalStore.js',
  semanticAnalysis: {
    archetypes: [
      { type: 'state-manager', requiresLLM: 'conditional' },
      { type: 'god-object', requiresLLM: true }  // ← GATE 1
    ],
    globalStateAccess: ['window.gameState'],
    storageAccess: ['localStorage'],
    eventListeners: [{ type: 'storage' }]
  }
}
```

---

### Paso 3: Orchestrator - Decisión (Diferente)

```javascript
// 1. Detectar arquetipos
const archetypes = [
  { type: 'state-manager', requiresLLM: 'conditional' },
  { type: 'god-object', requiresLLM: true }
];

// 2. GATE 1: ¿Algún arquetipo SIEMPRE requiere LLM?
const alwaysNeedsLLM = archetypes.some(a => a.requiresLLM === true);
// → TRUE (por 'god-object')

// 3. Agregar a cola LLM
this.queue.enqueueJob({
  filePath: 'src/state/GlobalStore.js',
  needsLLM: true,           // ← FLAG IMPORTANTE
  archetypes: ['god-object', 'state-manager'],
  priority: 'critical'      // ← God object = prioridad máxima
});

// 4. Iniciar procesamiento
this._processNext();  // ← Worker toma el job
```

---

### Paso 4: Analysis Worker + LLM

**Archivo**: `src/core/analysis-worker.js`

```javascript
async analyze(job) {
  // job.needsLLM = true
  
  // 1. Re-analizar con Layer A (actualizar)
  const layerAResult = await analyzeSingleFile(...);
  
  // 2. Preparar metadata para LLM
  const promptMetadata = buildPromptMetadata(job.filePath, layerAResult);
  
  // 3. Obtener LLMAnalyzer (inyectado o crear nuevo)
  let llmAnalyzer = this.llmAnalyzer;
  if (!llmAnalyzer) {
    llmAnalyzer = new LLMAnalyzer(aiConfig, this.rootPath);
    await llmAnalyzer.initialize();
  }
  
  // 4. Enviar a LLM
  const llmResults = await llmAnalyzer.analyzeMultiple([{
    filePath: job.filePath,
    code: fileContent,
    staticAnalysis: layerAResult,
    metadata: promptMetadata
  }]);
  
  // 5. LLM retorna insights
  const llmResult = {
    confidence: 0.92,
    reasoning: "Este archivo es un god-object...",
    suggestedConnections: [
      "src/components/GameBoard.js",    // ← LLM detectó conexión
      "src/components/ScorePanel.js"      que Layer A NO vio
    ],
    hiddenConnections: [...],
    godObjectAnalysis: {
      isGodObject: true,
      riskLevel: 'high',
      responsibilities: ['state management', 'persistence', 'event handling']
    }
  };
  
  // 6. MERGE: Layer A + LLM
  const mergedResult = {
    ...layerAResult,                    // Datos estáticos
    llmInsights: llmResult,            // Datos LLM
    llmProcessed: true,
    llmProcessedAt: "2026-02-12T..."
  };
  
  // 7. Guardar en disco
  await saveFileAnalysis(rootPath, job.filePath, mergedResult);
  
  // 8. FIX: Invalidar cache (para que se vea inmediatamente)
  const invalidator = getCacheInvalidator({ projectPath: this.rootPath });
  await invalidator.invalidateSync(job.filePath);
}
```

---

### Paso 5: Disponible para Tools (Enriquecido)

```javascript
// Cuando Claude pregunta: "¿Qué archivos usa GlobalStore.js?"

const analysis = await getFileAnalysis(projectPath, 'GlobalStore.js');

// Retorna:
{
  "path": "src/state/GlobalStore.js",
  "semanticAnalysis": {
    "archetypes": ["state-manager", "god-object"],
    "globalStateAccess": ["window.gameState"]
  },
  "llmInsights": {
    "confidence": 0.92,
    "suggestedConnections": [
      "src/components/GameBoard.js",    // ← Detectado por LLM
      "src/components/ScorePanel.js"
    ],
    "godObjectAnalysis": {
      "isGodObject": true,
      "riskLevel": "high"
    }
  },
  "llmProcessed": true
}
```

---

## 📊 Comparación Caso A vs Caso B

| Aspecto | Caso A (Simple) | Caso B (Complejo) |
|---------|-----------------|-------------------|
| **Tiempo** | ~100ms | ~2-5s (LLM) |
| **Arquetipos** | `utility`, `standard` | `god-object`, `state-manager` |
| **requiresLLM** | `false` | `true` o `conditional` |
| **Pasa por LLM** | ❌ No | ✅ Sí |
| **llmInsights** | ❌ No tiene | ✅ Tiene |
| **Conexiones** | Solo estáticas | Estáticas + LLM detectadas |
| **Prioridad cola** | `normal` | `critical` o `high` |
| **Cache invalidation** | ✅ Después de guardar | ✅ Después de guardar |

---

## 🔧 Archivos Clave del Flujo

| Archivo | Responsabilidad | Líneas clave |
|---------|-----------------|--------------|
| `src/core/file-watcher/handlers.js` | Detectar cambios, invalidar cache | `handleFileModified()` |
| `src/layer-a-static/pipeline/single-file.js` | Análisis estático | `analyzeSingleFile()` |
| `src/layer-a-static/storage/storage-manager.js` | Guardar en disco | `saveFileAnalysis()` |
| `src/core/orchestrator/llm-analysis.js` | Decidir si necesita LLM | `_analyzeComplexFilesWithLLM()` |
| `src/core/orchestrator/queueing.js` | Manejar cola de jobs | `_processNext()` |
| `src/core/analysis-worker.js` | Procesar jobs (con o sin LLM) | `analyze()` |
| `src/core/cache-invalidator/index.js` | Invalidar cache | `invalidateSync()` |

---

## 🚨 Problemas Conocidos

### Problema 1: LLM temprano en pipeline (Pendiente)

**Síntoma**: El LLM se inicia en Step 2 del pipeline MCP, antes de Layer A.

**Impacto**: Espera 30s del LLM aunque no lo necesitemos.

**Fix propuesto**: Mover `LLMSetupStep` al final del pipeline.

**Estado**: ⏳ Pendiente

---

### Problema 2: 4 cachés duplicados (Pendiente)

**Síntoma**: UnifiedCacheManager, CacheInvalidator, AtomicCache, DerivationCache hacen trabajo solapado.

**Impacto**: Uso de memoria innecesario, posibles inconsistencias.

**Fix propuesto**: Consolidar en un solo sistema con estrategias.

**Estado**: ⏳ Pendiente

**Documentado en**: [02-SISTEMA-CACHE.md](./02-SISTEMA-CACHE.md)

---

## ✅ Reglas de Oro para Desarrolladores

1. **Layer A siempre primero**: Sin análisis estático, no hay decisión.
2. **Arquetipos guían el flujo**: `requiresLLM: true` → Siempre LLM.
3. **Merge, no reemplazar**: Layer A + LLM = resultado final.
4. **Invalidar después de guardar**: Siempre.
5. **SSOT en disco**: `.omnysysdata/` es la verdad, cache es optimización.

---

**Volver al [README](./README.md)**
