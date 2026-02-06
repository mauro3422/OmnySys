# Indice de Documentacion

Entrada principal a la documentacion de OmnySys. Si hay diferencias entre docs y codigo, estos documentos marcan el destino.

| Tipo | Significado |
|------|-------------|
| **Canonico** | Fuente de verdad. Define comportamiento esperado. |
| **Resumen** | Sintetiza y apunta al canonico. |
| **Historico** | Solo referencia. No usar para decisiones actuales. |

---

## Empieza Aqui

1. [README.md](../README.md) - Vision general del proyecto
2. [GETTING_STARTED.md](../GETTING_STARTED.md) - Primeros pasos
3. [ROADMAP.md](../ROADMAP.md) - Plan de desarrollo

---

## Arquitectura

| Documento | Tipo | Descripcion |
|-----------|------|-------------|
| [ARCHITECTURE.md](../ARCHITECTURE.md) | Canonico | Arquitectura de 3 capas, SOLID, SSOT, estructura de modulos |
| [ARCHITECTURE_LAYER_A_B.md](ARCHITECTURE_LAYER_A_B.md) | Canonico | Detalle tecnico de Layer A (estatico) y Layer B (semantico) |
| [CONTEXT_SELECTION_ALGORITHMS.md](CONTEXT_SELECTION_ALGORITHMS.md) | Tecnico | Algoritmos de seleccion de contexto |
| [HYBRID_ANALYSIS_PIPELINE.md](HYBRID_ANALYSIS_PIPELINE.md) | Tecnico | Pipeline de analisis hibrido (Static + AI) |

---

## Sistema de Arquetipos

| Documento | Tipo | Descripcion |
|-----------|------|-------------|
| [ARCHETYPE_SYSTEM.md](ARCHETYPE_SYSTEM.md) | Resumen | Vision general del sistema de arquetipos |
| [ARCHETYPE_DEVELOPMENT_GUIDE.md](ARCHETYPE_DEVELOPMENT_GUIDE.md) | Canonico | Guia para crear nuevos arquetipos |
| [metadata-prompt-system.md](metadata-prompt-system.md) | Canonico | Flujo metadata -> prompt -> LLM |
| [ADR-001](architectural-decision-records/ADR-001-type-based-prompt-selection.md) | Decision | Type-based prompt selection |

---

## Operaciones y Modos

| Documento | Tipo | Descripcion |
|-----------|------|-------------|
| [MCP_TOOLS.md](MCP_TOOLS.md) | Canonico | Tools MCP, entry point, CLI, troubleshooting |
| [AI_CONSOLIDATION_MODE.md](AI_CONSOLIDATION_MODE.md) | Canonico | Modo consolidacion IA |
| [ITERATIVE_MODE.md](ITERATIVE_MODE.md) | Canonico | Modo iterativo de analisis |
| [AUTO_SERVE_IMPLEMENTATION.md](AUTO_SERVE_IMPLEMENTATION.md) | Canonico | Implementacion auto-serve |
| [FILE_WATCHER_ANALYSIS.md](FILE_WATCHER_ANALYSIS.md) | Canonico | FileWatcher y deteccion de cambios |

---

## IA y Modelos

| Documento | Tipo | Descripcion |
|-----------|------|-------------|
| [AI_MODELS_GUIDE.md](AI_MODELS_GUIDE.md) | Canonico | Guia completa de modelos LFM2.5 (setup, prompting, optimizacion) |
| [SEMANTIC_LAYER_MODELS.md](SEMANTIC_LAYER_MODELS.md) | Referencia | Modelos de IA para Layer B |
| [ai_architecture/AI_OPTIMIZATIONS_2026.md](ai_architecture/AI_OPTIMIZATIONS_2026.md) | Tecnico | Optimizaciones IA 2026 |
| [ai_architecture/AI_SETUP_GUIDE.md](ai_architecture/AI_SETUP_GUIDE.md) | Guia | Setup de infraestructura IA |

---

## Referencia

| Documento | Tipo | Descripcion |
|-----------|------|-------------|
| [PROBLEM_ANALYSIS.md](PROBLEM_ANALYSIS.md) | Referencia | Analisis del problema de vision de tunel |
| [EXISTING_SOLUTIONS.md](EXISTING_SOLUTIONS.md) | Referencia | Soluciones existentes en el mercado |
| [TUNNEL_VISION_CASES.md](TUNNEL_VISION_CASES.md) | Referencia | Casos reales de vision de tunel |
| [FUTURE_IDEAS.md](FUTURE_IDEAS.md) | Referencia | Ideas de expansion futura |
| [TESTING-RESULTS-PHASE-3.8.md](TESTING-RESULTS-PHASE-3.8.md) | Referencia | Resultados de testing |
| [storage-visualization.md](storage-visualization.md) | Referencia | Visualizacion del storage |
| [PROJECT_ANALYSIS_DIAGRAM.md](PROJECT_ANALYSIS_DIAGRAM.md) | Referencia | Diagramas de analisis |

---

## Guias

| Documento | Tipo | Descripcion |
|-----------|------|-------------|
| [DOCUMENTATION_GUIDE.md](DOCUMENTATION_GUIDE.md) | Guia | Convenciones de documentacion |
| [TRANSFER_FROM_GITEACH.md](TRANSFER_FROM_GITEACH.md) | Guia | Transferencia desde GiTeach |

---

## Historico

> No usar para decisiones actuales. Solo contexto historico.

| Documento | Descripcion |
|-----------|-------------|
| [REFACTOR_PLAN.md](REFACTOR_PLAN.md) | Plan de refactorizacion (completado en v0.5.1) |

---

## Changelogs

Registro de cambios por version en [changelog/](../changelog/):

| Version | Descripcion |
|---------|-------------|
| [v0.5.2](../changelog/v0.5.2.md) | Documentation Overhaul, Rename & New Extractors |
| [v0.5.1](../changelog/v0.5.1.md) | Enterprise Architecture Refactor (147 modulos) |
| [v0.5.0](../changelog/v0.5.0.md) | Layer A/B Unification & Orchestrator |
| [v0.4.6](../changelog/v0.4.6.md) | Metadata Contract & Plug & Play |
| [v0.4.5](../changelog/v0.4.5.md) | MCP Unified Entry Point |
| [v0.4.0-v0.4.4](../changelog/v0.4.4.md) | Iteraciones anteriores |

Indice completo: [CHANGELOG.md](../CHANGELOG.md)

---

*Ultima actualizacion: 2026-02-06 (v0.5.2)*
