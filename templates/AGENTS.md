# OmnySys — Agent Protocol Guide

> **Última actualización:** Abril 2026 | Fuente de verdad: `src/layer-c-memory/mcp/tools/tool-definitions.js`

---

## REGLA DE ORO — Flujo de trabajo obligatorio

```
PASO 0: list_tools() → ver todas las herramientas disponibles
PASO 1: ANTES de crear → query_graph(instances) — ¿ya existe?
PASO 2: ANTES de editar → traverse_graph(impact_map) — ¿qué se rompe?
PASO 3: SIEMPRE después de editar → get_recent_errors() — ¿el watcher captó algo?
```

> ⚠️ **NUNCA asumas qué tools existen.** Siempre empieza con `list_tools()` para ver el catálogo actualizado y sus schemas.

---

## Catálogo de Herramientas (43 tools)

### 🔎 QUERIES — Inspeccionar código

| Tool | Cuándo usarlo |
|------|---------------|
| **`query_graph`** | Inspeccionar un símbolo: `instances` (buscar), `details` (metadata completa), `history` (commits git) |
| **`traverse_graph`** | Navegar dependencias: `impact_map` (qué se rompe), `call_graph` (quién llama a quién) |
| **`impact_atomic`** | Simular impacto antes de modificar: `intent: "usage"` |
| **`get_atom_history`** | Ver historial Git de un símbolo (quién, cuándo, qué cambió) |
| **`get_atom_evolution_report`** | Reporte completo: details + DNA + dataFlow + impact + git + archive |
| **`aggregate_metrics`** | Métricas agrupadas (ver tabla abajo) |

#### `aggregate_metrics` — aggregationType disponibles

| Tipo | Qué retorna |
|------|-------------|
| `health` | Fragilidad, acoplamiento, cohesión del proyecto |
| `risk` | Archivos por nivel de riesgo (Critical/High/Medium/Low) |
| `duplicates` | Clones estructurales por ADN |
| `pipeline_health` | Estado del pipeline de análisis interno |
| `storage_health` | **Nuevo:** Salud del storage (DB sizes, genealogía, duplicados, anomalías) |
| `watcher_alerts` | Alertas activas del file watcher |
| `patterns` | Patrones de eventos y conexiones semánticas |
| `society` | Clústeres funcionales cohesivos |
| `modules` | Inventario de módulos |
| `molecule` | Átomos de un archivo específico + riesgo |
| `race_conditions` | Race conditions en código async |
| `async_analysis` | Análisis profundo de funciones async |

---

### ✍️ EDICIÓN — Modificar código

| Tool | Uso | Notas |
|------|-----|-------|
| **`atomic_edit`** | `filePath, oldString, newString` | Edición segura con validación + vibraciones |
| **`atomic_write`** | `filePath, content` | Crear archivo nuevo con validación |
| **`safe_edit`** | `filePath, lineNumber/pattern, newContent` | Editar por línea o patrón (auto-contexto) |
| **`fix_imports`** | `filePath, execute: false` | Preview de imports rotos (true = aplicar) |
| **`move_file`** | `oldPath, newPath` | Mover + actualizar imports en todo el proyecto |
| **`folderize_family`** | `candidatePath, execute: false` | Plan para mover familia cohesiva a carpeta |

---

### 🔬 ANÁLISIS — Diagnosticar problemas

| Tool | Uso | Notas |
|------|-----|-------|
| **`suggest_refactoring`** | `severity: "high"`, `filePath?` | Sugerencias por grafo (CC, loops, cohesión) |
| **`detect_performance_hotspots`** | `minRisk: 20`, `limit: 10` | O(n²), I/O bloqueante, memory risks |
| **`execute_solid_split`** | `filePath, symbolName, execute: false` | Dividir god-function (preview primero) |
| **`suggest_architecture`** | `limit: 10` | Refactorización DDD, reagrupar archivos |
| **`validate_imports`** | `filePath, checkBroken: true, checkCircular: true` | Imports rotos/circulares/no-usados |
| **`validate_exports`** | `filePath` | Verificar que exports existen en cadena |

---

### 🛠️ ADMIN — Gestión del sistema

| Tool | Uso | Notas |
|------|-----|-------|
| **`get_server_status`** | Sin params | Salud completa del servidor |
| **`get_health_panel`** | Sin params | Panel resumido: status + trend + next action |
| **`get_health_snapshot`** | `snapshotKind: "dashboard"` | Dashboard detallado con histórico |
| **`get_schema`** | `type: "atoms"` o `"database"` | Schema de átomos o estado de SQLite |
| **`get_tool_inventory_report`** | Sin params | Catálogo de tools con recomendaciones |
| **`get_system_inventory_report`** | Sin params | Inventario de surfaces canónicas |
| **`get_canonical_promotion_report`** | Sin params | Plan de promoción de surfaces emergentes |
| **`get_technical_debt_report`** | Sin params | Reporte de deuda técnica |
| **`check_pipeline_integrity`** | `fullCheck: true` | Verificar integridad completa del pipeline |
| **`get_recent_errors`** | Sin params | Errores/warnings recientes del logger |
| **`execute_sql`** | `query: "SELECT ..."` | SQL directo contra la DB |
| **`list_tools`** | `includeSchemas: true` | **USAR PRIMERO** — ver todas las tools |
| **`restart_server`** | `clearCacheOnly: true` | Ver modos abajo ↓ |

#### `restart_server` — Modos

| Modo | Qué hace | Cuándo usarlo |
|------|----------|---------------|
| `{ clearCacheOnly: true }` | Limpia cache + refresca tool registry | **Después de editar código** ← uso más común |
| `{ reindexOnly: true }` | Re-analiza Layer A sin borrar DB | Cambios en archivos analizados |
| `{ reanalyze: true }` | Borrado completo + reindex desde cero | Reset total (destructivo) |
| `{ refreshOnly: true }` | Solo refresca metadata | Cambio de config sin reindex |

> ⚠️ **NUNCA mates procesos node manualmente.** Usa `restart_server({ clearCacheOnly: true })` para recargar código. El sistema maneja el restart correctamente.

---

## Flujos Obligatorios

### 🆕 Crear código nuevo

```js
// 0. Ver tools disponibles
list_tools({ includeSchemas: false })

// 1. ¿Ya existe?
query_graph({ queryType: "instances", symbolName: "miNuevaFuncion" })

// 2. ¿Hay clones de ADN?
aggregate_metrics({ aggregationType: "duplicates" })

// 3. Crear con validación
atomic_write({ filePath, content })

// 4. El FileWatcher detecta duplicados automáticamente
// Revisa _recentErrors en la respuesta
```

### ✏️ Editar código existente

```js
// 1. Ver qué se rompe
traverse_graph({ traverseType: "impact_map", filePath: "src/file.js" })

// 2. Validar imports
validate_imports({ filePath: "src/file.js", checkBroken: true, checkCircular: true })

// 3. Editar
atomic_edit({ filePath, oldString, newString })

// 4. Verificar (los errores vienen en _recentErrors automáticamente)
get_recent_errors()
```

### 🐛 Debuggear un bug

```js
// 1. Encontrar el símbolo
query_graph({ queryType: "instances", symbolName: "buggyFunc" })

// 2. Ver detalles
query_graph({ queryType: "details", filePath, symbolName: "buggyFunc" })

// 3. Ver quién lo llama
traverse_graph({ traverseType: "call_graph", filePath, options: { maxDepth: 2 } })

// 4. Editar
atomic_edit({ filePath, oldString: buggyCode, newString: fixedCode })
```

### ♻️ Refactorizar complejidad alta

```js
// 1. Encontrar hotspots
detect_performance_hotspots({ minRisk: 20, limit: 10 })

// 2. Sugerir refactor
suggest_refactoring({ severity: "high", filePath: "src/file.js" })

// 3. Preview del split
execute_solid_split({ filePath, symbolName: "godFunction", execute: false })

// 4. Aplicar si el preview es correcto
execute_solid_split({ filePath, symbolName: "godFunction", execute: true })
```

### 🏗️ Después de editar código del sistema

```js
// Recargar sin reindex
restart_server({ clearCacheOnly: true })

// Verificar que cargó
get_recent_errors()
```

---

## ❌ Anti-Patrones

| Qué NO hacer | Por qué | Qué hacer en vez |
|--------------|---------|-----------------|
| Crear sin `query_graph(instances)` | Duplicar dead code existente | Buscar primero |
| Editar sin `traverse_graph(impact_map)` | Romper dependencias silenciosamente | Ver impacto primero |
| Omitir `_recentErrors` | Perder warnings del file watcher | Siempre revisar |
| Matar procesos node manualmente | El restart_server ya maneja todo | Usar `restart_server` |
| Asumir qué tools existen | El catálogo cambia con updates | Usar `list_tools()` primero |

---

## Convenciones del Proyecto

| Parámetro | Límite |
|-----------|--------|
| Max CC por función | ≤ 15 (óptimo ≤ 10) |
| Max líneas por función | ≤ 250 |
| Cobertura de tests | > 80% |
| Bulk save SQLite | Máx 50 átomos por batch |
| Lenguajes soportados | JS/TS |

---

## Notas sobre `_recentErrors`

El servidor inyecta automáticamente warnings/errors en **CUALQUIER** response bajo `_recentErrors`. No necesitas llamar `get_recent_errors()` explícitamente si ya estás usando otra tool — los errores aparecerán ahí.

Estructura de `_recentErrors`:
```js
{
  logs: [],           // Logs del logger
  watcherAlerts: [],  // Alertas del file watcher
  summary: { errors: N, warnings: N, total: N }
}
```
