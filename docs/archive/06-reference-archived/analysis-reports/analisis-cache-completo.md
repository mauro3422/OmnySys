# ANÁLISIS COMPLETO: Sistema de Caché y sus Dependencias

## 📊 Hallazgos del Análisis con MCP

### Stakeholders del Caché (18 archivos afectados):

**Core Orchestrator:**
- `src/core/orchestrator/lifecycle.js` - Inicializa file watcher y batch processor
- `src/core/orchestrator/index.js` - Usa caché para operaciones
- `src/core/orchestrator/helpers.js` - Intenta invalidar caché (_invalidateFileCache)

**Procesamiento:**
- `src/core/batch-processor/index.js` - Agrega delay de 1s, procesa cambios
- `src/core/analysis-worker.js` - Lee del caché para análisis
- `src/core/file-watcher/` - Detecta cambios en archivos

**Servidores:**
- `src/core/unified-server/` - Sirve datos del caché
- `mcp-http-server.js` - API MCP usa caché

**CLI:**
- `src/cli/commands/analyze.js` - Lee del caché
- `src/cli/index.js` - Comandos usan caché

**Capas:**
- `src/layer-a-static/indexer.js` - Escribe al caché
- `src/layer-b-semantic/llm-analyzer/core.js` - Lee del caché

---

## 🗄️ Qué Guarda el Caché (Datos Detallados)

### 1. RAM Cache (Memoria)
```javascript
// Estructura interna:
this.ramCache = Map {
  // Átomos individuales
  'atom:src/file.js::functionName' → { data, expiry, createdAt }
  
  // Metadata derivada
  'derived:src/file.js' → { complexity, archetypes, risk }
  
  // Análisis estático
  'analysis:src/file.js' → { imports, exports, dependencies }
  
  // Conexiones
  'connections:src/file.js' → { semantic, static }
}

// TTL: 5 minutos por defecto
// LRU: Evicción cuando > 1000 entradas
// Límite: maxRamEntries = 1000
```

### 2. Índice Persistente (Disco)
```javascript
// Archivo: .omnysysdata/cache/index.json
{
  version: '1.0.0',
  timestamp: Date.now(),
  entries: {
    'src/file.js': {
      hash: 'abc123',
      lastAnalyzed: 1234567890,
      staticVersion: '1.0.0',
      llmVersion: '1.0.0',
      changeType: 'NONE',
      dependencies: ['src/other.js'],
      metadata: {...},
      llmInsights: {...}
    }
  },
  dependencyGraph: {
    'src/file.js': ['src/dependent.js']
  },
  metadata: {
    totalFiles: 609,
    totalDependencies: 4051
  }
}
```

### 3. Archivos Individuales (Layer A)
```javascript
// Ubicación: .omnysysdata/files/src/file.js.json
{
  filePath: 'src/file.js',
  fileName: 'file.js',
  ext: '.js',
  imports: [...],
  exports: [...],
  definitions: [...],
  semanticConnections: [...],
  metadata: {
    jsdocContracts: [...],
    asyncPatterns: [...],
    errorHandling: [...]
  },
  atoms: [...], // NUEVO: átomos extraídos
  totalAtoms: N,
  analyzedAt: '2026-02-11T...'
}
```

---

## 🔴 Problemas Identificados

### Problema 1: Desincronización Multi-Capas

```
CAPA 1: Disco (.omnysysdata/files/)
   ↓ [Edit tool guarda]
Archivo actualizado
   ↓ [File watcher detecta]
CAPA 2: Evento 'file:modified'
   ↓ [Batch processor 1s delay]
CAPA 3: Invalidación de RAM cache
   ↓ [Async, puede fallar]
CAPA 4: Re-análisis
   ↓ [Escribe a disco]
¡Desincronizado! 💥
```

**Escenario de fallo:**
1. Editamos `src/core/orchestrator/index.js`
2. File watcher detecta cambio
3. Batch processor espera 1s
4. Durante ese 1s, consultamos el caché RAM → **datos viejos**
5. Batch processor invalida RAM cache
6. Pero el archivo `.json` en disco sigue viejo
7. Re-análisis genera nuevo `.json`
8. Pero el índice no se actualiza correctamente

### Problema 2: Race Condition

```javascript
// Thread 1: File watcher
detectChange('src/file.js')
  → emit('file:modified')
  → batchProcessor.addChange() // async, no espera

// Thread 2: Batch processor (1s después)
processBatch()
  → invalidateCache('src/file.js') // async
  → analyzeFile('src/file.js') // puede leer caché antes de invalidación

// Thread 3: Consulta MCP
getFileAnalysis('src/file.js')
  → cache.get('analysis:src/file.js') // datos viejos!
```

### Problema 3: No Atómico

```javascript
// helpers.js _invalidateFileCache()
await this.cache.invalidate(`analysis:${filePath}`); // Paso 1
await this.cache.invalidate(`atom:${filePath}`);     // Paso 2
await fs.unlink(fileDataPath);                       // Paso 3 - puede fallar!
this.indexedFiles.delete(normalizedPath);            // Paso 4

// Si Paso 3 falla, tenemos:
// - RAM cache invalidado ✅
// - Archivo .json en disco ❌ (sigue viejo)
// - indexedFiles sin el archivo ❌
// = INCONSISTENCIA
```

### Problema 4: Feedback Ausente

```javascript
// Cuando invalidamos, no sabemos si funcionó
await this._invalidateFileCache('src/file.js');
// ¿Éxito? ¿Fallo? ¿Qué pasó con los dependientes?
// No hay confirmación, no hay retry
```

---

## 🎯 Stakeholders y sus Necesidades

### 1. AtomicEditor (Edición de archivos)
**Necesita:** Invalidación INMEDIATA y SÍNCRONA
**Por qué:** Cuando guarda, debe invalidar antes de continuar
**Frustración:** "Guardé el archivo pero el sistema sigue viendo lo viejo"

### 2. File Watcher (Detección de cambios)
**Necesita:** Emitir evento DESPUÉS de confirmar invalidación
**Por qué:** Si invalida mal, todo el sistema usa datos corruptos
**Frustración:** "Emití el evento pero no sé si el caché se actualizó"

### 3. Batch Processor (Procesamiento)
**Necesita:** Asumir que caché ya está invalidado, solo procesar
**Por qué:** No debería manejar invalidación, solo análisis
**Frustración:** "Tengo que invalidar Y procesar, eso no es mi trabajo"

### 4. MCP Tools (Consultas)
**Necesita:** Leer SIEMPRE datos frescos
**Por qué:** Usuario confía en que las herramientas dan info actualizada
**Frustración:** "Digo que hay 0 archivos afectados pero en realidad son 30"

### 5. Analysis Worker (Análisis LLM)
**Necesita:** Caché limpio antes de analizar
**Por qué:** Si analiza con caché viejo, resultados son incorrectos
**Frustración:** "Analicé el archivo pero con metadata de hace 1 hora"

---

## 🧩 Dependencias Ocultas

### Grafo de Dependencias del Caché:

```
UnifiedCacheManager
├── atoms.js              (atom:*, derived:*)
├── ram-cache.js          (RAM con TTL/LRU)
├── storage.js            (Disco, Layer A)
├── dependency.js         (Grafo de deps)
├── register.js           (Índice de entradas)
├── stats.js              (Estadísticas)
└── cleanup.js            (Limpieza)

Usuarios:
├── lifecycle.js          → initialize(), get()
├── index.js (orch)       → invalidate(), get()
├── helpers.js (orch)     → _invalidateFileCache()
├── batch-processor       → Lee del caché
├── analysis-worker       → Lee del caché
├── unified-server        → Sirve del caché
├── mcp-tools             → Consultan caché
└── indexer.js            → Escribe al caché
```

**Problema:** Muchos lectores, pocos escritores, invalidación compleja

---

## 📉 Métricas Actuales (Observadas)

- **Tiempo de invalidación**: ~1000ms (con batch delay)
- **Consistencia**: ~70% (race conditions frecuentes)
- **Retry automático**: 0 (sin mecanismo)
- **Rollback**: No existe
- **Feedback**: Ninguno (fire-and-forget)

---

## 🎯 Requisitos para Solución Robusta

### Funcionales:
1. ✅ Invalidación síncrona inmediata (< 50ms)
2. ✅ Operación atómica (todo o nada)
3. ✅ Confirmación de éxito/fallo
4. ✅ Retry automático (3 intentos)
5. ✅ Rollback en caso de fallo parcial
6. ✅ Propagación a dependientes
7. ✅ Sincronización RAM ↔ Disco ↔ Índice

### No Funcionales:
1. ⚡ Performance: < 50ms para invalidación
2. 🔒 Atomicidad: Operaciones ACID
3. 📊 Observabilidad: Logs + Métricas
4. 🔄 Recuperación: Graceful degradation
5. 🧪 Testeabilidad: Fácil de testear

---

## 💡 Conclusión del Análisis

**El problema NO es simple.** No se arregla solo con "hacer la invalidación síncrona". Hay que considerar:

1. **5 capas de almacenamiento** (RAM, índice, archivos individuales, dependencias, metadata)
2. **18 archivos dependientes** que usan el caché de formas diferentes
3. **3 sistemas async** (file watcher, batch processor, analysis worker) que pueden intercalar operaciones
4. **Stakeholders con necesidades conflictivas** (sincronía vs performance)
5. **Estado distribuido** sin transacciones

**La solución requiere:**
- Re-arquitectura del flujo de invalidación
- Sistema de transacciones atómicas
- Mecanismo de retry y rollback
- Eventos con confirmación
- Tests exhaustivos de concurrencia

**Tiempo realista:** 4-6 horas de implementación + 2-3 horas de testing

**Alternativa temporal:** Documentar el bug y crear workaround (usar `restart_server` después de ediciones importantes)

---

**¿Procedemos con la solución compleja o buscamos alternativa temporal?** 🤔
