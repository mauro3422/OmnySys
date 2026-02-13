# Cambios Recientes

**Documento**: 05-CAMBIOS-RECIENTES.md  
**Versión**: v0.7.1  
**Fecha**: 2026-02-12  

---

## 📅 Timeline de Fixes

### 2026-02-12 - Fixes Críticos (Commit: `f21f3ee`)

#### 1. Cache Invalidation en Analysis Worker

**Problema**: Worker guardaba en disco pero NO invalidaba cache. Resultado: datos viejos.

**Archivo**: `src/core/analysis-worker.js`

**Cambio**:
```javascript
// DESPUÉS de saveFileAnalysis(), AGREGAR:

// FIX: Invalidar cache para forzar re-carga
const { getCacheInvalidator } = await import('../cache-invalidator/index.js');
const invalidator = getCacheInvalidator({ projectPath: this.rootPath });
await invalidator.invalidateSync(job.filePath);
```

**Impacto**: ✅ Cambios ahora visibles inmediatamente

---

#### 2. Orchestrator Stop en Shutdown

**Problema**: `shutdown()` no llamaba `orchestrator.stop()`. Resultado: procesos zombie.

**Archivo**: `src/layer-c-memory/mcp/core/server-class.js`

**Cambio**:
```javascript
// ANTES:
if (this.orchestrator) {
  // Orchestrator cleanup if needed  // ← SOLO COMENTARIO
  logger.info('  ✅ Orchestrator cleaned up');
}

// DESPUÉS:
if (this.orchestrator) {
  await this.orchestrator.stop();    // ← AHORA SÍ LLAMA
  logger.info('  ✅ Orchestrator stopped');
}
```

**Impacto**: ✅ No más procesos zombie al reiniciar

---

#### 3. Hot-Reload Timeout Cleanup

**Problema**: `stop()` no limpiaba `_reloadTimeout`. Resultado: procesos no morían.

**Archivo**: `src/layer-c-memory/mcp/core/hot-reload-manager.js`

**Cambios**:
1. En `stop()`: Agregar limpieza de timeout
2. En `_onFileChange()`: Agregar `unref()` al timeout

**Impacto**: ✅ Limpieza completa de recursos

---

## 📊 Estadísticas del Commit

```
4 files changed, 607 insertions(+), 2 deletions(-)

src/core/analysis-worker.js                       | 23 +++++++++++++++++
src/layer-c-memory/mcp/core/hot-reload-manager.js | 11 +++++++++
src/layer-c-memory/mcp/core/server-class.js       |  4 ++--
FLUJO_DATOS_OMNYSYS_MAESTRO.md                     | 569 ++++++++++++++++++
```

---

## 🎯 Pendientes (Para Próximos Commits)

### P0 - Crítico
- [ ] **Mover LLM al final del pipeline**
  - Archivo: `server-class.js` (cambiar orden de steps)
  - Impacto: Reduce tiempo de inicio
  
- [ ] **Remover autoStartLLM del Orchestrator**
  - Archivo: `src/core/orchestrator/index.js:22`
  - Cambio: `autoStartLLM: true` → `false`
  - Impacto: LLM solo cuando se necesita

### P1 - Alto
- [ ] **Consolidar 4 cachés**
  - Unificar en un solo CacheManager con estrategias
  - Ver: `02-SISTEMA-CACHE.md`
  
- [ ] **Remover LLM de InstanceDetectionStep**
  - Archivo: `instance-detection-step.js:186-188`
  - Evita duplicación de inicialización

### P2 - Medio
- [ ] **Implementar confidence-based LLM trigger**
  - Archivo: `orchestrator/lifecycle.js`
  - Solo iniciar LLM si hay archivos con `confidence < 0.8`

---

## 📝 Notas para Mantenedores

### Antes de Hacer Cambios
1. Leer documentación en `docs/architecture/orchestrator/`
2. Verificar que el cambio no rompe flujo en `01-FLUSO-VIDA-ARCHIVO.md`
3. Actualizar este documento si es un fix importante

### Después de Hacer Cambios
1. Agregar entrada a este documento
2. Actualizar CHANGELOG.md
3. Hacer commit con mensaje descriptivo

---

## 🔗 Referencias

- [Flujo de Vida de un Archivo](./01-FLUSO-VIDA-ARCHIVO.md)
- [Sistema de Caché](./02-SISTEMA-CACHE.md)
- [Troubleshooting](./04-TROUBLESHOOTING.md)
- [CHANGELOG.md](../../../CHANGELOG.md)

---

**Volver al [README](./README.md)**
