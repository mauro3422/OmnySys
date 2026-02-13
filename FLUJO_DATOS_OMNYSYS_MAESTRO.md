# FLUJO DE DATOS OMNYSYS - DOCUMENTO MAESTRO

**Fecha**: 2026-02-12  
**Propósito**: Único punto de verdad para el flujo completo de datos  
**Estado**: Análisis exhaustivo en progreso  

---

## PARTE 1: ARQUITECTURA GENERAL DE DATOS

```
┌─────────────────────────────────────────────────────────────────────────────────────┐
│                           FLUJO DE VIDA DE UN ARCHIVO                              │
└─────────────────────────────────────────────────────────────────────────────────────┘

    PROYECTO (C:\Dev\MiProyecto)
           │
           ▼
┌─────────────────────┐
│   layer-a-analysis  │ ←── Paso 1: Análisis estático (sin IA)
│   (indexer.js)      │      • AST parsing
└─────────┬───────────┘      • Regex patterns
          │                  • Extrae: imports, exports, functions
          │                  • Guarda en: .omnysysdata/
          ▼
┌─────────────────────┐
│   .omnysysdata/     │ ←── SSOT: Single Source of Truth en disco
│   ├── index.json    │      • Índice de todos los archivos
│   ├── files/        │      • Análisis individual por archivo
│   │   └── src/      │      • JSON con metadata completa
│   │       └── UI.js.json
│   ├── atoms/        │      • Funciones individuales (átomos)
│   └── connections/  │      • Conexiones entre archivos
└─────────┬───────────┘
          │
          ▼
┌─────────────────────┐
│   Cache System      │ ←── 4 CACHÉS ACTUALES (ver Parte 2)
│   (4 sistemas)      │      • UnifiedCacheManager
└─────────┬───────────┘      • CacheInvalidator
          │                  • AtomicCache
          ▼                  • DerivationCache
┌─────────────────────┐
│   Orchestrator      │ ←── Paso 2: Decisión inteligente
│   (lifecycle.js)    │      • Revisa metadata de Layer A
└─────────┬───────────┘      • Decide: ¿Necesita LLM?
          │                  • Si NO: Bypass (90% de archivos)
          │                  • Si SÍ: Agrega a cola LLM
          ▼
┌─────────────────────┐
│   Analysis Queue    │ ←── Cola de procesamiento
│   (queueing.js)     │      • Prioridad: critical/high/medium/low
└─────────┬───────────┘      • Max concurrent: 4 jobs
          │
          ▼
┌─────────────────────┐
│   Analysis Worker   │ ←── Paso 3: Procesamiento
│   (analysis-worker) │      • Recibe job de la cola
└─────────┬───────────┘      • Si needsLLM: Llama a LLMAnalyzer
          │                  • Si !needsLLM: Layer A solamente
          ▼
┌─────────────────────┐
│   LLM Analyzer      │ ←── Paso 4: Análisis semántico (IA)
│   (layer-b)         │      • Solo para archivos complejos
└────────┬────────────┘      • Confirma/ corrige metadata
         │                   • Guarda: llmInsights en .omnysysdata/
         ▼
┌─────────────────────┐
│   MCP Server        │ ←── Paso 5: Exposición de datos
│   (tools)           │      • Tools consultan .omnysysdata/
└─────────────────────┘      • Responden a Claude/OpenCode
```

---

## PARTE 2: LOS 4 SISTEMAS DE CACHÉ (Problema Crítico)

### 2.1 Mapa de Cachés

```
┌─────────────────────────────────────────────────────────────────┐
│                    SISTEMAS DE CACHÉ ACTUALES                  │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  ┌─────────────────────────┐                                    │
│  │ UnifiedCacheManager     │ ←── Caché "OFICIAL" del MCP        │
│  │ src/core/unified-cache/ │      • Usado por: MCP Server       │
│  │                         │      • Datos: Archivos, deps       │
│  │ • ramCache (Map)        │      • Persistencia: Disco + RAM   │
│  │ • index.entries         │                                    │
│  │ • dependencyGraph       │                                    │
│  └───────────┬─────────────┘                                    │
│              │                                                  │
│              │ ¡PROBLEMA! 4 sistemas hacen lo mismo            │
│              │                                                  │
│  ┌───────────┴─────────────┐                                    │
│  │ CacheInvalidator        │ ←── Invalidación atómica           │
│  │ src/core/cache-inval/   │      • Usado por: File Watcher     │
│  │                         │      • Datos: Operaciones de borrado
│  │ • Transacciones         │      • Persistencia: RAM + backup  │
│  │ • Rollback support      │                                    │
│  └───────────┬─────────────┘                                    │
│              │                                                  │
│  ┌───────────┴─────────────┐                                    │
│  │ AtomicCache             │ ←── Caché de FUNCIONES (átomos)    │
│  │ src/shared/atomic-cache │      • Usado por: Sistema Molecular│
│  │                         │      • Datos: Funciones individuales
│  │ • atoms (Map)           │      • Persistencia: RAM           │
│  │ • derivations           │      • TTL + LRU propios           │
│  │ • fileToAtoms           │                                    │
│  └───────────┬─────────────┘                                    │
│              │                                                  │
│  ┌───────────┴─────────────┐                                    │
│  │ DerivationCache         │ ←── Caché de DERIVACIONES          │
│  │ (dentro de AtomicCache) │      • Usado por: Reglas de        │
│  │                         │        derivación molecular        │
│  │ • cache (Map)           │      • Datos: Resultados de reglas │
│  │ • accessOrder           │      • Ej: moleculeComplexity()    │
│  └─────────────────────────┘                                    │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

### 2.2 Duplicaciones Confirmadas

| Feature | UnifiedCacheManager | AtomicCache | CacheInvalidator | DerivationCache |
|---------|-------------------|-------------|------------------|-----------------|
| **Map() interno** | ✅ ramCache | ✅ atoms | ✅ (en ops) | ✅ cache |
| **TTL** | ✅ 5 min | ✅ 5 min | ❌ No | ❌ No |
| **LRU eviction** | ✅ Sí | ✅ Sí | ❌ No | ✅ Sí |
| **Índice inverso** | ✅ entries | ✅ fileToAtoms | ❌ No | ❌ No |
| **Persistencia** | ✅ Disco + RAM | ❌ RAM only | ✅ RAM + backup | ❌ RAM only |

**CONCLUSIÓN**: UnifiedCacheManager ya tiene todo lo que necesitamos. Los otros 3 son duplicaciones o especializaciones innecesarias.

---

## PARTE 3: FLUJO DETALLADO - CASO A: Archivo NO necesita LLM (90%)

### 3.1 Paso a Paso

```javascript
// EJEMPLO: src/utils/helpers.js (archivo simple)
// NO tiene: estado global, eventos complejos, imports dinámicos
// SÍ tiene: funciones puras, exports simples

┌─────────────────────────────────────────────────────────────────┐
│ PASO 1: Layer A Analysis (indexer.js)                          │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  Input: Código fuente de helpers.js                            │
│         │                                                       │
│         ▼                                                       │
│  ┌─────────────┐                                                │
│  │ AST Parser  │ ──► Extrae:                                   │
│  │ (Babel)     │     • exports: ["formatDate", "parseJSON"]    │
│  └─────────────┘     • imports: []                              │
│                      • functions: 2                             │
│                      • complexity: baja                         │
│                          │                                      │
│                          ▼                                      │
│  ┌─────────────┐                                                │
│  │ Storage     │ ──► Guarda en:                                 │
│  │ Manager     │     .omnysysdata/files/src/utils/helpers.js.json
│  └─────────────┘                                                │
│                                                                 │
│  Estructura guardada:                                           │
│  {                                                              │
│    "path": "src/utils/helpers.js",                             │
│    "exports": ["formatDate", "parseJSON"],                      │
│    "imports": [],                                               │
│    "definitions": [...],                                        │
│    "semanticAnalysis": {                                        │
│      "complexity": "low",                                       │
│      "archetypes": ["utility"],                                 │
│      "hasSideEffects": false,                                   │
│      "isPure": true                                             │
│    },                                                           │
│    // NO tiene llmInsights                                      │
│  }                                                              │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘

          │
          ▼

┌─────────────────────────────────────────────────────────────────┐
│ PASO 2: Orchestrator Decision (lifecycle.js)                   │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  _analyzeComplexFilesWithLLM() revisa el archivo:              │
│                                                                 │
│  1. Lee: .omnysysdata/index.json                               │
│     └── Encuentra: helpers.js                                  │
│                                                                 │
│  2. Llama: getFileAnalysis(projectPath, "helpers.js")          │
│     └── Obtiene metadata de Layer A                            │
│                                                                 │
│  3. Detecta arquetipos:                                        │
│     └── archetypes: [{ type: "utility", requiresLLM: false }]  │
│                                                                 │
│  4. GATE 3: Verifica si todos los arquetipos tienen            │
│     requiresLLM = false                                        │
│     └── ✅ SÍ → NO necesita LLM                                │
│                                                                 │
│  5. Loguea bypass:                                             │
│     "Layer A analysis sufficient. Arquetipos: utility"         │
│                                                                 │
│  6. NO agrega a cola LLM                                       │
│                                                                 │
│  RESULTADO: Archivo bypassed, NO va a cola LLM                 │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘

          │
          ▼

┌─────────────────────────────────────────────────────────────────┐
│ PASO 3: MCP Tools consultan datos                              │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  Cuando Claude pregunta: "¿Qué hace helpers.js?"               │
│                                                                 │
│  1. Tool "get_molecule_summary" llama:                         │
│     └── getFileAnalysis(projectPath, "helpers.js")             │
│                                                                 │
│  2. Lee directamente desde:                                    │
│     .omnysysdata/files/src/utils/helpers.js.json               │
│                                                                 │
│  3. Retorna metadata (sin llmInsights porque no lo necesitó)   │
│                                                                 │
│  4. Claude responde al usuario con info de Layer A             │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

---

## PARTE 4: FLUJO DETALLADO - CASO B: Archivo SÍ necesita LLM (10%)

### 4.1 Paso a Paso

```javascript
// EJEMPLO: src/state/GlobalStore.js (archivo complejo)
// TIENE: window.*, localStorage, event listeners
// Archetype: "state-manager", "god-object"

┌─────────────────────────────────────────────────────────────────┐
│ PASO 1: Layer A Analysis (igual que antes)                     │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  Guarda en: .omnysysdata/files/src/state/GlobalStore.js.json   │
│                                                                 │
│  {                                                              │
│    "path": "src/state/GlobalStore.js",                         │
│    "exports": ["store", "dispatch"],                            │
│    "semanticAnalysis": {                                        │
│      "archetypes": [                                            │
│        { type: "state-manager", requiresLLM: "conditional" },   │
│        { type: "god-object", requiresLLM: true }                │
│      ],                                                         │
│      "hasSideEffects": true,                                    │
│      "globalStateAccess": ["window.gameState"],                │
│      "storageAccess": ["localStorage.saveGame"]                │
│      // Datos ESTÁTICOS detectados por regex/AST               │
│    }                                                            │
│    // NO tiene llmInsights todavía                              │
│  }                                                              │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘

          │
          ▼

┌─────────────────────────────────────────────────────────────────┐
│ PASO 2: Orchestrator Decision                                  │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  _analyzeComplexFilesWithLLM() revisa GlobalStore.js:          │
│                                                                 │
│  1. Obtiene metadata de Layer A                                │
│                                                                 │
│  2. Detecta arquetipos:                                        │
│     • "state-manager" (requiresLLM: "conditional")              │
│     • "god-object" (requiresLLM: true) ←── GATE 1              │
│                                                                 │
│  3. GATE 1: ¿Algún arquetipo tiene requiresLLM = true?         │
│     └── ✅ SÍ ("god-object") → Necesita LLM                    │
│                                                                 │
│  4. Loguea decisión:                                           │
│     "GlobalStore.js: Necesita LLM (god-object, state-manager)" │
│                                                                 │
│  5. Agrega a cola con prioridad CRITICAL:                      │
│     this.queue.enqueueJob({                                     │
│       filePath: "src/state/GlobalStore.js",                    │
│       needsLLM: true,     ←── FLAG IMPORTANTE                  │
│       archetypes: ["god-object", "state-manager"],             │
│       priority: "critical"                                     │
│     })                                                          │
│                                                                 │
│  6. Inicia procesamiento:                                      │
│     for (let i = 0; i < maxConcurrent; i++) {                  │
│       this._processNext();  ←── Worker toma el job             │
│     }                                                           │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘

          │
          ▼

┌─────────────────────────────────────────────────────────────────┐
│ PASO 3: Analysis Worker procesa con LLM                        │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  analysis-worker.js recibe el job:                             │
│                                                                 │
│  {                                                              │
│    filePath: "src/state/GlobalStore.js",                       │
│    needsLLM: true,     ←── Entra al branch LLM                 │
│    archetypes: ["god-object", "state-manager"],                │
│    fileAnalysis: { ...datos de Layer A... }                    │
│  }                                                              │
│                                                                 │
│  ┌─────────────────────────────────────────────────────┐       │
│  │ Branch: if (job.needsLLM) { ... }                   │       │
│  │                                                     │       │
│  │ 1. Re-analiza con Layer A (actualizar datos)        │       │
│  │                                                     │       │
│  │ 2. Prepara metadata para LLM:                       │       │
│  │    promptMetadata = buildPromptMetadata(filePath,   │       │
│  │                                          fileAnalysis)│       │
│  │                                                     │       │
│  │ 3. Obtiene LLMAnalyzer (inyectado o crea nuevo)     │       │
│  │    llmAnalyzer = this.llmAnalyzer || new LLMAnalyzer│       │
│  │                                                     │       │
│  │ 4. Envía a LLM:                                     │       │
│  │    llmResults = await llmAnalyzer.analyzeMultiple([ │       │
│  │      { filePath, code, staticAnalysis, metadata }   │       │
│  │    ])                                               │       │
│  │                                                     │       │
│  │ 5. LLM retorna insights:                            │       │
│  │    {                                                │       │
│  │      confidence: 0.92,                              │       │
│  │      reasoning: "Este archivo es un god-object...", │       │
│  │      suggestedConnections: [                        │       │
│  │        "src/components/GameBoard.js",               │       │
│  │        "src/components/ScorePanel.js"               │       │
│  │      ],                                             │       │
│  │      hiddenConnections: [...],                      │       │
│  │      riskLevel: "high"                              │       │
│  │    }                                                │       │
│  │                                                     │       │
│  │ 6. MERGE resultado LLM con análisis Layer A:        │       │
│  │    mergedResult = {                                 │       │
│  │      ...fileAnalysis,  // Datos de Layer A         │       │
│  │      llmInsights: llmResults,  // Datos LLM        │       │
│  │      llmProcessed: true,                           │       │
│  │      llmProcessedAt: "2026-02-12T..."              │       │
│  │    }                                                │       │
│  │                                                     │       │
│  │ 7. GUARDA en disco:                                 │       │
│  │    await saveFileAnalysis(rootPath,                 │       │
│  │                         filePath,                   │       │
│  │                         mergedResult)               │       │
│  │                                                     │       │
│  └─────────────────────────────────────────────────────┘       │
│                                                                 │
│  Archivo guardado:                                              │
│  .omnysysdata/files/src/state/GlobalStore.js.json              │
│                                                                 │
│  {                                                              │
│    "path": "src/state/GlobalStore.js",                         │
│    "semanticAnalysis": { ...Layer A... },                      │
│    "llmInsights": {     ←── AHORA tiene datos LLM              │
│      "confidence": 0.92,                                        │
│      "suggestedConnections": [...],                             │
│      "godObjectAnalysis": {                                     │
│        "isGodObject": true,                                     │
│        "riskLevel": "high"                                      │
│      }                                                          │
│    },                                                           │
│    "llmProcessed": true,                                       │
│    "llmProcessedAt": "2026-02-12T18:30:00Z"                    │
│  }                                                              │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘

          │
          ▼

┌─────────────────────────────────────────────────────────────────┐
│ PASO 4: MCP Tools consultan datos enriquecidos                 │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  Cuando Claude pregunta: "¿Qué archivos usa GlobalStore.js?"   │
│                                                                 │
│  1. Tool "get_impact_map" lee:                                 │
│     .omnysysdata/files/src/state/GlobalStore.js.json           │
│                                                                 │
│  2. Encuentra:                                                  │
│     • semanticAnalysis.exports (Layer A)                       │
│     • llmInsights.suggestedConnections (LLM) ←── Conexiones    │
│       que Layer A NO detectó                                    │
│                                                                 │
│  3. Retorna: "Afecta a GameBoard.js y ScorePanel.js"           │
│     (detectado por LLM, no por análisis estático)              │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

---

## PARTE 5: CONEXIÓN CACHÉ ↔ ORCHESTRATOR

### 5.1 ¿Dónde se usan los 4 cachés en el flujo?

```
FLUJO: Layer A → Orchestrator → Worker → LLM → Guardado

┌──────────────────────────────────────────────────────────────┐
│ Layer A Analysis                                              │
│                                                               │
│  ┌──────────────────────────────────────────────────────┐   │
│  │ UnifiedCacheManager                                 │   │
│  │ • loadFromLayerA() carga archivos                   │   │
│  │ • PERO: Layer A guarda directo a disco              │   │
│  │ • UnifiedCache solo LEE desde .omnysysdata/         │   │
│  └──────────────────────────────────────────────────────┘   │
│                                                               │
│  ┌──────────────────────────────────────────────────────┐   │
│  │ AtomicCache                                          │   │
│  │ • NO se usa en Layer A                               │   │
│  │ • Se usaría en molecular-extractor.js (¿dónde está?) │   │
│  └──────────────────────────────────────────────────────┘   │
└──────────────────────────────────────────────────────────────┘
                    │
                    ▼
┌──────────────────────────────────────────────────────────────┐
│ Orchestrator.initialize()                                     │
│                                                               │
│  1. Crea: new UnifiedCacheManager()                          │
│     └── Carga 604 archivos desde .omnysysdata/               │
│                                                               │
│  2. Crea: LLMAnalyzer                                        │
│     └── PERO: Si LLM no está listo, falla silenciosamente    │
│                                                               │
│  3. Crea: AnalysisWorker                                     │
│     └── Recibe llmAnalyzer inyectado                         │
│                                                               │
│  4. Inicia: _analyzeComplexFilesWithLLM()                    │
│     └── Lee index.json directamente (NO usa cache)           │
│                                                               │
└──────────────────────────────────────────────────────────────┘
                    │
                    ▼
┌──────────────────────────────────────────────────────────────┐
│ File Watcher (on file change)                                 │
│                                                               │
│  1. Detecta cambio en archivo X                              │
│                                                               │
│  2. Llama: CacheInvalidator.invalidateSync(X)                │
│     └── Borra de: UnifiedCacheManager.ramCache               │
│     └── Borra de: Disco (.omnysysdata/files/X.json)          │
│     └── Actualiza: index.json                                │
│                                                               │
│  3. Agrega a cola del Orchestrator                           │
│                                                               │
└──────────────────────────────────────────────────────────────┘
                    │
                    ▼
┌──────────────────────────────────────────────────────────────┐
│ Analysis Worker                                               │
│                                                               │
│  1. Toma job de la cola                                      │
│                                                               │
│  2. Si needsLLM:                                             │
│     └── Usa llmAnalyzer (pre-inicializado)                   │
│     └── O crea uno nuevo si no hay (FALLBACK)                │
│                                                               │
│  3. Guarda resultado:                                        │
│     └── saveFileAnalysis() → Disco                           │
│     └── NO actualiza cache directamente                      │
│                                                               │
│  ┌──────────────────────────────────────────────────────┐   │
│  │ PROBLEMA: Worker no usa UnifiedCacheManager          │   │
│  │           para guardar. Guarda directo a disco.      │
│  │           El cache se desincroniza.                  │   │
│  └──────────────────────────────────────────────────────┘   │
│                                                               │
└──────────────────────────────────────────────────────────────┘
```

### 5.2 Problema Crítico Encontrado

**El Worker guarda directo a disco, NO actualiza el cache:**

```javascript
// analysis-worker.js línea 246
await saveFileAnalysis(this.rootPath, job.filePath, mergedResult);
// ↑ Guarda en disco

// PERO NO HACE:
// this.cache.set(filePath, mergedResult);  // ← FALTA!
```

**Resultado**: 
- UnifiedCacheManager tiene datos viejos
- File Watcher lee del cache (viejo)
- Tools leen del cache (viejo)
- Solo las queries directas a disco ven datos nuevos

**Esto explica por qué no ves tus cambios!**

---

## PARTE 6: SÍNTESIS - QUÉ ESTÁ ROTO Y CÓMO ARREGLAR

### 6.1 Problemas Identificados

| # | Problema | Impacto | Archivos |
|---|----------|---------|----------|
| **P0** | Worker guarda a disco, NO actualiza cache | **Cache desincronizado** | `analysis-worker.js:246` |
| **P0** | 4 cachés hacen lo mismo | **Complejidad, memoria** | `unified-cache/`, `atomic-cache.js`, etc. |
| **P0** | LLM inicia antes de Layer A | **Espera innecesaria** | `server-class.js:steps` |
| **P1** | Orchestrator.stop() no llamaba | **Procesos zombie** | ✅ YA ARREGLADO |
| **P1** | Extractores duplicados Layer A/B | **Doble mantenimiento** | `redux-context-extractor.js` |

### 6.2 Solución Propuesta

**Opción A: Arreglar sincronización (Rápido, seguro)**
```javascript
// En analysis-worker.js, después de saveFileAnalysis:
await saveFileAnalysis(this.rootPath, job.filePath, mergedResult);

// AGREGAR: Invalidar cache para forzar re-carga
const { getCacheInvalidator } = await import('../cache-invalidator/index.js');
const invalidator = getCacheInvalidator({ projectPath: this.rootPath });
await invalidator.invalidateSync(job.filePath);
```

**Opción B: Consolidar cachés (Largo, riesgoso)**
- Unificar en un solo CacheManager
- Todos los componentes usan la misma instancia
- Guardar SIEMPRE pasa por el cache

### 6.3 Recomendación

**Hacer Opción A AHORA** (1 línea de código):
- ✅ Arregla el problema de cache viejo
- ✅ No rompe nada existente
- ✅ Se ve inmediatamente

**Hacer Opción B DESPUÉS** (requiere refactor grande):
- ⚠️ Cambia arquitectura
- ⚠️ Requiere testing extenso
- ⚠️ Riesgo de romper

---

## CONCLUSIÓN

**El problema por el que no ves tus cambios es:**

1. Worker guarda análisis en disco ✅
2. PERO el cache no se actualiza ❌
3. Tools leen del cache (datos viejos) ❌
4. Resultado: Ves datos viejos aunque el disco tenga lo nuevo

**Fix inmediato**: Agregar invalidación de cache en `analysis-worker.js:246`

**¿Procedo con el fix?** Es 1 línea de código, alta seguridad, arregla el problema real.
