# Plan de Refactorización: Query Facade (src/layer-a-static/query/index.js)

**Fecha**: 2026-02-11  
**Estado**: Análisis Completo  
**Riesgo**: MEDIUM (30 archivos afectados)  
**Prioridad**: HIGH

---

## 🎯 Problema Identificado

El archivo `src/layer-a-static/query/index.js` es un **facade monolítico** que exporta 19 funciones y actúa como punto único de acceso para TODO el sistema de queries.

### Impacto Actual
- **30 archivos** dependen directamente de este facade
- **19 exports** concentrados en un solo archivo
- **God-object pattern**: Todas las queries pasan por aquí
- **Riesgo de cambio**: Modificar una función afecta potencialmente a todo el sistema

### Archivos Críticos Afectados
1. `src/core/unified-server/tools/*` (7 archivos) - Herramientas MCP
2. `src/core/orchestrator/*` (4 archivos) - Orquestador principal
3. `src/cli/commands/*` (2 archivos) - Comandos CLI
4. `src/core/file-watcher/*` (2 archivos) - File watcher
5. `src/layer-c-memory/*` (2 archivos) - Export y populación

---

## 🧬 Análisis Molecular

El facade actual:
```javascript
// src/layer-a-static/query/index.js
export { readJSON, readMultipleJSON, fileExists } from './readers/json-reader.js';
export { getProjectMetadata, getAnalyzedFiles, ... } from './queries/project-query.js';
export { getFileAnalysis, getFileDependencies, ... } from './queries/file-query.js';
// ... más exports
```

### Problemas Arquitectónicos

1. **Single Point of Failure**: Si este archivo falla, todo el sistema deja de funcionar
2. **Acoplamiento Excesivo**: 30 archivos importan desde un único punto
3. **Dificultad de Testing**: No se puede mockear partes individuales fácilmente
4. **Carga Innecesaria**: Los consumidores importan funciones que no usan

---

## ✅ Solución Propuesta: Descomposición por Dominio

### Fase 1: Crear API Específicas por Dominio (ATÓMICO)

En lugar de un facade monolítico, crear módulos especializados:

```
src/layer-a-static/query/
├── index.js                    # Re-export (backwards compat) - DEPRECADO
├── readers/
│   └── json-reader.js          # ✅ Ya existe
├── apis/                       # 🆕 NUEVO: APIs por dominio
│   ├── project-api.js          # getProjectMetadata, getProjectStats
│   ├── file-api.js             # getFileAnalysis, getFileDependencies
│   ├── dependency-api.js       # getDependencyGraph, getTransitiveDependents
│   ├── connections-api.js      # getAllConnections
│   ├── risk-api.js             # getRiskAssessment
│   └── export-api.js           # exportFullSystemMapToFile
└── facade/                     # 🆕 NUEVO: Facade opcional legacy
    └── legacy-facade.js        # Re-exports para backwards compat
```

### Fase 2: Migración Gradual de Consumidores

Migrar archivos uno por uno desde el facade al API específica:

1. **Primero**: Tools del unified-server (alto impacto, bajo riesgo)
2. **Segundo**: Orchestrator (alto impacto, medio riesgo)
3. **Tercero**: CLI commands (medio impacto, bajo riesgo)
4. **Cuarto**: File watcher (bajo impacto, bajo riesgo)

### Fase 3: Deprecación del Facade

Marcar `index.js` como `@deprecated` y mantenerlo solo para backwards compatibility.

---

## 📋 Plan de Implementación

### Tarea 1.1: Crear Estructura de APIs (Fase 1)
**Archivos a crear**:
- `src/layer-a-static/query/apis/project-api.js`
- `src/layer-a-static/query/apis/file-api.js`
- `src/layer-a-static/query/apis/dependency-api.js`
- `src/layer-a-static/query/apis/connections-api.js`
- `src/layer-a-static/query/apis/risk-api.js`
- `src/layer-a-static/query/apis/export-api.js`

**Cambios**: Nuevos archivos (sin breaking changes)

### Tarea 1.2: Migrar unified-server/tools (Fase 2 - Paso 1)
**Archivos a modificar**:
- `src/core/unified-server/tools/impact-tools.js`
- `src/core/unified-server/tools/atomic-tools.js`
- `src/core/unified-server/tools/connection-tools.js`
- `src/core/unified-server/tools/risk-tools.js`
- `src/core/unified-server/tools/search-tools.js`
- `src/core/unified-server/tools/status-tools.js`

**Cambio**: 
```javascript
// ANTES
import { getFileAnalysis, getFileDependents } from '#layer-a/query/index.js';

// DESPUÉS
import { getFileAnalysis, getFileDependents } from '#layer-a/query/apis/file-api.js';
```

### Tarea 1.3: Migrar Orchestrator (Fase 2 - Paso 2)
**Archivos a modificar**:
- `src/core/orchestrator/issues.js`
- `src/core/orchestrator/iterative.js`
- `src/core/orchestrator/llm-analysis.js`
- `src/core/tunnel-vision-detector.js`

**Validación**: Usar MCP para verificar impacto antes de cada cambio

### Tarea 1.4: Migrar CLI (Fase 2 - Paso 3)
**Archivos a modificar**:
- `src/cli/commands/export.js`
- `src/cli/commands/status.js`

### Tarea 1.5: Migrar File Watcher (Fase 2 - Paso 4)
**Archivos a modificar**:
- `src/core/file-watcher/lifecycle.js`

### Tarea 1.6: Marcar Facade como Deprecado (Fase 3)
**Archivo a modificar**:
- `src/layer-a-static/query/index.js`

**Cambio**: Agregar JSDoc `@deprecated`

---

## 🛡️ Estrategia de Mitigación de Riesgos

### 1. Validación con MCP
Antes de cada cambio:
```javascript
// 1. Verificar impacto
get_impact_map({ filePath: "src/core/unified-server/tools/impact-tools.js" })

// 2. Verificar cambio de símbolo
analyze_change({ 
  filePath: "src/core/unified-server/tools/impact-tools.js",
  symbolName: "getImpactMap"
})

// 3. Usar atomic_edit para cambios seguros
atomic_edit({
  filePath: "src/core/unified-server/tools/impact-tools.js",
  oldString: "from '#layer-a/query/index.js'",
  newString: "from '#layer-a/query/apis/file-api.js'"
})
```

### 2. Tests de Regresión
- Ejecutar test suite completo después de cada migración
- Verificar que `toolDefinitions` sigue funcionando
- Validar que los tools MCP responden correctamente

### 3. Rollback Plan
- Cada cambio atómico puede revertirse individualmente
- Mantener facade legacy funcionando durante toda la migración
- Git history para revertir si es necesario

---

## 📊 Métricas de Éxito

| Métrica | Antes | Después | Objetivo |
|---------|-------|---------|----------|
| Dependencias directas | 30 | < 5 | Reducir 80% |
| Exports por archivo | 19 | 3-5 | Distribuir carga |
| Acoplamiento | Alto | Bajo | Desacoplar |
| Testeabilidad | Baja | Alta | Facilitar mocks |

---

## 🎯 Conclusión

Este refactor es **necesario** para:
1. Reducir el riesgo de cambios en el sistema de queries
2. Mejorar la testeabilidad
3. Permitir evolución independiente de cada dominio
4. Seguir los principios de Arquitectura Atómica de OmnySys

**Nota**: El facade actual no está "roto", pero es un **hotspot crítico** que necesita desacoplamiento para la salud a largo plazo del sistema.

---

**Documento creado por**: OpenCode + OmnySys MCP  
**Análisis de impacto**: 30 archivos afectados, riesgo MEDIUM  
**Recomendación**: Proceder con migración gradual y atómica
