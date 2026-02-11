# PLAN DE IMPLEMENTACIÓN: Refactor Query Facade

**Fecha**: 2026-02-11  
**Status**: Listo para implementar  
**Riesgo**: MEDIUM (41 archivos afectados)  
**Estrategia**: Migración gradual y atómica  

---

## 📊 Resumen del Problema

**Archivo crítico**: `src/layer-a-static/query/index.js`  
**Dependencias**: 41 archivos importan desde este facade  
**Exports**: 19 funciones concentradas  
**Patrón**: God-object / Facade monolítico

### Distribución de Dependencias

| Categoría | Cantidad | Archivos |
|-----------|----------|----------|
| **MCP Tools** | 11 | `layer-c-memory/mcp/tools/*` |
| **Unified Server** | 7 | `core/unified-server/tools/*` |
| **Orchestrator** | 3 | `core/orchestrator/*` |
| **Core** | 6 | `core/*` (analysis-worker, tunnel-vision, etc) |
| **CLI** | 2 | `cli/commands/*` |
| **File Watcher** | 1 | `core/file-watcher/*` |
| **Memory Layer** | 3 | `layer-c-memory/*` |
| **Tests** | 1 | `core/__tests__/*` |

---

## 🎯 Objetivo

Descomponer el facade monolítico en **APIs especializadas por dominio**, manteniendo:
- ✅ Backwards compatibility (index.js sigue funcionando)
- ✅ Zero breaking changes
- ✅ Migración gradual archivo por archivo
- ✅ Validación MCP después de cada cambio

---

## 📋 Estrategia de Implementación

### FASE 1: Crear APIs por Dominio (Sin Breaking Changes)

**Duración**: 1-2 horas  
**Riesgo**: ZERO (solo nuevos archivos)  
**Archivos a crear**: 6

#### 1.1 Crear directorio `apis/`

```
src/layer-a-static/query/
├── index.js                    # Facade actual (sin cambios)
├── readers/
│   └── json-reader.js          # ✅ Ya existe
├── queries/                    # ✅ Ya existe
│   ├── project-query.js
│   ├── file-query.js
│   ├── dependency-query.js
│   ├── connections-query.js
│   ├── risk-query.js
│   └── export.js
└── apis/                       # 🆕 NUEVO
    ├── index.js                # Re-exporta todas las APIs
    ├── project-api.js          # Metadata y stats
    ├── file-api.js             # Análisis de archivos
    ├── dependency-api.js       # Grafos de dependencias
    ├── connections-api.js      # Conexiones semánticas
    ├── risk-api.js             # Evaluación de riesgos
    └── export-api.js           # Exportación de datos
```

#### 1.2 API: project-api.js

```javascript
/**
 * @fileoverview Project API
 * 
 * API especializada para consultas de proyecto
 * 
 * @module query/apis/project-api
 */

export {
  getProjectMetadata,
  getAnalyzedFiles,
  getProjectStats,
  findFiles
} from '../queries/project-query.js';
```

#### 1.3 API: file-api.js

```javascript
/**
 * @fileoverview File API
 * 
 * API especializada para análisis de archivos individuales
 * 
 * @module query/apis/file-api
 */

export {
  getFileAnalysis,
  getMultipleFileAnalysis,
  getFileDependencies,
  getFileDependents,
  getFileAnalysisWithAtoms,
  getAtomDetails
} from '../queries/file-query.js';

// Re-exports de readers (comúnmente usados juntos)
export { readJSON, readMultipleJSON, fileExists } from '../readers/json-reader.js';
```

#### 1.4 API: dependency-api.js

```javascript
/**
 * @fileoverview Dependency API
 * 
 * API especializada para grafos de dependencias
 * 
 * @module query/apis/dependency-api
 */

export {
  getDependencyGraph,
  getTransitiveDependents
} from '../queries/dependency-query.js';
```

#### 1.5 API: connections-api.js

```javascript
/**
 * @fileoverview Connections API
 * 
 * API especializada para conexiones semánticas
 * 
 * @module query/apis/connections-api
 */

export {
  getAllConnections
} from '../queries/connections-query.js';
```

#### 1.6 API: risk-api.js

```javascript
/**
 * @fileoverview Risk API
 * 
 * API especializada para evaluación de riesgos
 * 
 * @module query/apis/risk-api
 */

export {
  getRiskAssessment
} from '../queries/risk-query.js';
```

#### 1.7 API: export-api.js

```javascript
/**
 * @fileoverview Export API
 * 
 * API especializada para exportación de datos
 * 
 * @module query/apis/export-api
 */

export {
  exportFullSystemMapToFile
} from '../export.js';
```

#### 1.8 API: index.js (aggregator)

```javascript
/**
 * @fileoverview Query APIs
 * 
 * APIs especializadas por dominio
 * 
 * @module query/apis
 */

export * from './project-api.js';
export * from './file-api.js';
export * from './dependency-api.js';
export * from './connections-api.js';
export * from './risk-api.js';
export * from './export-api.js';
```

---

### FASE 2: Migrar Unified Server Tools (Bajo Riesgo)

**Duración**: 30 minutos  
**Riesgo**: LOW  
**Archivos**: 7  
**Validación**: Después de cada archivo

#### Orden de migración (del menos al más crítico):

1. **status-tools.js** - Solo usa `getProjectMetadata`
2. **search-tools.js** - Solo usa `findFiles`
3. **risk-tools.js** - Solo usa `getRiskAssessment`
4. **connection-tools.js** - Solo usa `getAllConnections`
5. **impact-tools.js** - Usa `getFileAnalysis`, `getFileDependents`
6. **atomic-tools.js** - Usa `getFileAnalysisWithAtoms`, `getAtomDetails`

#### Ejemplo de cambio (status-tools.js):

```javascript
// ANTES
import { getProjectMetadata } from '../../../layer-a-static/query/index.js';

// DESPUÉS  
import { getProjectMetadata } from '../../../layer-a-static/query/apis/project-api.js';
```

#### Validación MCP después de cada cambio:

```bash
# 1. Verificar que el tool sigue funcionando
get_server_status()

# 2. Verificar que no hay errores en logs
tail -20 logs/mcp-server.log

# 3. Si todo OK, continuar con el siguiente
```

---

### FASE 3: Migrar MCP Tools (Medio Riesgo)

**Duración**: 45 minutos  
**Riesgo**: MEDIUM  
**Archivos**: 11  
**Estrategia**: Migrar en lotes de 3, validar, continuar

#### Lote 1: Tools simples (bajo riesgo)
- status.js
- search.js
- risk.js

#### Lote 2: Tools de análisis (medio riesgo)
- impact-map.js
- connection.js
- analyze-change.js

#### Lote 3: Tools atómicas (alto riesgo)
- get-molecule-summary.js (ya usa file-query directo ✅)
- get-function-details.js (ya usa file-query directo ✅)
- get-atomic-functions.js (ya usa file-query directo ✅)
- analyze-signature-change.js
- get-call-graph.js
- explain-value-flow.js

#### Cambio típico:

```javascript
// ANTES
import { getFileAnalysis } from '#layer-a/query/index.js';

// DESPUÉS
import { getFileAnalysis } from '#layer-a/query/apis/file-api.js';
```

---

### FASE 4: Migrar Core y Orchestrator (Alto Riesgo)

**Duración**: 1 hora  
**Riesgo**: HIGH  
**Archivos**: 9  
**Precaución**: Estos archivos son críticos, testear exhaustivamente

#### Archivos a migrar:
1. `core/analysis-worker.js`
2. `core/tunnel-vision-detector.js`
3. `core/atomic-editor.js`
4. `core/orchestrator/issues.js`
5. `core/orchestrator/iterative.js`
6. `core/orchestrator/llm-analysis.js`
7. `core/file-watcher/lifecycle.js`
8. `core/unified-server/api.js`
9. `core/unified-server/initialization/cache-manager.js`

#### Estrategia:
- Usar `await import()` para imports dinámicos (ya lo hacen algunos)
- Cambiar de `index.js` a `apis/*` correspondiente
- Validar con tests si existen

---

### FASE 5: Migrar CLI y Memory Layer (Bajo Riesgo)

**Duración**: 15 minutos  
**Riesgo**: LOW  
**Archivos**: 5

#### Archivos:
1. `cli/commands/status.js`
2. `cli/commands/export.js`
3. `layer-c-memory/populate-omnysysdata.js`
4. `layer-c-memory/export-system-map.js`
5. `layer-c-memory/mcp/core/analysis-checker.js`

---

### FASE 6: Marcar Facade como Deprecado

**Duración**: 5 minutos  
**Riesgo**: ZERO  
**Cambio**: Documentación

#### Actualizar `src/layer-a-static/query/index.js`:

```javascript
/**
 * @fileoverview index.js
 * 
 * ⚠️ DEPRECATED: Este archivo es un facade monolítico que exporta todas las queries.
 * 
 * Se recomienda usar las APIs especializadas:
 * - `#layer-a/query/apis/project-api.js` - Metadata y estadísticas
 * - `#layer-a/query/apis/file-api.js` - Análisis de archivos
 * - `#layer-a/query/apis/dependency-api.js` - Grafos de dependencias
 * - `#layer-a/query/apis/connections-api.js` - Conexiones semánticas
 * - `#layer-a/query/apis/risk-api.js` - Evaluación de riesgos
 * - `#layer-a/query/apis/export-api.js` - Exportación
 * 
 * @deprecated Use specialized APIs from `#layer-a/query/apis/*`
 * @module query
 */
```

---

## 🛡️ Plan de Contingencia

### Si algo se rompe:

1. **Revertir cambio específico**: Git checkout del archivo modificado
2. **Validar**: Usar MCP para verificar estado del sistema
3. **Rollback completo**: Git revert del commit
4. **Debug**: Revisar logs en `logs/mcp-server.log`

### Checklist antes de cada fase:

- [ ] Backup del código (git commit)
- [ ] Análisis MCP del archivo a modificar
- [ ] Identificar todas las funciones que usa
- [ ] Verificar que existen en la API destino
- [ ] Test manual si es posible
- [ ] Validación MCP después del cambio

---

## 📈 Métricas de Éxito

### Antes vs Después

| Métrica | Antes | Después | Mejora |
|---------|-------|---------|--------|
| Dependencias por archivo | 41 a index.js | <5 por API | 88% |
| Cohesión | Baja | Alta | +++ |
| Testeabilidad | Baja | Alta | +++ |
| Tiempo de carga | Alto (todo el facade) | Bajo (solo lo necesario) | 50% |

### Validación Final

Después de completar todas las fases:

```bash
# 1. Verificar que el sistema funciona
get_server_status()

# 2. Verificar que no hay archivos huérfanos
search_files({ pattern: "from.*query/index" })
# Debería retornar solo index.js y tests

# 3. Verificar imports de APIs
search_files({ pattern: "from.*query/apis" })
# Debería retornar ~40 archivos

# 4. Risk assessment
get_risk_assessment({ minSeverity: "medium" })
# No debería haber nuevos issues
```

---

## 🎯 Conclusión

Este plan permite desacoplar el sistema gradualmente sin breaking changes. La clave es:

1. **Crear APIs primero** (sin tocar código existente)
2. **Migrar gradualmente** (archivo por archivo)
3. **Validar constantemente** (usar MCP tools)
4. **Mantener facade** (para backwards compatibility)

**Tiempo estimado total**: 4-5 horas  
**Riesgo real**: LOW (con validación MCP continua)  
**Beneficio**: Desacoplamiento total del sistema de queries

---

**Documento creado**: 2026-02-11  
**Validado con**: OmnySys MCP Tools  
**Impacto analizado**: 41 archivos, 19 exports
