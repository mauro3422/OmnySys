# Índice de Documentación - OmnySys

**Versión**: v0.7.1
**Última actualización**: 2026-02-10

---

## 🚀 Empezar Aquí

Los documentos esenciales para comenzar con OmnySys:

| Documento | Descripción |
|-----------|-------------|
| [README.md](../README.md) | Instalación rápida (2 comandos) y overview del sistema |
| [INSTALL.md](../INSTALL.md) | Guía de instalación detallada |
| [GETTING_STARTED.md](../GETTING_STARTED.md) | Primeros pasos con OmnySys |
| [MCP_SETUP.md](../MCP_SETUP.md) | Configuración del servidor MCP |
| [FISICA_DEL_SOFTWARE.md](FISICA_DEL_SOFTWARE.md) | **⭐ Visión unificada**: De cajas con cables a átomos con electrones |

---

## 🏗️ Arquitectura

Documentación de la arquitectura del sistema:

### Core Architecture
| Documento | Descripción |
|-----------|-------------|
| [ARCHITECTURE.md](../ARCHITECTURE.md) | Arquitectura técnica completa de 3 capas |
| [architecture/CORE_PRINCIPLES.md](architecture/CORE_PRINCIPLES.md) | **⭐ Los 4 Pilares** del sistema |
| [architecture/ARCHITECTURE_MOLECULAR_PLAN.md](architecture/ARCHITECTURE_MOLECULAR_PLAN.md) | Plan de análisis atómico y molecular |
| [architecture/ARCHITECTURE_MOLECULAR_IMPLEMENTATION.md](architecture/ARCHITECTURE_MOLECULAR_IMPLEMENTATION.md) | Implementación del sistema molecular |
| [architecture/ARCHITECTURE_LAYER_A_B.md](architecture/ARCHITECTURE_LAYER_A_B.md) | Capas A (Static) y B (Semantic) |
| [architecture/DATA_FLOW_FRACTAL_DESIGN.md](architecture/DATA_FLOW_FRACTAL_DESIGN.md) | Diseño fractal del flujo de datos |
| [architecture/DATA_FLOW.md](architecture/DATA_FLOW.md) | **⭐ Data Flow System** - Comprehensive documentation (v1, v2, usage, implementation) |
| [architecture/METADATA_EXTRACTORS.md](architecture/METADATA_EXTRACTORS.md) | **Metadata Extractors** - Guía completa de extractores |

### Orchestrator & Data Flow
**⭐ NUEVO**: Documentación consolidada del flujo de datos y orchestrator.

| Documento | Descripción |
|-----------|-------------|
| [architecture/orchestrator/README.md](architecture/orchestrator/README.md) | **Índice y mapa del sistema** - Empezar aquí para entender el flujo |
| [architecture/orchestrator/01-FLUSO-VIDA-ARCHIVO.md](architecture/orchestrator/01-FLUSO-VIDA-ARCHIVO.md) | **Flujo completo**: Desde que tocas un archivo hasta que está disponible |
| [architecture/orchestrator/02-SISTEMA-CACHE.md](architecture/orchestrator/02-SISTEMA-CACHE.md) | **Los 4 cachés**: Por qué existen y cómo consolidarlos |
| [architecture/orchestrator/03-ORCHESTRATOR-INTERNO.md](architecture/orchestrator/03-ORCHESTRATOR-INTERNO.md) | **Cómo funciona internamente**: Colas, workers, decisión LLM |
| [architecture/orchestrator/04-TROUBLESHOOTING.md](architecture/orchestrator/04-TROUBLESHOOTING.md) | **Problemas comunes**: Cache desync, zombies, etc. |
| [architecture/orchestrator/05-CAMBIOS-RECIENTES.md](architecture/orchestrator/05-CAMBIOS-RECIENTES.md) | **Historial de fixes**: Qué se arregló y cuándo |

### Sistemas Especializados
| Documento | Descripción |
|-----------|-------------|
| [architecture/ARCHETYPE_SYSTEM.md](architecture/ARCHETYPE_SYSTEM.md) | Sistema de arquetipos |
| [architecture/ARCHETYPE_DEVELOPMENT_GUIDE.md](architecture/ARCHETYPE_DEVELOPMENT_GUIDE.md) | Guía para desarrollar arquetipos |
| [architecture/HYBRID_ANALYSIS_PIPELINE.md](architecture/HYBRID_ANALYSIS_PIPELINE.md) | Pipeline híbrido de análisis |
| [architecture/CONTEXT_SELECTION_ALGORITHMS.md](architecture/CONTEXT_SELECTION_ALGORITHMS.md) | Algoritmos de selección de contexto |

### Ecosistema
| Documento | Descripción |
|-----------|-------------|
| [architecture/ecosystem/ECOSYSTEM_ARCHITECTURE.md](architecture/ecosystem/ECOSYSTEM_ARCHITECTURE.md) | Todo se alimenta de todo |
| [architecture/ecosystem/VALUE_NETWORK.md](architecture/ecosystem/VALUE_NETWORK.md) | Red de valor del sistema |

---

## 🧬 Data Flow System (v0.7.1)

**Current Status**: Fase 1 (v2) ✅ 95% | Future Phases 🟡 Planned

### Main Documentation
| Documento | Descripción |
|-----------|-------------|
| [architecture/DATA_FLOW.md](architecture/DATA_FLOW.md) | **⭐ Complete guide** - v1, v2, architecture, implementation, usage |

### Future Phases (Roadmap)
| Documento | Descripción |
|-----------|-------------|
| [DATA_FLOW/README.md](DATA_FLOW/README.md) | **Roadmap index** - Future phases 2-5 (planned) |
| [DATA_FLOW/CONCEPTOS_CLAVE.md](DATA_FLOW/CONCEPTOS_CLAVE.md) | Core concepts (cables vs signals, fractal architecture) |
| [DATA_FLOW/04_FASE_CADENAS.md](DATA_FLOW/04_FASE_CADENAS.md) | 🟡 Fase 4: Cross-function chains (planned) |
| [DATA_FLOW/06_FASE_SIMULACION.md](DATA_FLOW/06_FASE_SIMULACION.md) | 🟡 Fase 6: Flow simulation (planned) |
| [DATA_FLOW/07_FASE_SISTEMA.md](DATA_FLOW/07_FASE_SISTEMA.md) | 🟡 Fase 7: System-level view (planned) |
| [DATA_FLOW/FASE_2_CROSS_FUNCTION_CHAINS.md](DATA_FLOW/FASE_2_CROSS_FUNCTION_CHAINS.md) | 🟡 Fase 2: Alternative cross-function design (planned) |
| [DATA_FLOW/FASE_3_MODULO_SISTEMA.md](DATA_FLOW/FASE_3_MODULO_SISTEMA.md) | 🟡 Fase 3: Module & system levels (planned) |

### Archived Design Documents
See [DATA_FLOW_CONSOLIDATION.md](DATA_FLOW_CONSOLIDATION.md) for details on consolidation.

**Archived to** `docs/archive/design/data-flow/`:
- `01_FASE_ATOMO.md` - Fase 1 design (superseded by v2 implementation)
- `02_FASE_SEMANTICA.md` - Semantic analysis design
- `03_FASE_ESTANDARIZACION.md` - Standardization design (implemented in v2)
- `05_FASE_RACE_CONDITIONS.md`, `08_FASE_4_RACE_CONDITIONS.md`, `09_FASE_5_SIMULATION.md` - Duplicates

**Archived to** `docs/archive/plans/data-flow/`:
- `PLAN_FASE_1_REVISADO.md`, `PLAN_FASE_1_IMPLEMENTADO.md` - Fase 1 plans (completed)

---

## 🪦 Shadow Registry (v0.7.1)

Sistema de linaje de archivos y metadata evolutiva:

| Documento | Descripción |
|-----------|-------------|
| [architecture/SHADOW_REGISTRY.md](architecture/SHADOW_REGISTRY.md) | **⭐ Arquitectura completa** - ADN, sombras, linaje y herencia |
| [guides/SHADOW_REGISTRY_USAGE.md](guides/SHADOW_REGISTRY_USAGE.md) | **Guía práctica de uso** - Casos comunes y ejemplos |
| [archive/plans/SHADOW_REGISTRY_PLAN.md](archive/plans/SHADOW_REGISTRY_PLAN.md) | Plan de implementación original (Fases 0-2) |

---

## 📖 Guías de Uso

Guías prácticas para usuarios y desarrolladores:

| Documento | Descripción |
|-----------|-------------|
| [guides/TOOLS_GUIDE.md](guides/TOOLS_GUIDE.md) | **⭐ Guía completa de las 14 herramientas MCP** |
| [guides/AI_MODELS_GUIDE.md](guides/AI_MODELS_GUIDE.md) | Guía de modelos de IA (LFM2.5, setup, prompting) |
| [guides/MCP_INTEGRATION_GUIDE.md](guides/MCP_INTEGRATION_GUIDE.md) | Integración con MCP |
| [guides/DOCUMENTATION_GUIDE.md](guides/DOCUMENTATION_GUIDE.md) | Guía de documentación |
| [guides/METADATA_INSIGHTS_GUIDE.md](guides/METADATA_INSIGHTS_GUIDE.md) | Guía de insights de metadata |
| [guides/METADATA_INSIGHTS_CATALOG.md](guides/METADATA_INSIGHTS_CATALOG.md) | Catálogo de insights |
| [guides/presentations/PRESENTATION_EXAMPLES.md](guides/presentations/PRESENTATION_EXAMPLES.md) | Ejemplos de presentaciones contextuales |
| [guides/presentations/SISTEMAS_NUEVOS_Y_ARQUETIPOS.md](guides/presentations/SISTEMAS_NUEVOS_Y_ARQUETIPOS.md) | Sistemas nuevos y arquetipos |
| [API_GUIDE.md](API_GUIDE.md) | Guía de la API del sistema |

---

## 📊 Análisis y Auditorías

Análisis del ecosistema y auditorías del sistema:

| Documento | Descripción |
|-----------|-------------|
| [analysis/COMPETITIVE_LANDSCAPE.md](analysis/COMPETITIVE_LANDSCAPE.md) | Análisis de competidores |
| [analysis/COMPETITIVE_STRATEGY.md](analysis/COMPETITIVE_STRATEGY.md) | Estrategia competitiva |
| [analysis/PROBLEM_ANALYSIS.md](analysis/PROBLEM_ANALYSIS.md) | Análisis del problema de visión de túnel |
| [analysis/TUNNEL_VISION_CASES.md](analysis/TUNNEL_VISION_CASES.md) | Casos de visión de túnel |
| [analysis/SYSTEM_ANALYSIS_OVERVIEW.md](analysis/SYSTEM_ANALYSIS_OVERVIEW.md) | Overview del análisis del sistema |
| [analysis/SYSTEM_ANALYSIS_EXTRACTORS.md](analysis/SYSTEM_ANALYSIS_EXTRACTORS.md) | Análisis de extractores |
| [analysis/SYSTEM_ANALYSIS_GAPS.md](analysis/SYSTEM_ANALYSIS_GAPS.md) | Gaps identificados |
| [analysis/PROJECT_ANALYSIS_DIAGRAM.md](analysis/PROJECT_ANALYSIS_DIAGRAM.md) | Diagrama de análisis |
| [FASES_CLARIFICATION.md](FASES_CLARIFICATION.md) | Clarificación de fases (dónde estamos) |
| [FLUJO_ACTUAL_SIMPLIFICADO.md](FLUJO_ACTUAL_SIMPLIFICADO.md) | Flujo actual simplificado |
| [INTEGRACION_COMPLETA_FLUJO.md](INTEGRACION_COMPLETA_FLUJO.md) | Integración completa del flujo |

---

## 🔮 Visión Futura

Ideas, conceptos y visión a largo plazo:

### Visión OmnyIDE y AGI
| Documento | Descripción |
|-----------|-------------|
| [OMNY_IDE_CONSCIENTE.md](OMNY_IDE_CONSCIENTE.md) | Visión del IDE consciente |
| [OMNY_IDE_CONSCIENTE_PRACTICO.md](OMNY_IDE_CONSCIENTE_PRACTICO.md) | Aspectos prácticos del IDE |
| [OMNY_IDE_CONSCIENTE_AGI.md](OMNY_IDE_CONSCIENTE_AGI.md) | Perspectiva AGI |
| [OMNY_AGI_ARQUITECTURA.md](OMNY_AGI_ARQUITECTURA.md) | Arquitectura AGI |
| [ideas/OMNYBRAIN_VISION.md](ideas/OMNYBRAIN_VISION.md) | Visión OmnyBrain |

### Roadmap
| Documento | Descripción |
|-----------|-------------|
| [ROADMAP.md](../ROADMAP.md) | Roadmap del proyecto |
| [future/FUTURE_IDEAS.md](future/FUTURE_IDEAS.md) | Ideas futuras (Fase 3+) |

### Ideas Avanzadas
| Documento | Descripción |
|-----------|-------------|
| [ideas/IDEAS_INDEX.md](ideas/IDEAS_INDEX.md) | **Índice de ideas** |
| [ideas/TRANSFORMATION_CONTRACTS.md](ideas/TRANSFORMATION_CONTRACTS.md) | Contratos de transformación |
| [ideas/VIRTUAL_FLOW_SIMULATION.md](ideas/VIRTUAL_FLOW_SIMULATION.md) | Simulación de flujos virtuales |
| [ideas/SEMANTIC_INTENT_ENRICHMENT.md](ideas/SEMANTIC_INTENT_ENRICHMENT.md) | Enriquecimiento de intención semántica |
| [ideas/UNIVERSAL_PATTERN_ENGINE.md](ideas/UNIVERSAL_PATTERN_ENGINE.md) | Motor de patrones universales |
| [ideas/DATA_COLLECTION_STRATEGY.md](ideas/DATA_COLLECTION_STRATEGY.md) | Estrategia de colección de datos |
| [ideas/VARIABLE_STANDARDIZATION.md](ideas/VARIABLE_STANDARDIZATION.md) | Estandarización de variables |
| [ideas/DEBUGGER_FOR_AIS.md](ideas/DEBUGGER_FOR_AIS.md) | Debugger para IAs |
| [ideas/LICENSING_STRATEGY.md](ideas/LICENSING_STRATEGY.md) | Estrategia de licenciamiento |
| [ideas/PHYSICS_OF_SOFTWARE_MANIFESTO.md](ideas/PHYSICS_OF_SOFTWARE_MANIFESTO.md) | Manifiesto de física del software |

---

## 🔧 Desarrollo Interno

Documentación para desarrollo y mantenimiento:

### Estado del Proyecto
| Documento | Descripción |
|-----------|-------------|
| [CHANGELOG.md](../CHANGELOG.md) | **Historial completo de versiones** |
| [TECHNICAL_STATUS.md](TECHNICAL_STATUS.md) | **Estado técnico actual v0.7.1** |
| [TESTING_GUIDE.md](TESTING_GUIDE.md) | **Guía de testing del sistema** |
| [MIGRATION_v0.6_to_v0.7.md](MIGRATION_v0.6_to_v0.7.md) | **Guía de migración v0.6 → v0.7** |
| [QUEDO_POR_HACER.md](../QUEDO_POR_HACER.md) | Tareas pendientes |
| [INTEGRITY_AND_CLEANUP.md](../INTEGRITY_AND_CLEANUP.md) | Integridad y limpieza del sistema |

### Consolidation Reports
| Documento | Descripción |
|-----------|-------------|
| [SHADOW_REGISTRY_CONSOLIDATION.md](SHADOW_REGISTRY_CONSOLIDATION.md) | Shadow Registry consolidation report (5→2 files, 60% reduction) |
| [DATA_FLOW_CONSOLIDATION.md](DATA_FLOW_CONSOLIDATION.md) | Data Flow consolidation report (15→7 files, 58% reduction) |
| [CLEANUP_REPORT.md](CLEANUP_REPORT.md) | Documentation cleanup report (3 dated reports archived) |

### Reportes Activos
| Documento | Descripción |
|-----------|-------------|
| [AUDIT_RESULTS.md](../AUDIT_RESULTS.md) | Resultados de auditoría v0.7.1 |
| [INTEGRATION_SUMMARY.md](../INTEGRATION_SUMMARY.md) | Resumen de integración v0.7.1 |

### Visión del Sistema
| Documento | Descripción |
|-----------|-------------|
| [OMNISCIENCIA.md](../OMNISCIENCIA.md) | Visión de omnisciencia del sistema |

### Desarrollo y Testing
| Documento | Descripción |
|-----------|-------------|
| [development/TODO-PENDIENTES.md](development/TODO-PENDIENTES.md) | TODOs pendientes |
| [development/TESTING-RESULTS-PHASE-3.8.md](development/TESTING-RESULTS-PHASE-3.8.md) | Resultados de testing |
| [development/RESEARCH_PUBLISHING_GUIDE.md](development/RESEARCH_PUBLISHING_GUIDE.md) | Guía de publicación de investigación |
| [development/metadata-prompt-system.md](development/metadata-prompt-system.md) | Sistema de prompts de metadata |

### IA y Optimizaciones
| Documento | Descripción |
|-----------|-------------|
| [ai_architecture/AI_SETUP_GUIDE.md](ai_architecture/AI_SETUP_GUIDE.md) | Guía de setup de IA |
| [ai_architecture/AI_OPTIMIZATIONS_2026.md](ai_architecture/AI_OPTIMIZATIONS_2026.md) | Optimizaciones de IA 2026 |

### ADRs (Architectural Decision Records)
| Documento | Descripción |
|-----------|-------------|
| [architectural-decision-records/ADR-001-type-based-prompt-selection.md](architectural-decision-records/ADR-001-type-based-prompt-selection.md) | Selección de prompts basada en tipo |

---

## 📦 Archivo

Documentos históricos y obsoletos:

| Documento | Descripción |
|-----------|-------------|
| [archive/README.md](archive/README.md) | **Índice de archivos históricos** |

### Total de documentos archivados: 38

**By category**:
- **Dated reports** (12): Point-in-time progress summaries, audits, verification reports
- **Design documents** (9): Pre-implementation design docs (Data Flow Fases 1-3, Shadow Registry plans)
- **Obsolete guides** (5): MCP_TOOLS v0.5.2, QWEN2.5_CODER_GUIDE, etc.
- **Merged documents** (4): COMPETITIVE-ANALYSIS, EXISTING_SOLUTIONS, etc.
- **Completed plans** (3): REFACTOR_PLAN v0.5.1, Shadow Registry plans, Data Flow plans
- **Integrated stubs** (3): AUTO_SERVE, ITERATIVE_MODE, FILE_WATCHER
- **Historical references** (2): TRANSFER_FROM_GITEACH, storage-visualization

**Recent additions** (2026-02-10):
- **Data Flow design docs** (8 files) → `archive/design/data-flow/`
- **Dated reports** (3 files) → `archive/reports/`

Ver [archive/README.md](archive/README.md) para detalles completos.

---

## 🎯 Rutas Rápidas por Rol

### 🔰 Para Usuarios Nuevos (15 min)
1. [README.md](../README.md) - Instalación (2 comandos)
2. [FASES_CLARIFICATION.md](FASES_CLARIFICATION.md) - Entender dónde estamos
3. [guides/TOOLS_GUIDE.md](guides/TOOLS_GUIDE.md) - Cómo usar las 14 herramientas

### 🏗️ Para Arquitectos
1. [FISICA_DEL_SOFTWARE.md](FISICA_DEL_SOFTWARE.md) - Visión unificada
2. [architecture/CORE_PRINCIPLES.md](architecture/CORE_PRINCIPLES.md) - Los 4 Pilares
3. [architecture/ARCHITECTURE_MOLECULAR_PLAN.md](architecture/ARCHITECTURE_MOLECULAR_PLAN.md) - Átomos y Moléculas
4. [architecture/SHADOW_REGISTRY.md](architecture/SHADOW_REGISTRY.md) - Sistema de Linaje

### 🧬 Para Entender el Ecosistema
1. [architecture/ecosystem/ECOSYSTEM_ARCHITECTURE.md](architecture/ecosystem/ECOSYSTEM_ARCHITECTURE.md) - Todo se alimenta de todo
2. [architecture/ecosystem/VALUE_NETWORK.md](architecture/ecosystem/VALUE_NETWORK.md) - Red de valor
3. [guides/presentations/PRESENTATION_EXAMPLES.md](guides/presentations/PRESENTATION_EXAMPLES.md) - Cómo se vería

### 🔧 Para Implementar
1. [guides/SHADOW_REGISTRY_USAGE.md](guides/SHADOW_REGISTRY_USAGE.md) - Guía de uso del Shadow Registry
2. [architecture/SHADOW_REGISTRY.md](architecture/SHADOW_REGISTRY.md) - Arquitectura técnica completa
3. [architecture/DATA_FLOW.md](architecture/DATA_FLOW.md) - Data Flow System complete guide

### 🔮 Para Visionarios
1. [OMNY_IDE_CONSCIENTE.md](OMNY_IDE_CONSCIENTE.md) - Visión del IDE consciente
2. [ideas/OMNYBRAIN_VISION.md](ideas/OMNYBRAIN_VISION.md) - OmnyBrain
3. [future/FUTURE_IDEAS.md](future/FUTURE_IDEAS.md) - Ideas futuras

---

## 📈 Estado de Fases (v0.7.1)

| Fase | Estado | Documentos |
|------|--------|------------|
| **Fase 0** - Limpieza | ✅ Completa | Archived to `archive/plans/` |
| **Fase 1** - Shadow Registry Core | ✅ Completa | [architecture/SHADOW_REGISTRY.md](architecture/SHADOW_REGISTRY.md) |
| **Fase 1** - Data Flow Atomic (v2) | ✅ 95% | [architecture/DATA_FLOW.md](architecture/DATA_FLOW.md) |
| **Fase 2** - Conexiones Enriquecidas | ✅ Completa | [architecture/ecosystem/](architecture/ecosystem/) |
| **Fase 3+** - ML/Predicción | 🔮 Futuro | [future/FUTURE_IDEAS.md](future/FUTURE_IDEAS.md) |

---

## 📊 Estadísticas de Documentación

- **Total de documentos activos**: 80+ archivos Markdown
- **Arquitectura**: 13 documentos (includes consolidated DATA_FLOW.md)
- **Data Flow**: 7 documentos (1 main + 6 future roadmap)
- **Shadow Registry**: 2 documentos (consolidated from 5)
- **Guías**: 10 documentos
- **Análisis**: 9 documentos
- **Ideas y Futuro**: 16 documentos
- **Desarrollo**: 11 documentos (includes 3 consolidation reports)
- **Archivados**: 38 documentos (26 original + 9 Data Flow + 3 reports)

---

**OmnySys v0.7.1** - Data Flow Fractal + Shadow Registry + 14 herramientas MCP
