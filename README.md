# OmnySys - Code Context Engine with Omnisciencia

**The system that prevents tunnel vision** - analyze entire codebase impact before making any changes.

## 🎯 Problem Solved

AI developers suffer from **tunnel vision**: they modify files without seeing dependencies or connections. OmnySys injects complete context before the AI touches code.

## 🚀 Auto-Installing MCP Server

**NO MANUAL CONFIGURATION REQUIRED!** When you install OmnySys:

```bash
# 1. Install (automatically detects MCP)
npm install

# 2. Open in IDE with MCP support (Claude Desktop, OpenCode, etc.)
# 3. THAT'S IT! The MCP server auto-detects and connects
```

The MCP server automatically:
- ✅ Detects the project root
- ✅ Loads existing analysis (or creates new)
- ✅ Starts background processing
- ✅ Exposes 9 omniscient tools
- ✅ Monitors file changes in real-time

## MCP Tools

| Tool | Que hace | Auto-analisis |
|------|----------|---------------|
| `get_impact_map(filePath)` | Archivos afectados si tocas este | Si (encola CRITICAL) |
| `analyze_change(filePath, symbolName)` | Impacto de cambiar un simbolo | Si |
| `explain_connection(fileA, fileB)` | Por que estan conectados | Si |
| `get_risk_assessment(minSeverity)` | Evaluacion de riesgos del proyecto | No (usa datos existentes) |
| `search_files(pattern)` | Buscar archivos por patron | No |
| `get_server_status()` | Estado del sistema | No |

### Ejemplo

```
Usuario: "Voy a modificar CameraState.js"

IA llama: get_impact_map("CameraState.js")

OmnySys responde:
  - RenderEngine.js (dependencia directa)
  - Input.js (dependencia directa)
  - MinimapUI.js (estado compartido: cameraPosition)
  - Riesgo: ALTO

IA edita los 4 archivos en una sola pasada.
FileWatcher detecta cambios y regenera el grafo.
```

## Estado del Proyecto

**Version**: v0.5.2

| Componente | Estado |
|------------|--------|
| Layer A (Analisis Estatico) | 95% |
| Layer B (Analisis Semantico) | 85% |
| Layer C (Memoria + MCP) | 90% |
| Orchestrator + FileWatcher | 90% |
| Cache Unificado | 95% |

Arquitectura modular SOLID con ~147 modulos (promedio ~85 lineas cada uno).

## Documentacion

| Documento | Descripcion |
|-----------|-------------|
| [docs/INDEX.md](docs/INDEX.md) | Indice completo de documentacion |
| [ARCHITECTURE.md](ARCHITECTURE.md) | Arquitectura tecnica detallada |
| [GETTING_STARTED.md](GETTING_STARTED.md) | Instalacion y primeros pasos |
| [ROADMAP.md](ROADMAP.md) | Plan de desarrollo |
| [docs/MCP_TOOLS.md](docs/MCP_TOOLS.md) | Documentacion de tools MCP |

## Contribuciones

Proyecto experimental. Si sufris del mismo problema de vision de tunel, tus ideas y casos de uso son bienvenidos.

## Licencia

Por definir.
