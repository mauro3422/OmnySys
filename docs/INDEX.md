# Índice de Documentación - OmnySys

## 🚀 Empezar Aquí

| Documento | ¿Para quién? | Descripción |
|-----------|--------------|-------------|
| **[README.md](../README.md)** | **Todos** | Instalación rápida (2 comandos) y overview |
| [ARCHITECTURE.md](../ARCHITECTURE.md) | Desarrolladores | Arquitectura de 3 capas detallada |
| [docs/TOOLS_GUIDE.md](TOOLS_GUIDE.md) | Usuarios de IA | Guía completa de las 9 herramientas MCP |

---

## 📚 Documentación por Tema

### 🏗️ Arquitectura

- **[ARCHITECTURE.md](../ARCHITECTURE.md)** - Visión general de las 3 capas (A, B, C)
- **[docs/ARCHETYPE_SYSTEM.md](ARCHETYPE_SYSTEM.md)** - Sistema de arquetipos (god-object, orphan, etc.)
- **[docs/ARCHITECTURE_LAYER_A_B.md](ARCHITECTURE_LAYER_A_B.md)** - Integración Layer A y B
- **[docs/HYBRID_ANALYSIS_PIPELINE.md](HYBRID_ANALYSIS_PIPELINE.md)** - Pipeline de análisis híbrido

### 🛠️ Herramientas y MCP

- **[docs/TOOLS_GUIDE.md](TOOLS_GUIDE.md)** - **Guía completa de las 9 herramientas** con ejemplos
- **[docs/MCP_TOOLS.md](MCP_TOOLS.md)** - Documentación técnica de herramientas MCP
- **[docs/MCP_INTEGRATION_GUIDE.md](MCP_INTEGRATION_GUIDE.md)** - Guía de integración MCP

### 🤖 Inteligencia Artificial

- **[docs/ARCHETYPE_DEVELOPMENT_GUIDE.md](ARCHETYPE_DEVELOPMENT_GUIDE.md)** - Cómo crear nuevos arquetipos
- **[docs/SEMANTIC_LAYER_MODELS.md](SEMANTIC_LAYER_MODELS.md)** - Modelos de Layer B
- **[docs/AI_MODELS_GUIDE.md](AI_MODELS_GUIDE.md)** - Guía de modelos de IA
- **[docs/metadata-prompt-system.md](metadata-prompt-system.md)** - Sistema de prompts basado en metadatos
- **[docs/AI_CONSOLIDATION_MODE.md](AI_CONSOLIDATION_MODE.md)** - Modo consolidación de IA
- **[docs/ITERATIVE_MODE.md](ITERATIVE_MODE.md)** - Análisis iterativo

### 🔧 Desarrollo

- **[docs/DOCUMENTATION_GUIDE.md](DOCUMENTATION_GUIDE.md)** - Cómo documentar el proyecto
- **[docs/REFACTOR_PLAN.md](REFACTOR_PLAN.md)** - Plan de refactoring
- **[docs/TESTING-RESULTS-PHASE-3.8.md](TESTING-RESULTS-PHASE-3.8.md)** - Resultados de testing

### 📊 Análisis y Casos de Uso

- **[docs/TUNNEL_VISION_CASES.md](TUNNEL_VISION_CASES.md)** - Casos de visión de túnel
- **[docs/PROBLEM_ANALYSIS.md](PROBLEM_ANALYSIS.md)** - Análisis del problema
- **[docs/EXISTING_SOLUTIONS.md](EXISTING_SOLUTIONS.md)** - Soluciones existentes
- **[docs/PROJECT_ANALYSIS_DIAGRAM.md](PROJECT_ANALYSIS_DIAGRAM.md)** - Diagrama de análisis

### 🔮 Futuro y Roadmap

- **[docs/FUTURE_IDEAS.md](FUTURE_IDEAS.md)** - Ideas futuras
- **[ROADMAP.md](../ROADMAP.md)** - Roadmap de desarrollo
- **[docs/AUTO_SERVE_IMPLEMENTATION.md](AUTO_SERVE_IMPLEMENTATION.md)** - Implementación auto-serve

---

## 🎯 Rutas de Aprendizaje

### 🔰 Para Usuarios Nuevos

1. [README.md](../README.md) - Instalación (5 min)
2. [docs/TOOLS_GUIDE.md](TOOLS_GUIDE.md) - Cómo usar las herramientas (15 min)
3. Probar: `npm start` → `npm tools` → usar una herramienta

### 🔧 Para Desarrolladores

1. [ARCHITECTURE.md](../ARCHITECTURE.md) - Entender las 3 capas (20 min)
2. [docs/ARCHETYPE_SYSTEM.md](ARCHETYPE_SYSTEM.md) - Sistema de arquetipos (15 min)
3. [docs/ARCHETYPE_DEVELOPMENT_GUIDE.md](ARCHETYPE_DEVELOPMENT_GUIDE.md) - Crear arquetipos (30 min)

### 🤖 Para IAs (Claude, OpenCode, etc.)

1. [docs/TOOLS_GUIDE.md](TOOLS_GUIDE.md) - **Referencia completa de herramientas**
2. Ver ejemplos de uso en cada herramienta
3. Practicar flujos de trabajo recomendados

---

## 🗂️ Documentación Técnica por Componente

### Layer A - Análisis Estático

```
src/layer-a-static/
├── indexer.js              # Entry point
├── scanner.js              # Escaneo de archivos
├── parser/                 # AST parsing
├── extractors/             # Extractores de datos
│   ├── static/             # Datos estáticos
│   ├── communication/      # Eventos, WebSocket, etc.
│   └── state-management/   # Redux, Context, etc.
├── graph/                  # Construcción de grafos
└── query/                  # API de consulta
```

**Docs relacionados**:
- [ARCHITECTURE.md](../ARCHITECTURE.md) - Sección Layer A
- [docs/ARCHITECTURE_LAYER_A_B.md](ARCHITECTURE_LAYER_A_B.md)

### Layer B - Análisis Semántico

```
src/layer-b-semantic/
├── prompt-engine/
│   ├── PROMPT_REGISTRY.js  # Registro de arquetipos
│   ├── prompt-selector.js  # Selector de prompts
│   └── prompt-templates/   # Templates por arquetipo
└── llm-analyzer/
    └── core.js             # Análisis con LLM
```

**Docs relacionados**:
- [docs/ARCHETYPE_SYSTEM.md](ARCHETYPE_SYSTEM.md)
- [docs/ARCHETYPE_DEVELOPMENT_GUIDE.md](ARCHETYPE_DEVELOPMENT_GUIDE.md)
- [docs/metadata-prompt-system.md](metadata-prompt-system.md)

### Layer C - Memoria y MCP

```
src/layer-c-memory/
├── mcp/
│   ├── core/
│   │   └── server-class.js # OmnySysMCPServer
│   └── tools/              # 9 herramientas MCP
│       ├── get-call-graph.js
│       ├── explain-value-flow.js
│       ├── analyze-signature-change.js
│       └── ...
├── orchestrator/           # Queue, Worker, Watcher
└── cache/                  # UnifiedCache
```

**Docs relacionados**:
- [docs/TOOLS_GUIDE.md](TOOLS_GUIDE.md)
- [ARCHITECTURE.md](../ARCHITECTURE.md) - Sección Layer C

### Core - Infraestructura

```
src/core/
├── orchestrator/           # Queue, Worker, FileWatcher
├── unified-cache-manager.js
└── analysis-worker.js
```

---

## 📝 Convenios de Documentación

### Nomenclatura

- **OmnySys**: Nombre del sistema (no OmnySystem, ni CogniSystem)
- **3 Capas**: Layer A (Static), Layer B (Semantic), Layer C (Memory)
- **Arquetipos**: god-object, orphan-module, dynamic-importer, etc.
- **Herramientas**: 9 tools MCP (get_impact_map, get_call_graph, etc.)

### Estructura de Archivos

```
docs/
├── ARCHITECTURE_LAYER_A_B.md     # Integración capas
├── ARCHETYPE_DEVELOPMENT_GUIDE.md # Crear arquetipos
├── ARCHETYPE_SYSTEM.md            # Sistema de arquetipos
├── TOOLS_GUIDE.md                 # **Guía de herramientas**
├── FUTURE_IDEAS.md               # Ideas futuras
└── ...

ARCHITECTURE.md    # Arquitectura general (raíz)
README.md          # Instalación y overview (raíz)
```

---

## 🔍 Búsqueda Rápida

| ¿Buscas...? | Ve a... |
|-------------|---------|
| Cómo instalar | [README.md](../README.md) |
| Cómo usar herramientas | [docs/TOOLS_GUIDE.md](TOOLS_GUIDE.md) |
| Entender arquitectura | [ARCHITECTURE.md](../ARCHITECTURE.md) |
| Qué son los arquetipos | [docs/ARCHETYPE_SYSTEM.md](ARCHETYPE_SYSTEM.md) |
| Crear nuevo arquetipo | [docs/ARCHETYPE_DEVELOPMENT_GUIDE.md](ARCHETYPE_DEVELOPMENT_GUIDE.md) |
| Ejemplos de código | [docs/TOOLS_GUIDE.md](TOOLS_GUIDE.md) sección "Flujos de Trabajo" |
| Roadmap | [ROADMAP.md](../ROADMAP.md) |

---

## 🆘 Soporte

- **Issues**: [GitHub Issues](https://github.com/mauro3422/OmnySys/issues)
- **Status**: Verificar con `npm status`
- **Logs**: Revisar consola de LLM (puerto 8000) y MCP (puerto 9999)

---

**Última actualización**: 2026-02-06 | **Versión**: v0.5.3
