# OmnySystem — Reglas para el Agente AI

> Leído automáticamente en cada sesión.  
> ⚠️ Cada tool fue verificada **leyendo su código fuente** en `src/layer-c-memory/mcp/tools/`.

---

## REGLA DE ORO

```
ANTES de crear → query_graph(instances) — ¿ya existe?
ANTES de editar → traverse_graph(impact_map) — ¿qué se rompe?
SIEMPRE después de editar → verificar _recentErrors en la respuesta
```

---

## Catálogo de Tools (verificado desde el código fuente)

### 🔎 `query_graph`

| `queryType`  | Estado        | Cuándo usarlo                            |
|--------------|---------------|------------------------------------------|
| `instances`  | ✅ ACTIVO     | ¿Ya existe esta función en el proyecto? |
| `details`    | ✅ ACTIVO     | CC, riesgos, ADN + Phase 2 on-demand    |
| `history`    | ❌ DEPRECATED | Devuelve error DEPRECATED_ROUTING        |
| `value_flow` | ❌ DEPRECATED | Devuelve error DEPRECATED_ROUTING        |
| `search`     | ❌ DEPRECATED | Devuelve error DEPRECATED_ROUTING        |
| `removed`    | ❌ DEPRECATED | Devuelve error DEPRECATED_ROUTING        |

`details` requiere `filePath` + `symbolName`. `options.includeSemantic=true` agrega sharedState/events.

---

### 🌐 `traverse_graph`

| `traverseType`          | Estado        | Cuándo usarlo                        |
|-------------------------|---------------|--------------------------------------|
| `impact_map`            | ✅ ACTIVO     | **Siempre antes de editar**          |
| `call_graph`            | ✅ ACTIVO     | Ver árbol de dependencias BFS        |
| `analyze_change`        | ❌ DEPRECATED | Devuelve error DEPRECATED_ROUTING    |
| `simulate_data_journey` | ❌ DEPRECATED | Devuelve error DEPRECATED_ROUTING    |
| `trace_variable`        | ❌ DEPRECATED | Devuelve error DEPRECATED_ROUTING    |
| `trace_data_flow`       | ❌ DEPRECATED | Devuelve error DEPRECATED_ROUTING    |
| `explain_connection`    | ❌ DEPRECATED | Devuelve error DEPRECATED_ROUTING    |
| `signature_change`      | ❌ DEPRECATED | Devuelve error DEPRECATED_ROUTING    |

`filePath` es requerido. `options.includeSemantic=true` enriquece nodos con datos semánticos.

---

### 📊 `aggregate_metrics`

| `aggregationType` | Estado    | Qué retorna                                     |
|-------------------|-----------|-------------------------------------------------|
| `health`          | ✅ ACTIVO | Fragilidad, acoplamiento, cohesión del proyecto |
| `risk`            | ✅ ACTIVO | Archivos ordenados Critical/High/Medium/Low     |
| `modules`         | ✅ ACTIVO | Inventario de módulos y archivos                |
| `molecule`        | ✅ ACTIVO | Átomos de un archivo (requiere `filePath`)      |
| `patterns`        | ✅ ACTIVO | Patrones de eventos y conexiones semánticas      |
| `race_conditions` | ✅ ACTIVO | Race conditions async detectadas                |
| `async_analysis`  | ✅ ACTIVO | Análisis de funciones async del proyecto        |
| `society`         | ✅ ACTIVO | Clústeres de átomos cohesivos                   |
| `duplicates`      | ✅ ACTIVO | Clones estructurales por ADN en el proyecto     |
| `pipeline_health` | ✅ ACTIVO | Estado del pipeline de análisis interno         |

---

### ✍️ Edición segura

| Tool           | Parámetros req           | Qué hace                                     |
|----------------|--------------------------|----------------------------------------------|
| `atomic_edit`  | filePath, oldString, newString | Edición con validación + vibraciones  |
| `atomic_write` | filePath, content        | Crea archivo con validación previa           |
| `move_file`    | oldPath, newPath         | Mueve archivo actualizando todos sus imports |
| `fix_imports`  | filePath                 | Repara imports rotos (execute: false = preview) |

---

### 🔬 Análisis

| Tool                          | Parámetros clave                               |
|-------------------------------|------------------------------------------------|
| `suggest_refactoring`         | filePath?, severity (all/high/medium/low), limit |
| `detect_performance_hotspots` | filePath?, minRisk (0-100), limit              |
| `execute_solid_split`         | filePath, symbolName, **execute: false** primero |
| `generate_tests`              | filePath, action (analyze\|generate)           |
| `generate_batch_tests`        | sortBy (risk\|complexity\|fragility), dryRun   |
| `validate_imports`            | filePath?, checkBroken, checkCircular          |
| `get_schema`                  | type (atoms\|database\|registry)               |

---

### 🛠️ Admin

| Tool                | Parámetros                                               |
|---------------------|----------------------------------------------------------|
| `get_server_status` | ninguno                                                  |
| `get_recent_errors` | ninguno — también aparece como `_recentErrors` en cualquier otra tool |
| `restart_server`    | clearCacheOnly: true (rápido) / clearCache+reanalyze: true (full) |

---

## Protocolo Anti Visión de Túnel

Siempre antes de crear una función nueva:

```js
// 1. ¿Ya existe? (incluye dead code)
query_graph({ queryType: "instances", symbolName: "miNuevaFuncion" })

// 2. ¿Hay clones de ADN?
aggregate_metrics({ aggregationType: "duplicates" })

// 3. Si existe como dead code → proponer revivir, no reescribir
// 4. Si no existe → crear
atomic_write({ filePath, content })
```

---

## Anti-Patrones ❌

- Usar queryType/traverseType deprecated → devuelve error, perdés tiempo
- Crear código sin verificar `instances` primero → duplicación de dead code
- Editar sin `impact_map` → cambios que rompen dependencias silenciosamente
