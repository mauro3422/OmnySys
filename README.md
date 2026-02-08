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
- 🔌 MCP Server: `http://localhost:9999` (12 herramientas)

Tu IA (Claude, OpenCode, etc.) tiene acceso automático a las herramientas.

## 🎯 El Problema

Las IAs sufren **visión de túnel**: editan archivos sin ver dependencias ni conexiones.

**OmnySys soluciona esto** proporcionando:
- Mapas de impacto completos
- Quién llama a qué funciones
- Flujo de datos entre componentes
- Riesgos ocultos detectados

## 🛠️ Herramientas MCP (12 disponibles)

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
| `restart_server()` | Reinicia servidor y recarga datos | Después de cambios en código |

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

| Documento | Descripción |
|-----------|-------------|
| **[docs/CORE_PRINCIPLES.md](docs/CORE_PRINCIPLES.md)** | **🎯 Los 4 Pilares del Sistema** (Box Test + Metadata Insights + Atomic Composition + Fractal Architecture) |
| [docs/TOOLS_GUIDE.md](docs/TOOLS_GUIDE.md) | Guía completa de herramientas con ejemplos |
| [ARCHITECTURE.md](ARCHITECTURE.md) | Arquitectura técnica |
| [docs/ARCHITECTURE_MOLECULAR_PLAN.md](docs/ARCHITECTURE_MOLECULAR_PLAN.md) | Plan futuro: Análisis atómico (v0.6+) |
| [docs/METADATA-INSIGHTS-GUIDE.md](docs/METADATA-INSIGHTS-GUIDE.md) | Combinación de metadatos para detectar patrones |
| [docs/INDEX.md](docs/INDEX.md) | Índice completo de documentación |

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
│  │ 12 Tools MCP    │  │ Layer A: Static Analysis │ │
│  │ • Impact Map    │  │ Layer B: Semantic        │ │
│  │ • Call Graph    │  │ Layer C: Memory          │ │
│  │ • Atomic View   │  └──────────────────────────┘ │
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

**Versión**: v0.6.0

| Componente | Estado |
|------------|--------|
| MCP Server HTTP | ✅ Production Ready |
| 12 Tools MCP | ✅ 100% Funcionales |
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
