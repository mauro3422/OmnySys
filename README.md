# CogniSystem - Motor de Conciencia Sistémica para IAs

## El Problema

Las IAs que trabajan con código sufren de **visión de túnel**: cuando editan un archivo, pierden de vista el contexto completo del sistema. Esto causa bugs colaterales porque modifican código sin considerar:

- Archivos que dependen del código modificado
- Conexiones semánticas no obvias (estado compartido, eventos, lógica de negocio)
- Efectos en cascada en otras partes del sistema

### La Encrucijada del Desarrollador

```
┌─────────────────────────────────────┐
│   ARCHIVOS GRANDES (Monolíticos)   │
│                                     │
│  ✓ Contexto completo en un lugar   │
│  ✗ IA no puede regenerar sin        │
│    romper sintaxis (300+ líneas)   │
└─────────────────────────────────────┘
                 ⬇️
            BLOQUEADO
                 ⬆️
┌─────────────────────────────────────┐
│   ARCHIVOS PEQUEÑOS (Modulares)    │
│                                     │
│  ✓ IA puede regenerar sin problemas│
│  ✗ Visión de túnel: pierde          │
│    conexiones entre módulos        │
└─────────────────────────────────────┘
```

**Resultado**: Proyectos que no pueden crecer porque cualquier cambio rompe algo inesperado.

---

## La Solución: CogniSystem

Un motor híbrido de tres capas que inyecta contexto a la IA **antes** de que edite código.

### Arquitectura Unificada (v0.4.5+)

```
┌─────────────────────────────────────────────────────────────┐
│              MCP SERVER (Entry Point Único)                 │
│              node src/layer-c-memory/mcp-server.js          │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  ┌───────────────────────────────────────────────────────┐  │
│  │  CAPA C: Memoria Persistente                          │  │
│  │  • .OmnySystemData/ - Datos particionados            │  │
│  │  • Query Service - API eficiente                     │  │
│  │  • UnifiedCacheManager - Caché unificado             │  │
│  └───────────────────────────────────────────────────────┘  │
│                           │                                  │
│  ┌────────────────────────┼──────────────────────────────┐  │
│  │                        ▼                               │  │
│  │  ┌─────────────────────────────────────────────────┐   │  │
│  │  │  ORCHESTRATOR (Componente Interno)              │   │  │
│  │  │  • AnalysisQueue - Cola CRITICAL>HIGH>MEDIUM>LOW│   │  │
│  │  │  • AnalysisWorker - Procesa con LLM             │   │  │
│  │  │  • FileWatcher - Detecta cambios en tiempo real │   │  │
│  │  │  • BatchProcessor - Agrupa cambios              │   │  │
│  │  └─────────────────────────────────────────────────┘   │  │
│  │                        │                               │  │
│  │  ┌─────────────────────┼───────────────────────────┐  │  │
│  │  │                     ▼                           │  │  │
│  │  │  CAPA B: Enlazador IA (La Mente)                │  │  │
│  │  │  • LLM Analyzer - Conexiones semánticas         │  │  │
│  │  │  • Semantic Enricher - Metadatos                │  │  │
│  │  │  • Validators - Filtro de alucinaciones         │  │  │
│  │  └─────────────────────────────────────────────────┘  │  │
│  │                        │                               │  │
│  │  ┌─────────────────────┼───────────────────────────┐  │  │
│  │  │                     ▼                           │  │  │
│  │  │  CAPA A: Rastreador Estático (El Cuerpo)        │  │  │
│  │  │  • Scanner - Tree-sitter, AST                   │  │  │
│  │  │  • Parser - Imports, exports, llamadas          │  │  │
│  │  │  • Graph Builder - Grafo de dependencias        │  │  │
│  │  └─────────────────────────────────────────────────┘  │  │
│  │                                                         │  │
│  │  ┌─────────────────────────────────────────────────┐   │  │
│  │  │  MCP TOOLS (Interfaz para la IA)                │   │  │
│  │  │                                                 │   │  │
│  │  │  🔧 get_impact_map(filePath)                   │   │  │
│  │  │     → "¿Qué archivos se ven afectados?"        │   │  │
│  │  │                                                 │   │  │
│  │  │  🔧 analyze_change(filePath, symbolName)       │   │  │
│  │  │     → "Impacto de cambiar esta función"        │   │  │
│  │  │                                                 │   │  │
│  │  │  🔧 explain_connection(fileA, fileB)           │   │  │
│  │  │     → "¿Por qué estos archivos están conectados?"│  │  │
│  │  │                                                 │   │  │
│  │  │  🔧 get_risk_assessment(minSeverity)           │   │  │
│  │  │     → "Evaluación de riesgos del proyecto"     │   │  │
│  │  │                                                 │   │  │
│  │  │  🔧 search_files(pattern)                      │   │  │
│  │  │     → "Buscar archivos por patrón"             │   │  │
│  │  │                                                 │   │  │
│  │  │  🔧 get_server_status()                        │   │  │
│  │  │     → "Estado del sistema"                     │   │  │
│  │  │                                                 │   │  │
│  │  └─────────────────────────────────────────────────┘   │  │
│  │                                                         │  │
│  └─────────────────────────────────────────────────────────┘  │
│                                                              │
└──────────────────────────────────────────────────────────────┘
```

### Flujo de Trabajo (Automático)

#### 1. **Instalación** (Un comando)
```bash
node src/layer-c-memory/mcp-server.js /ruta/a/tu/proyecto
```

Esto inicia automáticamente:
- Orchestrator (cola, worker, file watcher)
- Indexación en background (si no hay datos)
- Cache unificado
- Tools MCP listas para usar

#### 2. **Uso por la IA** (Transparente)
```javascript
// La IA (Claude) llama a una tool:
const impact = await get_impact_map("CameraState.js");

// Si el archivo no está analizado:
// → Se encola automáticamente como CRITICAL
// → Se analiza con LLM
// → Se devuelve el resultado
// 
// Console:
// 🚨 File not analyzed: CameraState.js
// ⏳ Queueing as CRITICAL priority...
// ✅ Analysis completed for: CameraState.js

// Resultado:
{
  file: "CameraState.js",
  directlyAffects: ["RenderEngine.js", "Input.js"],
  transitiveAffects: ["MinimapUI.js"],
  semanticConnections: [
    { target: "MinimapUI.js", type: "shared-state", key: "cameraPosition" }
  ],
  riskLevel: "high"
}
```

#### 3. **Protección Automática**
La IA ahora sabe que debe revisar 4 archivos, no solo 1:
- `CameraState.js` (el objetivo)
- `RenderEngine.js` (dependencia directa)
- `Input.js` (dependencia directa)
- `MinimapUI.js` (conexión semántica)

---

## 🚀 Inicio Rápido

### Opción 1: MCP Server (Recomendado)

```bash
# 1. Instalar dependencias
npm install

# 2. Iniciar sistema (un comando)
node src/layer-c-memory/mcp-server.js /ruta/a/tu/proyecto

# 3. El servidor está listo - las tools MCP están disponibles
# Puerto WebSocket: 9997 (notificaciones en tiempo real)
```

### Opción 2: Con VS Code Extension

```bash
# Inicia el servidor MCP
node src/layer-c-memory/mcp-server.js /ruta/a/tu/proyecto

# En VS Code, la extensión CogniSystem se conecta automáticamente
# y muestra el grafo de dependencias en tiempo real
```

---

## 🛠️ MCP Tools Disponibles

Estas son las herramientas que la IA (Claude) puede usar:

| Tool | Descripción | Auto-Análisis |
|------|-------------|---------------|
| `get_impact_map(filePath)` | Devuelve qué archivos se ven afectados | ✅ Si no existe, encola CRITICAL |
| `analyze_change(filePath, symbolName)` | Impacto de cambiar un símbolo específico | ✅ Auto-analiza si falta |
| `explain_connection(fileA, fileB)` | Explica por qué dos archivos están conectados | ✅ Auto-analiza ambos |
| `get_risk_assessment(minSeverity)` | Evaluación de riesgos del proyecto | ❌ Usa datos existentes |
| `search_files(pattern)` | Busca archivos por patrón | ❌ Búsqueda directa |
| `get_server_status()` | Estado del sistema y progreso | ❌ Estado en tiempo real |

### Ejemplo de Uso

```javascript
// Dentro de una conversación con Claude:

User: "Voy a modificar CameraState.js"

Claude: *llama automáticamente*
→ get_impact_map("CameraState.js")

Claude: "Antes de editar, deberías saber que CameraState.js afecta a:
  - RenderEngine.js (dependencia directa)
  - Input.js (dependencia directa)
  - MinimapUI.js (estado compartido: cameraPosition)
  
  Riesgo: ALTO. Recomiendo revisar estos 4 archivos."

User: "Ok, haz los cambios necesarios"

Claude: *edita los 4 archivos en una sola pasada*
```

---

## 📊 Estado del Proyecto

**Versión**: v0.4.5 - MCP Unified Entry Point ✅

| Componente | Estado | Descripción |
|------------|--------|-------------|
| **MCP Server** | 95% ✅ | Entry point único, tools listas |
| **Orchestrator** | 90% ✅ | Componente interno (cola + worker) |
| **FileWatcher** | 85% ✅ | Detección de cambios en tiempo real |
| **Capa A (Static)** | 95% ✅ | Análisis estático completo |
| **Capa B (Semantic)** | 85% ✅ | LLM analyzer con validación |
| **Capa C (Memory)** | 90% ✅ | Storage particionado + cache |
| **UnifiedCache** | 95% ✅ | Cache unificado v0.4.4 |

---

## 🏗️ Ventajas vs Soluciones Existentes

| Feature | Herramientas MCP Actuales | CogniSystem |
|---------|---------------------------|-------------|
| **Entry Point** | Múltiples comandos | ✅ Un solo comando |
| **Auto-Indexación** | Manual | ✅ Automática en background |
| **Análisis Estático** | ✓ Sí | ✓ Sí |
| **Conexiones Semánticas** | ✗ No | ✓ Sí (Capa B) |
| **Auto-Análisis** | On-demand manual | ✅ Si no existe, encola CRITICAL |
| **Velocidad** | Analiza on-demand (lento) | Pre-construido (instantáneo) |
| **Desconexiones** | ✗ Falla en CSS, Shaders, eventos | ✓ IA las detecta |
| **Integración** | App externa | ✅ Skill nativo en workflow |

---

## 📁 Estructura del Repositorio

```
cogni-system/
├── README.md                    (este archivo)
├── ROADMAP.md                   (fases de desarrollo)
├── ARCHITECTURE.md              (diseño técnico detallado)
├── CHANGELOG.md                 (historial de cambios)
├── docs/
│   ├── PROBLEM_ANALYSIS.md
│   ├── EXISTING_SOLUTIONS.md
│   └── MCP_TOOLS.md            (documentación de tools)
├── src/
│   ├── core/
│   │   ├── orchestrator.js     (🔥 Componente principal)
│   │   ├── unified-server.js   (HTTP API + WebSocket)
│   │   ├── unified-cache-manager.js
│   │   ├── analysis-queue.js
│   │   ├── analysis-worker.js
│   │   └── file-watcher.js
│   ├── layer-a-static/         (Análisis estático)
│   ├── layer-b-semantic/       (Análisis con IA)
│   └── layer-c-memory/         
│       ├── mcp-server.js       (🔥 Entry point único)
│       └── ...
└── test-cases/                 (Escenarios de prueba)
```

---

## 📖 Documentación Adicional

- **[ROADMAP.md](ROADMAP.md)** - Plan de desarrollo hacia Beta
- **[ARCHITECTURE.md](ARCHITECTURE.md)** - Diseño técnico detallado
- **[CHANGELOG.md](CHANGELOG.md)** - Historial de versiones
- **[docs/MCP_TOOLS.md](docs/MCP_TOOLS.md)** - Documentación de tools MCP

---

## 🤝 Contribuciones

Este es un proyecto experimental nacido de la frustración con proyectos bloqueados. Si sufres del mismo problema, tus ideas y casos de uso son bienvenidos.

## 📜 Licencia

Por definir
