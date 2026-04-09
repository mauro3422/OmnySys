# OmnySys — Referencia Rápida

> Cheat sheet para agentes IA trabajando con OmnySys. Actualizado abril 2026 (v0.9.434).

---

## 🚀 Start / Stop

```bash
npm start            # Inicia MCP en http://127.0.0.1:9999/mcp
npm stop             # Detiene
npm status           # Estado del servidor
npm tools            # Lista las 45 herramientas
```

---

## 🔧 Workflow Mínimo del Agente

```
ANTES de crear  →  query_graph({ queryType: "instances", symbolName: "X" })
ANTES de editar →  traverse_graph({ traverseType: "impact_map", filePath: "src/X" })
DESPUÉS de editar →  get_recent_errors()   (o mira _recentErrors en cualquier respuesta)
```

---

## 📦 Las 45 Herramientas MCP

### Query (6) — Leer el grafo
| Tool | Para qué |
|------|----------|
| `query_graph` | Buscar instancias, detalles, historia de un símbolo |
| `traverse_graph` | Impact map (qué se rompe) / Call graph (quién llama a quién) |
| `impact_atomic` | Simular impacto antes de modificar |
| `aggregate_metrics` | Health, risk, duplicates, society, pipeline health |
| `get_atom_history` | Historial Git de un símbolo |
| `get_atom_evolution_report` | Reporte completo: DNA + dataFlow + impacto + Git |

### Action (21) — Modificar código de forma segura
| Tool | Para qué |
|------|----------|
| `atomic_edit` | Editar con validación + propagación (USAR SIEMPRE en vez de edit normal) |
| `atomic_write` | Crear archivo nuevo con validación |
| `safe_edit` | Editar por línea/patrón con contexto automático |
| `move_file` | Mover archivo + actualizar TODOS los imports |
| `folderize_family` | Mover familia cohesiva a carpeta |
| `rename_folderized_family` | Renombrar dentro de familia folderizada |
| `fix_imports` | Reparar imports rotos |
| `execute_solid_split` | Dividir función compleja (SOLID) |
| `split_large_file` | Dividir archivos >300 líneas |
| `suggest_refactoring` | Sugerencias de refactoring |
| `suggest_architecture` | Reagrupar archivos DDD |
| `validate_imports` | Verificar imports |
| `validate_exports` | Verificar exports |
| `generate_tests` | Generar tests |
| `consolidate_conceptual_cluster` | Fusionar duplicados → SSOT |
| `consolidate_policy_drifts` | Reparar violaciones de contratos |
| `detect_folderization_opportunities` | Detectar oportunidades de folderización |

### Admin (18) — Diagnóstico y administración
| Tool | Para qué |
|------|----------|
| `get_health_panel` | Estado en una pantalla: score + trend + next action |
| `get_server_status` | Estado completo del servidor |
| `get_schema` | Schema de átomos o health de DB |
| `execute_sql` | SQL directo contra omnysys.db |
| `restart_server` | Reiniciar (processRestart, clearCacheOnly, reindexOnly, reanalyze) |
| `get_recent_errors` | Errores recientes del watcher/logger |
| `get_technical_debt_report` | Duplicados + huérfanos + score de deuda |
| `detect_performance_hotspots` | O(n²), blocking I/O, memory risks |
| `check_pipeline_integrity` | 8 checks del pipeline |
| `diagnose_tool_health` | Salud de las herramientas MCP |

---

## 🗄️ Bases de Datos

| DB | Tamaño | Qué tiene |
|----|--------|-----------|
| `omnysys.db` | 344 MB | Datos activos (14,241 átomos, 2,813 archivos, 11,202 relaciones) |
| `atom-history.db` | 384 MB | Historial de evolución de átomos (Git) |
| `health-history.db` | 20 MB | Snapshots de salud históricos |

**20 tablas · 0 schema drift · WAL mode**

---

## 🔄 Restart Server — Modos

```js
restart_server({ processRestart: true })   // Después de editar código (recomendado)
restart_server({ clearCacheOnly: true })   // Solo limpiar caché (más rápido)
restart_server({ reindexOnly: true })      // Forzar re-análisis Layer A
restart_server({ reanalyze: true })        // Reset destructivo (borra omnysys.db)
```

**Regla**: Editaste código → `processRestart: true`. El watcher reindexea solo.

---

## 📊 Estado del Sistema (Abril 2026)

| Métrica | Valor |
|---------|-------|
| Health Score | 62/100 (D-) |
| Database Health | 76/100 (C+) |
| Trust/Reliability | 44/100 (F) |
| Control Plane | BLOCKED (136 policy drifts) |
| Duplicados estructurales | 5 grupos |
| Hotspots CC > 30 | 15 funciones |
| Naming debt | 1,871 renombres |
| Metadata coverage | 84% |

---

## 🚫 Anti-Patrones Comunes

| Error | Qué pasa | Correcto |
|-------|----------|----------|
| Matar node manualmente | Rompe sesión MCP | `restart_server({ processRestart: true })` |
| `query_graph(details)` sin `filePath` | Error MISSING_PARAMS | Pasar ambos: symbolName + filePath |
| No revisar `_recentErrors` | Te pierdes warnings del watcher | Siempre mirar _recentErrors en respuestas |
| Editar sin verificar impacto | Rompes callers sin saber | `traverse_graph({ traverseType: "impact_map" })` primero |
| Asumir columnas de DB | "no such column" error | Usar `get_schema({ type: "database" })` primero |
| `safe_edit` sin lineNumber o pattern | Fallo | Usar uno de los dos (oneOf constraint) |

---

## 📁 Estructura de Carpetas

```
src/
├── layer-a-static/     → Análisis estático (Tree-sitter, parser, pipeline)
├── layer-b-semantic/   → Enriquecimiento (DNA, arquetipos, societies)
├── layer-graph/        → Grafo de dependencias
├── layer-c-memory/     → SQLite + MCP (45 tools)
├── core/               → FileWatcher, Orchestrator, Unified Server
├── shared/compiler/    → 313 archivos de contratos del compilador
├── cli/                → CLI (omny.js)
└── shared/utils/       → Utilidades compartidas
```

---

## 🔑 Comandos CLI

```bash
omny up                # Inicia servidor
omny down              # Detiene
omny status            # Estado
omny tools             # Lista tools
omny call <tool>       # Ejecuta tool
omny setup             # Configura OpenCode/VSCode
omny help              # Ayuda
```

---

## 📐 Convenciones del Proyecto

| Parámetro | Límite |
|-----------|--------|
| Max CC por función | ≤ 15 (óptimo ≤ 10) |
| Max líneas por función | ≤ 250 |
| Test coverage | > 80% |
| SQLite bulk save | Max 50 átomos por batch |
| LLM en análisis | 0% (100% estático) |

---

## 🔗 Documentación

| Archivo | Qué tiene |
|---------|-----------|
| [ARCHITECTURE.md](ARCHITECTURE.md) | Arquitectura técnica completa |
| [README.md](README.md) | Visión general y quick start |
| [ROADMAP.md](ROADMAP.md) | Plan de desarrollo |
| [AGENTS.md](AGENTS.md) | Referencia de herramientas + anti-patrones |
| [BACKLOG.md](BACKLOG.md) | Bugs abiertos y notas operativas |
| [CHANGELOG.md](CHANGELOG.md) | Historial de cambios (861 líneas) |
