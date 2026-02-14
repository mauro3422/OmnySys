# OmnySys - Code Context Engine

**Previene la visión de túnel al editar código.** Analiza impacto completo antes de cualquier cambio.

## 🚀 Instalación Plug & Play (2 comandos)

```bash
# 1. Clonar e instalar
git clone https://github.com/mauro3422/OmnySys.git
cd OmnySys && npm install

# 2. Iniciar todo automáticamente
npm run install:all
```

**¡Listo!** OmnySys ahora corre en background:
- 🧠 LLM Server: `http://localhost:8000`
- 🔌 MCP Server: `http://localhost:9999` (14 herramientas)

Tu IA (Claude, OpenCode, etc.) tiene acceso automático a las herramientas.

## 🎯 El Problema

Las IAs sufren **visión de túnel**: editan archivos sin ver dependencias ni conexiones.

**OmnySys soluciona esto** proporcionando:
- Mapas de impacto completos
- Quién llama a qué funciones
- Flujo de datos entre componentes
- Riesgos ocultos detectados

## 🛠️ Herramientas MCP (14 disponibles)

| Herramienta | Qué hace | Cuándo usar |
|-------------|----------|-------------|
| `get_impact_map(file)` | Archivos afectados por cambio | Antes de editar cualquier archivo |
| `get_call_graph(file, symbol)` | Quién llama a esta función | Refactorizando código |
| `analyze_change(file, symbol)` | Impacto de cambiar símbolo | Evaluando riesgo |
| `explain_connection(a, b)` | Por qué dos archivos están conectados | Entendiendo arquitectura |
| `analyze_signature_change(...)` | Breaking changes de firma | Cambiando APIs |
| `explain_value_flow(...)` | Inputs → proceso → outputs | Data pipelines |
| `get_risk_assessment()` | Riesgos de todo el proyecto | Priorizando trabajo |
| `search_files(pattern)` | Buscar archivos | Navegando codebase |
| `get_server_status()` | Estado del sistema | Diagnóstico |
| `get_function_details(file, fn)` | Metadata atómica de función | Análisis función por función |
| `get_molecule_summary(file)` | Resumen molecular de archivo | Vista completa de archivo |
| `get_atomic_functions(file)` | Lista funciones de un archivo | Navegación atómica |
| `restart_server()` | Reinicia servidor y recarga datos | Después de cambios en código |
| `get_tunnel_vision_stats()` | Estadísticas de detección de visión túnel | Diagnóstico de análisis |

## 📖 Ejemplo Real

```
Usuario: "Voy a modificar orchestrator.js"

IA usa: get_impact_map("src/core/orchestrator.js")

Resultado:
  ✅ Afecta directamente: 2 archivos
     - src/cli/commands/consolidate.js
     - src/layer-c-memory/mcp/core/server-class.js
  
  ⚠️  Afecta transitivamente: 6 archivos
     - src/cli/index.js
     - src/layer-c-memory/mcp-server.js
     - ...
  
  📊 Total: 8 archivos
  🟡 Riesgo: MEDIO

IA edita considerando todo el impacto.
```

## 🎮 Comandos CLI

```bash
# Control
npm start          # Inicia LLM + MCP
npm stop           # Detiene todo
npm status         # Estado de servicios

# Herramientas
npm tools          # Lista herramientas disponibles
npm run call -- get_impact_map '{"filePath": "src/test.js"}'

# Análisis
npm run analyze    # Analizar proyecto completo
```

## 📚 Documentación

La documentación está organizada en 4 niveles:

```
docs/
├── 01-core/              🎯 Fundamentos (empezar aquí)
├── 02-architecture/      🏗️ Sistemas técnicos
├── 03-orchestrator/      ⚙️ Flujo de datos
└── 04-guides/            🛠️ Guías prácticas
```

### Para Empezar
| Documento | Descripción |
|-----------|-------------|
| **[docs/01-core/principles.md](docs/01-core/principles.md)** | **🎯 Los 4 Pilares** (Box Test, Metadata Insights, Atomic Composition, Fractal Architecture) |
| **[docs/01-core/philosophy.md](docs/01-core/philosophy.md)** | **🧠 Física del Software + Omnisciencia** - La visión completa |
| **[docs/04-guides/quickstart.md](docs/04-guides/quickstart.md)** | **⚡ Empezar en 5 minutos** |

### Referencia Técnica
| Documento | Descripción |
|-----------|-------------|
| [docs/02-architecture/](docs/02-architecture/) | Data Flow, Arquetipos, Shadow Registry, Ecosistema |
| [docs/03-orchestrator/](docs/03-orchestrator/) | Flujo de vida de archivos, Caché, Troubleshooting |
| [docs/04-guides/tools.md](docs/04-guides/tools.md) | Las 14 herramientas MCP |
| [docs/INDEX.md](docs/INDEX.md) | **📖 Índice completo** - Mapa de toda la documentación |

### Arquitectura General
| Documento | Descripción |
|-----------|-------------|
| [ARCHITECTURE.md](ARCHITECTURE.md) | Arquitectura técnica de 3 capas |
| [docs/ARCHITECTURE_MOLECULAR_PLAN.md](docs/ARCHITECTURE_MOLECULAR_PLAN.md) | Plan de análisis atómico |
| [docs/METADATA-INSIGHTS-GUIDE.md](docs/METADATA-INSIGHTS-GUIDE.md) | Combinación de metadatos para patrones |

## 🏗️ Arquitectura

```
┌─────────────────────────────────────────────────────┐
│                    Tu IA (Claude/OpenCode)         │
└──────────────┬──────────────────────────────────────┘
               │ HTTP (localhost:9999)
               ▼
┌─────────────────────────────────────────────────────┐
│              OmnySys MCP Server                      │
│  ┌─────────────────┐  ┌──────────────────────────┐ │
│  │ 14 Tools MCP    │  │ Layer A: Static Analysis │ │
│  │ • Impact Map    │  │ Layer B: Semantic        │ │
│  │ • Call Graph    │  │ Layer C: Memory          │ │
│  │ • Atomic View   │  │ Data Flow v2 (graph)     │ │
│  │ • Data Flow v2  │  └──────────────────────────┘ │
│  └─────────────────┘                                  │
└──────────────┬──────────────────────────────────────┘
               │
               ▼
┌─────────────────────────────────────────────────────┐
│  LLM Server (localhost:8000)                        │
│  Modelo: LFM2.5-Instruct                            │
└─────────────────────────────────────────────────────┘
```

## ✅ Estado del Proyecto

**Versión**: v0.9.4

| Componente | Estado |
|------------|--------|
| MCP Server HTTP | ✅ Production Ready |
| 14 Tools MCP | ✅ 100% Funcionales |
| Modular Architecture | ✅ 204 Modules (v0.9.4) |
| Data Flow v2 (graph-based) | ✅ Fase 1 Completa |
| LLM Integration | ✅ GPU Optimizado |
| OpenCode Auto-Setup | ✅ Automático |
| Layer A (Static) | ✅ 95% |
| Layer B (Semantic) | ✅ 85% |

## 🤝 Contribuciones

Proyecto experimental. Si sufres de visión de túnel al editar código, ¡tus ideas son bienvenidas!

## 📄 Licencia

MIT

---

**OmnySys - Una herramienta a la vez, previene la visión de túnel.**
