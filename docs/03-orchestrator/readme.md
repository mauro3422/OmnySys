# Orchestrator - OmnySys

**Versión**: v0.9.61  
**Última actualización**: 2026-02-25  
**Estado**: ✅ **100% Estático, 0% LLM**

---

## Visión General

El orchestrator de OmnySys coordina el análisis estático del código, detectando cambios, procesando archivos y manteniendo la base de datos SQLite actualizada.

**IMPORTANTE (v0.9.61)**: El orchestrator es **100% ESTÁTICO, 0% LLM**. No usa inteligencia artificial para decisiones, solo reglas determinísticas basadas en AST + regex + álgebra de grafos.

---

## Arquitectura del Orchestrator

```
┌─────────────────────────────────────────────────────────────┐
│  FILE WATCHER (src/core/file-watcher/)                     │
│  ─────────────────────────────────                          │
│  • Detecta cambios en archivos                              │
│  • Debounce para evitar múltiples triggers                  │
│  • Clasifica cambios (created, modified, deleted)           │
└──────────────┬──────────────────────────────────────────────┘
               │
               ▼
┌─────────────────────────────────────────────────────────────┐
│  CHANGE PROCESSOR (src/core/)                               │
│  ─────────────────────────────────                          │
│  • processPendingChanges                                    │
│  • _processWithBatchProcessor                               │
│  • processBatch                                             │
└──────────────┬──────────────────────────────────────────────┘
               │
               ▼
┌─────────────────────────────────────────────────────────────┐
│  LAYER A: Single File Analysis                              │
│  ─────────────────────────────────                          │
│  • analyzeSingleFile                                        │
│  • loadExistingMap                                          │
│  • resolveFileImports                                       │
│  • detectConnections                                        │
│  • saveAtoms → saveFileResult                               │
└──────────────┬──────────────────────────────────────────────┘
               │
               ▼
┌─────────────────────────────────────────────────────────────┐
│  SQLITE STORAGE (src/layer-c-memory/storage/)               │
│  ─────────────────────────────────                          │
│  • saveSystemMap                                            │
│  • checkpoint (WAL mode)                                    │
│  • Bulk operations                                          │
└─────────────────────────────────────────────────────────────┘
```

---

## Flujo de Vida de un Archivo

### 1. Detección de Cambio

```javascript
// src/core/file-watcher/index.js
watch(srcPath, { recursive: true }, (eventType, filename) => {
  handleChange(eventType, filename);
});
```

**Tipos de cambios**:
- `created`: Archivo nuevo
- `modified`: Archivo modificado
- `deleted`: Archivo eliminado

---

### 2. Procesamiento del Cambio

```javascript
// src/core/file-watcher/lifecycle/change-processing.js
async function processPendingChanges(changes) {
  await _processWithBatchProcessor(changes);
}

async function processBatch(batch) {
  for (const change of batch) {
    await processChange(change);
  }
}
```

**Batch processing**:
- Agrupa cambios para eficiencia
- Procesa en lotes de ~50 archivos
- Evita sobrecarga del sistema

---

### 3. Análisis de Archivo Único

```javascript
// src/layer-a-static/pipeline/single-file.js
async function analyzeSingleFile(absoluteRootPath, relativeFilePath, options) {
  // 1. Cargar mapa existente
  const existingMap = await loadExistingMap(absoluteRootPath, relativeFilePath);
  
  // 2. Resolver imports
  const resolvedImports = await resolveFileImports(absoluteRootPath, relativeFilePath, existingMap);
  
  // 3. Detectar conexiones semánticas
  const connections = await detectConnections(absoluteRootPath, relativeFilePath, resolvedImports);
  
  // 4. Extraer átomos
  const atoms = await extractAtoms(absoluteRootPath, relativeFilePath);
  
  // 5. Guardar resultados
  await saveFileResult(absoluteRootPath, relativeFilePath, { atoms, connections });
  
  return { atoms, connections };
}
```

---

### 4. Persistencia en SQLite

```javascript
// src/layer-c-memory/storage/repository/adapters/sqlite-adapter-core.js
async function saveSystemMap(systemMap) {
  const repo = getRepository();
  
  // Bulk insert de átomos
  repo.saveManyBulk(systemMap.atoms, 500);
  
  // Bulk insert de relaciones
  repo.saveRelationsBulk(systemMap.relations, 500);
  
  // Checkpoint WAL
  db.pragma('wal_checkpoint(PASSIVE)');
}
```

**Performance**:
- 13,000 átomos en ~3 segundos
- 500 átomos por batch
- WAL mode para mejor concurrencia

---

## Componentes del Orchestrator

### 01-flujo-vida-archivo.md

Describe el flujo completo desde que se detecta un cambio hasta que se persiste en SQLite.

**Ver**: [01-flujo-vida-archivo.md](./01-flujo-vida-archivo.md)

---

### 02-sistema-cache.md

Describe el sistema de caché que evita re-analizar archivos no cambiados.

**Ver**: [02-sistema-cache.md](./02-sistema-cache.md)

---

### 03-orchestrator-interno.md

Describe las decisiones internas del orchestrator (prioridades, gates, etc.).

**Ver**: [03-orchestrator-interno.md](./03-orchestrator-interno.md)

---

### 04-troubleshooting.md

Problemas comunes y soluciones.

**Ver**: [04-troubleshooting.md](./04-troubleshooting.md)

---

## Métricas del Orchestrator (v0.9.61)

| Métrica | Valor |
|---------|-------|
| **Startup** | ~1.5 segundos |
| **Análisis inicial** | ~30-60 segundos (13,485 átomos) |
| **Cambio incremental** | <1 segundo por archivo |
| **Persistencia** | ~3 segundos (bulk insert) |
| **Memory cleanup** | ~50-100MB liberados |

---

## Comandos Útiles

```bash
# Iniciar orchestrator
npm start

# Con hot-reload
OMNYSYS_HOT_RELOAD=true npm start

# Ver status
npm run status

# Reiniciar
npm run restart

# Limpiar y reanalizar
npm run clean && npm run analyze
```

---

## Troubleshooting Rápido

### El orchestrator no inicia

```bash
# Verificar puerto en uso
netstat -ano | findstr :9999

# Matar proceso y reiniciar
taskkill /PID <PID> /F
npm start
```

### Los cambios no se detectan

```bash
# Limpiar caché
npm run clean

# Reanalizar todo
npm run analyze
```

### Error de SQLite

```bash
# Verificar archivo
ls .omnysysdata/omnysys.db

# Si no existe, reanalizar
npm run analyze
```

---

## Próximas Mejoras

### Q2 2026 - Tree-sitter Migration

- Reemplazar Babel con Tree-sitter
- Mejor performance en detección de cambios
- Soporte para más lenguajes

### Q3 2026 - Intra-File Caching

- Caché a nivel de función, no solo archivo
- Invalidación más granular
- Mejor performance en cambios pequeños

---

**Última actualización**: 2026-02-25 (v0.9.61)  
**Estado**: ✅ **100% Estático, 0% LLM**  
**Próximo**: 🚧 Migración a Tree-sitter (Q2 2026)
