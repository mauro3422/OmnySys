# BUG #47: Desincronización del Sistema de Caché

**Estado**: En proceso de fix  
**Severidad**: CRÍTICO  
**Fecha detectado**: 2026-02-11  
**Responsable**: mauro3422 + Claude  

---

## 📝 Descripción del Bug

El sistema de caché no se invalida correctamente cuando se editan archivos, causando que:
1. Las herramientas MCP devuelvan datos desactualizados
2. El análisis se haga con metadata vieja
3. Los impact maps sean incorrectos

---

## 🔍 Causa Raíz

### Flujo Roto Actual:
```
1. Edit tool guarda archivo → Disco actualizado
2. File watcher detecta cambio → Emite 'file:modified'
3. Batch processor recibe evento → Espera 1s (batch timeout)
4. Durante ese 1s: MCP consulta caché RAM → DATOS VIEJOS ❌
5. Batch processor invalida caché (async) → Puede fallar silenciosamente
6. Re-análisis usa datos inconsistentes
7. Índice no se actualiza correctamente
```

### Problemas Arquitectónicos:
1. **Race Condition**: Batch espera 1s, durante ese tiempo el sistema usa caché viejo
2. **No Atómico**: Invalidación de RAM, disco e índice no es atómica
3. **Sin Feedback**: Si invalidación falla, no hay retry ni alerta
4. **Acoplamiento**: Batch processor maneja invalidación (no es su responsabilidad)
5. **Inconsistencia**: indexedFiles, RAM cache y archivos JSON pueden quedar desync

---

## 📊 Stakeholders Afectados

- **18 archivos** dependen del caché
- **UnifiedCacheManager** - Gestiona 5 capas de almacenamiento
- **MCP Tools** - Devuelven datos incorrectos
- **Analysis Worker** - Analiza con metadata vieja
- **Batch Processor** - Tiene responsabilidad que no le corresponde

---

## 💾 Datos en el Caché (5 Capas)

1. **RAM Cache**: Átomos (`atom:*`), metadata (`derived:*`), análisis (`analysis:*`)
2. **Índice Persistente**: `.omnysysdata/cache/index.json` - Entradas y grafo
3. **Archivos Individuales**: `.omnysysdata/files/src/file.js.json` - Datos por archivo
4. **Dependencias**: Grafo de quién depende de quién
5. **Estadísticas**: Contadores y métricas

---

## ✅ Solución Implementada (Ver ANÁLISIS_CACHE_COMPLETO.md)

### Arquitectura Propuesta:
```
File Watcher detecta cambio
    ↓ [SÍNCRONO]
Cache Invalidator (nuevo componente)
    ↓ [Operación atómica]
1. Invalida RAM cache
2. Elimina archivo .json
3. Actualiza índice
4. Emite 'cache:invalidated'
    ↓ [Confirmación síncrona]
Batch Processor (solo procesa)
    ↓ [Async OK]
Análisis con caché limpia ✅
```

### Componentes Nuevos:
- `src/core/cache-invalidator/index.js` - Invalidación síncrona y atómica
- `src/core/cache-invalidator/atomic-operation.js` - Transacciones ACID
- Sistema de retry (3 intentos)
- Rollback en caso de fallo

### Archivos Modificados:
- `src/core/file-watcher/handlers.js` - Invalidación inmediata
- `src/core/batch-processor/index.js` - Sin invalidación, solo procesa
- `src/core/orchestrator/lifecycle.js` - Inicializar CacheInvalidator
- `src/core/orchestrator/helpers.js` - Deprecar _invalidateFileCache

---

## 🧪 Tests de Verificación

### Test 1: Invalidación Inmediata
```javascript
// Editar archivo
await atomicEdit('test.js', 'old', 'new');

// Verificar < 50ms
const start = Date.now();
await cacheInvalidator.invalidateSync('test.js');
const elapsed = Date.now() - start;
assert(elapsed < 50);
```

### Test 2: Atomicidad
```javascript
// Simular fallo
mockFsFailure('test.js');

try {
  await cacheInvalidator.invalidateSync('test.js');
} catch (error) {
  // Verificar rollback
  assert(cache.get('analysis:test.js') === null); // Invalidado
  assert(fs.existsSync('.omnysysdata/files/test.js.json')); // Rollback
}
```

### Test 3: Múltiples Cambios
```javascript
const files = ['a.js', 'b.js', 'c.js'];
await Promise.all(files.map(f => atomicEdit(f, '', 'new')));

for (const file of files) {
  assert(cacheInvalidator.getStatus(file).invalidated === true);
}
```

---

## 📈 Métricas Esperadas

- **Tiempo invalidación**: De 1000ms+ a < 50ms
- **Consistencia**: De 70% a 100%
- **Fiabilidad**: 99.9% con retry
- **Feedback**: Inmediato (éxito/fallo conocido)

---

## 🚀 Estado de Implementación

- [x] Análisis completo del sistema
- [x] Plan de arquitectura detallado
- [ ] CacheInvalidator componente
- [ ] Operaciones atómicas ACID
- [ ] Integración file-watcher
- [ ] Refactor batch-processor
- [ ] Tests exhaustivos
- [ ] Documentación final

---

**Notas**: 
- Requiere 6-9 horas de implementación
- Sigue SOLID, SSOT y modularidad
- Ver `ANALISIS_CACHE_COMPLETO.md` para detalles técnicos
- Ver `PLAN_CACHE_INVALIDATION.md` para plan de implementación

**Relacionado con**: 
- #46 (File watcher delay)
- #45 (Cache inconsistency)
- Atomic Editor feature (v0.7.2)
