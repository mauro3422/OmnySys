# OmnySys — Roadmap de Desarrollo

**Versión actual**: v0.9.285
**Última actualización**: 2026-04-09
**Estado**: ✅ **100% Estático, 0% LLM** — Tree-sitter + SQLite + 45 MCP Tools

---

## 🎯 Propósito Central

> **"Dar a las IAs el contexto exacto de un archivo específico, como si un desarrollador senior que conoce TODO el codebase estuviera sentado al lado"**

### La Metáfora: Cajas → Átomos → Electrones

```
SISTEMA TRADICIONAL:
┌─────────────────────────────────────┐
│  Levantas una caja (archivo)        │
│  └── Ves cables (imports/exports)   │
│  ❌ No sabes qué hace la función    │
│  ❌ No sabes el impacto de cambiar X│
└─────────────────────────────────────┘

OMNYSYS (Molecular):
┌─────────────────────────────────────┐
│  Dentro de la caja hay ÁTOMOS       │
│  └── Cada función es un átomo       │
│  ✅ Sabes que existe processOrder() │
│  ✅ Sabes sus parámetros            │
│  ✅ Sabes que llama a calculateTotal│
└─────────────────────────────────────┘

OMNYSYS (Data Flow):
┌─────────────────────────────────────┐
│  Dentro del átomo hay ELECTRONES    │
│  ✅ "order entra por aquí"          │
│  ✅ "se transforma en total aquí"   │
│  ✅ "Si cambias order.items → 8 archivos afectados" │
└─────────────────────────────────────┘
```

---

## ✅ Fases Completadas

### ✅ v0.9.285 — Propagation Engine + Control Plane (2026-04)

**Logros**:
- ✅ Motor de propagación canónico para cambios de folderización
- ✅ Plano de control del compilador con 8 señales
- ✅ Telemetría de runtime (proxy + bridge) con detección de thrashing
- ✅ Promoción canónica para familias folderizadas y superficies emergentes
- ✅ Inventario de sistemas (22 sistemas: 18 canónicos, 3 emergentes, 2 bridges, 2 wrappers)
- ✅ Snapshot de folderización con naming debt tracking
- ✅ Consolidación de monolitos: 5 archivos ~3,550L → 44 módulos
- ✅ Delta compression en atom-history (~60% reducción de payload)
- ✅ Snapshot rotation (1 por día máximo)
- ✅ Process restart split con DB preservation

**Métricas actuales**:
- Átomos indexados: 14,241 activos
- Archivos analizados: 2,813 activos
- Herramientas MCP: 45
- Relaciones en grafo: 11,202
- Sociedades de cohesión: 1,780
- Health Score: 62/100 (D-) — bloqueado por policy drift
- Database Health: 76/100 (C+) — schema A (0 drift)
- Reliability/Trust: 44/100 (F)

---

### ✅ v0.9.61 — Dead Code Detection + Refactorización (2026-02-25)

**Logros**:
- ✅ Dead Code Detection 85% preciso
- ✅ 100% Estático, 0% LLM
- ✅ 3 archivos refactorizados (audit-logger, write-queue, resolver)
- ✅ 8 god functions refactorizadas

---

### ✅ v0.9.60 — Semantic Algebra + SQLite (2026-02-24)

**Logros**:
- ✅ Semantic Algebra en producción
- ✅ SQLite migration completa
- ✅ Startup 1.5s (de 25s)
- ✅ Auto error notifications

---

### ✅ v0.9.54 — Zero Technical Debt Push (2026-02-22)

**Logros**:
- ✅ 13 files refactored (100%)
- ✅ 5,235 → 2,212 LOC (-58%)
- ✅ 127 tests passing

---

## 🔴 Estado Actual — Deuda Técnica Activa

| Tipo | Cantidad | Estado |
|------|----------|--------|
| **Policy Drift** | 136 hallazgos | 🔴 Bloquea control plane |
| **Hotspots de Complejidad** | 15 funciones CC > 30 | 🔴 Target ≤ 15 |
| **Duplicados Estructurales** | 5 grupos (10 instancias) | 🟡 Baja urgencia |
| **Duplicados Conceptuales** | 2 (watcher detected) | 🟡 Media urgencia |
| **Naming Debt** | 1,871 renombres | 🟡 Folderización pendiente |
| **Metadata Coverage** | 84% | 🟡 Target > 90% |
| **Estado Compartido Radiactivo** | 1 átomo (50 dependientes) | 🔴 Alto riesgo |

---

## 📋 Roadmap Inmediato

### Sprint 1 — Desbloquear Control Plane

**Prioridad**: 🔴 CRÍTICA

1. **Reconciliar universo de archivos** — Los archivos vivos indexados exceden el manifiesto persistido. Un rescan completo sincroniza la DB con el filesystem real.
2. **Consolidar 136 policy drifts** — Son hallazgos de gobernanza activos. Clasificar por tipo (data_gateway, propagation_expansion, summary_presentation, etc.) y reparar.
3. **Reparar database health** — Las proyecciones están drifting del grafo de átomos canónico.

**Resultado esperado**: Control plane pasa de `blocked` a `watching` o `ready`.

---

### Sprint 2 — Refactorizar Hotspots

**Prioridad**: 🔴 ALTA

Las 5 funciones más complejas necesitan división SOLID:

| Función | CC Actual | Target | Archivo |
|---------|-----------|--------|---------|
| `buildTechnicalDebtReportValues` | 55 | ≤ 15 | `technical-debt-report-cache-helpers.js` |
| `buildTelemetryRegistry` | 47 | ≤ 15 | `compiler-control-plane-telemetry.js` |
| `persistFolderizationSnapshot` | 43 | ≤ 15 | `folderization-snapshot-helpers.js` |
| `summarizeCompilerControlPlane` | 42 | ≤ 15 | `compiler-control-plane.js` |
| `buildCurrentMetrics` | 39 | ≤ 15 | `compiler-metrics-current.js` |

**Herramienta**: `execute_solid_split({ filePath, symbolName, execute: false })` para previsualizar antes de aplicar.

---

### Sprint 3 — Consolidar Duplicados

**Prioridad**: 🟡 MEDIA

5 grupos de duplicados estructurales para consolidar:

1. `isTransientSqliteAvailabilityError` → SSOT en `shared/utils/normalize-helpers.js`
2. `firstDefined` → SSOT en `shared/compiler/compiler-observability-contract.js`
3. `getDependentsForPath` → SSOT en `folderize-family-plan-runner.js`
4. `IssueManager.constructor` → SSOT en `consistency/issue-manager/manager.js`
5. `IssueManager.getIssues` → SSOT en `consistency/issue-manager/manager.js`

**Herramienta**: `consolidate_conceptual_cluster({ semanticFingerprint, ssotFilePath, execute: true })`

---

### Sprint 4 — Lazy Indexing (Performance)

**Prioridad**: 🟡 MEDIA

Migrar de análisis "Big Bang" a arquitectura escalonada tipo LSP:

```
Phase 1 (Structural Fast Scan) < 5s:
  Tree-sitter → Nombres/Firmas/Imports → SQLite → MCP Tools disponibles

Phase 2 (Deep Semantic Scan) Background/Lazy:
  DataFlow · Semántica · DNA · calledBy links · enrichWithCulture
  → Actualizaciones incrementales a SQLite
```

**Objetivo**: TTI (Time-to-Interactive) < 5s vs ~4.5s actuales para carga desde caché.

---

## 📋 Roadmap Futuro

### Q3 2026 — Intra-Atómico

**Qué**: Dentro de cada transformación, ver los **sub-átomos**:

```javascript
// Transformación actual
{ from: "total", to: "finalTotal", operation: "arithmetic" }

// Intra-atómico — MÁS GRANULAR
{
  from: "total", to: "finalTotal", operation: "arithmetic",
  subOperations: [
    { op: "multiply", operands: ["total", "discount"], result: "savings" },
    { op: "subtract", operands: ["total", "savings"], result: "finalTotal" }
  ]
}
```

**Para qué**: Detectar precision loss en cálculos financieros, optimizar transformaciones innecesarias.

---

### Q4 2026 — Estado Cuántico

**Qué**: Simular **todos los paths posibles** (if/else, try/catch):

```javascript
function processOrder(order) {
  if (!order.items.length) throw new Error("Empty");  // Universo A
  if (order.total > 10000) applyDiscount();           // Universo B
  return saveOrder(order);                            // Universo C
}
```

**Para qué**: Generar test cases automáticamente, detectar paths no cubiertos.

---

### 2027 — Campo Unificado

**Qué**: Detectar **entrelazamiento** entre archivos lejanos sin import directo:

```javascript
// Frontend: fetchUser(id) ──entrelazado──→ Backend: /api/user/:id
// Si cambia el contrato en B, A se rompe (aunque no haya import directo)
```

**Para qué**: Detectar breaking changes en APIs, mapear dependencias cross-service.

---

## 📊 Métricas de Éxito

### Actuales (Abril 2026)

| Métrica | Actual | Target | Estado |
|---------|--------|--------|--------|
| **Health Score** | 62/100 | > 80 | 🔴 |
| **Database Health** | 76/100 | > 90 | 🟡 |
| **Reliability/Trust** | 44/100 | > 70 | 🔴 |
| **MVP Ready** | No | Sí | 🔴 |
| **Herramientas MCP** | 45 | 45 | ✅ |
| **Schema Drift** | 0 | 0 | ✅ |
| **Análisis LLM** | 0% | 0% | ✅ |

### Objetivos Inmediatos

- [ ] Desbloquear control plane (136 policy drifts → 0)
- [ ] Refactorizar 5 funciones con CC > 30
- [ ] Consolidar 5 grupos de duplicados
- [ ] Normalizar naming debt (1,871 → < 500)
- [ ] Subir metadata coverage de 84% a > 90%
- [ ] Alcanzar MVP readiness

---

## 🎓 Lecciones Aprendidas

### Lo que Funciona

1. ✅ **100% Estático**: Tree-sitter + SQLite + álgebra de grafos — sin LLM
2. ✅ **3 bases de datos separadas**: Activas + historial de átomos + historial de salud
3. ✅ **45 herramientas MCP determinísticas**: Query, action, admin
4. ✅ **Atomic editing**: Validación de sintaxis + propagación de impacto
5. ✅ **DNA de código**: Detección de duplicados por estructura, no solo texto
6. ✅ **FileWatcher con guards**: Integridad + impacto + cobertura semántica
7. ✅ **Control plane**: Detecta cuándo el sistema confía en sus propios datos

### Lo que NO Funcionaba (y eliminamos)

1. ❌ **LLM para análisis**: Lento, caro, impredecible (deprecated desde v0.9.61)
2. ❌ **JSON storage**: Lento, sin integridad referencial (migrado a SQLite)
3. ❌ **Inserts individuales**: 30s vs 3s con bulk operations

---

**Última actualización**: 2026-04-09 (v0.9.285)
**Estado**: ✅ **100% Estático, 0% LLM**
**Próximo**: 🔧 Desbloquear control plane → Refactorizar hotspots → Consolidar duplicados
