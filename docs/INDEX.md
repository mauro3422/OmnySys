# Índice de Documentación - OmnySys

**Versión**: v0.6.0
**Última actualización**: 2026-02-08

---

## 🚀 Empezar Aquí

| Documento | ¿Para quién? | Descripción |
|-----------|--------------|-------------|
| **[README.md](../README.md)** | **Todos** | Instalación rápida (2 comandos) y overview |
| [ARCHITECTURE.md](../ARCHITECTURE.md) | Desarrolladores | Arquitectura de 3 capas detallada |
| [guides/TOOLS_GUIDE.md](guides/TOOLS_GUIDE.md) | Usuarios de IA | Guía completa de las 12 herramientas MCP |

---

## 📁 Estructura de Documentación

```
docs/
├── INDEX.md (este archivo)
│
├── architecture/           # 🏗️ Arquitectura del sistema
│   ├── CORE_PRINCIPLES.md                    # ⭐ Los 4 Pilares
│   ├── ARCHITECTURE_MOLECULAR_PLAN.md        # ⭐ Átomos y Moléculas
│   ├── ARCHITECTURE_MOLECULAR_IMPLEMENTATION.md
│   ├── ARCHITECTURE_LAYER_A_B.md
│   ├── ARCHETYPE_SYSTEM.md
│   ├── ARCHETYPE_DEVELOPMENT_GUIDE.md
│   ├── HYBRID_ANALYSIS_PIPELINE.md
│   └── CONTEXT_SELECTION_ALGORITHMS.md
│
├── guides/                 # 📖 Guías de uso
│   ├── TOOLS_GUIDE.md                        # ⭐ 12 herramientas MCP
│   ├── AI_MODELS_GUIDE.md                    # ⭐ LFM2.5, setup, prompting
│   ├── MCP_INTEGRATION_GUIDE.md
│   ├── DOCUMENTATION_GUIDE.md
│   ├── METADATA_INSIGHTS_GUIDE.md
│   └── METADATA_INSIGHTS_CATALOG.md
│
├── analysis/               # 📊 Análisis del problema
│   ├── PROBLEM_ANALYSIS.md
│   ├── TUNNEL_VISION_CASES.md
│   ├── COMPETITIVE_LANDSCAPE.md              # ⭐ Competidores 2026
│   ├── COMPETITIVE_STRATEGY.md               # ⭐ Go-to-market
│   ├── SYSTEM_ANALYSIS_OVERVIEW.md
│   ├── SYSTEM_ANALYSIS_EXTRACTORS.md
│   ├── SYSTEM_ANALYSIS_GAPS.md
│   └── PROJECT_ANALYSIS_DIAGRAM.md
│
├── development/            # 🔧 Desarrollo interno
│   ├── metadata-prompt-system.md
│   ├── TODO-PENDIENTES.md
│   ├── TESTING-RESULTS-PHASE-3.8.md
│   └── RESEARCH_PUBLISHING_GUIDE.md
│
├── future/                 # 🔮 Ideas futuras
│   └── FUTURE_IDEAS.md                       # Ideas 1-20
│
├── ideas/                  # 💡 Ideas avanzadas
│   ├── IDEAS_INDEX.md
│   ├── TRANSFORMATION_CONTRACTS.md
│   ├── VIRTUAL_FLOW_SIMULATION.md
│   ├── DEBUGGER_FOR_AIS.md
│   ├── UNIVERSAL_PATTERN_ENGINE.md
│   └── ... (8 ideas más)
│
├── archive/                # 📦 Históricos
│   └── README.md (17 docs archivados)
│
├── ai_architecture/        # 🤖 AI setup (legacy)
│   ├── AI_SETUP_GUIDE.md
│   └── AI_OPTIMIZATIONS_2026.md
│
└── architectural-decision-records/
    └── ADR-001-type-based-prompt-selection.md
```

---

## 🎯 Rutas Rápidas

### 🔰 Para Usuarios Nuevos (15 min)
1. [README.md](../README.md) - Instalación (2 comandos)
2. [guides/TOOLS_GUIDE.md](guides/TOOLS_GUIDE.md) - Cómo usar las 12 herramientas
3. Probar: `npm start` → `npm tools`

### 🔧 Para Desarrolladores (1 hora)
1. [ARCHITECTURE.md](../ARCHITECTURE.md) - Entender las 3 capas (20 min)
2. [architecture/CORE_PRINCIPLES.md](architecture/CORE_PRINCIPLES.md) - Los 4 Pilares (15 min)
3. [architecture/ARCHITECTURE_MOLECULAR_PLAN.md](architecture/ARCHITECTURE_MOLECULAR_PLAN.md) - Átomos y moléculas (20 min)
4. [architecture/ARCHETYPE_SYSTEM.md](architecture/ARCHETYPE_SYSTEM.md) - Sistema de arquetipos (15 min)

### 🤖 Para IAs (Claude, OpenCode, etc.)
1. [guides/TOOLS_GUIDE.md](guides/TOOLS_GUIDE.md) - **Referencia completa de herramientas**
2. [architecture/CORE_PRINCIPLES.md](architecture/CORE_PRINCIPLES.md) - Principios fundamentales
3. Practicar flujos de trabajo recomendados

---

## 📚 Documentación por Tema

### 🏗️ Arquitectura

| Documento | Descripción |
|-----------|-------------|
| [ARCHITECTURE.md](../ARCHITECTURE.md) | **Visión general** de las 3 capas (A, B, C) |
| [architecture/CORE_PRINCIPLES.md](architecture/CORE_PRINCIPLES.md) | **⭐ Los 4 Pilares** (Box Test, Metadata, Atomic, Fractal) |
| [architecture/ARCHITECTURE_MOLECULAR_PLAN.md](architecture/ARCHITECTURE_MOLECULAR_PLAN.md) | **⭐ Arquitectura Molecular** (átomos y moléculas) |
| [architecture/ARCHITECTURE_MOLECULAR_IMPLEMENTATION.md](architecture/ARCHITECTURE_MOLECULAR_IMPLEMENTATION.md) | Implementación molecular |
| [architecture/ARCHITECTURE_LAYER_A_B.md](architecture/ARCHITECTURE_LAYER_A_B.md) | Integración Layer A y B |
| [architecture/ARCHETYPE_SYSTEM.md](architecture/ARCHETYPE_SYSTEM.md) | Sistema de arquetipos (god-object, orphan, etc.) |
| [architecture/ARCHETYPE_DEVELOPMENT_GUIDE.md](architecture/ARCHETYPE_DEVELOPMENT_GUIDE.md) | Cómo crear nuevos arquetipos |
| [architecture/HYBRID_ANALYSIS_PIPELINE.md](architecture/HYBRID_ANALYSIS_PIPELINE.md) | Pipeline de análisis híbrido |
| [architecture/CONTEXT_SELECTION_ALGORITHMS.md](architecture/CONTEXT_SELECTION_ALGORITHMS.md) | Algoritmos de selección de contexto |

### 📖 Guías de Uso

| Documento | Descripción |
|-----------|-------------|
| [guides/TOOLS_GUIDE.md](guides/TOOLS_GUIDE.md) | **⭐ Guía completa de las 12 herramientas MCP** con ejemplos |
| [guides/AI_MODELS_GUIDE.md](guides/AI_MODELS_GUIDE.md) | **⭐ Guía de modelos de IA** (LFM2.5, setup, prompting, GPU) |
| [guides/MCP_INTEGRATION_GUIDE.md](guides/MCP_INTEGRATION_GUIDE.md) | Integración con Claude Desktop, OpenCode |
| [guides/DOCUMENTATION_GUIDE.md](guides/DOCUMENTATION_GUIDE.md) | Cómo documentar el proyecto |
| [guides/METADATA_INSIGHTS_GUIDE.md](guides/METADATA_INSIGHTS_GUIDE.md) | Guía de Metadata Insights |
| [guides/METADATA_INSIGHTS_CATALOG.md](guides/METADATA_INSIGHTS_CATALOG.md) | Catálogo de combinaciones de metadata |

### 📊 Análisis y Competencia

| Documento | Descripción |
|-----------|-------------|
| [analysis/PROBLEM_ANALYSIS.md](analysis/PROBLEM_ANALYSIS.md) | Análisis del problema de visión de túnel |
| [analysis/TUNNEL_VISION_CASES.md](analysis/TUNNEL_VISION_CASES.md) | Casos reales de visión de túnel |
| [analysis/COMPETITIVE_LANDSCAPE.md](analysis/COMPETITIVE_LANDSCAPE.md) | **⭐ Análisis competitivo** (Qodo, Augment, Code Pathfinder) |
| [analysis/COMPETITIVE_STRATEGY.md](analysis/COMPETITIVE_STRATEGY.md) | **⭐ Estrategia y go-to-market** |
| [analysis/SYSTEM_ANALYSIS_OVERVIEW.md](analysis/SYSTEM_ANALYSIS_OVERVIEW.md) | Overview del análisis del sistema |
| [analysis/SYSTEM_ANALYSIS_EXTRACTORS.md](analysis/SYSTEM_ANALYSIS_EXTRACTORS.md) | Análisis de extractores |
| [analysis/SYSTEM_ANALYSIS_GAPS.md](analysis/SYSTEM_ANALYSIS_GAPS.md) | Gaps identificados |
| [analysis/PROJECT_ANALYSIS_DIAGRAM.md](analysis/PROJECT_ANALYSIS_DIAGRAM.md) | Diagrama de análisis del proyecto |

### 🔧 Desarrollo Interno

| Documento | Descripción |
|-----------|-------------|
| [development/metadata-prompt-system.md](development/metadata-prompt-system.md) | Sistema de prompts basado en metadata |
| [development/TODO-PENDIENTES.md](development/TODO-PENDIENTES.md) | Tareas pendientes |
| [development/TESTING-RESULTS-PHASE-3.8.md](development/TESTING-RESULTS-PHASE-3.8.md) | Resultados de testing |
| [development/RESEARCH_PUBLISHING_GUIDE.md](development/RESEARCH_PUBLISHING_GUIDE.md) | Guía para publicar investigación |

### 🔮 Futuro e Ideas

| Documento | Descripción |
|-----------|-------------|
| [future/FUTURE_IDEAS.md](future/FUTURE_IDEAS.md) | Ideas futuras (core 1-20) |
| [ideas/IDEAS_INDEX.md](ideas/IDEAS_INDEX.md) | **💡 Índice de ideas avanzadas** (21-24) |
| [ideas/TRANSFORMATION_CONTRACTS.md](ideas/TRANSFORMATION_CONTRACTS.md) | Contratos de transformación |
| [ideas/VIRTUAL_FLOW_SIMULATION.md](ideas/VIRTUAL_FLOW_SIMULATION.md) | Simulación de flujo virtual |
| [ideas/DEBUGGER_FOR_AIS.md](ideas/DEBUGGER_FOR_AIS.md) | "Debugger for AIs" - concepto de branding |
| [ideas/UNIVERSAL_PATTERN_ENGINE.md](ideas/UNIVERSAL_PATTERN_ENGINE.md) | Motor de patrones universal |
| [ROADMAP.md](../ROADMAP.md) | Roadmap de desarrollo |

### 📦 Históricos

| Documento | Descripción |
|-----------|-------------|
| [archive/README.md](archive/README.md) | **Índice de 17 documentos archivados** (históricos, consolidados, supersedidos) |

---

## 🔍 Búsqueda Rápida

| ¿Buscas...? | Ve a... |
|-------------|---------|
| **Instalación** | [README.md](../README.md) |
| **Usar herramientas MCP** | [guides/TOOLS_GUIDE.md](guides/TOOLS_GUIDE.md) |
| **Entender arquitectura** | [ARCHITECTURE.md](../ARCHITECTURE.md) |
| **Los 4 Pilares** | [architecture/CORE_PRINCIPLES.md](architecture/CORE_PRINCIPLES.md) |
| **Átomos y moléculas** | [architecture/ARCHITECTURE_MOLECULAR_PLAN.md](architecture/ARCHITECTURE_MOLECULAR_PLAN.md) |
| **Arquetipos** | [architecture/ARCHETYPE_SYSTEM.md](architecture/ARCHETYPE_SYSTEM.md) |
| **Crear arquetipo** | [architecture/ARCHETYPE_DEVELOPMENT_GUIDE.md](architecture/ARCHETYPE_DEVELOPMENT_GUIDE.md) |
| **Modelos de IA** | [guides/AI_MODELS_GUIDE.md](guides/AI_MODELS_GUIDE.md) |
| **Competidores** | [analysis/COMPETITIVE_LANDSCAPE.md](analysis/COMPETITIVE_LANDSCAPE.md) |
| **Roadmap** | [ROADMAP.md](../ROADMAP.md) |
| **Ideas futuras** | [future/FUTURE_IDEAS.md](future/FUTURE_IDEAS.md) + [ideas/IDEAS_INDEX.md](ideas/IDEAS_INDEX.md) |

---

## 📝 Convenciones

### Nomenclatura
- **OmnySys**: Nombre del sistema (no OmnySystem, ni CogniSystem)
- **3 Capas**: Layer A (Static), Layer B (Semantic), Layer C (Memory)
- **4 Pilares**: Box Test, Metadata Insights, Atomic Composition, Fractal Architecture
- **12 herramientas MCP**: get_impact_map, get_call_graph, atomic tools, etc.

### Estructura de Carpetas
- `architecture/` - Documentos de arquitectura y diseño
- `guides/` - Guías de uso para usuarios y desarrolladores
- `analysis/` - Análisis del problema, competencia, sistema
- `development/` - Documentos internos de desarrollo
- `future/` - Ideas futuras (core)
- `ideas/` - Ideas avanzadas (experimentales)
- `archive/` - Históricos preservados (no usar para decisiones actuales)

---

## 🆘 Soporte

- **Issues**: [GitHub Issues](https://github.com/mauro3422/OmnySys/issues)
- **Status**: `npm status`
- **Logs**: LLM (puerto 8000), MCP (puerto 9999)

---

**OmnySys v0.6.0** - Molecular Architecture con 12 herramientas MCP
