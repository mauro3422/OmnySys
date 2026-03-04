# OmnySys — Agent Protocol Guide

> **Última actualización:** Marzo 2026 | Fuente de verdad: `src/layer-c-memory/mcp/tools/index.js`  
> ⚠️ Cada tool fue verificada **leyendo su implementación** antes de documentarla.

---

## REGLA DE ORO

```
ANTES de crear → query_graph(instances) — ¿ya existe?
ANTES de editar → traverse_graph(impact_map) — ¿qué se rompe?
SIEMPRE después de editar → get_recent_errors() — ¿el watcher captó algo?
```

---

## Catálogo de Herramientas (verificado desde el código)

### 🔎 `query_graph` — Consultas sobre un símbolo

| `queryType`  | Estado    | Cuándo usarlo                               |
|--------------|-----------|---------------------------------------------|
| `instances`  | ✅ ACTIVO | ¿Ya existe esta función en el proyecto?     |
| `details`    | ✅ ACTIVO | CC, riesgos, ADN, Phase 2 on-demand        |
| `history`    | ❌ DEPRECATED | Devuelve error                         |
| `value_flow` | ❌ DEPRECATED | Devuelve error                         |
| `search`     | ❌ DEPRECATED | Devuelve error                         |
| `removed`    | ❌ DEPRECATED | Devuelve error                         |

**Parámetros:** `queryType` (req), `symbolName`, `filePath`, `options`  
`details` requiere `filePath` + `symbolName`. `options.includeSemantic=true` agrega sharedState, events.

---

### 🌐 `traverse_graph` — Navegación del grafo

| `traverseType`          | Estado        | Cuándo usarlo                        |
|-------------------------|---------------|--------------------------------------|
| `impact_map`            | ✅ ACTIVO     | **Siempre antes de editar un archivo** |
| `call_graph`            | ✅ ACTIVO     | Ver árbol de dependencias (BFS/DFS)  |
| `analyze_change`        | ❌ DEPRECATED | Devuelve error                       |
| `simulate_data_journey` | ❌ DEPRECATED | Devuelve error                       |
| `trace_variable`        | ❌ DEPRECATED | Devuelve error                       |
| `trace_data_flow`       | ❌ DEPRECATED | Devuelve error                       |
| `explain_connection`    | ❌ DEPRECATED | Devuelve error                       |
| `signature_change`      | ❌ DEPRECATED | Devuelve error                       |

**Parámetros:** `traverseType` (req), `filePath` (req), `symbolName`, `variableName`, `options`  
`options.includeSemantic=true` enriquece los nodos del grafo con datos semánticos.

---

### 📊 `aggregate_metrics` — Métricas agrupadas

| `aggregationType`  | Estado    | Qué retorna                                      |
|--------------------|-----------|--------------------------------------------------|
| `health`           | ✅ ACTIVO | Fragilidad promedio, acoplamiento, cohesión       |
| `risk`             | ✅ ACTIVO | Archivos Critical/High/Medium/Low                |
| `modules`          | ✅ ACTIVO | Inventario de módulos                            |
| `molecule`         | ✅ ACTIVO | Átomos de un archivo + riesgo (requiere filePath)|
| `patterns`         | ✅ ACTIVO | Patrones de eventos y conexiones semánticas       |
| `race_conditions`  | ✅ ACTIVO | Race conditions async                            |
| `async_analysis`   | ✅ ACTIVO | Funciones async: red, error handling, CC         |
| `risk`             | ✅ ACTIVO | Ranking de riesgo por archivo                   |
| `society`          | ✅ ACTIVO | Clústeres funcionales cohesivos                 |
| `duplicates`       | ✅ ACTIVO | **Clones estructurales por ADN** en el proyecto  |
| `pipeline_health`  | ✅ ACTIVO | Estado del pipeline de analysis interno          |

**Parámetros:** `aggregationType` (req), `filePath`, `options` (limit, offset, minSeverity, etc.)

---

### ✍️ Edición segura

| Tool                     | Parámetros req           | Qué hace                                        |
|--------------------------|--------------------------|--------------------------------------------------|
| `atomic_edit`            | `filePath, oldString, newString` | Edición con validación de sintaxis + vibraciones |
| `atomic_write`           | `filePath, content`      | Crea archivo con validación antes de escribir    |
| `move_file`              | `oldPath, newPath`       | Mueve archivo actualizando todos sus imports     |
| `fix_imports`            | `filePath`               | Repara imports rotos (execute: false = preview)  |

---

### 🔬 Análisis y mejoras

| Tool                          | Parámetros principales             | Qué hace                                      |
|-------------------------------|-------------------------------------|-----------------------------------------------|
| `suggest_refactoring`         | `filePath?`, `severity`, `limit`   | Sugerencias priorizadas por grafo (CC, loops, cohesión) |
| `detect_performance_hotspots` | `filePath?`, `minRisk`, `limit`    | Detecta O(n^2), I/O bloqueante, memory risks  |
| `execute_solid_split`         | `filePath`, `symbolName`, `execute`| Divide god-function (execute: false = preview) |
| `generate_tests`              | `filePath`, `functionName?`, `action` | Analiza (`analyze`) o genera (`generate`) tests |
| `generate_batch_tests`        | `limit`, `minComplexity`, `sortBy`, `dryRun` | Tests en lote para funciones sin cobertura |
| `validate_imports`            | `filePath?`, `checkBroken`, `checkCircular` | Verifica imports rotos/circulares/no-usados |
| `get_schema`                  | `type` (atoms/database/registry)   | Schema de átomos o estado del SQLite          |

---

### 🛠️ Admin y debug

| Tool                | Cuándo usar                                              |
|---------------------|----------------------------------------------------------|
| `get_server_status` | Verificar salud del servidor antes de trabajar          |
| `get_recent_errors` | **SIEMPRE después de editar.** Warnings del watcher automáticos en `_recentErrors` |
| `restart_server`    | `clearCacheOnly: true` (rápido) / `clearCache+reanalyze: true` (full wipe) |

> 💡 **Nota sobre `_recentErrors`:** El servidor inyecta automáticamente los warnings/errors del logger en el response de **CUALQUIER tool** bajo la clave `_recentErrors`. No hace falta llamar `get_recent_errors()` explícitamente si ya planeabas llamar otra tool — los errores aparecerán ahí igualmente.

---

## Flujos Obligatorios

### 🆕 Crear código nuevo — Protocolo Anti Visión de Túnel

```js
// 1. ¿Ya existe? (incluye dead code con isDeadCode: true)
query_graph({ queryType: "instances", symbolName: "miNuevaFuncion" })

// 2. ¿Hay clones de ADN en el proyecto?
aggregate_metrics({ aggregationType: "duplicates" })

// 3. Crear con validación
atomic_write({ filePath, content })

// 4. Alertas post-creación (o revisar _recentErrors del paso anterior)
get_recent_errors()
```

### ✏️ Editar código existente

```js
traverse_graph({ traverseType: "impact_map", filePath: "src/file.js" })
validate_imports({ filePath: "src/file.js", checkBroken: true })
atomic_edit({ filePath, oldString, newString })
// _recentErrors vendrá incluido en la respuesta de atomic_edit si hay algo
```

### 🐛 Debuggear un bug

```js
query_graph({ queryType: "instances", symbolName: "buggyFunc" })
query_graph({ queryType: "details", filePath, symbolName: "buggyFunc" })
traverse_graph({ traverseType: "call_graph", filePath, options: { depth: 2 } })
atomic_edit({ filePath, oldString: buggyCode, newString: fixedCode })
```

### ♻️ Refactorizar complejidad alta

```js
suggest_refactoring({ severity: "high" })
detect_performance_hotspots({ minRisk: 30 })
execute_solid_split({ filePath, symbolName: "godFunction", execute: false }) // preview
execute_solid_split({ filePath, symbolName: "godFunction", execute: true })  // aplicar
```

---

## ❌ Anti-Patrones

- Usar `traverse_graph` con `traverseType` deprecated → devuelve error, pierde tiempo
- Crear código sin `query_graph(instances)` primero → riesgo de duplicar dead code
- Editar sin `traverse_graph(impact_map)` → cambios silenciosos que rompen dependencias
- Omitir verificar `_recentErrors` → se pierden warnings del file watcher

---

## Convenciones del Proyecto

| Parámetro             | Límite                      |
|-----------------------|-----------------------------|
| Max CC por función    | ≤ 15 (óptimo ≤ 10)        |
| Max líneas por función| ≤ 250                       |
| Cobertura de tests    | > 80%                       |
| Bulk save SQLite      | Máx 50 átomos por batch     |
| Lenguajes soportados  | JS/TS (Python en roadmap)   |
