# Watcher Guard System - Standardization Guide

> **Versión:** 2.0.0 | **Estándar:** guard-standards.js

## Overview

El sistema de guards de OmnySys ejecuta validaciones automáticas tras la modificación o creación de archivos. Todos los guards siguen el estándar definido en `guard-standards.js` para consistencia y mantenibilidad.

---

## Tipos de Guards

### 1. Semantic Guards
Se ejecutan inmediatamente después de la extracción atómica. Tienen acceso a los átomos recién procesados.

- **Cuándo se ejecutan:** Durante `analyzeAndIndex`
- **Firma:** `async (rootPath, filePath, context, atoms, options) => Promise<results>`
- **Uso ideal:** Detección de errores de lógica, inconsistencias, validación de data-flow

### 2. Impact Guards
Se ejecutan después de que todo el archivo ha sido indexado y persistido.

- **Cuándo se ejecutan:** Al final de los eventos `add` y `change` del watcher
- **Firma:** `async (rootPath, filePath, context, options) => Promise<results>`
- **Uso ideal:** Detección de dependencias circulares, análisis de impacto, duplicados globales

---

## Guards Registrados

### Semantic Guards (6)

| Guard | Dominio | Versión | Detecta |
|-------|---------|---------|---------|
| `shared-state` | sem | 2.0.0 | "Átomos radioactivos" con >5 conexiones de estado |
| `atomic-integrity` | sem | 2.0.0 | Data-flow incoherente, inputs sin usar |
| `async-safety` | runtime | 1.0.0 | Funciones async sin error handling |
| `complexity-monitor` | code | 1.0.0 | Complejidad ciclomática alta, funciones largas |
| `event-leak` | runtime | 1.0.0 | Memory leaks por event listeners sin cleanup |
| `dead-code` | code | 1.0.0 | Código muerto recién creado |

### Impact Guards (5)

| Guard | Dominio | Versión | Detecta |
|-------|---------|---------|---------|
| `impact-wave` | arch | 2.0.0 | Radio de explosión de cambios |
| `duplicate-risk` | code | 2.0.0 | Duplicados por DNA hash |
| `circular-dependencies` | arch | 2.0.0 | Ciclos de imports y llamadas |
| `hotspot-detector` | perf | 1.0.0 | Funciones que cambian frecuentemente |
| `pipeline-health` | code | 1.0.0 | Shadow volume alto, zero atoms |

---

## Estándar de Issue Types

### Formato
```
{domain}_{subdomain}_{severity}
```

### Dominios
- `code` - Calidad de código (duplicados, complejidad, estilo)
- `arch` - Arquitectura (impacto, dependencias, circularidad)
- `sem` - Semántica (data-flow, estado compartido)
- `runtime` - Runtime (async safety, memory leaks)
- `perf` - Performance (hotspots)

### Ejemplos
```javascript
'code_duplicate_high'
'arch_circular_high'
'arch_impact_medium'
'sem_shared_state_medium'
'sem_data_flow_low'
'runtime_async_safety_high'
'runtime_event_leak_medium'
'perf_hotspot_high'
'code_dead_code_medium'
'code_complexity_high'
'code_pipeline_health_high'
```

---

## Cómo Crear un Nuevo Guard

### 1. Crear el archivo

```javascript
// src/core/file-watcher/guards/my-guard.js
import { persistWatcherIssue, clearWatcherIssue } from '../watcher-issue-persistence.js';
import { createLogger } from '../../../utils/logger.js';
import {
    IssueDomains,
    createIssueType,
    createStandardContext,
    // ... otros imports necesarios
} from './guard-standards.js';

const logger = createLogger('OmnySys:file-watcher:guards:my');

export async function detectMyIssue(rootPath, filePath, EventEmitterContext, atoms = [], options = {}) {
    // Tu lógica de detección aquí
    
    // Usar createStandardContext para el contexto
    const context = createStandardContext({
        guardName: 'my-guard',
        severity: 'medium',
        suggestedAction: 'What to do about this issue',
        suggestedAlternatives: ['Option 1', 'Option 2'],
        extraData: { /* specific data */ }
    });
    
    // Usar createIssueType para el issue type
    const issueType = createIssueType(IssueDomains.CODE, 'my_issue', 'medium');
    
    await persistWatcherIssue(rootPath, filePath, issueType, 'medium', 'Message', context);
}
```

### 2. Registrar en registry.js

```javascript
// En initializeDefaultGuards()
const { detectMyIssue } = await import('./my-guard.js');
this.registerSemanticGuard('my-guard', detectMyIssue, {
    domain: IssueDomains.CODE,
    version: '1.0.0',
    description: 'What this guard detects'
});
```

---

## Estructura de Contexto Estándar

Todos los guards deben usar `createStandardContext()`:

```typescript
{
    // Identificación (requerido)
    source: 'file_watcher',
    guardName: string,
    timestamp: string,  // ISO 8601
    
    // Átomo afectado (opcional)
    atomId?: string,
    atomName?: string,
    
    // Métricas (opcional)
    metricValue?: number,
    threshold?: number,
    severity?: 'high' | 'medium' | 'low',
    
    // Acciones (requerido)
    suggestedAction: string,
    suggestedAlternatives?: string[],
    
    // Relaciones (opcional)
    relatedAtomIds?: string[],
    relatedFiles?: string[],
    
    // Datos específicos (opcional)
    extraData?: object
}
```

---

## Thresholds Estándar

```javascript
StandardThresholds = {
    COMPLEXITY_HIGH: 20,
    COMPLEXITY_MEDIUM: 15,
    COMPLEXITY_LOW: 10,
    LINES_HIGH: 150,
    LINES_MEDIUM: 100,
    IMPACT_HIGH: 18,
    IMPACT_MEDIUM: 10,
    IMPACT_LOW: 4,
    SHARED_STATE_HIGH: 10,
    SHARED_STATE_MEDIUM: 5,
    HOTSPOT_HIGH: 5,
    HOTSPOT_MEDIUM: 3,
    COHERENCE_MIN: 0.3
}
```

---

## Sugerencias de Acción Estándar

```javascript
StandardSuggestions = {
    DUPLICATE_REUSE: 'Use atomic_edit to extend existing function',
    DUPLICATE_RENAME: 'Rename using suggested alternatives',
    IMPACT_REVIEW: 'Review related files before committing',
    IMPACT_BREAKING: 'Update all callers for breaking changes',
    ASYNC_ADD_TRY_CATCH: 'Add try/catch for error handling',
    EVENT_ADD_CLEANUP: 'Add cleanup for event listeners',
    COMPLEXITY_SPLIT: 'Split function into smaller ones',
    SHARED_STATE_LOCAL: 'Convert to local state',
    SHARED_STATE_EXTRACT: 'Extract to dedicated store',
    HOTSPOT_STABILIZE: 'Stabilize frequently changing code',
    DEAD_CODE_REMOVE: 'Remove dead code',
    DEAD_CODE_REVIVE: 'Add TODO with revival conditions'
}
```

---

## Persistencia de Issues

### Guardar Issue
```javascript
await persistWatcherIssue(
    rootPath,
    filePath,
    issueType,      // Usar createIssueType()
    severity,       // 'high' | 'medium' | 'low'
    message,        // Mensaje descriptivo
    context         // Usar createStandardContext()
);
```

### Limpiar Issue Resuelto
```javascript
await clearWatcherIssue(rootPath, filePath, issueType);
```

### Ciclo de Vida
1. Archivo modificado → Guards ejecutan
2. Issue detectado → `persistWatcherIssue()`
3. Issue se muestra en `_recentErrors` de MCP tools
4. Archivo arreglado → `clearWatcherIssue()`
5. Issue desaparece de `_recentErrors`

---

## Testing de Guards

### Verificar registro
```javascript
const stats = guardRegistry.getStats();
console.log(stats.total);  // Número total de guards
console.log(stats.byDomain);  // Distribución por dominio
```

### Verificar issues activos (SQL)
```sql
SELECT issue_type, severity, file_path, detected_at
FROM semantic_issues
WHERE message LIKE '[watcher]%'
ORDER BY detected_at DESC;
```

### Verificar en tiempo real
Los issues aparecen automáticamente en `_recentErrors` de cualquier respuesta MCP.

---

## Mejores Prácticas

1. **Siempre usar estándares**: `createIssueType()`, `createStandardContext()`
2. **Limpiar issues resueltos**: Llamar `clearWatcherIssue()` cuando no hay problema
3. **Sugerir acciones**: Incluir `suggestedAction` y `suggestedAlternatives`
4. **Emitir eventos**: Notificar vía `EventEmitterContext.emit()` para UI/logs
5. **Manejar errores**: Usar try/catch y loggear con nivel debug
6. **Performance**: Guards deben ejecutar en <100ms por archivo

---

## Changelog

### v2.0.0 (2026-03-05)
- Estandarización completa del sistema
- Nuevos guards: async-safety, complexity, event-leak, dead-code, hotspot, pipeline-health
- Todos los guards ahora usan `guard-standards.js`
- Issue types estandarizados: `{domain}_{subdomain}_{severity}`
- Contexto estandarizado con `suggestedAction` y `suggestedAlternatives`

### v1.0.0
- Versión inicial con guards básicos
