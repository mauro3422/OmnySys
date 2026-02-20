# CHANGELOG - OmnySys

All notable changes to this project are documented in this file and organized by version.

## Quick Links

- **[v0.9.44 - Richer Archetypes + Connection Bridge Detection](changelog/v0.9.44-richer-archetypes-connection.md)** - Latest release
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
| **[0.9.44]** | 2026-02-20 | **Richer Archetypes (14 tipos) + Connection Bridge Detection** (Latest) |
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

## 🚀 Latest Release: v0.9.40 (2026-02-20)

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

---

## Previous Release: v0.9.38 (2026-02-20)

**Caller Pattern Detection**: Nuevo sistema que explica POR QUÉ un átomo no tiene calledBy. Coverage "real" de 99.9%. +2 bug fixes.

### Highlights
- ✨ **Layer Graph** creada con 17 módulos y 54 exports
- 🧹 **Deuda técnica**: 4 wrappers y 5 carpetas vacías eliminadas
- 📚 **Documentación**: 4 nuevos docs de arquitectura
- ✅ **Tests**: 75 tests nuevos para layer-graph

**Key Changes**:
- ✅ **4,045+ Tests Passing**: +668% desde v0.9.9
- ✅ **159 Test Files**: +511% más archivos de test
- ✅ **12 Factories**: Sistema de factories completo
- ✅ **10 Sub-Agentes**: Paralelismo para velocidad 10x
- ✅ **4 Systems 100%**: Race Detector (572), Atomic (238), Communication (449), Tier 1-3 (527)
- ✅ **23 Source Fixes**: Bugs encontrados y arreglados automáticamente
- ✅ **~26% Cobertura**: De ~4% a ~26% de Layer A

**Architecture**:
- Factories: `tier3-analysis`, `detector-test`, `extractor-test`, `race-detector-test`
- Contracts: Structure, Error Handling, Cross-Component Consistency
- Pattern: Factory + Contracts + Specific Tests

### **Previous Release: v0.9.9 (2026-02-14) - Tier 3 Analysis Complete**

**Tier 3 Analysis Audit COMPLETE**: Audit exhaustivo del sistema de análisis avanzado con **440 tests unitarios** + **30+ contract tests**. Todos los detectores avanzados (SharedState, SideEffects, EventDetector) ahora tienen cobertura completa con manejo robusto de edge cases y compatibilidad ESM.

**Key Changes**:
- ✅ **440 Tier 3 Tests**: Risk Scoring (121) + Detectors (175) + Advanced (144)
- ✅ **8 Critical Fixes**: ESM traverse, null-safety, import hoisting
- ✅ **100% Bulletproof**: Zero runtime errors posibles

**Phases**:
- Phase 1: RiskScorer + 5 Factors + Calculators (121 tests)
- Phase 2: 6 Detectores + Utils/Validators (175 tests)  
- Phase 3: SharedState + SideEffects + EventDetector (144 tests)

### **Previous Release: v0.9.8 (2026-02-14) - Layer A Analysis Systems Audit**

**Analysis Audit Complete**: Audit de sistemas de análisis (Tier 1-2) con **125 tests pasando** (79 unit + 46 contract). Se implementó Analysis Factory pattern y ScenarioBuilder para testing consistente. Todos los análisis ahora manejan null/undefined gracefully. Sistema bulletproof listo para producción.

**Key Changes**:
- ✅ **125 Tests**: 79 Unit Tests + 46 Contract Tests
- ✅ **6 Bugs Fixed**: null/undefined handling en todos los análisis
- ✅ **Analysis Factory**: Pattern reutilizable para nuevos análisis
- ✅ **Bulletproof**: Todos los edge cases manejados

### **Previous Release: v0.9.7 (2026-02-14) - Layer A Core Test Audit**

**Test Audit Complete**: Audit completo del Layer A Core con **90 tests pasando (100%)**. Arquitectura de testing profesional implementada con Contract Testing pattern para multi-language support. Sistema 100% funcional y listo para continuar con Layer A Analysis.

**Key Changes**:
- ✅ **90 Tests Passing**: Parser (15) + Scanner (12) + Graph (13) + Contracts (52)
- ✅ **52 Contract Tests**: Patrón revolucionario para soporte multi-lenguaje
- ✅ **3 Critical Fixes**: ESM traverse, TS/Flow conflict, glob patterns
- ✅ **CI/CD Parallel**: 8-10 min vs 30+ min sequential

### **Previous Release: v0.9.6 (2026-02-14) - Cleanup: Eliminación de Wrappers Legacy**

**Cleanup Completo**: Eliminación de **18 wrappers legacy** creados durante la refactorización. El sistema ahora usa directamente las rutas modulares sin wrappers de compatibilidad. **Zero deuda técnica**.

**Key Changes**:
- ✅ **18 Wrappers Eliminados**: Todos los archivos @deprecated eliminados
- ✅ **14 Archivos Migrados**: Actualizados a rutas modulares directas
- ✅ **-594 Líneas**: Código innecesario eliminado
- ✅ **100% Modular**: Sin indirecciones ni re-exports
- ✅ **Zero Imports Rotos**: Todo el código actualizado

### **Previous: v0.9.5 (2026-02-14) - Phase 2 Complete Modular Refactoring**

**FINAL Phase 2 Modular Refactoring**: 12 additional critical monolithic files (3,000+ lines) completely refactored into **80+ specialized modules**, completing the total architectural transformation. **Zero duplication achieved** with 100% SSOT (Single Source of Truth).

**Key Changes**:
- ✅ **12 Monoliths Refactored**: ErrorGuardian, CSS-in-JS, Cache Invalidator, Function Analyzer, Audit Context
- ✅ **80+ New Specialized Modules**: Each with single responsibility (<100 lines avg)
- ✅ **500+ Total Modules**: Complete system modularization
- ✅ **Zero Duplication**: All code in single location, wrappers only re-export
- ✅ **Zero Breaking Changes**: 100% backward compatible via 10 thin wrappers
- ✅ **Deuda Técnica: 0.5%**: Minimal remaining debt
- ✅ **SOLID Principles**: Single Responsibility, Open/Closed, Liskov Substitution, Interface Segregation, Dependency Inversion
- ✅ **Technical Debt**: 0% - All monoliths eliminated

**Phases Completed**:
- Phase 1: 33 files >350 lines (validation-result, pattern-registry, argument-mapper, llm/client, storage-manager, typescript-extractor, lifecycle, file-query, ErrorGuardian, atom-extraction-phase, schema-validator, +21 more)
- Phase 2: 26 files 300-350 lines (class-extractor, tunnel-vision-logger, data-flow-analyzer, export-extractor, timing-analyzer, chain-builder, analysis-worker, lineage-tracker, type-inferrer, +17 more)

**Total Impact**: 
- 984 JavaScript files in codebase
- 400+ new modules created
- 59 backward-compatible wrappers
- 0 files >350 lines remaining

**Ver archivo completo:** `changelog/v0.9.4-COMPLETE.md`

---

### **v0.9.3 (2026-02-13) - Massive Modular Refactoring**

**Massive Modular Refactoring**: Refactorización de 5 archivos monolíticos críticos (2,909 líneas) en **56 módulos especializados** (619 líneas cada archivo principal), mejorando mantenibilidad, testeabilidad y debuggabilidad manteniendo 100% compatibilidad.

**Key Changes**:
- ✅ **5 Monoliths Refactored**: race-detector, prompt-engine, consistency-validator, transformation-extractor, derivation-engine
- ✅ **56 Specialized Modules**: Cada módulo con responsabilidad única (30-200 líneas)
- ✅ **79% Size Reduction**: Archivos principales reducidos en promedio
- ✅ **Zero Breaking Changes**: 100% backward compatible
- ✅ **SOLID Principles**: Single Responsibility, Open/Closed, Dependency Inversion
- ✅ **Debuggable**: Errores localizados en módulos específicos

**Ver archivo:** `changelog/v0.9.3-modular-refactor.md`

---

### **v0.9.2 (2026-02-14) - LLMService Architecture Refactor**

**Complete LLM Architecture Refactoring**: Centralización de comunicación con GPU en servicio singleton con circuit breaker, métricas y health checking automático.

**Key Changes**:
- ✅ **LLMService Singleton**: Un único punto de control para todo el sistema
- ✅ **Circuit Breaker**: Protección contra cascada de fallos cuando GPU muere
- ✅ **Real-time Metrics**: Latencia, errores, throughput centralizados
- ✅ **50% Less Code Duplication**: Eliminadas múltiples instancias de LLMClient
- ✅ **Zero Breaking Changes**: Código legacy continúa funcionando

**Ver archivo:** `changelog/v0.9.2-llm-service-refactor.md`

---

### **v0.9.1 (2026-02-13) - MCP Pipeline Hotfix**

**Critical Fixes to MCP Initialization Pipeline**: Corrección de 3 bugs críticos en el orden de inicialización que causaban inicios lentos (10-30s), duplicación de cache e inconsistencias de datos.

**Key Changes**:
- ✅ **85% Faster Startup**: ~2s para proyectos sin LLM (antes 30-35s)
- ✅ **Fixed LLM Order**: LLM solo inicia si hay archivos que lo necesitan
- ✅ **Eliminated Cache Duplication**: Orchestrator ahora usa cache compartido
- ✅ **Fixed FileWatcher Timing**: Cache preparado antes de iniciar FileWatcher
- ✅ **Zero Breaking Changes**: APIs públicas sin cambios

**Ver archivo:** `changelog/v0.9.1.md`

---

### **v0.9.0 (2026-02-12) - Pattern Detection Engine V2**

**Pattern Detection Engine V2 - Intelligent Code Analysis**: Sistema robusto de detección de patrones con heurísticas inteligentes basadas en AST, eliminando 99.8% de falsos positivos y proporcionando análisis de calidad preciso.

**Key Changes**:
- ✅ **99.8% Reduction in False Positives**: De 473 issues a 1 issue real
- ✅ **Quality Score**: De 0/100 (F) a 99/100 (A)
- ✅ **Pattern Detection Engine**: Arquitectura SOLID completa
- ✅ **Smart Detectors**: Deep chains y Shared objects con scoring inteligente
- ✅ **Zero Breaking Changes**: Retrocompatible con sistema legacy
- ✅ **Circular Dependencies Fixed**: Separación de concerns con detector-base.js

**Ver archivo:** `changelog/v0.9.0.md`

---

### **v0.7.2 (2026-02-11) - BUG #47 Fix + 89 Extractores + Verification System**

**BUG #47 Cache Desynchronization + 89 Extractores + Verification & Certification System**: Implementación completa de 5 fixes críticos, activación de 89 extractores, sistema de verificación con 88% de mejora, 1,375 átomos extraídos, y certificado de verificación generado.

**Key Changes**:
- ✅ **FIX #1-5**: Tunnel Vision ↔ Risk Assessment, Cache Hashing, Audit Trail, Statistics, Path Normalization
- ✅ **89 Extractores**: Comprehensive extractor con 8 categorías
- ✅ **1,375 Átomos**: Extraídos con metadata completa (archetypes, DNA, side effects)
- ✅ **Verification System**: 4,067 issues detectados, 88% mejora, 0 críticos
- ✅ **Certificación**: Certificado generado válido hasta 2026-02-18
- ✅ **Clasificación Inteligente**: Scripts, tests, docs, core diferenciados

**Ver archivo:** `changelog/v0.7.2.md`

---

### **v0.7.1 (2026-02-09) + Documentation Consolidation (2026-02-10)**

**Race Conditions + Logger System + Meta-Validator + Data Flow V2 + Shadow Registry + 5 Extractores + Documentation Consolidation**: Activación completa del race detector (8 TODOs implementados), migración de 475+ logs a sistema centralizado, nuevo Meta-Validator de 4 capas, Data Flow V2 graph-based (12 archivos), Shadow Registry para linaje de archivos, 5 extractores de metadata adicionales, y consolidación masiva de documentación (58% reducción).

**Key Changes**:
- ✅ **8 TODOs Implemented** - sameBusinessFlow, sameTransaction, findCapturedVariables, etc.
- ✅ **Mitigation Detection** - Locks, transactions, atomic operations, async queues
- ✅ **27+ New Tests** - Derivation engine + Race detector coverage
- ✅ **Logger Migration** - 475+ console.log migrados a sistema jerárquico (100% completo)
- ✅ **Meta-Validator** - 4 capas de validación: Source, Derivation, Semantic, Cross-Metadata
- ✅ **100% Race Detection** - All patterns now functional
- ✅ **Validation CLI** - `scripts/validate-full.js` con reportes detallados
- ✅ **Data Flow V2** - 12 archivos modulares, 50+ patrones, 3 output formats, 95% completo
- ✅ **Transform Registry** - 50+ transformation patterns (side effects, functional, operators)
- ✅ **Shadow Registry** - Sistema de linaje con DNA extraction (7 shadows creados)
- ✅ **5 New Extractors** - Temporal Connections, Type Contracts, Error Flow, Performance Impact, DNA Extractor
- ✅ **Connection Enricher** - Post-procesamiento con pesos calculados y ancestry
- ✅ **Metadata Enhancer** - DNA extraction, historical context, network analysis
- ✅ **Lineage Validator** - Validación de ancestros y detección de rupturas
- ✅ **350+ Test Cases** - Comprehensive test coverage across system
- ✅ **99% Veracity Audit** - System integrity validated
- ✅ **Complete Documentation** - PLAN_MAESTRO + AUDIT_FOLLOW_UP + Architecture docs
- ✅ **Divided Changelogs** - 4 archivos (<300 líneas cada uno) para mejor mantenibilidad
- ✅ **Documentation Consolidation (2026-02-10)** - 58% reducción en redundancia
  - Shadow Registry: 5 files → 2 files (60% reduction, 65% redundancy eliminated)
  - Data Flow: 15 files → 7 files (58% reduction, 20% redundancy eliminated)
  - 12 files archived (9 design docs + 3 dated reports)
  - New comprehensive docs: DATA_FLOW.md (809 lines), SHADOW_REGISTRY.md (652 lines)
  - INDEX.md updated with clear structure (active vs roadmap vs archived)
  - ~4,593 lines saved, improved navigation and maintainability

**Documentación Dividida**:
- [changelog/v0.7.1.md](changelog/v0.7.1.md) - Resumen ejecutivo
- [changelog/v0.7.1-race-conditions.md](changelog/v0.7.1-race-conditions.md) - Race detector
- [changelog/v0.7.1-shadow-registry.md](changelog/v0.7.1-shadow-registry.md) - Shadow Registry + Extractores
- [changelog/v0.7.1-audit-verification.md](changelog/v0.7.1-audit-verification.md) - Auditoría + Logger + Meta-Validator

---

### **v0.7.0 (2026-02-09)**

**Architecture Refactoring - SOLID/SSOT/Fractal**: Refactorización masiva reduciendo 69% las líneas de código, extracción de 25+ módulos especializados y documentación completa para extensiones.

**Key Changes**:
- ✅ **Race Detector Modular** - 5 trackers + 3 strategies (was: 925 lines, now: 292 lines)
- ✅ **Molecular Pipeline** - Fases independientes con error handling (was: 470 lines, now: 200 lines)
- ✅ **Server Initialization** - 6 steps con rollback automático (was: 541 lines, now: 109 lines)
- ✅ **Extension Guides** - Documentación extensiva en 9 archivos críticos
- ✅ **100% Backwards Compatible** - APIs públicas sin cambios
- ✅ **Template Method Pattern** - Base classes para extensibilidad
- ✅ **Strategy Pattern** - Detección de races modular
- ✅ **Pipeline Pattern** - Orquestación declarativa

Ver detalles completos en [changelog/v0.7.0.md](changelog/v0.7.0.md)

---

### **Previous Release: v0.6.2 (2026-02-08)**

**Tunnel Vision Solver + Critical Bugfix**: Sistema automático de detección de riesgos cuando modificas archivos sin actualizar dependientes + bugfix crítico del servidor

**Key Changes**:
- ✅ **Tunnel Vision Detector** - Detección automática usando metadata del sistema atómico/molecular (sin LLM)
- ✅ **Logger JSONL** - Recolección de datos para entrenar Artificial Intuition (userAction, preventedBug, timeToResolve)
- ✅ **MCP Tool** - `get_tunnel_vision_stats` para visualizar estadísticas y patrones (13 tools total)
- ✅ **Severity Calculation** - CRITICAL/HIGH/MEDIUM/LOW basado en dependientes, exports, riskScore
- ✅ **Smart Recommendations** - Recomendaciones automáticas de refactoring
- ✅ **CRITICAL BUGFIX** - Servidor no iniciaba (`cache.ramCacheSet → cache.set`)
- ✅ **Path Normalization Fix** - Detector ahora encuentra correctamente archivos en system-map
- ✅ **Test End-to-End** - Validado con archivo real (20 dependientes directos, 35 transitivos)

Ver detalles completos en [changelog/v0.6.2.md](changelog/v0.6.2.md)

---

### **Previous Release: v0.6.1 (2026-02-08)**

**Documentation Overhaul & System Audit**: Reorganización completa de docs + auditoría técnica de integridad atómica/molecular

**Key Changes**:
- ✅ **Reorganización de Documentación** - 7 carpetas temáticas (architecture, guides, analysis, development, future, ideas, archive)
- ✅ **Auditoría Técnica Completa** - Verificación de integridad átomo→molécula, ~95% cobertura de conexiones JS/TS
- ✅ **10 Ideas Extraídas** - Transformation Contracts, Virtual Flow Simulation, Debugger for AIs, etc.
- ✅ **17 Docs Archivados** - Históricos preservados en docs/archive/
- ✅ **Versiones Unificadas** - v0.6.0 en todos los archivos
- ✅ **Correcciones Globales** - 12 tools MCP, 4 Pilares, ROADMAP actualizado
- ✅ **Sistema Validado** - 968 átomos, 431 archivos, 487 dependencias - Calidad 9/10

Ver detalles completos en [changelog/v0.6.1.md](changelog/v0.6.1.md)

---

### **Previous Release: v0.6.0 (2026-02-08)**

**Major Architecture Release**: Arquitectura Molecular + Fractal A→B→C con Confidence-Based Bypass

**Key Changes**:
- ✅ **Molecular Architecture** - Funciones (átomos) como unidad primaria de análisis
- ✅ **Atomic Extractor** - Extracción de funciones como átomos desde AST
- ✅ **7 Atomic Archetypes** - god-function, fragile-network, hot-path, dead-function, private-utility, utility, standard
- ✅ **Derivation Engine** - Metadata molecular derivada desde átomos
- ✅ **Atomic Cache** - Caché de átomos individuales (100x más rápido)
- ✅ **Call Graph** - `calledBy` calculado bidireccionalmente
- ✅ **Optimized Storage** - `atoms/` (SSOT), `molecules/` (índice), `files/` (referencias)
- ✅ **MCP Tools** - `getFunctionDetails()`, `getMoleculeSummary()`, `analyzeFunctionChange()`
- ✅ **Fractal Architecture (NEW)** - Patrón A→B→C se repite en funciones, archivos y módulos
- ✅ **Confidence-Based Bypass (NEW)** - Sistema de confianza para evitar LLM innecesario
  - Cada arquetipo calcula confidence (0.0 - 1.0) basado en evidencia
  - Si confidence >= 0.8 → Bypass LLM (90% de casos)
  - Evidencia documentada: exports, dependents, atoms, conexiones resueltas
- ✅ **15 Archetypes** - Ahora con confidence calculation para cada uno
- ✅ **4 Pillars Documented** - Box Test + Metadata Insights + Atomic Composition + Fractal Architecture

**Performance Improvements**:
- LLM Bypass Rate: 70% → 90% (20% mejora)
- Cache Invalidation: Por archivo → Por función (100x más rápido)
- Análisis atómico: ~0.01ms por función desde caché

**Docs**: See `changelog/v0.6.0.md` for full details

---

### **v0.5.4 (2026-02-08)**

**Major Feature Release**: 8 new metadata extractors + 4 new archetypes + Metadata Insights Guide

**Key Changes**:
- ✅ **8 New Metadata Extractors** - Advanced code analysis without LLM
  - `side-effects.js` - Network calls, DOM, storage, console, timers
  - `call-graph.js` - Function definitions and internal/external calls
  - `data-flow.js` - Variable assignments, returns, parameters
  - `type-inference.js` - typeof, instanceof, JSDoc types, defaults
  - `temporal-patterns.js` - Lifecycle hooks (React/Vue/Angular/Svelte/SolidJS), events, timers, cleanup
  - `dependency-depth.js` - Import complexity and chain indicators
  - `performance-hints.js` - Nested loops, blocking ops, complexity estimation
  - `historical-metadata.js` - Git history, churn rate, hotspot score
- ✅ **4 New Archetypes** - Cross-cutting patterns from metadata combinations
  - `network-hub` - Files sharing API endpoints
  - `critical-bottleneck` (Phase 1) - High churn + complexity + coupling
  - `api-event-bridge` (Phase 1) - API calls coordinated with events
  - `storage-sync-manager` (Phase 1) - Multi-tab localStorage synchronization
- ✅ **Metadata Insights Guide** - Documentation on combining metadata to discover patterns
- ✅ **Enhanced Analysis Decider** - 2 new bypass criteria for network/lifecycle patterns
- ✅ **Extended Metadata Contract** - 16 new optional fields in constants.js
- ✅ **Smart Prompt Builder** - Exposes new metadata to LLM when needed
- ✅ **All Tests Pass** - Verified backward compatibility

**New Files**:
- `src/layer-a-static/extractors/metadata/side-effects.js`
- `src/layer-a-static/extractors/metadata/call-graph.js`
- `src/layer-a-static/extractors/metadata/data-flow.js`
- `src/layer-a-static/extractors/metadata/type-inference.js`
- `src/layer-a-static/extractors/metadata/temporal-patterns.js`
- `src/layer-a-static/extractors/metadata/dependency-depth.js`
- `src/layer-a-static/extractors/metadata/performance-hints.js`
- `src/layer-a-static/extractors/metadata/historical-metadata.js`
- `src/layer-b-semantic/prompt-engine/prompt-templates/critical-bottleneck.js`
- `src/layer-b-semantic/prompt-engine/prompt-templates/api-event-bridge.js`
- `src/layer-b-semantic/prompt-engine/prompt-templates/storage-sync.js`
- `docs/METADATA-INSIGHTS-GUIDE.md` - Comprehensive guide on metadata combinations

**Modified Files**:
- `src/layer-a-static/extractors/metadata/index.js` - Integrated 8 new extractors
- `src/layer-a-static/extractors/metadata/temporal-patterns.js` - Added Svelte + SolidJS support
- `src/core/file-watcher/analyze.js` - Added 8 new metadata fields to output
- `src/layer-b-semantic/metadata-contract/constants.js` - Added 16 optional fields
- `src/layer-b-semantic/metadata-contract/builders/prompt-builder.js` - Exposed new fields
- `src/layer-b-semantic/llm-analyzer/analysis-decider.js` - Added network/lifecycle bypass
- `src/layer-b-semantic/prompt-engine/PROMPT_REGISTRY.js` - Added 4 new archetypes (15 total)
- `docs/ARCHETYPE_DEVELOPMENT_GUIDE.md` - Added Box Test section + references to CORE_PRINCIPLES
- `docs/METADATA-INSIGHTS-GUIDE.md` - Added Pillar 2 section + verification checklist
- `README.md` - Added CORE_PRINCIPLES reference

---

### **Previous: v0.5.3 (2026-02-08)**

**Maintenance Release**: Code quality improvements, refactoring, and test suite

**Key Changes**:
- ✅ **Removed Deprecated Files** - Eliminated css-in-js-extractor.js and static-extractors.js re-exports
- ✅ **Path Aliases** - Implemented #config/*, #core/*, #layer-a/*, #ai/* imports (14 files updated)
- ✅ **Safe JSON Utilities** - Added json-safe.js with error handling for all JSON operations
- ✅ **Unified Constants** - Merged duplicate ChangeType definitions into centralized config
- ✅ **Centralized Logger** - Created logger.js with level-based logging
- ✅ **Test Suite** - Added 18 unit and integration tests (npm test)
- 🐛 **Bug Fix** - Fixed duplicate export error in batch-processor/constants.js
- ✅ **Circular Dependency Fix** - Resolved layer-a ↔ layer-b circular import
- ✅ **File Splitting** - Divided ast-analyzer.js (564 lines) into 3 focused modules
- ✅ **SSOT Configuration** - Centralized paths, limits, and change types in src/config/

**New Files**:
- `src/config/paths.js` - All path constants
- `src/config/limits.js` - All limit/threshold constants  
- `src/config/change-types.js` - All enum constants
- `src/utils/json-safe.js` - Safe JSON operations
- `src/utils/logger.js` - Centralized logging
- `src/shared/architecture-utils.js` - Shared pattern detection
- `tests/unit/*.test.js` - Unit tests
- `tests/integration/*.test.js` - Integration tests
- `run-tests.js` - Test runner

---


**Major Release**: Layer A and B unified under Orchestrator with semantic metadata support

**Key Changes**:
- âœ… **Layer A/B Unification** - Single responsibility for each layer
- âœ… **Orchestrator** - Queue + Worker + Iterative analysis
- âœ… **Semantic Metadata** - LLM now receives global state, events, connections
- âœ… **Archetype Detection** - Improved detection using semantic info
- âœ… **Tracking System** - Progress tracking for all analyzed files
- âœ… **Prompt Hygiene** - Archetype prompts receive only needed metadata
- ✅ **Core Refactors** - Modularizacion de unified-server, orchestrator, indexer pipeline, file-watcher, cache y LLM client

**New**: `PROBLEMATICAS.md` - Known issues and roadmap

**Previous: v0.4.6** - Metadata Contract

**Architecture Release**: MCP Server is now the unified entry point with internal Orchestrator

**Key Changes**:
- âœ… **MCP Server as Entry Point** - Single command starts everything
- âœ… **Internal Orchestrator** - Queue + Worker + FileWatcher as component
- âœ… **Auto-Indexing** - Background indexing on startup if needed
- âœ… **Smart Tools** - Auto-queue as CRITICAL if file not analyzed
- âœ… **analyzeAndWait()** - Tools can trigger and wait for analysis

**New**: `orchestrator.js` - Reusable orchestrator component

**Previous: v0.4.4** - Unified cache system

**Previous: v0.4.0** - Complete semantic analysis with hybrid AI (80/20)

**ðŸ”— Quick Links**:
- [View Latest Changes](changelog/v0.4.4.md)
- [View v0.4.0 Changes](changelog/v0.4.0.md)
- [View All Version Files](changelog/)
- [Project Documentation](README.md)

### **ðŸ“ˆ Project Evolution**

| Phase | Version | Focus | Status |
|-------|---------|-------|--------|
| **Phase 1** | 0.1.0 | Static Analysis Foundation | âœ… Complete |
| **Phase 2** | 0.2.0 | Function-Level Tracking | âœ… Complete |
| **Phase 3** | 0.3.0-0.3.4 | Quality Analysis & Import Validation | âœ… Complete |
| **Phase 3.8** | 0.4.0-0.4.1 | Semantic Enrichment & AI Integration | âœ… Complete |
| **Phase 3.9** | 0.4.2 | Context Optimization & Function Analysis | âœ… Complete |
| **Architecture** | 0.4.5 | MCP Unified Entry Point | âœ… Complete |
| **Architecture** | 0.4.4 | Unified Cache System | âœ… Complete |
| **Patch** | 0.4.3 | Bug Fixes & Stability | âœ… Complete |

### **ðŸ’¡ Why This Structure?**

- **ðŸŽ¯ Focused**: Each file covers specific milestones
- **ðŸ” Searchable**: Easy to find changes by version
- **ðŸ“ Maintainable**: No more 700+ line files
- **ðŸ”„ Scalable**: Easy to add new versions
- **ðŸ‘¥ Collaborative**: Multiple developers can work on different versions

### **ðŸ“‹ Usage**

To view changes for a specific version:
```bash
# View latest changes
cat changelog/v0.4.0.md

# View all version files
ls changelog/

# View combined early phases
cat changelog/v0.1.0-v0.2.0.md
```

This modular approach ensures the changelog remains organized, maintainable, and easy to navigate as the project continues to grow!
