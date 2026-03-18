# File Watcher Guard System - Audit Report

**Fecha:** 2026-03-05  
**Proyecto:** OmnySystem  
**Estado:** ✅ Sistema operativo, algunas mejoras identificadas

---

## 1. Resumen Ejecutivo

El sistema File Watcher de OmnySys incluye **8 guards** que ejecutan validaciones automáticas cuando se modifican archivos. Los issues detectados se persisten en SQLite (`semantic_issues`) y se inyectan automáticamente en todas las respuestas MCP vía `_recentErrors`.

### Cobertura de Detección

| Categoría | Estado | Guards |
|-----------|--------|--------|
| Duplicados de código | ✅ Activo | `duplicate-risk.js` |
| Dependencias circulares | ✅ Activo | `circular-guard.js` |
| Impacto de cambios | ✅ Activo | `impact-wave.js` |
| Estado compartido | ✅ Activo | `shared-state-guard.js` |
| Integridad de data-flow | ✅ Activo | `integrity-guard.js` |
| Pipeline health | ✅ Activo | `pipeline-alert-guard.js` |
| Errores de runtime | ⚠️ Parcial | Error Guardian (runtime) |
| Imports rotos | ⚠️ Manual | `validate_imports` tool |
| Errores de sintaxis | ⚠️ Parcial | Syntax Shield |

---

## 2. Guards Registrados

### 2.1 Semantic Guards (Ejecutan post-extracción atómica)

| Guard | Función | Qué Detecta | Issue Type |
|-------|---------|-------------|------------|
| `shared-state` | `detectSharedStateContention()` | Átomos con >5 conexiones `shares_state` (Radioactive Atoms) | `shared_state_contention` |
| `atomic-integrity` | `detectIntegrityViolations()` | Data-flow coherence < 30%, unused inputs | `atomic_integrity` |
| `technical-debt-todo` | `examplePluginGuard()` | Placeholder - búsqueda de TODOs | (no implementado) |

### 2.2 Impact Guards (Ejecutan post-indexación)

| Guard | Función | Qué Detecta | Issue Type |
|-------|---------|-------------|------------|
| `impact-wave` | `detectImpactWave()` | Cambios que afectan >18 archivos (high blast radius) | `watcher_impact_wave` |
| `duplicate-risk` | `detectDuplicateRisk()` | Funciones con DNA hash duplicado | `watcher_duplicate_risk` |
| `circular-dependencies` | `detectCircularDependencies()` | Ciclos de imports y llamadas | `watcher_circular_dependency` |

### 2.3 Otros Guards (No registrados en registry.js)

| Guard | Ubicación | Qué Detecta | Persistencia |
|-------|-----------|-------------|--------------|
| `pipeline-integrity` | `pipeline-alert-guard.js` | Shadow Volume > 30%, zero atoms | Emite eventos `pipeline:alert` |
| Error Guardian | `error-guardian.js` | Errores en tiempo de ejecución | Consola + Eventos |
| Syntax Shield | `syntax-shield.js` | Errores de sintaxis JS/TS | Consola + Eventos |

---

## 3. Metadatos Disponibles (Atom Schema)

### Campos Útiles para Detección

```javascript
// 63 campos totales disponibles
{
  // Identidad y propósito
  archetype: { type, severity, confidence },
  purpose: 'API_EXPORT' | 'CLASS_METHOD' | 'INTERNAL_HELPER' | ...,
  
  // Complejidad y tamaño
  complexity: number,        // Cyclomatic Complexity
  linesOfCode: number,
  
  // Características de ejecución
  isAsync: boolean,
  hasErrorHandling: boolean,
  hasNetworkCalls: boolean,
  
  // Análisis de duplicación
  dna_json: string,          // Hash estructural para detección de clones
  
  // Estado y eventos
  sharedStateAccess: string[], // ej: ['process.env', 'global.store']
  eventEmitters: string[],
  eventListeners: string[],
  
  // Métricas de riesgo
  fragilityScore: number,
  centralityScore: number,
  importanceScore: number,
  riskLevel: 'HIGH' | 'MEDIUM' | 'LOW',
  
  // Métricas de evolución
  changeFrequency: number,
  ageDays: number,
  
  // Estado del código
  isExported: boolean,
  isDeadCode: boolean,
  isRemoved: boolean
}
```

### Campos NO utilizados actualmente

| Campo | Potencial | Sugerencia |
|-------|-----------|------------|
| `hasNetworkCalls` | Detectar funciones sin error handling | Guard: `network-unhandled` |
| `isDeadCode` | Alertar de código muerto nuevo | Guard: `dead-code-alert` |
| `ageDays` + `changeFrequency` | Detectar "constantly changing" hotspots | Guard: `hotspot-detector` |
| `fragilityScore` | Alertar si fragility > umbral | Extender `shared-state-guard` |
| `purpose` | Validar naming vs propósito | Guard: `naming-convention` |
| `eventEmitters`/`eventListeners` | Detectar memory leaks | Guard: `event-leak-detector` |

---

## 4. Patrones NO Detectados (Gap Analysis)

### 4.1 High Priority Gaps

| Patrón | Impacto | Esfuerzo | Sugerencia de Implementación |
|--------|---------|----------|------------------------------|
| **Funciones async sin try/catch** | Runtime crashes | Bajo | Guard `async-safety`: verificar `hasNetworkCalls && !hasErrorHandling` |
| **Memory leaks en event listeners** | Degradación | Medio | Guard `event-leak`: contar listeners sin remove, detectar patrones `on()` sin `off()` |
| **Código muerto recién creado** | Deuda técnica | Bajo | Guard `dead-code-alert`: alertar si `isDeadCode: true` en archivo nuevo |
| **Hotspots de cambio frecuente** | Inestabilidad | Medio | Guard `hotspot-detector`: `changeFrequency > threshold && ageDays < 30` |
| **Inconsistencia de nomenclatura** | Mantenibilidad | Medio | Guard `naming-convention`: validar `purpose` vs prefijo de nombre |

### 4.2 Medium Priority Gaps

| Patrón | Impacto | Esfuerzo | Sugerencia |
|--------|---------|----------|------------|
| **Magic numbers/strings** | Mantenibilidad | Medio | Extraer en metadata, detectar literales repetidos |
| **Callbacks anidados profundos** | Legibilidad | Bajo | Detectar callback hell (nested functions > 3 niveles) |
| **Imports no utilizados** | Bundle size | Medio | Comparar imports vs usos reales |
| **Variables sin usar** | Calidad | Medio | Usar data-flow analysis existente |
| **Funciones excesivamente largas** | Complejidad | Bajo | `linesOfCode > 150` → warning |
| **Complejidad ciclomática alta** | Testability | Bajo | `complexity > 15` → warning |

### 4.3 Low Priority Gaps

| Patrón | Impacto | Esfuerzo | Sugerencia |
|--------|---------|----------|------------|
| **Inconsistencias de estilo** | Consistencia | Alto | Integrar con ESLint/Prettier |
| **Documentación faltante** | Onboarding | Bajo | Detectar funciones públicas sin JSDoc |
| **Tests faltantes** | Cobertura | Alto | Mapear funciones de alto riesgo sin tests |

---

## 5. Estandarización de Issues

### 5.1 Formatos Actuales (Inconsistentes)

Los guards actuales usan diferentes formatos para `issue_type`:

```javascript
// duplicate-risk.js
'watcher_duplicate_risk'

// impact-wave.js  
'watcher_impact_wave'

// shared-state-guard.js
'shared_state_contention'

// integrity-guard.js
'atomic_integrity'

// circular-guard.js
'watcher_circular_dependency'
```

### 5.2 Propuesta de Estandarización

```typescript
// Prefijo: domain_subdomain_severity
// Ejemplos:
'code_quality_duplicate_high'
'architecture_impact_wave_high'
'semantics_shared_state_medium'
'semantics_data_flow_low'
'runtime_async_safety_high'
'performance_hotspot_medium'
```

### 5.3 Estructura de Contexto Estándar

```javascript
const standardContext = {
  // Identificación
  atomId?: string,
  atomName?: string,
  
  // Métricas cuantitativas
  metricValue?: number,
  threshold?: number,
  
  // Sugerencias de acción
  suggestedAction: string,  // Requerido
  suggestedAlternatives?: string[],
  
  // Enlaces al grafo
  relatedAtomIds?: string[],
  relatedFiles?: string[],
  
  // Metadatos
  source: 'file_watcher',
  guardName: string,
  timestamp: string  // ISO 8601
};
```

---

## 6. Estado de Persistencia

### 6.1 Tabla semantic_issues

```sql
CREATE TABLE semantic_issues (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  file_path TEXT NOT NULL,
  issue_type TEXT NOT NULL,
  severity TEXT CHECK(severity IN ('low', 'medium', 'high')),
  message TEXT NOT NULL,
  line_number INTEGER,
  context_json TEXT,  // JSON con metadata
  detected_at TEXT    // ISO 8601
);
```

### 6.2 Ciclo de Vida de un Issue

```
┌─────────────────────────────────────────────────────────────┐
│  File Changed                                               │
│     ↓                                                       │
│  Guards Execute                                             │
│     ↓                                                       │
│  Issue Detected? ──NO──→ clearWatcherIssue() ──→ [DELETE]   │
│     ↓ YES                                                   │
│  persistWatcherIssue() ──→ [INSERT/REPLACE]                 │
│     ↓                                                       │
│  MCP Tool Called                                            │
│     ↓                                                       │
│  _recentErrors incluye issue                                │
│     ↓                                                       │
│  AI ve el issue y actúa                                     │
└─────────────────────────────────────────────────────────────┘
```

### 6.3 Problema Identificado

Los guards registrados en `registry.js` usan `persistWatcherIssue()`, pero:
- `pipeline-alert-guard.js` NO está registrado en el registry
- Emite eventos pero **no persiste** en SQLite
- Resultado: las alertas de pipeline solo aparecen en logs

**Recomendación:** Mover `pipeline-alert-guard.js` al registry o agregar persistencia manual.

---

## 7. Verificación de Funcionamiento

### 7.1 Test de Inyección en _recentErrors

```bash
# 1. Verificar que el watcher está activo
curl -s http://localhost:9999/health | jq .watchers.fileWatcher.state

# 2. Crear un duplicado intencional
echo "function testDuplicate() { return 1; }" >> src/test-duplicate.js

# 3. Llamar cualquier tool MCP
# El response debe incluir _recentErrors con el issue de duplicado
```

### 7.2 Query SQL para Ver Issues Activos

```sql
-- Issues por archivo
SELECT file_path, issue_type, severity, detected_at
FROM semantic_issues
WHERE message LIKE '[watcher]%'
ORDER BY detected_at DESC
LIMIT 20;

-- Conteo por tipo
SELECT issue_type, COUNT(*) as count
FROM semantic_issues
WHERE message LIKE '[watcher]%'
GROUP BY issue_type;

-- Issues críticos pendientes
SELECT * FROM semantic_issues
WHERE severity = 'high'
AND message LIKE '[watcher]%'
ORDER BY detected_at DESC;
```

---

## 8. Recomendaciones

### 8.1 Prioridad Alta

1. **Crear Guard `async-safety`**
   - Detectar `isAsync && hasNetworkCalls && !hasErrorHandling`
   - Severidad: high
   - Mensaje: "Async function 'X' makes network calls but lacks error handling"

2. **Estandarizar Nomenclatura de Issues**
   - Migrar todos los `issue_type` al formato: `domain_severity`
   - Ejemplo: `code_duplicate_high`, `arch_circular_medium`

3. **Registrar pipeline-alert-guard.js**
   - Agregar al registry.js o agregar persistencia manual
   - Issues actuales se pierden en logs

### 8.2 Prioridad Media

4. **Mejorar Mensajes de Error**
   - Todos los guards deben incluir `suggestedAction` en context
   - Agregar `suggestedAlternatives` cuando aplique

5. **Crear Guard `hotspot-detector`**
   - Usar `changeFrequency` + `ageDays` para detectar inestabilidad
   - Umbral: >5 cambios en <30 días

6. **Crear Guard `event-leak-detector`**
   - Analizar `eventListeners` sin correspondiente cleanup
   - Detectar patrones de memory leak

### 8.3 Prioridad Baja

7. **Documentar Todos los Guards**
   - Actualizar GUARDS.md con cada guard y sus triggers

8. **Crear Dashboard de Issues**
   - UI para ver issues activos por severidad
   - Tendencias de deuda técnica

9. **Integrar con CI/CD**
   - Bloquear PRs con issues `high` no resueltos
   - Reporte automático en PR description

---

## 9. Métricas del Sistema

### Estado Actual

```
Guards Registrados:        6 (3 semantic + 3 impact)
Guards Totales:            8 (incluyendo no-registrados)
Tipos de Issues:           6
Campos Schema Utilizados:  ~15 de 63 disponibles
Cobertura de Detección:    ~60%
```

### Meta Objetivo

```
Guards Registrados:        10+
Cobertura de Detección:    85%+
Tiempo promedio:           <2ms por archivo
Issues con acción:         100% (suggestedAction)
```

---

## 10. Checklist de Verificación

- [x] Guards se registran en `registry.js`
- [x] Guards usan `persistWatcherIssue()` para issues
- [x] Guards usan `clearWatcherIssue()` para resolver
- [x] Issues aparecen en `_recentErrors` de MCP responses
- [x] Mensajes incluyen contexto JSON útil
- [ ] Todos los guards incluyen `suggestedAction`
- [ ] Nomenclatura de `issue_type` es consistente
- [ ] Guards no registrados también persisten
- [ ] Tests automatizados para cada guard

---

**Conclusión:** El sistema de guards está **funcional y estable**. Los principales gaps son en la detección de `async-safety` y `event-leaks`. La estandarización de nombres y mensajes mejoraría la accionabilidad de los issues.
