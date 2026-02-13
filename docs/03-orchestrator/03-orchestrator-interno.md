# Orchestrator Interno

**Documento**: 03-ORCHESTRATOR-INTERNO.md  
**Versión**: v0.7.1  
**Descripción**: Cómo funciona internamente el orchestrator - colas, workers, y decisión LLM

---

## 🎯 Responsabilidad del Orchestrator

El Orchestrator es el **cerebro del análisis en tiempo real**:

1. Recibe cambios de archivos (vía File Watcher)
2. Decide: ¿Necesita LLM o bypass?
3. Maneja cola de procesamiento
4. Coordina workers concurrentes
5. Emite eventos al completar

---

## 🏗️ Arquitectura Interna

```
┌─────────────────────────────────────────────────────────────┐
│                    ORCHESTRATOR                             │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  ┌─────────────────┐    ┌─────────────────┐                │
│  │   AnalysisQueue │    │  AnalysisWorker │                │
│  │   (cola)        │───→│  (procesador)   │                │
│  │                 │    │                 │                │
│  │ • Priority Q    │    │ • Llama Layer A │                │
│  │ • maxConcurrent │    │ • Llama LLM     │                │
│  │ • enqueue()     │    │ • Guarda result │                │
│  └─────────────────┘    └─────────────────┘                │
│           │                       │                         │
│           │                       │                         │
│           ▼                       ▼                         │
│  ┌─────────────────────────────────────────┐               │
│  │          Decision Engine               │               │
│  │  ¿Necesita LLM?                       │               │
│  │  • Gate 1: Arquetipos always LLM      │               │
│  │  • Gate 2: Arquetipos conditional     │               │
│  │  • Gate 3: Bypass (no LLM)            │               │
│  └─────────────────────────────────────────┘               │
│                                                             │
│  ┌─────────────────────────────────────────┐               │
│  │          Event Emitter                 │               │
│  │  • 'file:changed'                      │               │
│  │  • 'analysis:complete'                 │               │
│  │  • 'job:started'                       │               │
│  │  • 'job:complete'                      │               │
│  └─────────────────────────────────────────┘               │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

---

## 📊 Flujo de Decisión: ¿Necesita LLM?

```javascript
// src/core/orchestrator/llm-analysis.js

function shouldUseLLM(archetypes, fileAnalysis, llmAnalyzer) {
  // Si no hay arquetipos, fallback
  if (!archetypes?.length) {
    return llmAnalyzer.needsLLMAnalysis(fileAnalysis);
  }
  
  // GATE 1: Algun arquetipo SIEMPRE requiere LLM?
  const alwaysNeedsLLM = archetypes.some(a => a.requiresLLM === true);
  if (alwaysNeedsLLM) return true;
  
  // GATE 2: Hay arquetipos condicionales?
  const hasConditional = archetypes.some(a => a.requiresLLM === 'conditional');
  if (hasConditional) {
    return llmAnalyzer.needsLLMAnalysis(fileAnalysis);
  }
  
  // GATE 3: Todos bypass?
  const allBypass = archetypes.every(a => a.requiresLLM === false);
  if (allBypass) return false;
  
  // Fallback
  return llmAnalyzer.needsLLMAnalysis(fileAnalysis);
}
```

### Ejemplos de Gates

| Arquetipos | Gate | Resultado |
|------------|------|-----------|
| `god-object` (requiresLLM: true) | Gate 1 | ✅ Siempre LLM |
| `state-manager` (conditional) | Gate 2 | 🤔 Depende de análisis |
| `utility` (requiresLLM: false) | Gate 3 | ❌ No LLM |
| `orphan-module` (conditional) | Gate 2 | 🤔 Depende |

---

## 🔄 Ciclo de Vida de un Job

```
1. ENQUEUE (queueing.js)
   │
   ├─ this.queue.enqueue(filePath, priority)
   │
   ▼
2. PROCESS (queueing.js)
   │
   ├─ _processNext() toma job de la cola
   ├─ Crea AbortController (para cancelar)
   │
   ▼
3. ANALYZE (analysis-worker.js)
   │
   ├─ Paso 1: Re-analizar con Layer A
   ├─ Paso 2: ¿Necesita LLM?
   │   ├─ SÍ: Llama LLMAnalyzer
   │   └─ NO: Termina con Layer A
   ├─ Paso 3: Guardar resultado
   ├─ Paso 4: Invalidar cache
   │
   ▼
4. CALLBACK
   │
   ├─ onProgress(job, 100)
   ├─ onComplete(job, result)
   │
   ▼
5. NEXT
   │
   └─ _processNext() siguiente job
```

---

## ⚙️ Configuración

```javascript
// src/core/orchestrator/index.js

new Orchestrator(projectPath, {
  enableFileWatcher: true,     // Detectar cambios
  enableWebSocket: true,       // Notificar a clients
  autoStartLLM: false,         // ← YA ARREGLADO (era true)
  ports: {
    webSocket: 9997
  }
});
```

### Max Concurrent Analyses

```javascript
// Cuántos jobs procesar en paralelo
this.maxConcurrentAnalyses = 4;  // Default

// Iniciar procesamiento (llena slots)
for (let i = 0; i < maxConcurrent; i++) {
  this._processNext();
}
```

---

## 🚨 Prioridades de Cola

| Prioridad | Cuándo | Ejemplo |
|-----------|--------|---------|
| `critical` | God objects | Archivos con riesgo máximo |
| `high` | Orphan modules | Potenciales conexiones ocultas |
| `medium` | Dynamic imports | Singletons |
| `low` | Utilities | Funciones simples |
| `normal` | Default | Archivos estándar |

---

## 📁 Archivos Clave

| Archivo | Función | Métodos clave |
|---------|---------|---------------|
| `orchestrator/index.js` | Clase principal | `constructor()`, `handleFileChange()` |
| `orchestrator/lifecycle.js` | Inicialización | `initialize()`, `stop()` |
| `orchestrator/queueing.js` | Manejo de cola | `_processNext()`, `analyzeAndWait()` |
| `orchestrator/llm-analysis.js` | Decisión LLM | `_analyzeComplexFilesWithLLM()` |
| `analysis-worker.js` | Worker | `analyze()`, `isAnalyzed()` |

---

## 🔌 Eventos

```javascript
// Suscribirse a eventos del orchestrator

orchestrator.on('file:changed', ({ filePath, changeType }) => {
  console.log(`Archivo ${changeType}: ${filePath}`);
});

orchestrator.on('analysis:complete', ({ totalFiles, iterations }) => {
  console.log(`Análisis completo: ${totalFiles} archivos`);
});

orchestrator.on('job:started', (job) => {
  console.log(`Iniciando: ${job.filePath}`);
});

orchestrator.on('job:complete', (job, result) => {
  console.log(`Completado: ${job.filePath}`);
});
```

---

## ✅ Estado del Orchestrator (GET /status)

```javascript
{
  isRunning: true,
  isIndexing: false,
  queue: {
    size: 5,
    active: 2,
    maxConcurrent: 4
  },
  stats: {
    totalAnalyzed: 150,
    totalQueued: 155,
    avgTime: 1200  // ms
  },
  llm: {
    available: true,
    activeRequests: 1
  }
}
```

---

## 📚 Referencias

Para entender mejor los conceptos que usa el orchestrator:

| Documento | Descripción | Por qué es relevante |
|-----------|-------------|---------------------|
| [ARCHETYPE_SYSTEM.md](../ARCHETYPE_SYSTEM.md) | Sistema de arquetipos | Cómo se clasifican archivos y se decide si necesitan LLM |
| [HYBRID_ANALYSIS_PIPELINE.md](../HYBRID_ANALYSIS_PIPELINE.md) | Pipeline híbrido 80/20 | La estrategia de análisis estático + IA que implementa el orchestrator |
| [01-FLUSO-VIDA-ARCHIVO.md](./01-FLUSO-VIDA-ARCHIVO.md) | Flujo completo | Dónde encaja el orchestrator en el pipeline global |

---

**Volver al [README](./README.md)**
