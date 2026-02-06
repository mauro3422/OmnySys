# OmnySys - Motor de Contexto para IAs que Editan Codigo

Las IAs que editan codigo sufren de **vision de tunel**: modifican un archivo sin ver que otros archivos dependen de el. OmnySys resuelve esto inyectando contexto antes de que la IA toque codigo.

## Como Funciona

Imagina una caja donde moves un archivo y ves todas las conexiones por detras — como cables y raices conectadas a otros archivos. OmnySys construye ese mapa automaticamente.

```
Codigo Fuente
   |
   v
Layer A (Estatico)    -- Parsea AST, extrae imports/exports, construye grafo
   |
   v
Layer B (Semantico)   -- IA local detecta conexiones invisibles (eventos, estado, imports dinamicos)
   |
   v
Layer C (Memoria)     -- Almacena, cachea, sirve queries via MCP
   |
   v
MCP Tools             -- La IA consulta: "que se rompe si toco este archivo?"
```

## Inicio Rapido

```bash
# 1. Instalar
npm install

# 2. Iniciar (un comando)
node src/layer-c-memory/mcp-server.js /ruta/a/tu/proyecto

# 3. Listo - las tools MCP estan disponibles para la IA
```

El sistema inicia automaticamente: Orchestrator, FileWatcher, indexacion en background, cache y tools MCP.

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
