# Índice de Documentación - OmnySys

**Versión**: v0.9.61  
**Última actualización**: 2026-02-25  
**Estado**: ✅ **Dead Code Detection 85% preciso + 3 archivos refactorizados + MCP Tools**  
**Próximo**: 🚧 Migración a Tree-sitter (Q2 2026)

---

## 📚 Estructura de Documentación

```
docs/
├── 01-core/           🎯 Fundamentos (leer primero)
├── 02-architecture/   🏗️ Arquitectura técnica
├── 03-orchestrator/   ⚙️ Orquestador y flujo de datos
├── 04-guides/         🛠️ Guías prácticas
├── 04-maintenance/    🔧 Issues y mejoras
├── 05-roadmap/        🔮 Roadmap e investigación
├── 06-reference/      📚 Referencia técnica
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

### Para Usar MCP Tools

| Ruta | Documento | Descripción |
|------|-----------|-------------|
| **(raíz)** | [AGENTS.md](../AGENTS.md) | **⭐ Guía rápida de herramientas MCP** |
| **04-guides/** | [tools.md](04-guides/tools.md) | **30 herramientas MCP** disponibles |
| **06-reference/mcp/** | [mcp-tools-detailed.md](06-reference/mcp/mcp-tools-detailed.md) | Referencia detallada |

---

## 📊 Estado Actual del Sistema (Medido con MCP)

```
┌─────────────────────────────────────────────────────────────┐
│  OMNYSYS v0.9.61 — Estado del Sistema                     │
├─────────────────────────────────────────────────────────────┤
│  Átomos:         13,485 funciones analizadas              │
│  Archivos:       1,860                                    │
│  Health Score:   99/100 (Grade A)                        │
│  Test Coverage:  79%                                      │
│  God Functions:  193 (complejidad > 15)                  │
│  Dead Code:      42 casos (85% menos falsos positivos)   │
│  Duplicados:     118 exactos, 694 contextuales           │
│  Debt Arch:      15 archivos críticos                    │
└─────────────────────────────────────────────────────────────┘
```

---

## 🏗️ Arquitectura (02-architecture/)

### Documentos Principales

| Documento | Descripción | Estado |
|-----------|-------------|--------|
| [core.md](02-architecture/core.md) | Arquitectura unificada (Layer A + Orchestrator) | ✅ Actualizado |
| [DATA_FLOW.md](02-architecture/DATA_FLOW.md) | **⭐ Flujo de Datos**: Layer A → SQLite → MCP Tools | ✅ Actualizado |
| [SYSTEM_ARCHITECTURE.md](02-architecture/SYSTEM_ARCHITECTURE.md) | **⭐ Arquitectura completa con datos reales** | ✅ Nuevo |
| [code-physics.md](02-architecture/code-physics.md) | **⭐ Código como Física**: Entropía, auto-reparación | ✅ Actualizado |
| [data-by-layer.md](02-architecture/data-by-layer.md) | **⭐ Datos por Layer**: Qué extrae cada layer | ✅ Actualizado |
| [file-cultures.md](02-architecture/file-cultures.md) | **⭐ Culturas de Archivos**: Clasificación estática | ✅ Actualizado |
| [archetypes.md](02-architecture/archetypes.md) | Catálogo de arquetipos + sistema de confianza | ✅ Actualizado |

### Data Flow (docs/02-architecture/data-flow/)

| Documento | Descripción |
|-----------|-------------|
| [README.md](02-architecture/data-flow/README.md) | Índice de Data Flow |
| [concepts.md](02-architecture/data-flow/concepts.md) | Conceptos clave (Cables, Fractal, Zero LLM) |
| [atom-extraction.md](02-architecture/data-flow/atom-extraction.md) | Extracción atómica implementada (v2) |
| [roadmap.md](02-architecture/data-flow/roadmap.md) | Fases 2-5 planificadas |

### Storage

| Documento | Descripción |
|-----------|-------------|
| [delta-graph-migration.md](architecture/delta-graph-migration.md) | **⭐ SQLite Migration**: Por qué migrar de JSON a SQLite |

---

## 📐 Layers del Sistema

```
┌─────────────────────────────────────────────────────────────────┐
│  LAYER GRAPH (Nivel 0)                                          │
│  "El cerebro matemático - grafo con pesos dinámicos"           │
│  src/layer-graph/                                               │
├─────────────────────────────────────────────────────────────────┤
│  LAYER A: STATIC (Nivel 1)                                      │
│  "Qué puedo saber SIN ejecutar el código"                      │
│  src/layer-a-static/                                            │
├─────────────────────────────────────────────────────────────────┤
│  LAYER B: SEMANTIC (Nivel 2)                                    │
│  "Qué SIGNIFICA lo que encontré en A"                          │
│  src/layer-b-semantic/                                          │
├─────────────────────────────────────────────────────────────────┤
│  LAYER C: MEMORY (Nivel 3)                                      │
│  "Cómo exponer y persistir el conocimiento"                    │
│  src/layer-c-memory/                                            │
└─────────────────────────────────────────────────────────────────┘
```

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

---

## 🔧 Mantenimiento (04-maintenance/)

| Documento | Descripción |
|-----------|-------------|
| [ISSUES_AND_IMPROVEMENTS.md](04-maintenance/ISSUES_AND_IMPROVEMENTS.md) | **⭐ Issues conocidos y mejoras propuestas** |

---

## 🔮 Roadmap e Investigación (05-roadmap/)

| Documento | Descripción |
|-----------|-------------|
| [vision-future.md](05-roadmap/vision-future.md) | **⭐ Visión**: AGI + Intuición + Semilla cognitiva |
| [competitors.md](05-roadmap/competitors.md) | **⭐ Análisis de competencia** |
| [future-ideas.md](05-roadmap/future-ideas.md) | Ideas futuras y roadmap técnico |
| [next-steps-detailed.md](05-roadmap/next-steps-detailed.md) | Próximos pasos específicos |
| [hardware-vision.md](05-roadmap/hardware-vision.md) | OmnySys para hardware |

---

## 📚 Referencia Técnica (06-reference/)

| Documento | Descripción |
|-----------|-------------|
| [development/technical-status.md](06-reference/development/technical-status.md) | Estado técnico actual |
| [development/testing-guide.md](06-reference/development/testing-guide.md) | Guía de testing |
| [development/modular-architecture-guide.md](06-reference/development/modular-architecture-guide.md) | Guía de arquitectura modular |
| [mcp/mcp-tools-detailed.md](06-reference/mcp/mcp-tools-detailed.md) | Documentación detallada de tools |
| [decisions/ADR-001-type-based-prompt-selection.md](06-reference/decisions/ADR-001-type-based-prompt-selection.md) | Decisiones arquitectónicas |

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
| `design/` | Diseños de fases futuras |

---

## 📈 Métricas de Calidad

| Métrica | Objetivo | Actual | Estado |
|---------|----------|--------|--------|
| **Health Score** | >95/100 | 99/100 | ✅ Excelente |
| **Test Coverage** | >80% | 79% | 🟡 Casi |
| **God Functions** | <100 | 193 | 🔴 En progreso |
| **Dead Code** | 0 | 42 | 🟡 En progreso |
| **Duplicados** | <50 | 118 exactos | 🔴 En progreso |
| **Deuda Arquitectónica** | 0 | 15 archivos | 🔴 En progreso |

---

## 🎯 Próximos Pasos

1. **Nuevo usuario**: Empezar en [01-core/problem.md](01-core/problem.md)
2. **Desarrollador**: Ver [04-guides/quickstart.md](04-guides/quickstart.md)
3. **Investigador**: Explorar [05-roadmap/vision-future.md](05-roadmap/vision-future.md)
4. **Debugger**: Ver [03-orchestrator/04-troubleshooting.md](03-orchestrator/04-troubleshooting.md)

---

## 🚧 Migración a Tree-sitter (Próximamente)

**Estado**: Planificado para Q2 2026

**Por qué**: El parser actual (Babel) tiene limitaciones en:
- Detección precisa de `isExported` para arrow functions
- Análisis de tipos TypeScript
- Performance en proyectos grandes

**Beneficios de Tree-sitter**:
- ✅ Parsing incremental (más rápido)
- ✅ Mejor manejo de errores de sintaxis
- ✅ Soporte nativo para más lenguajes
- ✅ AST más rico y preciso

**Impacto en MCP Tools**: Las herramientas MCP seguirán funcionando igual, pero con mayor precisión en la detección de patrones y menos falsos positivos.

---

## 📊 Estadísticas

- **Documentos activos**: ~45
- **Documentos archivados**: ~60
- **Ratio**: 1:1.3 (saludable - más activo que archivado)
