# CogniSystem MCP - Guía de Uso

## 🚀 Comando Principal (Entry Point)

```bash
node src/layer-c-memory/mcp/index.js <ruta-del-proyecto>
```

### Ejemplos:

```bash
# Analizar proyecto de prueba
node src/layer-c-memory/mcp/index.js ./test-cases/scenario-ia-dynamic-imports

# Analizar tu propio proyecto
node src/layer-c-memory/mcp/index.js ./mi-proyecto

# Analizar proyecto con espacios (usar comillas)
node src/layer-c-memory/mcp/index.js "./mi proyecto"
```

## 📁 Estructura del Comando

```
node src/layer-c-memory/mcp/index.js [opciones] <project-path>
```

| Parámetro | Descripción | Requerido |
|-----------|-------------|-----------|
| `project-path` | Ruta al proyecto a analizar | ✅ Sí |
| `--skip-llm` | Desactivar IA (solo análisis estático) | ❌ No |
| `--verbose` | Modo detallado | ❌ No |

## 🔄 Flujo de Ejecución (Arquitectura Actual)

Cuando ejecutás el comando, el sistema hace automáticamente:

```
1. Iniciar LLM Server (llama-server.exe en GPU)
   └─ Espera a que esté listo (health check)

2. Verificar Análisis Existente
   └─ Si NO hay: Ejecutar Layer A (Análisis Estático)
   └─ Si hay: Usar análisis existente

3. Inicializar Orchestrator
   └─ Carga metadatos de Layer A
   └─ Analiza qué archivos necesitan LLM
   └─ Agrega a cola de prioridad (background)

4. Inicializar Cache
   └─ Carga análisis existente

5. Iniciar MCP Server
   └─ Listo para recibir queries via stdio
   └─ LLM processing continúa en background
```

### 🏗️ Arquitectura de Capas

```
┌─────────────────────────────────────────────────────────────┐
│  MCP Server                                                  │
│  └─ Entry point, recibe queries de la IA (Claude, etc.)     │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│  Layer A - Static Analysis                                   │
│  └─ Parse AST, extrae metadatos (exports, imports, etc.)    │
│  └─ NO usa LLM - es 100% estático                          │
│  └─ Guarda en .OmnySysData/ (sin llmInsights)               │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│  Orchestrator                                                │
│  └─ Recibe metadatos de Layer A                             │
│  └─ Decide qué archivos necesitan LLM (basado en patrones)  │
│  └─ Agrega a cola: critical > high > medium > low           │
│  └─ Procesa en background (no bloquea al usuario)           │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│  Analysis Worker                                             │
│  └─ Toma job de la cola                                     │
│  └─ Si needsLLM: usa LLMAnalyzer con prompt especializado   │
│  └─ Guarda resultado CON llmInsights                        │
└─────────────────────────────────────────────────────────────┘
```

### 🧠 Cuándo se activa el LLM

El LLM se activa para archivos que tienen:
- **Patrones complejos**: shared state (window.*), eventos, localStorage
- **Arquetipos detectados**: orphan-module, state-manager, god-object, etc.
- **Baja confianza**: conexiones detectadas con confianza < 0.8

El procesamiento es **asíncrono**: el usuario puede trabajar mientras el LLM analiza en background.

## 📊 Qué obtienes

Después de ejecutar, se crea en tu proyecto:

```
tu-proyecto/
├── .OmnySystemData/          ← Datos del análisis
│   ├── index.json            ← Metadata general
│   ├── files/                ← Análisis por archivo
│   ├── connections/          ← Conexiones detectadas
│   └── risks/                ← Evaluación de riesgos
├── system-map.json           ← Grafo de dependencias
├── system-map-analysis.json  ← Análisis de calidad
└── system-map-enhanced.json  ← Análisis semántico + IA
```

## 🧠 Cuándo se activa la IA

La IA (Layer B) se activa automáticamente cuando:

- Hay archivos "huérfanos" (sin imports ni usedBy)
- Se detecta código dinámico (`import()`, `eval`)
- Hay eventos con nombres ambiguos
- Hay conexiones de baja confianza
- Archivos con side effects sospechosos

## 🛠️ Troubleshooting

### "Found 0 JS/TS files"
Verificar que la ruta sea correcta y existan archivos `.js` o `.ts`

### "LLM server not available"
- Verificar que `llama-server.exe` esté en `src/ai/server/`
- Verificar que el modelo `.gguf` esté en `src/ai/models/`
- Verificar que no haya otro proceso usando el puerto 8000

### "Out of memory"
- El modelo Q8_0 usa ~1.2GB VRAM
- Si tu GPU tiene menos de 2GB, usar CPU mode (editar config)

## 📝 Para otras IAs (Claude, GPT, etc.)

Esta es la forma de integrar CogniSystem:

```bash
# 1. Clonar/instalar CogniSystem
git clone <repo>
cd OmnySystem
npm install

# 2. Ejecutar MCP server en el proyecto objetivo
node src/layer-c-memory/mcp/index.js ./ruta-del-proyecto

# 3. El servidor queda escuchando en stdio
# Las herramientas disponibles son:
# - get_impact_map(filePath)
# - analyze_change(filePath, symbol)
# - explain_connection(fileA, fileB)
# - get_risk_assessment(minSeverity)
# - search_files(pattern)
```

## 🔗 Integración MCP Protocol

El servidor implementa el [Model Context Protocol](https://modelcontextprotocol.io/):

```json
{
  "tools": [
    {
      "name": "get_impact_map",
      "description": "Returns impact analysis for a file",
      "parameters": {
        "filePath": "string"
      }
    },
    {
      "name": "analyze_change",
      "description": "Analyzes impact of changing a symbol",
      "parameters": {
        "filePath": "string",
        "symbolName": "string"
      }
    }
  ]
}
```

## 📈 Performance Esperado

| Proyecto | Tiempo Layer A | Tiempo Layer B (IA) | Total |
|----------|---------------|---------------------|-------|
| 10 archivos | 5-10s | 10-20s | 15-30s |
| 50 archivos | 20-30s | 30-60s | 50-90s |
| 100 archivos | 40-60s | 60-120s | 100-180s |

*Layer B solo corre en ~20% de archivos (los complejos)*

---

**Para más info**: Ver `test-cases/IA-TEST-GUIDE.md` para casos de prueba específicos.
