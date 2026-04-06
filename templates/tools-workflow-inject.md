<!-- OMNYSYS TOOLS WORKFLOW — Auto-injected by OmnySys installer -->

## 📋 OmnySys Tools — Guía de uso rápido

> **Regla de oro:** ANTES de crear → verificar que no exista. ANTES de editar → verificar impacto. DESPUÉS de editar → verificar errores.

### Flujo obligatorio para cualquier edición

```js
// 1. ANTES de crear código — verificar que no exista
query_graph({ queryType: "instances", symbolName: "miFuncion" })
// Si ya existe, úsala o refactorizala. No dupliques.

// 2. ANTES de editar un archivo — verificar qué se rompe
traverse_graph({ traverseType: "impact_map", filePath: "src/archivo.js" })
// Te dice qué archivos dependen de lo que vas a tocar.

// 3. DESPUÉS de editar — verificar que no rompiste nada
get_recent_errors()
// El watcher inyecta errores automáticamente, pero puedes verificar explícitamente.
```

### Flujo rápido por escenario

| Escenario | Tools a usar |
|-----------|-------------|
| **Crear función nueva** | `query_graph(instances)` → `aggregate_metrics(duplicates)` → `atomic_write` |
| **Editar función existente** | `traverse_graph(impact_map)` → `atomic_edit` → `get_recent_errors` |
| **Mover archivo** | `move_file` (actualiza imports automáticamente) |
| **Debuggear bug** | `query_graph(instances)` → `query_graph(details)` → `traverse_graph(call_graph)` → `atomic_edit` |
| **Refactorizar función compleja** | `detect_performance_hotspots` → `suggest_refactoring` → `execute_solid_split(execute: false)` → preview → `execute: true` |
| **Ver salud del sistema** | `get_health_panel` → `aggregate_metrics(storage_health)` |

### Tool reference rápida

#### Queries (inspeccionar código)
- **`query_graph`** — Inspeccionar símbolo: `queryType: "instances"` (buscar), `"details"` (metadata completa), `"history"` (commits git)
- **`traverse_graph`** — Navegar grafo: `traverseType: "impact_map"` (qué se rompe), `"call_graph"` (quién llama a quién)
- **`impact_atomic`** — Simular impacto antes de modificar: `intent: "usage"`
- **`aggregate_metrics`** — Métricas: `health`, `risk`, `duplicates`, `storage_health`, `pipeline_health`, `patterns`, `society`, etc.

#### Edición (modificar código)
- **`atomic_edit`** — Editar con validación: `filePath, oldString, newString`
- **`atomic_write`** — Crear archivo: `filePath, content`
- **`safe_edit`** — Editar por línea o patrón
- **`fix_imports`** — Reparar imports rotos
- **`move_file`** — Mover archivo + actualizar imports en todo el proyecto

#### Admin (gestión del sistema)
- **`get_server_status`** — Salud completa del servidor
- **`get_health_panel`** — Panel resumido con next action
- **`execute_sql`** — SQL directo contra la DB
- **`restart_server`** — `{ clearCacheOnly: true }` para recargar código sin reindex

### ⚠️ Anti-patrones comunes

| Qué NO hacer | Por qué | Qué hacer |
|--------------|---------|-----------|
| Crear sin `query_graph(instances)` | Duplicar código existente | Buscar primero |
| Editar sin `traverse_graph(impact_map)` | Romper dependencias | Ver impacto primero |
| Omitir `get_recent_errors()` | Perder warnings del watcher | Verificar después de editar |
| Matar procesos node manualmente | El restart_server ya maneja todo | Usar `restart_server({ clearCacheOnly: true })` |

### 💡 Tips

- `_recentErrors` viene **automáticamente** en la respuesta de CUALQUIER tool. No necesitas llamar `get_recent_errors()` si ya usaste otra tool.
- `list_tools({ includeSchemas: false })` — Ver todas las tools disponibles y sus descripciones.
- `aggregate_metrics({ aggregationType: "storage_health" })` — Verificar salud del storage (DB sizes, genealogía, duplicados).
- `get_schema({ type: "database" })` — Verificar que el schema de SQLite esté sano.

---
<!-- END OMNYSYS TOOLS WORKFLOW -->
