# OmnySys — Motor de Contexto de Código

> **Previene la visión de túnel al editar código.**  
> Analiza el impacto completo antes de cualquier cambio y lo expone a tu IA vía MCP.

**Versión**: v0.9.61  
**Estado**: ✅ **100% Estático, 0% LLM** - Dead Code Detection 85% preciso  
**Última actualización**: 2026-02-25

---

## ¿Qué es OmnySys?

Las IAs sufren **visión de túnel**: editan un archivo sin saber qué rompen en el resto del sistema.

OmnySys resuelve esto construyendo un **mapa completo del codebase** (grafo de dependencias, funciones, flujo de datos) y exponiéndolo como **29 herramientas MCP** que cualquier IA puede usar antes de tocar código.

**IMPORTANTE (v0.9.61)**: Todo el análisis es **100% ESTÁTICO, 0% LLM**. No usamos inteligencia artificial para extraer metadata, solo AST + regex + álgebra de grafos.

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
npm start
```

### Integración con tu IDE

**Para Qwen Code / Claude Code / OpenCode:**

Crear `.mcp.json` en tu proyecto:
```json
{
  "mcpServers": {
    "omnysys": {
      "type": "http",
      "url": "http://127.0.0.1:9999/mcp"
    }
  }
}
```

Luego en tu IDE:
```
> Analiza el impacto de cambiar src/app.js
> ¿Qué funciones llaman a processOrder?
> Detecta código muerto en este archivo
```

---

## Las 29 Herramientas MCP

### Impacto y Análisis de Cambios (6 tools)
| Herramienta | Qué hace | Cuándo usar |
|-------------|----------|-------------|
| `get_impact_map(file)` | Archivos afectados por un cambio | Antes de editar cualquier archivo |
| `analyze_change(file, symbol)` | Impacto de cambiar un símbolo | Evaluando riesgo |
| `trace_variable_impact(file, fn, var)` | Propagación de variable (PageRank) | Cambiando estructuras de datos |
| `trace_data_journey(file, fn, var)` | Flujo de datos de variable específica | Auditar seguridad de datos |
| `explain_connection(a, b)` | Por qué dos archivos están conectados | Entendiendo arquitectura |
| `analyze_signature_change(...)` | Breaking changes de firma | Cambiando APIs |

### Análisis de Código (5 tools)
| Herramienta | Qué hace | Cuándo usar |
|-------------|----------|-------------|
| `get_call_graph(file, symbol)` | Quién llama a esta función | Refactorizando código |
| `explain_value_flow(...)` | Inputs → proceso → outputs | Data pipelines |
| `get_function_details(file, fn)` | Metadata completa de función | Análisis detallado |
| `get_molecule_summary(file)` | Resumen de archivo con insights | Vista completa de archivo |
| `find_symbol_instances(symbol)` | Encuentra todas las instancias de un símbolo | Debugging |

### Métricas y Salud (5 tools)
| Herramienta | Qué hace | Cuándo usar |
|-------------|----------|-------------|
| `get_risk_assessment()` | Riesgos de todo el proyecto | Priorizando trabajo |
| `get_health_metrics()` | Métricas de salud del código | Auditar calidad |
| `detect_patterns(type)` | Duplicados, god functions, dead code | Optimizando codebase |
| `get_async_analysis()` | Análisis async con recommendations | Optimizando performance |
| `detect_race_conditions()` | Detecta race conditions en async | Seguridad concurrente |

### Sociedad de Átomos (3 tools)
| Herramienta | Qué hace | Cuándo usar |
|-------------|----------|-------------|
| `get_atom_society()` | Chains, clusters, hubs, orphans | Entendiendo estructura |
| `get_atom_history(file, fn)` | Historial Git de función | Debugging cambios |
| `get_removed_atoms()` | Átomos eliminados del código | Prevención de duplicados |

### Búsqueda y Sistema (4 tools)
| Herramienta | Qué hace | Cuándo usar |
|-------------|----------|-------------|
| `search_files(pattern)` | Buscar archivos por patrón | Navegando codebase |
| `get_server_status()` | Estado del sistema | Diagnóstico |
| `restart_server()` | Reinicia servidor y recarga datos | Después de cambios en código |
| `get_atom_schema(type)` | Schema de metadatos de átomos | Debugging |

### Editor Atómico (2 tools)
| Herramienta | Qué hace | Cuándo usar |
|-------------|----------|-------------|
| `atomic_edit(file, old, new)` | Edita con validación atómica | Editando código |
| `atomic_write(file, content)` | Escribe archivo con validación | Creando archivos |

### Refactoring y Validación (2 tools)
| Herramienta | Qué hace | Cuándo usar |
|-------------|----------|-------------|
| `suggest_refactoring(file)` | Sugiere mejoras de código | Refactorizando |
| `validate_imports(file)` | Valida imports del archivo | Prevención de errores |

### Testing (2 tools)
| Herramienta | Qué hace | Cuándo usar |
|-------------|----------|-------------|
| `generate_tests(file, fn)` | Genera tests para función | Mejorando coverage |
| `generate_batch_tests(...)` | Genera tests en batch | Testing masivo |

**Ver documentación completa**: [docs/04-guides/tools.md](docs/04-guides/tools.md)

---

## Estado del Sistema (v0.9.61)

```
┌─────────────────────────────────────────────────────────────┐
│  OMNYSYS v0.9.61 — Estado del Sistema                     │
├─────────────────────────────────────────────────────────────┤
│  Átomos:         13,485 funciones analizadas              │
│  Archivos:       1,860                                    │
│  Health Score:   99/100 (Grade A)                        │
│  Test Coverage:  79%                                      │
│  God Functions:  193 (complejidad > 15)                  │
│  Dead Code:      42 casos (85% menos falsos positivos)   │
│  Duplicados:     118 exactos, 694 contextuales           │
│  Debt Arch:      15 archivos críticos                    │
│  Storage:        SQLite (WAL mode)                        │
│  MCP Tools:      29 herramientas                          │
│  LLM Usage:      0% - 100% ESTÁTICO                      │
└─────────────────────────────────────────────────────────────┘
```

---

## Arquitectura

### Capas del Sistema

```
src/
├── layer-a-static/     # Análisis estático puro (AST + regex)
├── layer-b-semantic/   # Metadata enrichment (100% estático)
├── layer-graph/        # Sistema de grafos de dependencias
├── layer-c-memory/     # MCP Server, SQLite, exposición
├── core/               # Core: FileWatcher, Orchestrator
└── cli/                # CLI de administración
```

**Ver arquitectura completa**: [docs/02-architecture/core.md](docs/02-architecture/core.md)

---

## Comandos Útiles

```bash
# Iniciar servidor
npm start

# Analizar proyecto
npm run analyze

# Ver status
npm run status

# Reiniciar servidor
npm run restart

# Limpiar y reanalizar
npm run clean && npm run analyze

# Ejecutar tests
npm test

# Ver coverage
npm run coverage
```

---

## Documentación

### Guías Principales

- **[Quick Start](docs/04-guides/quickstart.md)** - Empezar en 5 minutos
- **[MCP Tools](docs/04-guides/tools.md)** - Guía de las 29 herramientas
- **[INDEX](docs/INDEX.md)** - Índice completo de documentación

### Fundamentos

- **[Problem](docs/01-core/problem.md)** - Visión de túnel en IAs
- **[Principles](docs/01-core/principles.md)** - Los 4 Pilares
- **[Philosophy](docs/01-core/philosophy.md)** - Física del software

### Arquitectura

- **[Core](docs/02-architecture/core.md)** - Arquitectura unificada
- **[Data Flow](docs/02-architecture/DATA_FLOW.md)** - Flujo de datos detallado
- **[Code Physics](docs/02-architecture/code-physics.md)** - Vectores matemáticos

### Referencia

- **[System Status](docs/06-reference/SYSTEM_STATUS.md)** - Estado actual
- **[Cleanup Plan](docs/06-reference/CLEANUP_PLAN.md)** - Refactorizaciones
- **[Issues](docs/04-maintenance/ISSUES_AND_IMPROVEMENTS.md)** - Issues conocidos

---

## Roadmap

### Q2 2026 - Tree-sitter Migration

- Reemplazar Babel con Tree-sitter
- Mejor detección de `isExported` para arrow functions
- Análisis de tipos TypeScript más preciso
- Performance mejorado en proyectos grandes
- Soporte para más lenguajes (Rust, Go, Python)

### Q3 2026 - Intra-Atómico

- Dentro de cada transformación, ver los **sub-átomos**
- Detectar precision loss en cálculos financieros
- Optimizar transformaciones innecesarias

### Q4 2026 - Estado Cuántico

- Simular **todos los paths posibles** (if/else, try/catch)
- Generar test cases automáticamente
- Detectar paths no cubiertos por tests

---

## Contribuir

1. Fork del repositorio
2. Crear branch para feature (`git checkout -b feature/amazing-feature`)
3. Commit de cambios (`git commit -m 'Add amazing feature'`)
4. Push a la branch (`git push origin feature/amazing-feature`)
5. Abrir Pull Request

---

## Licencia

MIT License - ver [LICENSE](LICENSE) para detalles.

---

**Última actualización**: 2026-02-25 (v0.9.61)  
**Estado**: ✅ **100% Estático, 0% LLM**  
**Próximo**: 🚧 Migración a Tree-sitter (Q2 2026)
