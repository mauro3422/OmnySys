# Índice de Documentación - OmnySys

**Versión**: v0.9.4  
**Última actualización**: 2026-02-14  
**Estado**: ✅ **CONSOLIDADO**

---

## 📚 Estructura de Documentación

```
docs/
├── 01-core/           🎯 Fundamentos (leer primero)
├── 02-architecture/   🏗️ Arquitectura técnica
├── 03-orchestrator/   ⚙️ Orquestador y flujo de datos
├── 04-guides/         🛠️ Guías prácticas
├── 05-roadmap/        🔮 Roadmap e investigación
├── 06-reference/      📚 Referencia técnica (esencial)
└── archive/           🗄️ Archivo histórico
```

---

## 🚀 Empezar Aquí

### Para Entender el Sistema

| Ruta | Documento | Descripción |
|------|-----------|-------------|
| **01-core/** | [problem.md](01-core/problem.md) | **⭐ El problema**: Visión de túnel en IAs |
| **01-core/** | [principles.md](01-core/principles.md) | **⭐ Los 4 Pilares** del diseño |
| **01-core/** | [philosophy.md](01-core/philosophy.md) | **⭐ Física del Software** + Omnisciencia |

### Para Instalar y Usar

| Ruta | Documento | Descripción |
|------|-----------|-------------|
| **(raíz)** | [INSTALL.md](../INSTALL.md) | Guía de instalación completa |
| **(raíz)** | [GETTING_STARTED.md](../GETTING_STARTED.md) | Primeros pasos |
| **04-guides/** | [quickstart.md](04-guides/quickstart.md) | Empezar en 5 minutos |
| **04-guides/** | [tools.md](04-guides/tools.md) | 14 herramientas MCP |

---

## 🏗️ Arquitectura (02-architecture/)

| Documento | Descripción |
|-----------|-------------|
| [core.md](02-architecture/core.md) | Arquitectura unificada (Layer A + Orchestrator) |
| [context-selection.md](02-architecture/context-selection.md) | Algoritmos de selección de contexto |
| **data-flow/** | |
| ├─ [README.md](02-architecture/data-flow/README.md) | Índice de Data Flow |
| ├─ [concepts.md](02-architecture/data-flow/concepts.md) | Conceptos clave (Cables, Fractal, Zero LLM) |
| ├─ [atom-extraction.md](02-architecture/data-flow/atom-extraction.md) | Extracción atómica implementada (v2) |
| └─ [roadmap.md](02-architecture/data-flow/roadmap.md) | Fases 2-5 planificadas |
| [shadow-registry.md](02-architecture/shadow-registry.md) | ADN + ciclo de vida de código |
| [archetypes.md](02-architecture/archetypes.md) | Catálogo de arquetipos + sistema de confianza |

---

## ⚙️ Orchestrator (03-orchestrator/)

| Documento | Descripción |
|-----------|-------------|
| [readme.md](03-orchestrator/readme.md) | Índice del orchestrator |
| [01-flujo-vida-archivo.md](03-orchestrator/01-flujo-vida-archivo.md) | Pipeline completo de análisis |
| [03-orchestrator-interno.md](03-orchestrator/03-orchestrator-interno.md) | Decisiones LLM, gates, prioridad |
| [02-sistema-cache.md](03-orchestrator/02-sistema-cache.md) | Sistema de caché |
| [04-troubleshooting.md](03-orchestrator/04-troubleshooting.md) | Problemas comunes |

---

## 🛠️ Guías Prácticas (04-guides/)

| Documento | Descripción |
|-----------|-------------|
| [quickstart.md](04-guides/quickstart.md) | Empezar en 5 minutos |
| [installation-auto.md](04-guides/installation-auto.md) | Instalación automática |
| [mcp-integration.md](04-guides/mcp-integration.md) | Integrar con tu IDE |
| [development.md](04-guides/development.md) | Desarrollo y debugging |
| [ai-setup.md](04-guides/ai-setup.md) | Configurar modelos de IA |
| [reuse.md](04-guides/reuse.md) | Reusar componentes |
| [tools.md](04-guides/tools.md) | Referencia de 14 herramientas |

---

## 🔮 Roadmap e Investigación (05-roadmap/)

| Documento | Descripción |
|-----------|-------------|
| [vision-future.md](05-roadmap/vision-future.md) | **⭐ Visión**: AGI + Intuición + Semilla cognitiva |
| [competitors.md](05-roadmap/competitors.md) | **⭐ Análisis de competencia** |
| [future-ideas.md](05-roadmap/future-ideas.md) | Ideas futuras y roadmap técnico |
| [next-steps-detailed.md](05-roadmap/next-steps-detailed.md) | Próximos pasos específicos |
| [hardware-vision.md](05-roadmap/hardware-vision.md) | OmnySys para hardware |
| **historical/** | |
| └─ [gemini-validation-2026-02-08.md](05-roadmap/historical/gemini-validation-2026-02-08.md) | Validación inicial por Gemini |
| └─ [gemini-initial-feedback-2026-02-08.md](05-roadmap/historical/gemini-initial-feedback-2026-02-08.md) | Primera conversación sobre OmnySys |

---

## 📚 Referencia Técnica (06-reference/)

| Documento | Descripción |
|-----------|-------------|
| [development/technical-status.md](06-reference/development/technical-status.md) | Estado técnico actual v0.9.4 |
| [development/testing-guide.md](06-reference/development/testing-guide.md) | Guía de testing |
| [development/modular-architecture-guide.md](06-reference/development/modular-architecture-guide.md) | **⭐ Nueva - Guía de arquitectura modular** |
| [mcp/mcp-tools-detailed.md](06-reference/mcp/mcp-tools-detailed.md) | Documentación detallada de tools |
| [decisions/ADR-001-type-based-prompt-selection.md](06-reference/decisions/ADR-001-type-based-prompt-selection.md) | Decisiones arquitectónicas |

---

## 📋 Documentos Clave en Raíz

| Documento | Descripción |
|-----------|-------------|
| [README.md](../README.md) | Overview del proyecto |
| [ROADMAP.md](../ROADMAP.md) | Roadmap técnico detallado |
| [CHANGELOG.md](../CHANGELOG.md) | Historial de cambios |
| [OMNISCIENCIA.md](../OMNISCIENCIA.md) | Visión de omnisciencia |

---

## 🗄️ Archivo Histórico (archive/)

Documentos consolidados, auditorías pasadas y material histórico:

| Carpeta | Contenido |
|---------|-----------|
| `vision-consolidated/` | Agi-vision + Intuition-engine + OmnyBrain + Seed |
| `competitors-consolidated/` | Análisis detallados de competencia |
| `shadow-registry-original/` | Documentos originales del shadow registry |
| `archetypes-original/` | Documentos originales de arquetipos |
| `06-reference-archived/` | Reportes de análisis, guías técnicas específicas |
| `consolidated/` | (existente) Documentos ya consolidados |
| `design/` | (existente) Diseños de fases futuras |

---

## 📊 Estadísticas

- **Documentos activos**: ~45
- **Documentos archivados**: ~60
- **Ratio**: 1:1.3 (saludable - más activo que archivado)

---

## 🎯 Próximos Pasos

1. **Nuevo usuario**: Empezar en [01-core/problem.md](01-core/problem.md)
2. **Desarrollador**: Ver [04-guides/quickstart.md](04-guides/quickstart.md)
3. **Investigador**: Explorar [05-roadmap/vision-future.md](05-roadmap/vision-future.md)
4. **Debugger**: Ver [03-orchestrator/04-troubleshooting.md](03-orchestrator/04-troubleshooting.md)
