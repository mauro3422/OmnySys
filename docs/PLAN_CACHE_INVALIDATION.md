# PLAN DE ARQUITECTURA: Sistema de Invalidación de Caché Síncrona

## 📋 Resumen Ejecutivo

**Problema**: El file-watcher tiene delay de 1s y race conditions hacen que el caché no se invalide correctamente cuando editamos archivos.

**Solución**: Re-diseñar el flujo de invalidación para que sea **síncrono, atómico y con feedback inmediato**.

**Tiempo estimado**: 3-4 horas
**Complejidad**: Alta (requiere sincronización de 5+ componentes)

---

## 🔍 Análisis del Problema (Basado en MCP Tools)

### Flujo Actual (ROTO):
```
File Watcher detecta cambio
    ↓ [Evento asíncrono]
lifecycle.js recibe 'file:modified'
    ↓ [Agrega a batch]
Batch Processor (espera 1s)
    ↓ [Batch timeout]
Invalida caché (async)
    ↓ [No espera confirmación]
Agrega a cola de análisis
    ↓ [Async]
Análisis con datos viejos 💥
```

### Problemas Identificados:

1. **Race Condition**: El file-watcher emite evento pero el batch espera 1s
2. **No Atómico**: Invalidación y re-análisis no son atómicos
3. **Sin Feedback**: Si invalidación falla, no nos enteramos
4. **Acoplamiento**: Batch processor no debería manejar invalidación
5. **Inconsistencia**: indexedFiles y caché pueden quedar desync

### Componentes Involucrados (Impact Map):
- `src/core/orchestrator/lifecycle.js` - Recibe eventos
- `src/core/batch-processor/index.js` - Agrega delay
- `src/core/orchestrator/helpers.js` - Invalida caché
- `src/core/unified-cache-manager/` - Gestiona caché
- `src/core/file-watcher/` - Emite eventos

---

## 🏗️ Arquitectura Propuesta

### Principios:
1. **Síncrono**: Invalidación inmediata, sin delay
2. **Atómico**: Todo o nada (invalidación + marcado)
3. **Feedback**: Confirmación de éxito/fallo
4. **Desacoplado**: Separar invalidación de procesamiento
5. **Consistente**: Estado siempre sincronizado

### Nuevo Flujo:
```
File Watcher detecta cambio
    ↓ [Evento síncrono]
Cache Invalidator (nuevo componente)
    ↓ [Operación atómica]
1. Invalida caché de memoria
2. Elimina archivo .json
3. Actualiza indexedFiles
4. Emite 'cache:invalidated'
    ↓ [Confirmación síncrona]
Batch Processor (solo procesa, no invalida)
    ↓ [Async OK]
Análisis con caché limpia ✅
```

---

## 📐 Diseño Detallado

### 1. Nuevo Componente: Cache Invalidator

**Archivo**: `src/core/cache-invalidator/index.js`

**Responsabilidad Única (SRP)**: Invalidar caché de forma síncrona y atómica

```javascript
class CacheInvalidator {
  // Invalidación síncrona inmediata
  invalidateSync(filePath) {
    const operations = [
      () => this.invalidateMemoryCache(filePath),
      () => this.deleteCacheFile(filePath),
      () => this.updateIndexedFiles(filePath),
      () => this.propagateToDependents(filePath)
    ];
    
    // Ejecutar todo o nada
    try {
      operations.forEach(op => op());
      this.emit('cache:invalidated', { filePath, success: true });
      return { success: true };
    } catch (error) {
      this.emit('cache:invalidation:failed', { filePath, error });
      return { success: false, error };
    }
  }
  
  // Invalidación con retry
  async invalidateWithRetry(filePath, maxRetries = 3) {
    for (let i = 0; i < maxRetries; i++) {
      const result = this.invalidateSync(filePath);
      if (result.success) return result;
      await delay(100); // Esperar 100ms entre retries
    }
    throw new Error(`Failed to invalidate cache for ${filePath} after ${maxRetries} attempts`);
  }
}
```

### 2. Refactor File Watcher

**Archivo**: `src/core/file-watcher/handlers.js`

**Cambio**: Emitir evento 'file:changed' inmediatamente (sin batch)

```javascript
// ANTES (con delay):
handleFileModified(filePath) {
  this.emit('file:modified', { filePath }); // Batch espera 1s
}

// AHORA (síncrono):
async handleFileModified(filePath) {
  // 1. Invalidar caché inmediatamente (síncrono)
  const invalidation = await this.cacheInvalidator.invalidateSync(filePath);
  
  if (!invalidation.success) {
    logger.error(`Cache invalidation failed for ${filePath}`);
    return; // No continuar si invalidación falla
  }
  
  // 2. Emitir evento solo si invalidación exitosa
  this.emit('file:modified', { 
    filePath, 
    cacheInvalidated: true,
    timestamp: Date.now()
  });
}
```

### 3. Refactor Batch Processor

**Archivo**: `src/core/batch-processor/index.js`

**Cambio**: Solo procesa, NO invalida caché

```javascript
// ANTES:
processChange: async (change) => {
  await this._invalidateFileCache(change.filePath); // ❌ Esto está mal aquí
  this.queue.enqueue(change.filePath, priority);
}

// AHORA:
processChange: async (change) => {
  // Asumimos que caché ya fue invalidado síncronamente
  // Solo agregamos a cola de análisis
  this.queue.enqueue(change.filePath, priority);
  
  // Log para debugging
  logger.debug(`Processing ${change.filePath} (cache already invalidated)`);
}
```

### 4. Nuevo Evento: 'cache:invalidated'

**Flujo de eventos**:

```javascript
// 1. File Watcher detecta cambio
fileWatcher.emit('file:modified', { filePath });

// 2. Cache Invalidator escucha y actúa inmediatamente
cacheInvalidator.on('file:modified', async (event) => {
  const result = await cacheInvalidator.invalidateSync(event.filePath);
  
  if (result.success) {
    // 3. Emitir confirmación
    eventEmitter.emit('cache:invalidated', {
      filePath: event.filePath,
      timestamp: Date.now(),
      affectedDependents: result.affectedDependents
    });
  }
});

// 4. Batch Processor solo procesa después de confirmación
eventEmitter.on('cache:invalidated', (event) => {
  batchProcessor.addToQueue(event.filePath);
});
```

### 5. Sincronización de Estado

**Problema**: `indexedFiles` y caché pueden quedar desync

**Solución**: Operación atómica con rollback

```javascript
class AtomicCacheOperation {
  constructor() {
    this.state = {
      memoryCache: null,
      diskCache: null,
      indexedFiles: null
    };
  }
  
  async invalidateAtomically(filePath) {
    // 1. Guardar estado actual (para rollback)
    this.saveState(filePath);
    
    try {
      // 2. Ejecutar operaciones
      await Promise.all([
        this.invalidateMemory(filePath),
        this.deleteDiskCache(filePath),
        this.updateIndexedFiles(filePath)
      ]);
      
      // 3. Confirmar éxito
      return { success: true };
      
    } catch (error) {
      // 4. Rollback si falla
      await this.rollback(filePath);
      return { success: false, error };
    }
  }
}
```

---

## 🔧 Implementación Paso a Paso

### Fase 1: Cache Invalidator (1 hora)
1. Crear `src/core/cache-invalidator/index.js`
2. Implementar `invalidateSync()`
3. Implementar manejo de errores y retry
4. Tests unitarios

### Fase 2: Integración File Watcher (1 hora)
1. Modificar `src/core/file-watcher/handlers.js`
2. Integrar Cache Invalidator
3. Agregar evento 'cache:invalidated'
4. Tests de integración

### Fase 3: Refactor Batch Processor (1 hora)
1. Eliminar lógica de invalidación de batch processor
2. Escuchar evento 'cache:invalidated'
3. Solo procesar cuando caché esté invalidada
4. Tests de flujo completo

### Fase 4: Sincronización y Estado (1 hora)
1. Implementar AtomicCacheOperation
2. Agregar rollback en caso de fallo
3. Sincronizar indexedFiles con caché
4. Tests de edge cases

### Fase 5: Testing y Validación (30 min)
1. Test manual: editar archivo y verificar invalidación inmediata
2. Test de estrés: múltiples cambios simultáneos
3. Test de recuperación: simular fallo y verificar rollback
4. Verificar con herramientas MCP que todo funciona

---

## 🎯 Cambios en Archivos

### Nuevos Archivos:
- `src/core/cache-invalidator/index.js` - Componente principal
- `src/core/cache-invalidator/atomic-operation.js` - Operaciones atómicas
- `tests/cache-invalidator.test.js` - Tests

### Archivos Modificados:
- `src/core/file-watcher/handlers.js` - Integrar invalidación síncrona
- `src/core/batch-processor/index.js` - Eliminar invalidación, escuchar eventos
- `src/core/orchestrator/lifecycle.js` - Inicializar Cache Invalidator
- `src/core/orchestrator/helpers.js` - Deprecar _invalidateFileCache

### Archivos Eliminados (lógica vieja):
- Lógica de invalidación en batch processor
- Delay de 1s en file watcher (opcional)

---

## 🧪 Plan de Testing

### Test 1: Invalidación Inmediata
```javascript
// Editar archivo
atomicEdit('test.js', 'old', 'new');

// Verificar que caché se invalidó inmediatamente (< 100ms)
const cacheStatus = await checkCacheStatus('test.js');
assert(cacheStatus.invalidated === true);
assert(cacheStatus.timestamp < Date.now() + 100);
```

### Test 2: Atomicidad
```javascript
// Simular fallo en medio de invalidación
mockFsFailure('test.js');

try {
  await invalidateCache('test.js');
} catch (error) {
  // Verificar rollback
  const cacheStatus = await checkCacheStatus('test.js');
  assert(cacheStatus.unchanged === true); // No quedó a medias
}
```

### Test 3: Múltiples Cambios
```javascript
// Editar 5 archivos simultáneamente
const files = ['a.js', 'b.js', 'c.js', 'd.js', 'e.js'];
await Promise.all(files.map(f => atomicEdit(f, '', 'new')));

// Verificar que todos se invalidaron correctamente
for (const file of files) {
  const status = await checkCacheStatus(file);
  assert(status.invalidated === true);
}
```

### Test 4: Dependencias
```javascript
// Archivo A es dependencia de B y C
// Editar A
atomicEdit('A.js', '', 'new');

// Verificar que caché de B y C también se invalidó
assert(await checkCacheStatus('A.js').invalidated);
assert(await checkCacheStatus('B.js').invalidated);
assert(await checkCacheStatus('C.js').invalidated);
```

---

## 📊 Métricas de Éxito

- **Tiempo de invalidación**: < 50ms (antes: 1000ms+ con batch)
- **Consistencia**: 100% (sin race conditions)
- **Fiabilidad**: 99.9% uptime (con retry y rollback)
- **Feedback**: Inmediato (éxito/fallo conocido al instante)

---

## ⚠️ Riesgos y Mitigaciones

### Riesgo 1: Performance (síncrono bloquea)
**Mitigación**: Invalidación síncrona pero muy rápida (< 50ms), luego procesamiento async

### Riesgo 2: Deadlocks (múltiples hilos)
**Mitigación**: Usar cola de operaciones con locks, una invalidación a la vez por archivo

### Riesgo 3: Rollback falla
**Mitigación**: Guardar snapshots completos, no deltas, para poder restaurar 100%

### Riesgo 4: Eventos perdidos
**Mitigación**: Sistema de heartbeat, si no se recibe confirmación en 5s, re-intentar

---

## 🎉 Resultado Esperado

Después de implementar:
- ✅ Editamos archivo → Caché se invalida inmediatamente (< 50ms)
- ✅ Sin race conditions (operaciones atómicas)
- ✅ Sin delay de 1s (procesamiento inmediato)
- ✅ Feedback claro (sabemos si falló y por qué)
- ✅ Sistema robusto (retry, rollback, recuperación)

**El sistema será FINALMENTE confiable para ediciones en tiempo real.**

---

**¿Aprobamos este plan y comenzamos la implementación?** 🚀
