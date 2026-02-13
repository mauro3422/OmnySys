# Archivo Histórico - OmnySys

**Ubicación:** `docs/archive/`  
**Propósito:** Documentos históricos, consolidados y obsoletos

---

## ⚠️ Información Importante - DOCUMENTOS RESCATADOS

### 🚨 Documentos Rescatados a Documentación Activa

Los siguientes documentos fueron **rescatados** del archivo porque contienen información valiosa:

### 📊 Análisis Competitivo y Estratégico
| Documento Archivado | Destino en docs/ | Por Qué Se Rescató |
|---------------------|------------------|-------------------|
| **COMPETITIVE-ANALYSIS.md** | [05-roadmap/competitors-detailed-analysis.md](../05-roadmap/competitors-detailed-analysis.md) | **⭐ COMPETIDORES REALES: Qodo, Augment Code, Code Pathfinder** |
| **EXISTING_SOLUTIONS.md** | [05-roadmap/competitors-existing-solutions.md](../05-roadmap/competitors-existing-solutions.md) | **Análisis de soluciones existentes (MCP, Dependency Cruiser, etc.)** |

### 🔬 Técnico y de Modelos
| Documento Archivado | Destino en docs/ | Por Qué Se Rescató |
|---------------------|------------------|-------------------|
| **SEMANTIC_LAYER_MODELS.md** | [06-reference/ai/semantic-layer-models.md](../06-reference/ai/semantic-layer-models.md) | Análisis detallado LFM2.5 vs Qwen3, benchmarks |
| **QWEN2.5_CODER_GUIDE.md** | [06-reference/ai/qwen2.5-coder-guide.md](../06-reference/ai/qwen2.5-coder-guide.md) | Guía de modelo alternativo (+40% más rápido) |

### 🔧 Auditorías y Reportes
| Documento Archivado | Destino en docs/ | Por Qué Se Rescató |
|---------------------|------------------|-------------------|
| **SYSTEM_ANALYSIS_REPORT.md** | [06-reference/analysis-reports/system-analysis-critical.md](../06-reference/analysis-reports/system-analysis-critical.md) | Problemas críticos encontrados en auditoría |
| **COMPLETE_REFACTORING_REPORT.md** | [06-reference/analysis-reports/refactoring-report-v0.7.1.md](../06-reference/analysis-reports/refactoring-report-v0.7.1.md) | Cambios realizados en v0.7.1 |
| **AUDIT_ARCHITECTURE.md** | [06-reference/audit-architecture.md](../06-reference/audit-architecture.md) | Auditoría de arquitectura |
| **AUDIT_FOLLOW_UP.md** | [06-reference/audit-follow-up.md](../06-reference/audit-follow-up.md) | Follow-up de auditoría |
| **CORRECTIONS_SUMMARY.md** | [06-reference/corrections-summary.md](../06-reference/corrections-summary.md) | Resumen de correcciones |
| **PLAN_MAESTRO_CORRECCION.md** | [06-reference/plan-maestro-correccion.md](../06-reference/plan-maestro-correccion.md) | Plan maestro de correcciones v0.7.1 |

### 📚 Guías y Referencias
| Documento Archivado | Destino en docs/ | Por Qué Se Rescató |
|---------------------|------------------|-------------------|
| **METADATA-INSIGHTS-GUIDE.md** | [06-reference/metadata-insights-guide-detailed.md](../06-reference/metadata-insights-guide-detailed.md) | Guía completa de metadata insights |
| **MCP_TOOLS.md** | [06-reference/mcp-tools-detailed.md](../06-reference/mcp-tools-detailed.md) | Documentación detallada de MCP tools |
| **storage-visualization.md** | [06-reference/storage-visualization.md](../06-reference/storage-visualization.md) | Visualización de estructura de storage |
| **AUTO_INSTALLATION.md** | [04-guides/installation-auto.md](../04-guides/installation-auto.md) | Guía de instalación automática |

### 🏛️ Históricos
| Documento Archivado | Destino en docs/ | Por Qué Se Rescató |
|---------------------|------------------|-------------------|
| **1_GEMINI_CONVERSATION_2026_02_08.md** | [05-roadmap/historical/gemini-validation-2026-02-08.md](../05-roadmap/historical/gemini-validation-2026-02-08.md) | Validación del proyecto por Gemini (origen) |
| **NEXT_STEPS_ROADMAP.md** | [05-roadmap/next-steps-detailed.md](../05-roadmap/next-steps-detailed.md) | Roadmap con tareas específicas |

**Total rescatados:** 16 documentos

---

## 🗑️ Documentos Eliminados (Redundantes)

Los siguientes documentos fueron **eliminados** del archivo porque eran redundantes o muy desactualizados:

| Documento Eliminado | Razón |
|---------------------|-------|
| **REFACTORING_SUMMARY.md** | Redundante con `refactoring-report-v0.7.1.md` (más completo) |
| **REFACTOR_PLAN.md** | Histórico v0.5.1, ya completado |
| **LOG_MIGRATION_COMPLETE.md** | Log de migración, no aporta valor actual |
| **AI_CONSOLIDATION_MODE.md** | Feature específica ya documentada en código |
| **ITERATIVE_MODE.md** | Feature específica ya documentada en código |
| **MCP_SETUP.md** | Redundante con `MCP_SETUP.md` en raíz |
| **AUTO_SERVE_IMPLEMENTATION.md** | Feature específica ya documentada |
| **FILE_WATCHER_ANALYSIS.md** | Redundante con documentación en `03-orchestrator/` |

**Total eliminados:** 8 documentos

---

## Estructura del Archivo

```
archive/
├── consolidated/          # 30+ documentos consolidados en nueva estructura
│   └── (01-CORE_PRINCIPLES.md, 02-FISICA_DEL_SOFTWARE.md, etc.)
├── design/               # Documentos de diseño de fases futuras
│   └── data-flow/        # Fases 2-5 de Data Flow
├── plans/                # Planes de implementación históricos
│   └── SHADOW_REGISTRY_PLAN.md
├── reports/              # Reportes de consolidación
├── src-archive/          # Código fuente archivado (DATA_FLOW/src/)
└── README.md             # Este archivo
```

---

## Documentos Consolidados (30+)

Estos documentos fueron integrados en la nueva estructura:

### Core (01-core/)
- `01-CORE_PRINCIPLES.md` → [01-core/principles.md](../01-core/principles.md)
- `02-FISICA_DEL_SOFTWARE.md` → [01-core/philosophy.md](../01-core/philosophy.md)
- `PROBLEM_ANALYSIS.md` + `TUNNEL_VISION_CASES.md` → [01-core/problem.md](../01-core/problem.md)

### Arquitectura (02-architecture/)
- `03-DATA_FLOW_FRACTAL_DESIGN.md` → [02-architecture/data-flow/](../02-architecture/data-flow/)
- `04-ARCHETYPE_SYSTEM.md` → [02-architecture/archetypes/system.md](../02-architecture/archetypes/system.md)
- `05-ARCHETYPE_DEVELOPMENT_GUIDE.md` → [02-architecture/archetypes/development.md](../02-architecture/archetypes/development.md)
- `06-SHADOW_REGISTRY.md` → [02-architecture/shadow-registry/](../02-architecture/shadow-registry/)
- `07-SHADOW_REGISTRY_USAGE.md` → [02-architecture/shadow-registry/usage.md](../02-architecture/shadow-registry/usage.md)
- `08-ECOSYSTEM_ARCHITECTURE.md` + `09-VALUE_NETWORK.md` → [02-architecture/ecosystem/](../02-architecture/ecosystem/)

### Guías (04-guides/)
- `10-TOOLS_GUIDE.md` → [04-guides/tools.md](../04-guides/tools.md)
- `11-MCP_INTEGRATION_GUIDE.md` → [04-guides/mcp-integration.md](../04-guides/mcp-integration.md)
- `12-AI_MODELS_GUIDE.md` → [04-guides/ai-setup.md](../04-guides/ai-setup.md)
- `13-HOT_RELOAD_USAGE.md` → [04-guides/development.md](../04-guides/development.md)
- `EXTRAPOLACION_OMNYSYS.md` → [04-guides/reuse.md](../04-guides/reuse.md)

### Roadmap (05-roadmap/)
- `FUTURE_IDEAS.md` → [05-roadmap/future-ideas.md](../05-roadmap/future-ideas.md)
- `OMNY_AGI_ARQUITECTURA.md` → [05-roadmap/agi-vision.md](../05-roadmap/agi-vision.md)
- `OMNYBRAIN_VISION.md` + `UNIVERSAL_PATTERN_ENGINE.md` → [05-roadmap/omnybrain-cognition.md](../05-roadmap/omnybrain-cognition.md)
- `TUNNEL_VISION_CASES.md` → [05-roadmap/ (consolidado en problem.md)]

---

## Código Fuente Archivado

La carpeta `src-archive/` contiene código fuente que estaba en `DATA_FLOW/src/`:

- **Estado**: No integrado al sistema actual
- **Propósito**: Revisión futura para implementación de fases 2-5 de Data Flow
- **Ubicación**: `archive/src-archive/data-flow/`
- **Contenido**: Extractores de data flow (visitors, analyzers, utils)

---

## Documentos Históricos Misceláneos

Otros documentos en el archivo que pueden tener información relevante:

| Documento | Contenido |
|-----------|-----------|
| `TRANSFER_FROM_GITEACH.md` | Guía para transferir modelos LLM desde proyecto Giteach |
| `AI_SETUP_GUIDE.md` (en ai_architecture/) | Setup de AI con Vulkan |
| `QWEN2.5_CODER_GUIDE.md` | Guía del modelo Qwen2.5 |
| `PROGRESS_SUMMARY_2026-02-09.md` | Resumen de progreso |
| `REFACTOR_PLAN.md` | Plan de refactorización |
| `REFACTORING_SUMMARY.md` | Resumen de refactoring |

---

## Notas para el Mantenedor

1. **No modificar documentos archivados** - Son referencia histórica
2. **Si se rescata información**: Mover a docs/ con header de "rescatado"
3. **Actualizar este README** si se rescata más documentos
4. **Los documentos consolidados** tienen headers indicando su destino
5. **Los documentos rescatados** se marcan con ⭐ en el índice

---

**Última actualización**: 2026-02-12  
**Total documentos en archivo**: 60  
**Documentos rescatados**: 16  
**Documentos consolidados**: 30+  
**Documentos eliminados**: 8 (redundantes)
