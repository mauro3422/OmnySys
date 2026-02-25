# OmnySys — Motor de Contexto de Código

> **Previene la visión de túnel al editar código.**  
> Analiza el impacto completo antes de cualquier cambio y lo expone a tu IA vía MCP.

---

## ¿Qué es OmnySys?

Las IAs sufren **visión de túnel**: editan un archivo sin saber qué rompen en el resto del sistema.

OmnySys resuelve esto construyendo un **mapa completo del codebase** (grafo de dependencias, funciones, flujo de datos) y exponiéndolo como **28 herramientas MCP** que cualquier IA puede usar antes de tocar código.

```
"Voy a modificar orchestrator.js"

IA usa: get_impact_map("src/core/orchestrator.js")

Resultado:
  ✅ Afecta directamente: 2 archivos
  ⚠️  Afecta transitivamente: 6 archivos
  📊 Total: 8 archivos  |  🟡 Riesgo: MEDIO

IA edita considerando TODO el impacto.
```

---

## Instalación Rápida

```bash
git clone https://github.com/mauro3422/OmnySys.git
cd OmnySys && npm install
npm run mcp /ruta/a/tu/proyecto
```

### Integración con Claude Desktop

```json
{
  "mcpServers": {
    "omnysys": {
      "command": "node",
      "args": ["/ruta/a/OmnySys/src/layer-c-memory/mcp-server.js", "/ruta/a/tu/proyecto"]
    }
  }
}
```

### Integración con OpenCode

Ver `opencode.json` en la raíz — ya está configurado para uso local.

---

## Las 28 Herramientas MCP

### Impacto y Análisis de Cambios
| Herramienta | Qué hace | Cuándo usar |
|-------------|----------|-------------|
| `get_impact_map(file)` | Archivos afectados por un cambio | Antes de editar cualquier archivo |
| `analyze_change(file, symbol)` | Impacto de cambiar un símbolo | Evaluando riesgo |
| `trace_variable_impact(file, fn, var)` | Propagación de variable (PageRank) | Cambiando estructuras de datos |
| `trace_data_journey(file, fn, var)` | Flujo de datos de variable específica | Auditar seguridad de datos |
| `explain_connection(a, b)` | Por qué dos archivos están conectados | Entendiendo arquitectura |
| `analyze_signature_change(...)` | Breaking changes de firma | Cambiando APIs |

### Análisis de Código
| Herramienta | Qué hace | Cuándo usar |
|-------------|----------|-------------|
| `get_call_graph(file, symbol)` | Quién llama a esta función | Refactorizando código |
| `explain_value_flow(...)` | Inputs → proceso → outputs | Data pipelines |
| `get_function_details(file, fn)` | Metadata completa de función | Análisis detallado |
| `get_molecule_summary(file)` | Resumen de archivo con insights | Vista completa de archivo |
| `find_symbol_instances(symbol)` | Encuentra todas las instancias de un símbolo | Debugging |

### Métricas y Salud
| Herramienta | Qué hace | Cuándo usar |
|-------------|----------|-------------|
| `get_risk_assessment()` | Riesgos de todo el proyecto | Priorizando trabajo |
| `get_health_metrics()` | Métricas de salud del código | Auditar calidad |
| `detect_patterns(type)` | Duplicados, god functions, dead code | Optimizando codebase |
| `get_async_analysis()` | Análisis async con recommendations | Optimizando performance |
| `detect_race_conditions()` | Detecta race conditions en async | Seguridad concurrente |

### Sociedad de Átomos
| Herramienta | Qué hace | Cuándo usar |
|-------------|----------|-------------|
| `get_atom_society()` | Chains, clusters, hubs, orphans | Entendiendo estructura |
| `get_atom_history(file, fn)` | Historial Git de función | Debugging cambios |
| `get_removed_atoms()` | Átomos eliminados del código | Prevención de duplicados |

### Búsqueda y Sistema
| Herramienta | Qué hace | Cuándo usar |
|-------------|----------|-------------|
| `search_files(pattern)` | Buscar archivos por patrón | Navegando codebase |
| `get_server_status()` | Estado del sistema | Diagnóstico |
| `restart_server()` | Reinicia servidor y recarga datos | Después de cambios en código |
| `get_atom_schema(type)` | Schema de metadatos de átomos | Debugging |

### Editor Atómico
| Herramienta | Qué hace | Cuándo usar |
|-------------|----------|-------------|
| `atomic_edit(file, old, new)` | Edición con validación sintáctica | Editar código seguro |
| `atomic_write(file, content)` | Escritura con indexación automática | Crear archivos nuevos |

### Refactoring y Validación
| Herramienta | Qué hace | Cuándo usar |
|-------------|----------|-------------|
| `suggest_refactoring(file)` | Sugiere mejoras específicas de código | Antes de refactorizar |
| `validate_imports(file)` | Detecta imports rotos/no usados | Limpiar código |

### Testing
| Herramienta | Qué hace | Cuándo usar |
|-------------|----------|-------------|
| `generate_tests(file, fn)` | Genera tests para una función | Aumentar cobertura |
| `generate_batch_tests()` | Genera tests en batch | Cobertura masiva |

---

## Arquitectura

OmnySys tiene **5 capas** que trabajan juntas:

```
┌─────────────────────────────────────────────────────────────┐
│                  Tu IA (Claude / OpenCode)                  │
└────────────────────────┬────────────────────────────────────┘
                         │ MCP Protocol (stdio)
                         ▼
┌─────────────────────────────────────────────────────────────┐
│              Layer C — Memory / MCP Server                  │
│   14 herramientas MCP  │  Cache  │  WebSocket  │  Watcher  │
└────────────────────────┬────────────────────────────────────┘
                         │
        ┌────────────────┼─────────────────┐
        ▼                ▼                 ▼
┌──────────────┐  ┌─────────────┐  ┌──────────────┐
│  Layer A     │  │  Layer B    │  │  Layer Graph │
│  (Static)    │  │  (Semantic) │  │  (Graph)     │
│              │  │             │  │              │
│ AST Parser   │  │ Archetypes  │  │ SystemMap    │
│ Extractors   │  │ LLM (opt.)  │  │ ImpactMap    │
│ Analyses     │  │ Validators  │  │ CallGraph    │
│ Race Detect  │  │ Metadata    │  │ Cycles       │
└──────────────┘  └─────────────┘  └──────────────┘
        │                                  │
        └──────────────┬───────────────────┘
                       ▼
┌─────────────────────────────────────────────────────────────┐
│                       Core                                  │
│   Cache  │  Orchestrator  │  Worker  │  ErrorGuardian       │
│   FileWatcher  │  BatchProcessor  │  UnifiedServer          │
└─────────────────────────────────────────────────────────────┘
```

### Responsabilidades por Capa

| Capa | Responsabilidad | Sin LLM |
|------|----------------|---------|
| **Layer A** | Análisis estático: AST, imports, exports, funciones, race conditions | ✅ Siempre |
| **Layer B** | Análisis semántico: arquetipos, validación, enriquecimiento | ✅ 90% casos |
| **Layer Graph** | Grafo de dependencias: SystemMap, ImpactMap, ciclos, transitivas | ✅ Siempre |
| **Layer C** | Servidor MCP, caché, WebSocket, exposición de herramientas | ✅ Siempre |
| **Core** | Infraestructura: caché RAM, orquestador, workers, error guardian | ✅ Siempre |

---

## Comandos

```bash
# Iniciar MCP server (uso principal)
npm run mcp /ruta/al/proyecto

# CLI de administración
npm start          # Inicia servicios
npm stop           # Detiene todo
npm status         # Estado de servicios

# Tests
npm test                          # Todos los tests (283 archivos, ~4000 tests)
npm run test:layer-a:core         # Solo Layer A
npm run test:layer-b              # Solo Layer B
npm run test:layer-c              # Solo Layer C

# Diagnóstico
npm run validate                  # Valida sintaxis de todos los archivos
node scripts/detect-broken-imports.js  # Detecta imports rotos
```

---

## Estado del Proyecto

**Versión**: v0.9.60  
**Estado**: ✅ **Estable — 28 Tools MCP + SQLite (Determinístico) + Startup 1.5s + Auto Error Notifications**

### Sistema de Semantic Algebra (Implementado)

OmnySys usa **álgebra determinística sobre grafos** para análisis de código:

| Componente | Implementación |
|------------|----------------|
| Storage | SQLite con WAL mode (ACID) |
| Vectores | 7 scores por átomo (importance, cohesion, coupling, etc.) |
| Propagation | PageRank-like determinístico |
| Queries | Mismo input → Mismo output (100% determinístico) |

```
┌─────────────────────────────────────────────────────────────┐
│  ÁTOMO → VECTOR → PROPAGACIÓN → IMPACT ANALYSIS           │
│                                                             │
│  importance_score  ← PageRank-like (0-1)                   │
│  cohesion_score   ← Conexiones internas (0-1)              │
│  coupling_score   ← Acoplamiento externo (0-1)             │
│  propagation_score ← Impacto de cambios (0-1)             │
│  centrality_score ← Hub/Bridge/Leaf classification        │
└─────────────────────────────────────────────────────────────┘
```

| Componente | Estado | Cobertura Tests |
|------------|--------|----------------|
| Layer A — Análisis Estático | ✅ Funcional | ~40% |
| Layer B — Análisis Semántico | ✅ Funcional | ~60% |
| Layer C — MCP Server | ✅ **28 Tools** | ~30% |
| Layer Graph — Grafo | ✅ **SQLite + Vectores** | ~50% |
| Core — Infraestructura | ✅ Funcional | ~40% |
| **SQLite Database** | ✅ **Production - Determinístico** | ~35% |
| **Semantic Algebra** | ✅ **Implementado (v0.9.58+)** | — |
| **Tests totales** | ✅ **Pasando** | **~4,500+ tests** |

### Novedades v0.9.60

| Feature | Descripción |
|---------|-------------|
| **Semantic Algebra** | 7 vectores por átomo (importance, cohesion, coupling, stability, propagation, fragility, testability) |
| **Deterministic Queries** | Mismo input → Mismo output (100% determinístico) |
| **Startup Speed** | 25s → 1.5s (SQLite check optimization) |
| **Error Notifications** | `_recentErrors` automático en todas las tools |
| **Health Metrics** | Tests excluded from unhealthy count |
| **Deleted Files** | Skip shadow creation for already-deleted files |
| **SQLite Database** | Base de datos SQLite con WAL mode, mejor performance |
| **Bulk Operations** | Inserciones masivas en single-transaction (64% más rápido) |
| **Atomic Editor** | `atomic_edit` y `atomic_write` con validación sintáctica |

---

## Documentación

```
docs/
├── 01-core/              🎯 Principios fundamentales
├── 02-architecture/      🏗️ Sistemas técnicos
├── 03-orchestrator/      ⚙️ Flujo de datos
└── 04-guides/            🛠️ Guías prácticas
```

- **[ARCHITECTURE.md](ARCHITECTURE.md)** — Mapa técnico de todas las capas
- **[ROADMAP.md](ROADMAP.md)** — Estado actual y próximos pasos
- **[PLAN_ESTABILIZACION.md](PLAN_ESTABILIZACION.md)** — Plan activo de estabilización
- **[LAYER_A_STATUS.md](LAYER_A_STATUS.md)** — Estado detallado de Layer A y sus tests
- **[CHANGELOG.md](CHANGELOG.md)** — Historial de versiones
- **[docs/INDEX.md](docs/INDEX.md)** — Índice completo de documentación

---

## Licencia

MIT — Ver [LICENSE](LICENSE)

---

*OmnySys — Del código al conocimiento. Una herramienta a la vez, previene la visión de túnel.*
