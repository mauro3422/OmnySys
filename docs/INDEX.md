# Índice de Documentación - OmnySys

**Versión**: v0.7.1  
**Última actualización**: 2026-02-12  
**Estado**: ✅ **REESTRUCTURACIÓN COMPLETA**

---

## 📚 Estructura de Documentación

```
docs/
├── 01-core/           🎯 Fundamentos (leer primero)
├── 02-architecture/   🏗️ Arquitectura técnica
├── 03-orchestrator/   ⚙️ Flujo de datos y orquestación
├── 04-guides/         🛠️ Guías prácticas
├── 05-roadmap/        🔮 Roadmap e investigación
├── 06-reference/      📚 Referencia técnica
└── archive/           🗄️ Archivo histórico
```

---

## 🚀 Empezar Aquí

### Para Entender el Sistema (Obligatorio)

| Ruta | Documento | Descripción |
|------|-----------|-------------|
| **01-core/** | [problem.md](01-core/problem.md) | **⭐ El problema**: Visión de túnel en IAs |
| **01-core/** | [principles.md](01-core/principles.md) | **⭐ Los 4 Pilares** del diseño |
| **01-core/** | [philosophy.md](01-core/philosophy.md) | **⭐ Física del Software** + Omnisciencia |
| **01-core/** | [README.md](01-core/README.md) | Índice de fundamentos |

### Para Instalar y Usar

| Ruta | Documento | Descripción |
|------|-----------|-------------|
| **(raíz)** | [INSTALL.md](../INSTALL.md) | **⭐ Guía de instalación completa** |
| **(raíz)** | [GETTING_STARTED.md](../GETTING_STARTED.md) | **⭐ Primeros pasos** |
| **(raíz)** | [MCP_SETUP.md](../MCP_SETUP.md) | Configuración del servidor MCP |
| **04-guides/** | [quickstart.md](04-guides/quickstart.md) | Empezar en 5 minutos (rápido) |
| **04-guides/** | [installation-auto.md](04-guides/installation-auto.md) | **⭐ Instalación automática** (rescatado) |
| **04-guides/** | [tools.md](04-guides/tools.md) | **14 herramientas MCP** disponibles |
| **04-guides/** | [mcp-integration.md](04-guides/mcp-integration.md) | Integrar con tu IDE |
| **04-guides/** | [reuse.md](04-guides/reuse.md) | Reusar componentes en tu proyecto |
| **04-guides/** | [development.md](04-guides/development.md) | Desarrollo y debugging |
| **04-guides/** | [ai-setup.md](04-guides/ai-setup.md) | Configurar modelos de IA |

---

## 🏗️ Arquitectura (02-architecture/)

### Core
| Documento | Descripción |
|-----------|-------------|
| [core.md](02-architecture/core.md) | Arquitectura de capas A y B |
| [context-selection.md](02-architecture/context-selection.md) | Algoritmos de selección de contexto |

### Data Flow Fractal
| Documento | Descripción |
|-----------|-------------|
| [data-flow/README.md](02-architecture/data-flow/README.md) | Índice de Data Flow |
| [data-flow/concepts.md](02-architecture/data-flow/concepts.md) | Conceptos clave (Cables vs Señales, Fractal) |
| [data-flow/atom-extraction.md](02-architecture/data-flow/atom-extraction.md) | Extracción atómica (implementado) |
| [data-flow/roadmap.md](02-architecture/data-flow/roadmap.md) | Roadmap fases 2-5 |

### Arquetipos
| Documento | Descripción |
|-----------|-------------|
| [archetypes/README.md](02-architecture/archetypes/README.md) | Índice de arquetipos |
| [archetypes/system.md](02-architecture/archetypes/system.md) | Catálogo de arquetipos |
| [archetypes/development.md](02-architecture/archetypes/development.md) | Crear nuevos arquetipos |

### Shadow Registry
| Documento | Descripción |
|-----------|-------------|
| [shadow-registry/README.md](02-architecture/shadow-registry/README.md) | Índice del Shadow Registry |
| [shadow-registry/dna-system.md](02-architecture/shadow-registry/dna-system.md) | ADN estructural |
| [shadow-registry/lifecycle.md](02-architecture/shadow-registry/lifecycle.md) | Ciclo de vida de archivos |
| [shadow-registry/usage.md](02-architecture/shadow-registry/usage.md) | Guía de uso |

### Ecosistema
| Documento | Descripción |
|-----------|-------------|
| [ecosystem/README.md](02-architecture/ecosystem/README.md) | Índice del ecosistema |
| [ecosystem/architecture.md](02-architecture/ecosystem/architecture.md) | Arquitectura de valor |
| [ecosystem/value-flow.md](02-architecture/ecosystem/value-flow.md) | Flujo de valor |

---

## ⚙️ Orchestrator (03-orchestrator/)

| Documento | Descripción |
|-----------|-------------|
| [readme.md](03-orchestrator/readme.md) | Índice del orchestrator |
| [01-flujo-vida-archivo.md](03-orchestrator/01-flujo-vida-archivo.md) | Pipeline completo |
| [02-sistema-cache.md](03-orchestrator/02-sistema-cache.md) | Sistema de caché |
| [03-orchestrator-interno.md](03-orchestrator/03-orchestrator-interno.md) | Funcionamiento interno |
| [04-troubleshooting.md](03-orchestrator/04-troubleshooting.md) | Problemas comunes |
| [05-cambios-recientes.md](03-orchestrator/05-cambios-recientes.md) | Historial de fixes |

---

## 🔮 Roadmap e Investigación (05-roadmap/)

### Análisis Estratégico
| Documento | Descripción |
|-----------|-------------|
| [competitive-analysis.md](05-roadmap/competitive-analysis.md) | **⭐ Análisis de competencia** - Posicionamiento vs Copilot, Cody, Aider |
| [competitors-detailed-analysis.md](05-roadmap/competitors-detailed-analysis.md) | **⭐⭐ COMPETIDORES REALES** - Qodo, Augment Code, Code Pathfinder (rescatado) |
| [competitors-existing-solutions.md](05-roadmap/competitors-existing-solutions.md) | **⭐ Análisis de soluciones existentes** - MCP servers, Dependency Cruiser (rescatado) |

### Roadmap Práctico
| Documento | Descripción |
|-----------|-------------|
| [future-ideas.md](05-roadmap/future-ideas.md) | Ideas futuras y roadmap |
| [next-steps-detailed.md](05-roadmap/next-steps-detailed.md) | **⭐ Roadmap detallado** con tareas específicas (rescatado) |

### Históricos
| Documento | Descripción |
|-----------|-------------|
| [historical/gemini-validation-2026-02-08.md](05-roadmap/historical/gemini-validation-2026-02-08.md) | **⭐ Validación por Gemini** - Origen del proyecto (rescatado) |

### Visión e Investigación
| Documento | Descripción |
|-----------|-------------|
| [agi-vision.md](05-roadmap/agi-vision.md) | 🧪 Hipótesis AGI |
| [intuition-engine-vision.md](05-roadmap/intuition-engine-vision.md) | 🧪 Motor de intuición |
| [omnybrain-cognition.md](05-roadmap/omnybrain-cognition.md) | 🧪 Cognición artificial |
| [hardware-vision.md](05-roadmap/hardware-vision.md) | 🧪 OmnySys para hardware |
| [omnysys-seed.md](05-roadmap/omnysys-seed.md) | Semilla de cognición estructural |

### Omny IDE Visión
| Documento | Descripción |
|-----------|-------------|
| [omny-ide/omny-ide.md](05-roadmap/omny-ide/omny-ide.md) | Visión del IDE |
| [omny-ide/omny-ide-agi.md](05-roadmap/omny-ide/omny-ide-agi.md) | Camino a AGI práctica |
| [omny-ide/omny-ide-practico.md](05-roadmap/omny-ide/omny-ide-practico.md) | Revolución en programación |

---

## 📚 Referencia Técnica (06-reference/)

### Análisis del Sistema
| Documento | Descripción |
|-----------|-------------|
| [analysis/system-overview.md](06-reference/analysis/system-overview.md) | Overview del análisis |
| [analysis/system-gaps.md](06-reference/analysis/system-gaps.md) | Gaps identificados |
| [analysis/system-extractors.md](06-reference/analysis/system-extractors.md) | Análisis de extractores |

### Análisis y Reportes (Rescatados del archivo)
| Documento | Descripción |
|-----------|-------------|
| [analysis-reports/system-analysis-critical.md](06-reference/analysis-reports/system-analysis-critical.md) | **⭐ Auditoría crítica** - Problemas encontrados |
| [analysis-reports/refactoring-report-v0.7.1.md](06-reference/analysis-reports/refactoring-report-v0.7.1.md) | **⭐ Reporte de refactorización** v0.7.1 |
| [audit-architecture.md](06-reference/audit-architecture.md) | **⭐ Auditoría de arquitectura** |
| [audit-follow-up.md](06-reference/audit-follow-up.md) | **⭐ Follow-up de auditoría** |
| [corrections-summary.md](06-reference/corrections-summary.md) | **⭐ Resumen de correcciones** |
| [plan-maestro-correccion.md](06-reference/plan-maestro-correccion.md) | **⭐ Plan maestro de corrección** |
| [analysis-reports/analisis-cache-completo.md](06-reference/analysis-reports/analisis-cache-completo.md) | Análisis de caché |
| [analysis-reports/analisis-mcp-completo.md](06-reference/analysis-reports/analisis-mcp-completo.md) | Análisis MCP |
| [analysis-reports/flujo-actual-simplificado.md](06-reference/analysis-reports/flujo-actual-simplificado.md) | Flujo actual |
| [technical-status.md](06-reference/technical-status.md) | Estado técnico v0.7.1 |

### Desarrollo y Testing
| Documento | Descripción |
|-----------|-------------|
| [development/todo-pendientes.md](06-reference/development/todo-pendientes.md) | TODOs pendientes |
| [development/testing-results-phase-3.8.md](06-reference/development/testing-results-phase-3.8.md) | Resultados de testing |
| [testing-guide.md](06-reference/testing-guide.md) | Guía de testing |
| [hot-reload-design.md](06-reference/hot-reload-design.md) | Diseño de hot-reload |

### Documentación Técnica Implementada
| Documento | Descripción |
|-----------|-------------|
| [technical/virtual-flow-simulation.md](06-reference/technical/virtual-flow-simulation.md) | Simulación de flujos (✅ implementado) |
| [technical/transformation-contracts.md](06-reference/technical/transformation-contracts.md) | Contratos de transformación (✅ implementado) |
| [technical/variable-standardization.md](06-reference/technical/variable-standardization.md) | Estandarización (✅ implementado) |
| [technical/metadata-extractors.md](06-reference/technical/metadata-extractors.md) | Sistema de extractores |
| [technical/hybrid-analysis-pipeline.md](06-reference/technical/hybrid-analysis-pipeline.md) | Pipeline híbrido |
| [technical/metadata-insights-guide.md](06-reference/technical/metadata-insights-guide.md) | Guía de metadata |
| [technical/metadata-insights-catalog.md](06-reference/technical/metadata-insights-catalog.md) | Catálogo de metadata |

### MCP (Rescatados)
| Documento | Descripción |
|-----------|-------------|
| [mcp/mcp-maintenance-guide.md](06-reference/mcp/mcp-maintenance-guide.md) | Guía de mantenimiento |
| [mcp/mcp-problems-analysis.md](06-reference/mcp/mcp-problems-analysis.md) | Análisis de problemas |
| [mcp-tools-detailed.md](06-reference/mcp-tools-detailed.md) | **⭐ Documentación detallada de tools** |

### Migración
| Documento | Descripción |
|-----------|-------------|
| [migration/v0.6-to-v0.7.md](06-reference/migration/v0.6-to-v0.7.md) | Migración v0.6→v0.7 |
| [migration/query-refactor-plan.md](06-reference/migration/query-refactor-plan.md) | Plan de refactor |

### AI y Modelos (Rescatados)
| Documento | Descripción |
|-----------|-------------|
| [ai/AI_SETUP_GUIDE.md](06-reference/ai/AI_SETUP_GUIDE.md) | Setup de IA |
| [ai/AI_OPTIMIZATIONS_2026.md](06-reference/ai/AI_OPTIMIZATIONS_2026.md) | Optimizaciones |
| [ai/semantic-layer-models.md](06-reference/ai/semantic-layer-models.md) | **⭐ Análisis LFM2.5 vs Qwen3** |
| [ai/qwen2.5-coder-guide.md](06-reference/ai/qwen2.5-coder-guide.md) | **⭐ Guía Qwen2.5** (+40% más rápido) |
| [metadata-insights-guide-detailed.md](06-reference/metadata-insights-guide-detailed.md) | **⭐ Guía completa de metadata insights** |
| [storage-visualization.md](06-reference/storage-visualization.md) | **⭐ Visualización de storage** |
| [decisions/ADR-001-type-based-prompt-selection.md](06-reference/decisions/ADR-001-type-based-prompt-selection.md) | ADR-001 |

---

## 🗄️ Archivo Histórico (archive/)

Documentos históricos, consolidados y obsoletos:

| Sección | Contenido |
|---------|-----------|
| [archive/README.md](archive/README.md) | **⭐ Índice del archivo** - Qué se rescató, qué se consolidó |
| `archive/consolidated/` | 30+ documentos consolidados en nueva estructura |
| `archive/design/` | Documentos de diseño de fases futuras |
| `archive/reports/` | Reportes de consolidación y limpieza |
| `archive/src-archive/` | Código fuente archivado para revisión |

**Nota**: Algunos documentos importantes fueron [rescatados del archivo](archive/README.md) a la documentación activa.

---

## 📋 Documentos Clave en Raíz

| Documento | Descripción |
|-----------|-------------|
| [README.md](../README.md) | Overview y entrada principal del proyecto |
| [ROADMAP.md](../ROADMAP.md) | Roadmap técnico detallado |
| [ARCHITECTURE.md](../ARCHITECTURE.md) | Arquitectura técnica completa |
| [CHANGELOG.md](../CHANGELOG.md) | Historial de cambios (índice) |
| [QUEDO_POR_HACER.md](../QUEDO_POR_HACER.md) | Tareas pendientes del sistema |
| [OMNISCIENCIA.md](../OMNISCIENCIA.md) | Visión de omnisciencia |
| [AUDIT_RESULTS.md](../AUDIT_RESULTS.md) | Resultados de auditoría |
| [INTEGRATION_SUMMARY.md](../INTEGRATION_SUMMARY.md) | Resumen de integraciones |
| [INTEGRITY_AND_CLEANUP.md](../INTEGRITY_AND_CLEANUP.md) | Estrategia de integridad |

---

## 📊 Estadísticas

- **Documentos activos**: 101
- **Documentos archivados**: 60
- **Documentos rescatados del archivo**: 16
- **Documentos eliminados**: 8 (redundantes)
- **Total**: 161 documentos organizados

---

## 🎯 Próximos Pasos

1. **Nuevo usuario**: Empezar en [01-core/problem.md](01-core/problem.md)
2. **Desarrollador**: Ver [04-guides/quickstart.md](04-guides/quickstart.md)
3. **Investigador**: Explorar [05-roadmap/](05-roadmap/)
4. **Debugger**: Ver [03-orchestrator/04-troubleshooting.md](03-orchestrator/04-troubleshooting.md)
