# CHANGELOG - OmnySys

All notable changes to this project are documented in this file and organized by version.

## Quick Links

- **[v0.9.51 - Robust FileWatcher + Test Factory Refactoring](changelog/v0.9.51-robust-filewatcher-refactoring.md)** - Latest release
- **[v0.9.50 - Technical Debt Audit: God Function Refactoring Pass 2](changelog/v0.9.50-technical-debt-refactor.md)**
- **[v0.9.48 - Semantic Domain + Test Generator + Registry System](changelog/v0.9.48-semantic-domain-test-generator.md)**
- **[v0.9.47 - Massive Refactoring: 77% code reduction](changelog/v0.9.47-massive-refactoring.md)**
- **[v0.9.46 - MCP Tools Bug Fixes + Quality Improvements](changelog/v0.9.46-mcp-bugfixes.md)**
- **[v0.9.45 - MCP Tools Enhancement + Test Coverage Detection](changelog/v0.9.45-mcp-enhancement.md)**
- **[v0.9.44 - Richer Archetypes + Connection Bridge Detection](changelog/v0.9.44-richer-archetypes-connection.md)**
- **[v0.9.43 - Mixin & Namespace Import calledBy Detection](changelog/v0.9.43-mixin-namespace-calledby.md)**
- **[v0.9.42 - FileWatcher Pipeline Robustness](changelog/v0.9.42-filewatcher-robustness.md)**
- **[v0.9.41 - Removed Atom Lineage + get_removed_atoms MCP Tool](changelog/v0.9.41-removed-atom-lineage.md)**
- **[v0.9.40 - Recursive Pagination Middleware + MCP Tool Fixes](changelog/v0.9.40-pagination-middleware.md)**
- **[v0.9.39 - Full Metadata Exposure + 2 New MCP Tools](changelog/v0.9.39-full-metadata-mcp-tools.md)**
- **[v0.9.38 - Caller Pattern Detection + calledBy Enhancement](changelog/v0.9.38-caller-pattern.md)**
- **[v0.9.37 - LLM-Free Mode + Bug Fixes + Tool Consolidation](changelog/v0.9.37-impact-map-enhanced.md)**
- **[Changelog Directory](changelog/)** - All version-specific changelogs
- **[Changelog Index](changelog/README.md)** - Complete version index

---

## Version Index

### Latest Versions

| Version | Date | Description |
|---------|------|-------------|
| **[0.9.51]** | 2026-02-21 | **Robust FileWatcher + 6 Test Factories Refactored — Smart Batch Processor, Incremental Analysis** (Latest) |
| **[0.9.50]** | 2026-02-21 | **Technical Debt Audit: God Function Refactoring Pass 2 — 8 files, 359 LOC removed** |
| **[0.9.48]** | 2026-02-21 | **Semantic Domain + Test Generator + Registry System: 30 MCP tools, 43 files changed** |
| **[0.9.47]** | 2026-02-21 | **Massive Refactoring: 77% code reduction, 5 files refactored** |
| **[0.9.46]** | 2026-02-20 | **MCP Tools Bug Fixes: 4 tools mejorados + Technical Debt Audit** |
| **[0.9.45]** | 2026-02-20 | **MCP Tools Enhancement: 2 nuevas tools + Test Coverage Detection** |
| **[0.9.44]** | 2026-02-20 | **Richer Archetypes (14 tipos) + Connection Bridge Detection** |
| **[0.9.43]** | 2026-02-20 | **Mixin & Namespace Import calledBy Detection** |
| **[0.9.42]** | 2026-02-20 | **FileWatcher Pipeline Robustness - 5 bugs críticos corregidos** |
| **[0.9.41]** | 2026-02-20 | **Removed Atom Lineage + get_removed_atoms MCP Tool (20 total)** |
| **[0.9.40]** | 2026-02-20 | **Recursive Pagination Middleware + MCP Tool Fixes** |
| **[0.9.39]** | 2026-02-20 | **Full Metadata Exposure + 2 New MCP Tools (19 total)** |
| **[0.9.38]** | 2026-02-20 | **Caller Pattern Detection + calledBy Enhancement (99.9% real coverage)** |
| **[0.9.37]** | 2026-02-20 | **LLM-Free Mode + 4 Bug Fixes + Tool Consolidation (16→14)** |
| **[0.9.35]** | 2026-02-19 | **File Culture Classifier - ZERO LLM classification system** - See `changelog/v0.9.35-file-culture-classifier.md` |
| **[0.9.31]** | 2026-02-19 | **Cross-file calledBy index + LLM Metadata Completeness Score + OOM Fix** - See `changelog/v0.9.31-calledby-llm-completeness.md` |
| **[0.9.30]** | 2026-02-19 | **Bug Fixes: Data Flow via AST Node + Atom ID Normalization + ChainBuilder Stack Overflow** - See `changelog/v0.9.30-dataflow-ast-node-fixes.md` |
| **[0.9.29]** | 2026-02-19 | **Preprocessor Framework + Import Cleanup + MCP Stability** - See `changelog/v0.9.29-preprocessor-framework-mcp-fixes.md` |
| **[0.9.20–0.9.28]** | 2026-02-18/19 | **Import Cleanup: 0 broken imports en 1152 archivos** - Ver changelog v0.9.29 (consolidado) |
| **[0.9.18]** | 2026-02-18 | **Runtime Bugfix: 6 bugs en arranque MCP** - See `changelog/v0.9.18-runtime-bugfix.md` |
| **[0.9.17]** | 2026-02-18 | **Estabilización completa + Deuda Técnica eliminada** - See `changelog/v0.9.17-cache-singleton-oom-fix.md` |
| **[0.9.16]** | 2026-02-18 | **Layer Cleanup + Duplicaciones** |
| **[0.9.15]** | 2026-02-18 | **Architecture Refactor: Graph → Core** |
| **[0.9.5]** | 2026-02-18 | **Layer Graph Architecture + Deuda Técnica** - See `changelog/v0.9.5-layer-graph-architecture.md` |
| **[0.9.13]** | 2026-02-14 | **Layer B Test Coverage + Cross-Layer Integration - 1,222 Tests** |
| **[0.9.12]** | 2026-02-13 | **Layer A Test Coverage - 687 Tests** |
| **[0.9.10]** | 2026-02-11 | **Layer A Test Coverage - 527+ Tests** |
| **[0.9.8]** | 2026-02-10 | **Layer A Analysis Audit - 79 Tests, Tier 1-2 Complete** |
| **[0.9.7]** | 2026-02-09 | **Layer A Core Test Audit - 90 Tests 100% Passing** |
| **[0.9.6]** | 2026-02-08 | **Cleanup - Eliminación de 18 Wrappers Legacy** |
| **[0.9.4]** | 2026-02-07 | **COMPLETE Modular Refactoring - 59 Monoliths → 400+ Modules** |
| **[0.9.3]** | 2026-02-06 | **Massive Modular Refactoring - 5 Monoliths → 56 Modules** |
| **[0.9.2]** | 2026-02-05 | **LLMService Architecture Refactor - Circuit Breaker & Metrics** |
| **[0.9.1]** | 2026-02-04 | **MCP Pipeline Hotfix - Critical Initialization Fixes** |
| **[0.9.0]** | 2026-02-03 | **Pattern Detection Engine V2 - Intelligent Analysis** |
| **[0.8.0]** | 2026-02-02 | **Query Refactor + Hot-Reload + Self-Improvement** |
| **[0.7.x]** | Earlier | See `changelog/` for full history |

---

## 🚀 Latest Release: v0.9.51 (2026-02-21)

**Robust FileWatcher + Test Factory Refactoring**: Sistema de file-watching robusto con procesamiento incremental, Smart Batch Processor, y refactorización masiva de 6 test factories. **34 nuevos módulos creados, deuda técnica reducida 25%.**

### Major Features

#### 1. Smart Batch Processor
- **Ventana de tiempo adaptativa**: 500ms → 5000ms según volumen de cambios
- **Detección automática de cambios masivos**: Umbral de 5 cambios/segundo
- **Procesamiento ordenado**: delete → create → modify
- **Cooldown inteligente**: Pausa después de batches grandes

#### 2. Incremental Analyzer
- **Invalidación selectiva de cache**: Solo archivos afectados
- **Actualización de dependencias transitivas**: Detecta impacto en archivos dependientes
- **Procesamiento en 3 fases**: Agrupa cambios por tipo y prioridad
- **Reutilización de análisis**: Mantiene cache de archivos sin cambios

#### 3. Test Factory Refactoring (6 archivos → 34 módulos)
| Archivo Original | Líneas | Nuevos Módulos |
|-----------------|--------|----------------|
| `query-test/builders.js` | 545 | 8 módulos |
| `css-in-js-test/builders.js` | 595 | 5 módulos |
| `race-detector-test/builders.js` | 605 | 8 módulos |
| `state-management-test/builders.js` | 611 | 4 módulos |
| `data-flow-test/builders.js` | 430 | 3 módulos |
| `batch-processor.js` | 253 | 6 módulos |

### Files Changed

| Tipo | Cantidad |
|------|----------|
| Nuevos archivos | 40+ |
| Archivos refactorizados | 6 |
| Líneas eliminadas | ~3,000 |
| Deuda técnica reducida | 25% |

### Cache Invalidation Fix
- **Problema**: Cache no se actualizaba durante refactorizaciones masivas
- **Solución**: SmartBatchProcessor detecta y procesa cambios masivos automáticamente
- **Resultado**: No requiere reinicio completo del servidor después de cambios

---

## 🚀 Previous Release: v0.9.48 (2026-02-21)

**Semantic Domain + Test Generator + Registry System**: Nueva infraestructura de metadata con detección semántica automática, generador de tests MCP, y sistema de registro centralizado. **30 MCP Tools total. 43 archivos modificados.**

### Major Features

#### 1. Semantic Domain Detection
- **Nuevo extractor**: `semantic-domain.js`
- Detecta automáticamente el tipo de operación: JSON, HTTP, filesystem, string, validation, LLM, database
- Genera `inputPatterns` y `outputPatterns` específicos para cada dominio
- **Ejemplo**: `extractJSON` → `primary: "json"`, `inputPatterns: ["json-string", "text-with-json"]`

#### 2. Test Generator MCP Tool
- **2 nuevas tools**: `generate_tests`, `generate_batch_tests`
- Usa `semanticDomain` para generar inputs inteligentes
- Detecta throws de `errorFlow` para tests de error
- Genera mocks basados en `callGraph`
- **Ejemplo**: `extractJSON('{"name": "test"}')` en lugar de `extractJSON("sample text")`

#### 3. Extractor Registry System
- **Archivo**: `registry.js`
- 18 extractores registrados + 22 campos base
- Agregar nuevo extractor: 2 pasos (era 5)
- `getFieldToolCoverage()` dinámico para schema

### Files Changed

| Tipo | Cantidad |
|------|----------|
| Nuevos archivos | 28 |
| Archivos modificados | 15 |
| Total cambios | 43 |

### MCP Tools Update

| Herramienta | Estado |
|-------------|--------|
| Total MCP Tools | 30 (era 28) |
| `generate_tests` | ✨ Nuevo |
| `generate_batch_tests` | ✨ Nuevo |
| `get_atom_schema` | Mejorado (registry dinámico) |
| `get_function_details` | Mejorado (incluye semanticDomain) |

### Key Highlights

- ✨ **Semantic Domain** - Detección automática de 12 dominios
- ✨ **Test Generator** - Inputs inteligentes basados en metadata
- ✨ **Registry System** - Centralizado, auto-descubrimiento
- ✨ **0 breaking changes** - Todo backward compatible
- ✨ **Inputs correctos** - JSON strings para JSON functions, URLs para HTTP functions

---

## Previous Release: v0.9.47 (2026-02-21)

**Massive Code Refactoring**: 5 archivos críticos refactorizados usando OmnySys MCP. Reducción del 77% en líneas de código (1,440 → 337 líneas). Mejora dramática en complejidad ciclomática. Sistema validado con 0 breaking changes.

### Major Refactors

#### 1. `detectAtomArchetype` - Complejidad Reducida 93%
- **Antes**: 168 líneas, complejidad 57 (god-function)
- **Después**: 52 líneas, complejidad 4 (utility)
- **Cambio**: Extraídas 15 reglas de arquetipos a `archetype-rules.js`
- **Impacto**: 2 archivos afectados, 0 rotos

#### 2. `core-builders.js` - Reducción 97%
- **Antes**: 526 líneas, 4 clases mezcladas
- **Después**: 15 líneas (barrel export)
- **Cambio**: Dividido en 4 módulos especializados
  - `base-builder.js` - Clase base y configuración
  - `code-sample-builder.js` - Builder principal
  - `function-builders.js` - FunctionBuilder y ArrowFunctionBuilder
  - `class-builder.js` - ClassBuilder
- **Impacto**: 3 archivos de test, compatibilidad mantenida

#### 3. `handlers.js` - Reducción 94%
- **Antes**: 358 líneas, 13 funciones mezcladas
- **Después**: 23 líneas (barrel export)
- **Cambio**: Dividido en 3 módulos especializados
  - `handlers/file-handlers.js` - Handlers principales
  - `handlers/metadata-cleanup.js` - Limpieza de metadata
  - `handlers/relationships.js` - Gestión de dependencias
- **Impacto**: 7 archivos, 0 rotos

#### 4. `decideFromAtoms` - Complejidad Reducida 80%
- **Antes**: 186 líneas, complejidad 41
- **Después**: 105 líneas, complejidad 8
- **Cambio**: Extraídos 7 gates de decisión a `decision-gates.js`
- **Impacto**: 2 archivos, 0 rotos

#### 5. `response-cleaner.js` - Reducción 30%
- **Antes**: 202 líneas, complejidad 39
- **Después**: 142 líneas, complejidad 10
- **Cambio**: Extraídas 6 utilidades de limpieza a `json-cleaners.js`
- **Impacto**: 5 archivos (incluyendo tests), 0 rotos

### System Improvements

#### UTF-8/Emoji Support Fixed
- **Problema**: `atomic_write` fallaba con caracteres especiales en Windows
- **Solución**: Agregado BOM UTF-8 y normalización Unicode en `syntax-validator.js`
- **Resultado**: Soporte completo para emojis, tildes y caracteres especiales

### Validation Results
- ✅ **1,800 archivos** indexados
- ✅ **11,953 funciones** analizadas
- ✅ **Health Score**: 99/100 (Grado A)
- ✅ **Breaking Changes**: 0
- ✅ **Imports Rotos**: 0
- ✅ **Tests Fallidos**: 0

---

## 🎯 OmnySys MCP: Development Superpower

Esta versión demuestra el poder de **OmnySys MCP** como herramienta de desarrollo:

### Ventajas Demostradas

1. **Visión Completa del Impacto**
   - Antes: "Edito y cruzo los dedos"
   - Ahora: Sé exactamente qué 7 archivos se romperán antes de tocar código

2. **Zero Breaking Changes**
   - 5 refactors grandes (1,440 líneas modificadas)
   - 0 archivos rotos
   - 0 imports perdidos
   - 0 APIs rotas

3. **Desarrollo Guiado por Datos**
   - Impact maps en tiempo real
   - Call graphs completos
   - Validación automática de imports
   - Detección de código duplicado

4. **Refactorización Segura**
   - Complejidad reducida 93% en función crítica
   - 77% reducción en código total
   - Health score mantenido en 99/100
   - Sin degradación del sistema

### Métricas del Sistema

| Métrica | Valor |
|---------|-------|
| Total Archivos | 1,800 |
| Total Funciones | 11,953 |
| Health Score | 99/100 (A) |
| Complejidad Promedio | 3.0 |
| Funciones Grado A | 7,299 (97.7%) |
| Imports Rotos | 0 |
| Tests | 1,222+ |

---

## Previous Release: v0.9.46 (2026-02-20)

**MCP Tools Bug Fixes**: Corrección de problemas menores en 4 herramientas + auditoría completa de deuda técnica. Mejoras de calidad en `get_async_analysis`, `explain_value_flow`, `validate_imports` y `trace_data_journey`. Sistema operativo con 99/100 health score.

### Fixed Tools
- `get_async_analysis` - Deduplicación de optimizaciones (evita duplicados)
- `explain_value_flow` - Dependencies ahora incluyen tipo y contexto (native vs project)
- `validate_imports` - Exclusión automática de `archive/` y otros directorios legacy
- `trace_data_journey` - Mensajes explicativos cuando no hay journey

### Technical Debt Analysis
- **7,462 átomos** analizados (health score: 99/100)
- **192 god-functions** detectados (requieren refactorización)
- **18 race conditions** identificadas (3 críticas)
- **22 átomos** con grado F (peor health)

---

## Previous Release: v0.9.45 (2026-02-20)

**MCP Tools Enhancement**: 2 nuevas herramientas de refactoring, mejoras en `search_files` (glob patterns) y `detect_patterns` (test coverage detection). Documentación completa actualizada. **23 MCP Tools total.**

### New Tools
- `suggest_refactoring` - Analiza código y sugiere mejoras específicas (extract functions, rename variables, optimize loops)
- `validate_imports` - Valida imports detectando rotos, no usados y dependencias circulares

### Enhanced Tools
- `search_files` - Ahora soporta glob patterns (ej: `src/**/*.js`)
- `validate_imports` - Detecta uso en objetos literales, spread operators y exports
- `detect_patterns` - Nuevo modo `test-coverage` con estadísticas detalladas:
  - 33 archivos de test detectados
  - 75 átomos de test
  - 20 funciones sin cobertura (priorizadas por riskScore)
  - Detección de tests huérfanos

### Documentation Updates
- README.md - Actualizado a 23 tools, versión v0.9.45
- docs/INDEX.md - Índice de documentación actualizado
- docs/04-guides/tools.md - Guía completa de 23 tools
- docs/04-guides/mcp-integration.md - Integración con OpenCode agregada
- docs/06-reference/mcp/mcp-tools-detailed.md - Referencia técnica completa (805 líneas)
- docs/02-architecture/core.md - Fix de encoding (caracteres â€)

### Highlights
- ✨ **23 MCP Tools** - 2 nuevas categorías: Refactoring y Validación
- ✨ **Glob patterns** en `search_files` - Búsqueda real con wildcards
- ✨ **0 falsos positivos** en `validate_imports` - Detecta uso indirecto
- ✨ **Test coverage detection** - Relaciona tests con funciones automáticamente
- ✨ **Documentation 100%** - Toda la doc coincide con implementación real

---

## Previous Release: v0.9.44 (2026-02-20)

**Richer Archetypes (14 tipos) + Connection Bridge Detection**: Sistema de arquetipos expandido con 14 tipos diferentes + detección automática de archivos puente entre subsistemas.

### What's New
- 14 arquetipos de átomos (vs 5 anteriores): utility, orchestrator, transformer, persister, factory, validator, adapter, builder, controller, service, repository, presenter, config, api-client
- Connection Bridge Detection - identifica automáticamente archivos que conectan diferentes subsistemas
- Risk Score ajustado por arquetipo
- Archetype heatmap por subsistema

### Highlights
- ✨ **14 arquetipos** - Clasificación semántica más precisa
- ✨ **Bridge detection** - Encuentra los archivos que unen subsistemas
- ✨ **Risk por arquetipo** - Diferentes umbrales según tipo de función

---

## Previous Release: v0.9.40 (2026-02-20)

**Recursive Pagination Middleware**: Sistema de paginación automática recursiva implementado como middleware central. Todas las herramientas obtienen paginación sin cambios individuales. Fix de duplicados en `get_async_analysis`. Conectado `layer-graph/query` al sistema activo. **19 MCP Tools sin overflow.**

### What's New
- `pagination.js` — middleware central con paginación recursiva (top-level + nested arrays)
- `PAGINATION_SCHEMA` — fragment reutilizable en 9 tools
- Fix: `get_async_analysis` — eliminados issues y recomendaciones duplicadas por atom
- Fix: `get_atom_society` — `insights` compacto, sin overflow
- Fix: `detect_patterns` — modo `all` retorna overview; tipos específicos retornan full data paginada
- Refactor: `analyzeSingleFile` complexity 50 → 20 (7 helpers)
- Eliminado: `loadAllAtoms` duplicado en 3 MCP tools (~72 LOC)
- Conectado: `layer-graph/query/call-graph-analyzer` → re-export en MCP tools

### Highlights
- ✨ **19/19 tools** responden sin token overflow
- ✨ **Paginación recursiva** — `_pagination.fields` reporta dot-paths en cualquier nivel de anidamiento
- ✨ **DEFAULT_LIMIT = 10** — balance óptimo entre datos ricos y tokens
- ✨ **AI navigation**: `hasMore + nextOffset` en cada campo paginado
- 🧹 **~272 LOC** de duplicación eliminada

---

## Previous Release: v0.9.39 (2026-02-20)

**Full Metadata Exposure**: Las herramientas MCP ahora devuelven TODA la metadata disponible. +2 nuevas herramientas de análisis profundo. **19 MCP Tools total.**

### New Tools
- `get_async_analysis` - Análisis profundo de async con recommendations (867 async atoms, 38 high risk)
- `get_atom_history` - Historial Git de átomos con commits, authors, blame

### Enhanced Tools
- `get_function_details` - Ahora devuelve: performance, asyncAnalysis, errorFlow, dataFlow, dna completos
- `detect_patterns` - Usa patternHash para detectar código similar (412 duplicados, 17K LOC savings)

### Highlights
- ✨ **412 exact duplicates** detectados via structuralHash
- ✨ **125 similar code patterns** via patternHash
- ✨ **17,039 LOC** potential savings identificados
- ✨ **867 async atoms** analizados con recommendations
- 📚 **Metadata completa**: bigO, heavyCalls, tryBlocks, transformations, etc.
