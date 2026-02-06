# MCP Tools - Documentacion

Version: v0.5.2
Ultima actualizacion: 2026-02-06

## Objetivo

Exponer contexto del proyecto a una IA antes de editar codigo. El MCP Server analiza la estructura, dependencias y riesgos del codebase para que la IA tome decisiones informadas.

## Entry Point

```bash
node src/layer-c-memory/mcp/index.js <project-path>
```

| Parametro | Descripcion | Requerido |
|-----------|-------------|-----------|
| `project-path` | Ruta al proyecto a analizar | Si |
| `--skip-llm` | Desactivar IA (solo analisis estatico) | No |
| `--verbose` | Modo detallado con logging extendido | No |

Ejemplos:

```bash
# Analizar proyecto de prueba
node src/layer-c-memory/mcp/index.js ./test-cases/scenario-ia-dynamic-imports

# Analizar sin IA
node src/layer-c-memory/mcp/index.js --skip-llm ./mi-proyecto

# Modo verbose
node src/layer-c-memory/mcp/index.js --verbose ./mi-proyecto
```

## Flujo de Ejecucion

Cuando se ejecuta el comando, el sistema realiza automaticamente:

1. **Iniciar LLM Server** - Arranca llama-server.exe en GPU, espera health check.
2. **Verificar Analisis Existente** - Si no hay datos previos, ejecuta Layer A (analisis estatico). Si hay, reutiliza el analisis existente.
3. **Inicializar Orchestrator** - Carga metadatos de Layer A, determina que archivos necesitan LLM, los agrega a cola de prioridad (critical > high > medium > low) para procesamiento en background.
4. **Inicializar Cache** - Carga analisis existente en memoria para respuestas rapidas.
5. **Iniciar MCP Server** - Queda listo para recibir queries via stdio. El procesamiento LLM continua en background sin bloquear al usuario.

## Tools Disponibles

| Tool | Descripcion | Parametros | Auto-analysis |
|------|-------------|------------|---------------|
| `get_impact_map` | Retorna mapa de impacto para un archivo: dependencias, dependientes y riesgos asociados | `filePath: string` | Si |
| `analyze_change` | Analiza el impacto de modificar un simbolo especifico (funcion, clase, variable exportada) | `filePath: string`, `symbolName: string` | Si |
| `explain_connection` | Explica la conexion entre dos archivos: tipo de dependencia, datos compartidos, acoplamiento | `fileA: string`, `fileB: string` | Si |
| `get_risk_assessment` | Retorna evaluacion de riesgos del proyecto filtrada por severidad minima | `minSeverity: string` | No |
| `search_files` | Busca archivos por patron en el indice del proyecto | `pattern: string` | No |
| `get_server_status` | Retorna estado del servidor: archivos analizados, progreso LLM, health del sistema | (ninguno) | No |

**Auto-analysis**: Cuando es "Si", si el archivo no ha sido analizado previamente, el sistema ejecuta el analisis on-demand antes de responder.

## Diagrama

```text
MCP Tool --> Query Service --> .omnysysdata/ --> Response
```

El flujo completo por capas:

```text
MCP Server (stdio)
    |
    v
Layer A - Static Analysis (AST parse, exports, imports)
    |
    v
Orchestrator (decide que archivos necesitan LLM)
    |
    v
Analysis Worker (procesa cola con LLM en background)
    |
    v
.omnysysdata/ (almacenamiento persistente)
```

## Que Obtienes

Despues de ejecutar, se crea en el proyecto objetivo:

```
tu-proyecto/
|-- .omnysysdata/              <-- Datos del analisis
|   |-- index.json                <-- Metadata general del proyecto
|   |-- files/                    <-- Analisis individual por archivo
|   |-- connections/              <-- Conexiones detectadas entre archivos
|   +-- risks/                    <-- Evaluacion de riesgos por archivo
|-- system-map.json               <-- Grafo de dependencias
|-- system-map-analysis.json      <-- Analisis de calidad estructural
+-- system-map-enhanced.json      <-- Analisis semantico + IA
```

- **index.json**: Lista de archivos analizados, timestamps, configuracion usada.
- **files/**: Un JSON por archivo con exports, imports, arquetipos, metricas y (opcionalmente) llmInsights.
- **connections/**: Relaciones entre archivos con tipo, confianza y datos compartidos.
- **risks/**: Riesgos detectados con severidad, descripcion y archivos afectados.

## Cuando se Activa la IA

La IA (Layer B) se activa automaticamente cuando se detectan estos patrones:

- **Archivos huerfanos**: Sin imports ni usedBy detectados por analisis estatico.
- **Imports dinamicos**: Uso de `import()`, `require()` dinamico, `eval()`.
- **Eventos ambiguos**: Event emitters con nombres genericos o shared state (`window.*`, `localStorage`).
- **Conexiones de baja confianza**: Relaciones detectadas con confidence < 0.8.
- **Side effects sospechosos**: Archivos que modifican estado global o tienen efectos secundarios no evidentes.

El procesamiento es asincrono: el usuario puede trabajar mientras el LLM analiza en background. Layer B solo procesa aproximadamente el 20% de archivos (los que presentan patrones complejos).

## Integracion MCP Protocol

El servidor implementa el [Model Context Protocol](https://modelcontextprotocol.io/). Esquema de registro de tools:

```json
{
  "tools": [
    {
      "name": "get_impact_map",
      "description": "Returns impact analysis for a file",
      "parameters": {
        "filePath": { "type": "string", "description": "Relative path to the file" }
      }
    },
    {
      "name": "analyze_change",
      "description": "Analyzes impact of changing a symbol in a file",
      "parameters": {
        "filePath": { "type": "string", "description": "Relative path to the file" },
        "symbolName": { "type": "string", "description": "Name of the exported symbol" }
      }
    },
    {
      "name": "explain_connection",
      "description": "Explains the connection between two files",
      "parameters": {
        "fileA": { "type": "string", "description": "Relative path to first file" },
        "fileB": { "type": "string", "description": "Relative path to second file" }
      }
    },
    {
      "name": "get_risk_assessment",
      "description": "Returns risk assessment filtered by minimum severity",
      "parameters": {
        "minSeverity": { "type": "string", "description": "Minimum severity: low, medium, high, critical" }
      }
    },
    {
      "name": "search_files",
      "description": "Searches files by pattern in the project index",
      "parameters": {
        "pattern": { "type": "string", "description": "Search pattern (glob or substring)" }
      }
    },
    {
      "name": "get_server_status",
      "description": "Returns server status, analysis progress and system health",
      "parameters": {}
    }
  ]
}
```

## Performance Esperado

| Proyecto | Tiempo Layer A | Tiempo Layer B (IA) | Total |
|----------|---------------|---------------------|-------|
| 10 archivos | 5-10s | 10-20s | 15-30s |
| 50 archivos | 20-30s | 30-60s | 50-90s |
| 100 archivos | 40-60s | 60-120s | 100-180s |

Nota: Layer B solo corre en aproximadamente el 20% de archivos (los que presentan patrones complejos). Los tiempos asumen GPU disponible para el LLM server.

## Troubleshooting

### "Found 0 JS/TS files"
Verificar que la ruta sea correcta y que existan archivos `.js` o `.ts` en el directorio. El analisis busca recursivamente pero respeta `.gitignore` y `node_modules/`.

### "LLM server not available"
- Verificar que `llama-server.exe` este en `src/ai/server/`.
- Verificar que el modelo `.gguf` este en `src/ai/models/`.
- Verificar que no haya otro proceso usando el puerto 8000.
- Si no se necesita IA, usar el flag `--skip-llm`.

### "Out of memory"
- El modelo Q8_0 usa aproximadamente 1.2GB VRAM.
- Si la GPU tiene menos de 2GB, configurar CPU mode editando la configuracion del server.
- Para proyectos grandes (>200 archivos), considerar analizar por subdirectorios.

## Nota

Este documento es contrato. El MCP Server debe adherirse a estas firmas.
