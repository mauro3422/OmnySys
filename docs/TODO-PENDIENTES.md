# 📋 LISTA COMPLETA DE TODOs PENDIENTES - OmnySys

**Fecha**: Febrero 2026  
**Versión**: v0.5.3+ (post-refactor)  
**Estado**: En progreso

---

## 🔴 CRÍTICOS (Arreglar esta semana)

### 1. Resolver TODOs de Imports (Circularidad residual)
**Archivos**:
- `src/layer-b-semantic/css-in-js-extractor.js:10`
- `src/layer-b-semantic/static-extractors.js:10`

**Problema**: Estos archivos son re-exports que apuntan a `layer-a-static`. Ya movemos la lógica arquitectónica a `shared/`, pero estos re-exports siguen ahí.

**Acción**:
```bash
# Buscar quién usa estos archivos:
grep -r "from.*css-in-js-extractor" src/ --include="*.js"
grep -r "from.*static-extractors" src/ --include="*.js"

# Actualizar esos imports para apuntar directamente a layer-a-static
# Luego eliminar estos archivos re-export
```

**Prioridad**: Alta (reduce warnings en consola)

---

## 🟡 IMPORTANTES (Próximas 2 semanas)

### 2. Implementar Path Aliases (#config/*, #core/*)
**Ubicación**: Todos los archivos con imports profundos (`../../../`)

**Archivos que más sufren**:
- `src/layer-c-memory/mcp/core/server-class.js` (5 imports profundos)
- `src/layer-c-memory/mcp/tools/*.js` (varios)
- `src/layer-a-static/pipeline/enhancers/*.js`

**Ejemplo de cambio**:
```javascript
// ❌ ANTES:
import { Orchestrator } from '../../../core/orchestrator.js';

// ✅ DESPUÉS:
import { Orchestrator } from '#core/orchestrator.js';
```

**Prioridad**: Media-Alta (mejora mantenibilidad)

---

### 3. Agregar Manejo de Errores a Operaciones JSON
**Ubicación**: 75 lugares con `JSON.parse/stringify`

**Patrón vulnerable**:
```javascript
// ❌ VULNERABLE (en ~75 lugares):
const index = JSON.parse(await fs.readFile(indexPath));
```

**Solución**: Usar funciones de `src/utils/json-safe.js` (crear si no existe):
```javascript
// ✅ SEGURO:
import { safeReadJson } from '#utils/json-safe.js';
const index = await safeReadJson(indexPath, {});
```

**Archivos prioritarios**:
1. `src/layer-c-memory/mcp/tools/lib/analysis/*.js` (usado por MCP)
2. `src/core/orchestrator/index.js` (core del sistema)
3. `src/layer-a-static/pipeline/save.js` (guarda datos)

**Prioridad**: Media (robustez)

---

### 4. Completar Funcionalidad File Watcher
**Archivo**: `src/core/file-watcher/handlers.js`

**TODOs específicos**:

#### 4.1 Línea 182: Detectar archivos con exports removidos
```javascript
// TODO: Detectar archivos que importaban estos exports
// y marcarlos como potencialmente rotos
```
**Implementación**:
```javascript
async function findFilesUsingExports(removedExports) {
  const affectedFiles = [];
  // Buscar en index.json qué archivos importaban estos exports
  // Marcar como "potentially broken"
  return affectedFiles;
}
```

#### 4.2 Línea 195: Limpiar relaciones de archivos eliminados
```javascript
// TODO: Remover referencias en otros archivos a este archivo
```
**Implementación**:
```javascript
async function cleanupRelationships(filePath) {
  // 1. Leer system-map.json
  // 2. Encontrar todas las conexiones TO filePath
  // 3. Remover esas conexiones
  // 4. Guardar system-map actualizado
}
```

#### 4.3 Línea 203: Notificar a VS Code/MCP
```javascript
// TODO: Enviar notificación a VS Code/MCP de que hay cambios
```
**Implementación**:
```javascript
this.emit('file:changed', {
  file: filePath,
  changeType: 'deleted',
  timestamp: Date.now()
});
```

**Prioridad**: Media (funcionalidad incompleta)

---

## 🟢 MEJORAS (Mes próximo)

### 5. Migrar Hardcoded `.omnysysdata` a Constantes
**Ubicación**: 15+ archivos

**Lista de archivos** (ordenados por facilidad):
1. ✅ `src/core/unified-cache-manager/constants.js` - Ya tiene CACHE_DIR
2. 🟡 `src/layer-a-static/pipeline/save.js` - 5 strings hardcodeados
3. 🟡 `src/cli/commands/*.js` - Múltiples usos
4. 🔴 `src/core/orchestrator/index.js` - `this.OmnySysDataPath`
5. 🔴 `src/core/file-watcher/index.js` - `this.dataPath`

**Ejemplo de migración**:
```javascript
// ❌ ANTES:
path.join(projectPath, '.omnysysdata', 'index.json')

// ✅ DESPUÉS:
import { getIndexPath } from '#config/paths.js';
getIndexPath(projectPath)
```

**Prioridad**: Media (SSOT)

---

### 6. Eliminar Constantes Duplicadas
**Problema**: `ChangeType` definido en 2 lugares

**Archivos**:
- `src/core/batch-processor/constants.js` (línea 39)
- `src/core/unified-cache-manager/constants.js` (línea 7)

**Solución**: Ya creado en `src/config/change-types.js`, falta migrar usos.

**Prioridad**: Baja-Media

---

### 7. Limpiar Timers y Memory Leaks
**Ubicación**: 
- `src/core/file-watcher/lifecycle.js:18` - `setInterval` sin cleanup garantizado
- `src/core/batch-processor/batch-scheduler.js:67` - `setTimeout`

**Patrón a implementar**:
```javascript
// En shutdown/destroy:
if (this.interval) {
  clearInterval(this.interval);
  this.interval = null;
}
if (this.timer) {
  clearTimeout(this.timer);
  this.timer = null;
}
```

**Prioridad**: Baja (no es crítico aún, pero buena práctica)

---

### 8. Extraer Logging a Servicio Centralizado
**Problema**: `console.log/error` dispersos en todo el código

**Solución**: Crear `src/utils/logger.js` con niveles (debug, info, warn, error)

**Ejemplo**:
```javascript
// ❌ ANTES:
console.log(`Analizando ${filePath}`);

// ✅ DESPUÉS:
import { logger } from '#utils/logger.js';
logger.info(`Analizando ${filePath}`);
```

**Prioridad**: Baja (mejora pero no es urgente)

---

## 📚 DOCUMENTACIÓN Y TESTS

### 9. Crear Tests Unitarios
**Directorio**: `tests/` (no existe aún)

**Tests prioritarios**:
1. `tests/config.test.js` - Verificar constantes
2. `tests/shared/architecture-utils.test.js` - Test detectGodObject
3. `tests/layer-c-memory/mcp/tools/lib/analysis/*.test.js` - Test análisis

**Ejemplo**:
```javascript
// tests/shared/architecture-utils.test.js
import { detectGodObject } from '#shared/architecture-utils.js';

assert.strictEqual(detectGodObject(10, 25), true); // Es God Object
assert.strictEqual(detectGodObject(1, 2), false);  // No es God Object
```

**Prioridad**: Media (calidad)

---

### 10. Actualizar Documentación
**Archivos a actualizar**:
- `CHANGELOG.md` - Agregar cambios recientes
- `ARCHITECTURE.md` - Reflejar nueva estructura con `shared/`
- `README.md` - Si cambió algo para usuarios finales

**Prioridad**: Baja (pero importante para release)

---

## 🎯 CRONOGRAMA SUGERIDO

### Semana 1 (Esta semana)
- [ ] TODO #1: Resolver imports de css-in-js-extractor y static-extractors
- [ ] TODO #3: Agregar manejo de errores JSON (archivos más críticos)

### Semana 2
- [ ] TODO #2: Implementar path aliases en archivos más usados
- [ ] TODO #4: Completar file watcher handlers

### Semana 3
- [ ] TODO #5: Migrar hardcoded paths a constantes
- [ ] TODO #6: Eliminar constantes duplicadas

### Semana 4
- [ ] TODO #9: Crear tests unitarios básicos
- [ ] TODO #10: Actualizar documentación

### Futuro (cuando sea necesario)
- [ ] TODO #7: Limpiar timers
- [ ] TODO #8: Servicio de logging centralizado

---

## 🚀 DECISIONES PENDIENTES

### A. ¿Eliminar `src/src/` completamente?
Ya eliminamos el directorio, pero revisar si queda algo en git history.

### B. ¿Crear barrel exports para todas las capas?
Estructura propuesta:
```
src/
├── config/
│   └── index.js (ya existe ✅)
├── core/
│   └── index.js (crear)
├── layer-a-static/
│   └── index.js (crear)
├── layer-b-semantic/
│   └── index.js (ya existe)
└── layer-c-memory/
    └── index.js (crear)
```

### C. ¿Agregar TypeScript?
Evaluar si vale la pena migrar gradualmente para mejor DX.

---

## 📊 RESUMEN EJECUTIVO

| Prioridad | Cantidad | Estimado |
|-----------|----------|----------|
| 🔴 Crítico | 1 | 2 horas |
| 🟡 Importante | 4 | 8 horas |
| 🟢 Mejora | 4 | 6 horas |
| 📚 Docs/Tests | 2 | 4 horas |
| **TOTAL** | **11** | **20 horas** |

**Recomendación**: Enfocarse en los 5 primeros (TODOs 1-4) para estabilizar, luego los demás son polish.

---

**¿Por cuál empezamos?** Te recomiendo el TODO #1 (resolver imports) porque:
1. Es rápido (30 min)
2. Elimina warnings
3. Reduce deuda técnica
4. Prepara terreno para path aliases

**¿Procedemos con el TODO #1?**
