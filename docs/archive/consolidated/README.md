# Documentos Archivados - Consolidados

**Fecha de consolidación**: 2026-02-12  
**Estado**: Reemplazados por nueva documentación estructurada

---

## ¿Qué pasó con estos documentos?

Estos documentos han sido **consolidados** en la nueva estructura de documentación:

```
docs/
├── 01-core/              ← Fundamentos unificados
├── 02-architecture/      ← Sistemas técnicos organizados
├── 03-orchestrator/      ← Flujo de datos y operación
└── 04-guides/            ← Guías prácticas
```

---

## Mapa de Reubicación

| Documento Archivado | Nuevo Ubicación | Razón |
|---------------------|-----------------|-------|
| `CORE_PRINCIPLES.md` | `01-core/principles.md` | Consolidado con filosofía |
| `FISICA_DEL_SOFTWARE.md` | `01-core/philosophy.md` | Fusionado con OMNISCIENCIA |
| `DATA_FLOW.md` | `02-architecture/data-flow/*.md` | Dividido en conceptos + implementación + roadmap |
| `DATA_FLOW_FRACTAL_DESIGN.md` | `02-architecture/data-flow/concepts.md` | Conceptos unificados |
| `ARCHETYPE_SYSTEM.md` | `02-architecture/archetypes/system.md` | Catálogo + sistema de confianza |
| `ARCHETYPE_DEVELOPMENT_GUIDE.md` | `02-architecture/archetypes/development.md` | Guía de desarrollo |
| `SHADOW_REGISTRY.md` | `02-architecture/shadow-registry/*.md` | Dividido en ADN + ciclo de vida + uso |
| `SHADOW_REGISTRY_USAGE.md` | `02-architecture/shadow-registry/usage.md` | API práctica |
| `ECOSYSTEM_ARCHITECTURE.md` | `02-architecture/ecosystem/architecture.md` | Arquitectura de ecosistema |
| `VALUE_NETWORK.md` | `02-architecture/ecosystem/value-flow.md` | Flujo de valor |
| `TOOLS_GUIDE.md` | `04-guides/tools.md` | Referencia de tools |
| `MCP_INTEGRATION_GUIDE.md` | `04-guides/mcp-integration.md` | Integración con IDEs |
| `AI_MODELS_GUIDE.md` | `04-guides/ai-setup.md` | Setup de IA |
| `HOT_RELOAD_USAGE.md` | `04-guides/development.md` | Desarrollo + hot-reload |

---

## ¿Por qué se consolidaron?

### Problemas antes:
- **Duplicación**: Mismos conceptos en múltiples documentos
- **Dispersión**: Información relacionada en carpetas diferentes
- **Navegación difícil**: 80+ documentos sin estructura clara

### Solución:
- **Estructura jerárquica**: 01-core → 02-architecture → 03-orchestrator → 04-guides
- **Un sistema por carpeta**: Data Flow, Arquetipos, Shadow Registry, cada uno con su README
- **Sin duplicación**: Cada concepto en un solo lugar
- **Referencias cruzadas**: Cada doc apunta a los relacionados

---

## ¿Debo usar estos documentos archivados?

**NO** - Usa la nueva estructura:

1. **Para entender conceptos**: Ve a `docs/01-core/`
2. **Para entender sistemas**: Ve a `docs/02-architecture/`
3. **Para usar las tools**: Ve a `docs/04-guides/`
4. **Para troubleshooting**: Ve a `docs/03-orchestrator/`

---

## Historial

- **2026-02-12**: Fase 1-6 completadas, documentación consolidada
- **Estado**: Los documentos originales se mantienen aquí por referencia histórica

---

**Ir a la nueva documentación**: [docs/INDEX.md](../../INDEX.md)
