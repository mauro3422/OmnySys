# CHANGELOG - OmnySys

All notable changes to this project are documented in this file and organized by version.

## Unreleased

- MCP/Codex startup moved to `stdio -> bridge -> proxy -> worker`, including workspace/global config generation for Codex Desktop.
- Session deduplication hardened with startup cleanup, in-flight reservation of `client_id` handshakes, and better persistence of active/inactive rows.
- `reindexOnly` now preserves the process, refreshes cache metadata, and restarts the Phase 2 background indexer instead of leaving all atoms pending forever.
- Server/status telemetry now exposes compiler readiness, Phase 2 progress, `fast_phase2` fallback during deep indexing, cache/live count alignment, and `/health.background` details.
- The stdio bridge now fails fast with retryable MCP errors during daemon restarts instead of leaving in-flight tool calls hanging until client timeouts.
- FileWatcher now runs semantic guards through the real `analyzeAndIndex` path, includes new compiler guards for metadata completeness, topology regression, and semantic coverage, and fixes shared-state guard relation queries.
- Health and pipeline telemetry now distinguish missing physics coverage from real zero values, exposing `fragility/coupling/cohesion` gaps as compiler debt instead of reporting a misleading perfect grade.
- Semantic Algebra persistence now restores real `fragility/coupling/cohesion` vectors: converters no longer drop derived scores, `persistGraphMetrics()` backfills physics from live atoms, and semantic formulas were realigned with the project paper for deterministic DB coverage.
- Fragility scoring is now recalibrated to reduce saturation on complex atoms, producing more realistic compiler health signals instead of collapsing thousands of atoms at `1.0`.
- Pipeline health now filters import-backed production modules before flagging orphan pipeline atoms, and the FileWatcher adds a new `pipeline-orphan` guard to surface truly disconnected exported pipeline modules during incremental recompilation.
- FileWatcher terminal observability was restored for live-compilation workflows: file changes, per-file compile summaries, watcher issue persistence/clear events, and atom-save notifications are visible again without bringing back Phase 1 noise.
- `_recentErrors` now merges transient logger output with persisted FileWatcher alerts, so any MCP tool can surface active watcher/compiler issues with a standardized payload (`source`, `severity`, `issueType`, `filePath`, `context`, timestamps).
- Hot-reload runtime traces now use live-compiler wording (`runtime change detected`, `runtime pass`, `runtime reload applied`) so terminal output distinguishes runtime cache refreshes from FileWatcher recompilation.
- Duplicate metrics no longer group the stringified `null` DNA placeholder as if it were valid structural DNA; when DNA coverage is absent, the compiler now reports duplicate detection as unavailable instead of inventing giant clone groups.
- Duplicate DNA extraction is now centralized in a shared helper, so FileWatcher guards, semantic MCP queries, and duplicate handlers all build the same canonical duplicate key instead of drifting across ad-hoc SQL/JSON implementations.
- Duplicate detection now exposes a reusable compiler API (`strict` vs `structural`) through `storage/repository/utils`, so new MCP tools and watcher guards can reuse one entrypoint instead of re-embedding their own SQL/hash policy.
- Compiler policy drift is now a first-class signal: a shared `policy-conformance` helper plus a FileWatcher guard detect ad-hoc duplicate/impact/file-discovery logic, `pipeline_health` reports drift as technical debt, and `mcp/core/validation-utils` now uses canonical duplicate/impact APIs instead of rebuilding them from `getAllAtoms()`.
- Atomic edit impact/topology paths now reuse canonical compiler APIs too: blast radius, rename/signature impact, namespace checks, and export-conflict scans no longer rebuild graph state from `getAllAtoms()` across multiple MCP modules.
- Compiler policy detection is also stricter about real impact reconstruction vs schema/inventory reads, so schema/reporting tools stop being flagged as topology drift just for inspecting graph fields.
- FileWatcher now actually drains its live-compilation queue again: initialization creates the SmartBatchProcessor and starts the processing loop, and the lifecycle exposes `_processWithBatchProcessor()` so queued `create/modify/delete` events are compiled instead of silently sitting in memory until the next full restart.
- Duplicate detection semantics are now explicit: canonical DNA groups detect strict structural clones, while broader “similar-but-not-identical” logic is still future work.
- Dead-code heuristics are now shared between the watcher and `pipeline_health`: only high-signal top-level function/arrow orphans count as suspicious, snake_case/camelCase atom fields are normalized consistently, and false positives from callbacks/methods/classes no longer inflate compiler debt.
- The compiler also removed two real orphan helpers (`validateEditArgs`, `impactLevelFromScore`), bringing suspicious dead-code candidates back to zero after telemetry and guard alignment.
- FileWatcher result assembly now normalizes connection containers (`[]` vs `{ all: [] }`), preventing incremental analysis crashes when a newly created file has no semantic connection payloads yet.
- Duplicate-risk now uses a structural DNA fingerprint for atomic watcher alerts, falls back to persisted DNA when in-memory atoms are not enriched yet, and keeps SQL/JS duplicate-key generation aligned so the live compiler can flag renamed clones instead of missing them silently.
- DNA/data-flow/signature persistence is now restored at the converter layer, so semantic metadata survives SQLite round-trips instead of being serialized as `null`; duplicate coverage also distinguishes all atoms from duplicate-eligible production atoms.
- FileWatcher adds a `semantic-persistence` guard to catch future regressions where semantic compiler metadata is extracted in memory but dropped during persistence.
- MCP proxy/runtime restarts are more robust: the proxy now cancels stale respawn timers, new proxy instances refuse to spawn duplicate workers when a healthy daemon already exists, and the worker retries port bind before giving up under proxy mode.
- The stdio bridge now auto-recovers not only on transport close but also when a restarted daemon rejects requests with stale-session / not-initialized errors, allowing the same IDE session to resume after hot-reload restarts.
- Core metadata persistence now normalizes against live SQLite counts, reducing drift between `system_metadata` and the current atom graph.
- Remaining limitation: after true worker restarts, some MCP clients can still keep a stale session/tool channel even though the OmnySys daemon is healthy again.

## Quick Links

- **[v0.9.94 - File Watcher Guard System v2.0](changelog/v0.9.94.md)** - **✅ 11 standardized guards, improved error handling detection, +371% async detection accuracy.** (Latest)
- **[v0.9.93 - Critical Error Handling & Live Debugging](changelogs/v0.9.93.md)** - **✅ SocietyEngine/indexer hardening, Syntax Shield validation, Kimi MCP integration.**
- **[v0.9.92 - Sprint 12: Unified Analysis Core](changelogs/v0.9.92.md)** - **✅ Core Analyzer, Dynamic Shadow Volume, Queue Consolidation.**
- **[v0.9.91 - Sprint 11: Real-time Integrity Guards](changelogs/v0.9.91.md)** - **✅ Atomic Integrity Guard, Shared State Guard, Real-time Alerts.**
- **[v0.9.90 - Sprint 10: Daemon Intelligence (AI-Centric)](changelogs/v0.9.90.md)** - **✅ Shared State Tracking, Resource Leak Detection, CLI-Daemon Protocol Mapping.**
- **[v0.9.89 - Sprint 9: Daemon Stability & Session Persistence](changelogs/v0.9.89.md)** - **✅ Session Recovery (SQLite), Syntax Check Shield, 3 New Daemon Heuristics.**
- **[v0.9.88 - Sprint 8: Integridad y Detección de Infraestructura](changelogs/v0.9.88.md)** - **✅ 687 puntos de red detectados, 0 falsos positivos de duplicados, Watcher resilienciado.**
- **[v0.9.84 - Sprint Q/A: Deuda Técnica Completa](changelogs/v0.9.84-qa-technical-debt-complete.md)** - **✅ Refactor final de Type Detector y Semantic Queries. Sistema validado en Grado A (95/100).**
- **[v0.9.83 - Daemon Stability & Semantic Pipeline Fix](changelogs/v0.9.83-daemon-stability-semantic-pipeline.md)** - **✅ 7 bugs fixed: daemon restart no longer kills connection, semantic_connections 264 real connections persisted, health/risk/patterns tools return real data**
- **[v0.9.82 - SQL Health Eradication](changelog/v0.9.82-health-eradication.md)** - **✅ Eliminación de N+1 queries y purificado de las 37 deudas técnicas SQL**
- **[v0.9.81 - Algorithmic O(n²) Eradication](changelog/v0.9.81-algorithmic-eradication.md)** - **✅ Elimination of O(n²) bottlenecks in AST parsers and SQLite querying**
- **[v0.9.80 - SQL Optimization & Schema Drift Extinction](changelog/v0.9.80-sql-optimization.md)** - **✅ Schema Drift False Positives eradicated, Window Functions optimization**
- **[v0.9.70 - SQLite Persistence Unification](changelog/v0.9.70-persistence-unification.md)** - **✅ JSON Legacy removed, Transactional Versioning, Path Normalization**
- **[v0.9.69 - Import Resolution & Parser Stability](changelog/v0.9.69-import-stability.md)** - **✅ Fixed Constant/Class extraction, fix-imports resolution**
- **[v0.9.64 - Test Generator Auto-Healing & Memory SRP](changelog/v0.9.64-test-generator-autohealing.md)** - **✅ 269 autonomous tests generated via Tree-Sitter compatibility layers**
- **[v0.9.62 - Tree-sitter Migration](changelog/v0.9.62-tree-sitter-migration.md)** - Precise scope/state detection, fixed legacy crashes
- **[v0.9.61 - Dead Code Detection + Architectural Debt Reduction](changelog/v0.9.61-dead-code-detection.md)** - **✅ 85% dead code false positive reduction, 3 production files refactored**
- **[v0.9.60 - Semantic Algebra Production](changelog/v0.9.60-sqlite-exclusive-race-fixes.md)** - **✅ Semantic Algebra + Deterministic Queries** - 7 vectors per atom, SQLite-only storage
- **[v0.9.59 - Startup Speed + Error Notifications](changelog/v0.9.59-query-optimization.md)** - 25s→1.5s startup, auto-error notifications
- **[v0.9.58 - Complete SQLite Migration](changelog/v0.9.58-sqlite-migration-complete.md)** - All tools migrated to SQLite, removed JSON dependencies
- **[v0.9.57 - SQLite Bulk Operations & Architecture Modularization](changelog/v0.9.57-sqlite-modularization.md)** - Split 606-line monolith into 6 modules, 64% performance improvement
- **[v0.9.56 - Performance Optimization & Architectural Refactoring](changelog/v0.9.56-performance-optimization.md)** - Selective queries (100x faster), atomic-edit modularized (1,616 to 7 files), async stats
- **[v0.9.55 - Atomic Edit System: Breaking Change Detection & Rollback](changelog/v0.9.55-atomic-edit-system.md)** - Production-ready atomic editor with optimistic concurrency control, automatic rollback, and 20+ validated test cases
- **[v0.9.54 - Technical Debt Complete: Core System 100% Debt Free](changelog/v0.9.54-technical-debt-complete.md)** - 13 files refactored, 5,235 → 2,212 LOC (-58%), 80% debt reduction
- **[v0.9.53 - Technical Debt Phase 2 + Multi-IDE Support](changelog/v0.9.53-technical-debt-phase2.md)** - OpenCode & Claude Code compatible
- **[v0.9.52 - Massive Technical Debt Reduction: 6 Core Files Refactored](changelog/v0.9.52-technical-debt-reduction.md)**
- **[v0.9.51 - Robust FileWatcher + Test Factory Refactoring](changelog/v0.9.51-robust-filewatcher-refactoring.md)**
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

| **[0.9.92]** | 2026-03-05 | **🚀 Version 0.9.92: Sprint 12 — ✅ Unified Analysis Core, Dynamic Shadow Volume Calculation, Queue Management Consolidation.** (Latest) |
| **[0.9.91]** | 2026-03-05 | **🛡️ Version 0.9.91: Sprint 11 — ✅ Real-time Integrity Guards, Shared State Contention Alerts, Atomic Naming Validation.** |
| **[0.9.90]** | 2026-03-05 | **🧠 Version 0.9.90: Sprint 10 — ✅ Shared State Tracking, Detection of Node.js Resource Leaks, CLI-Daemon Protocol Mapping.** |
| **[0.9.89]** | 2026-03-05 | **🛡️ Version 0.9.89: Sprint 9 — ✅ Persistencia de Sesiones MCP (SQLite), Escudo de Validación de Sintaxis, Heurísticas de Salud del Daemon.** |
| **[0.9.88]** | 2026-03-05 | **🛡️ Version 0.9.88: Sprint 8 — ✅ 687 puntos de red detectados, erradicación de 8k+ falsos positivos de duplicados.** |
| **[0.9.84]** | 2026-03-04 | **🛡️ Version 0.9.84: Sprint Q/A & Technical Debt Complete — ✅ Refactored detectTypeAndName (C=51→12) & SemanticQueryTool (C=41→15). 0 High Risk Files.** |
| **[0.9.83]** | 2026-03-04 | **🛡️ Daemon Stability & Semantic Pipeline Fix — ✅ 7 bugs fixed: restart_server fast path (<1s), 264 semantic connections persisted, NOT NULL transaction cascade fixed** |
| **[0.9.81]** | 2026-03-03 | **🚀 Algorithmic O(n²) Eradication — ✅ Elimination of O(n²) bottlenecks in AST parsers and SQLite querying** |
| **[0.9.80]** | 2026-03-03 | **🚀 SQL Optimization & Schema Drift Extinction — ✅ Window functions refactoring for N+1 queries, SQLite JSON metadata parsing fixed** |
| **[0.9.70]** | 2026-03-01 | **🛡️ SQLite Persistence Unification — ✅ JSON Legacy removed, Unified transactions, Database-backed versioning** |
| **[0.9.69]** | 2026-03-01 | **🔍 Import Resolution & Parser Stability — ✅ Fixed Constant/Class extraction, reindex.js persistence, and fix-imports symbol resolution** |
| **[0.9.68]** | 2026-02-28 | **🛠️ MCP Tools Unification & Daemon Stability — ✅ 16 Consolidated Tools, WASM Memory Leaks Fixed, Graceful Restart API** |
| **[0.9.67]** | 2026-02-26 | **🧠 Atomic Intelligence Hub & High-Risk Refactoring — ✅ Refactored vector-calculator.js (SOLID split). Fixed Layer C visibility & path normalization.** |
| **[0.9.66]** | 2026-02-26 | **⚡ God Function Refactoring & Atomic DX — ✅ Refactored cleanLLMResponse, findLargeMonolithic, and atomic_write. New Impact Map integration.** |
| **[0.9.65]** | 2026-02-26 | **🛡️ Database Schema Integrity & Stability — ✅ Fixed SQLite Schema constraints, ZERO initialization crashes, Error Guardian Graceful Fallbacks** (Latest) |
| **[0.9.64]** | 2026-02-26 | **🧠 Test Auto-Healing & Daemon Stability — ✅ 269 tests autonomously written, DB orchestrator SRP split, Tree-Sitter MCP compliance** |
| **[0.9.62]** | 2026-02-25 | **🌳 Tree-sitter Migration — ✅ Precise scope/state detection, fixed legacy crashes, enhanced metadata** |
| **[0.9.61]** | 2026-02-25 | **🎯 Dead Code Detection + Architectural Debt — 85% false positive reduction, 3 files refactored** |
| **[0.9.59]** | 2026-02-24 | **🚀 Startup Speed + Error Notifications — 25s→1.5s startup, auto-error notifications** |
| **[0.9.58]** | 2026-02-23 | **🗄️ SQLite Migration Complete — All tools use SQLite, 5 files migrated, JSON legacy removed** |
| **[0.9.56]** | 2026-02-22 | **⚡ Performance Optimization — Selective queries (100x faster), atomic-edit modularized, async stats** |
| **[0.9.54]** | 2026-02-22 | **🏆 ZERO Technical Debt Achievement — 13 files refactored (100%), 5,235 → 2,212 LOC (-58%), 127 tests passing** |
| **[0.9.53]** | 2026-02-22 | **Technical Debt Phase 2 + Multi-IDE Support: 3 MCP Tools Refactored + OpenCode/Claude Compatibility** |
| **[0.9.52]** | 2026-02-21 | **Massive Technical Debt Reduction: 6 Core Files Refactored — 1,932 LOC → 478 LOC** |
| **[0.9.51]** | 2026-02-21 | **Robust FileWatcher + 6 Test Factories Refactored — Smart Batch Processor, Incremental Analysis** |
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

## 🚀 Latest Release: v0.9.89 (2026-03-05)

**Sprint 9: Daemon Stability & Session Persistence**: Enfoque en resiliencia del daemon ante errores de desarrollo y persistencia de estado entre reinicios. Implementación de escudo de sintaxis y recuperación automática de sesiones MCP.

### Key Achievements

1. **MCP Session Persistence (SQLite)**:
   - Creado `SessionManager` para persistir sesiones en la tabla `mcp_sessions`.
   - Recuperación automática de sesiones tras reinicios del worker en `mcp-http-server.js`.
   - Cleanup automático de sesiones antiguas (>48h).

2. **Syntax Validation Shield**:
   - Integrada validación `node --check` en el `ReloadHandler`.
   - Bloqueo preventivo de hot-reloads ante archivos con errores de sintaxis, evitando crashes del daemon.

3. **Daemon Health Heuristics**:
   - Nuevos checks en `network-analyzer.js`: Mutable Global State, `async` Event Listeners sin `try/catch`, y riesgos de corte de sesión (`process.exit`).

4. **CLI Introspection**:
   - Comando `omny status` actualizado con métricas en tiempo real: Salud del Daemon y Conteo de Sesiones MCP activas.

---

## v0.9.88 (2026-03-05)

**Sprint Q/A: Deuda Técnica Completa**: Culminación exitosa del sprint masivo de limpieza de deuda técnica. Resolución de God Functions finales y verificación de infraestructura mediante MCP garantizando un estado "Grade A" del sistema.

### Key Achievements

1. **Resolución Ciclomática**:
   - **Type Detector**: `detectTypeAndName` simplificado de C=51 a ~C=12 dividiendo heurísticas de AST en helpers estáticos.
   - **Semantic Queries**: Extracción limpia de 5 queries SQL crudas de `SemanticQueryTool` (C=41 a ~C=15).

2. **Diagnóstico Valorado**:
   - Verificado comportamiento correcto de la capa "Red" (falso positivo como deficiencia curado a comportamiento deseado).
   - Componentes críticos validados sin *race conditions* activas y analizador de dependencias a salvo.

---

## v0.9.70 (2026-03-01)

**SQLite Persistence Unification**: Unificación completa de la persistencia en SQLite, eliminando la dependencia de archivos JSON para átomos y versiones. Se implementó una arquitectura de transacciones unificada para garantizar integridad total.

### Key Achievements

1. **Transactional Integrity**:
   - **Unified saveMany**: Guardado atómico de archivos, átomos y relaciones en una sola transacción.
   - **DB Versioning**: Migración de `atom-versions.json` a la tabla SQLite `atom_versions`.
   - **Immediate Sync**: Eliminación del lag de indexación tras ediciones atómicas.

2. **Standardization**:
   - **Path Normalization**: Rutas uniformes (`/`) en toda la base de datos.
   - **ESM Readiness**: Refactorización de gestores para compatibilidad total con módulos modernos.

---

## v0.9.69 (2026-03-01)

### Key Achievements

1. **Parser (parser-v2) Functional Integrity**:
   - **Constant Extraction**: Re-habilitada la extracción de `export const` y `export let` mediante `variables.js`.
   - **Class Detection**: Actualizado `type-detector.js` para reconocer `class_declaration` como un átomo válido.
   - **Extractor Flow**: Sincronizado `extractor.js` para procesar constantes y clases en cada paso del análisis.

2. **Atomic Indexing (reindex.js) Stability**:
   - **Internal Fix**: Corregido import roto de `extractAtoms` que causaba fallos silenciosos en el flujo de edición atómica.
   - **Persistence Polish**: Añadida actualización manual de la tabla `files` durante el reindexado para garantizar que los nuevos archivos sean visibles inmediatamente para las herramientas MCP.
   - **Zero Early-Exit**: Eliminado el retorno prematuro en archivos sin funciones, permitiendo la indexación de archivos de configuración y constantes.

3. **Intelligent Symbol Resolution (fix_imports)**:
   - **Dual-Search Logic**: Implementada búsqueda híbrida (Átomos → Archivos) para resolver imports rotos incluso cuando el símbolo no es una función.
   - **Path Accuracy**: Corregida la extracción de nombres base en rutas de importación complejas.

4. **Maintenance & Cleanup**:
   - Eliminados múltiples logs de debug en el core de persistencia y extractores.
   - Sincronización de variables de entorno para asegurar el uso consistente de SQLite en todas las herramientas.

---

## 🚀 Previous Release: v0.9.68 (2026-02-28)

**MCP Tools Unification & Daemon Stability**: Auditoría absoluta y consolidación de las APIs MCP. El registro pasó de >30 herramientas dispersas a 16 super-herramientas agnósticas unificadas con arquitecturas enrutadas. Erradicación de pérdidas de conexión entre interfaces por finalizaciones abruptas del servidor.

### Key Achievements

1. **Arquitectura OOP para MCP Tools (Phase 15 & 17)**:
   - **Base Clases Analíticas**: Creada `BaseMCPTool` para estandarizar el registro y metadata de las herramientas.
   - **Consultas de Grafo Pasivas**: Implementada clase abstracta `GraphQueryTool`. Más de 30 consultas legacy disgregadas fueron refactorizadas y enrutadas a través de esta clase.
   - **Motor de Mutaciones Inyectado (AtomicMutationTool)**: Migrada toda la lógica imperativa destartalada de edición atómica hacia la clase abstracta transaccional `AtomicMutationTool`. 
   - **Estabilización Transaccional (`TransactionManager`)**: Corregido un "Bug durmiente" donde las mutaciones (`atomic_write`, `atomic_edit`, `move_file`) fallaban porque llamaban estáticamente a métodos estáticos inexistentes, instanciado de manera segura con `AtomicEditor`.

2. **Unificación y Limpieza Extrema del Payload**:
   - El registro total de MCP tools pasó de +30 herramientas a un modelo de cohesión de **16 herramientas unificadas** (Routers: `query_graph`, `traverse_graph`, `aggregate_metrics`).
   - Sistema de rutas agnóstico y normalizado de Windows Absolute paths a esquemas POSIX (`src/utils/...`), previniendo errores de `ENOENT` (`C:\Dev\OmnySystem\C:\Dev\...`).

3. **Daemon Stability & Graceful Restart (omny up)**:
   - Integrado Express JSON Parser `express.json()` en el `mcp-http-server.js`.
   - Creado Endpoint HTTP Interno `POST /restart`. 
   - Al detectar el daemon MCP, `omny up` ahora despacha una señal de hot-restart al daemon principal sin matarlo, impidiendo cuelgues de VS Code.

4. **Zero Memory Leaks del WASM Parser**:
   - Resuelto Leak en analizadores Tree-Sitter con entorno WASM GC-locked. Insertado desensamblador manual `tree.delete()` después de cada uso del AST.

5. **Estabilización en DataFlow Extractors**:
   - Solventado _Uncaught Promise Exception_ (`c.isNamed is not a function`).
   - Prevención de `Cannot read properties of undefined (reading 'slice')` mediante _Optional Chaining_ en Extractor ASTs.

---

## 📚 Previous Release: v0.9.67 (2026-02-26)

**BRAIN & Atomic Intelligence Excellence**: Intervención profunda en el corazón analítico de OmnySys. Refactorización completa de `vector-calculator.js` (God Function de larga data) mediante una desintegración modular SOLID. Mejoras críticas en la infraestructura de la Capa C para garantizar visibilidad atómica en tiempo real y eliminar lag de indexación.

### Key Achievements

1. **God Function Deconstruction**:
   - `vector-calculator.js`: Complejidad ciclomática Drásticamente reducida. Transformado en un **Facade** que orquesta 5 calculadores especializados (`temporal`, `structural`, `semantic`, `compatibility`, `impact`).
   - Mejora de Salud: Elevado a **Grado A** (100 score).

2. **Atomic Engine Robustness**:
   - **Real-Time Visibility**: Refactorizado `single-file.js` y `SQLiteAdapter` para unificar los datos de la tabla `files` con la realidad indexada en `atoms`, eliminando la "ceguera" ante cambios recientes.
   - **Exact Path Normalization**: Parcheado `normalizeFilePath` para manejar discrepancias de Windows (`\`) vs SQLite (`/`) y prefijos redundantes (`./`).
   - **Dedicated Metadata API**: Implementado `repo.getFile` para una recuperación de metadatos más confiable que el buscador genérico de átomos.

3. **Infrastructural Integrity**:
   - Corregido bug en `SQLiteAdapter` que causaba colisiones entre consultas de átomos y archivos.
   - Forzado el checkpoint de WAL para asegurar persistencia inmediata en cirugías complejas.

---

## 📚 Previous Release: v0.9.66 (2026-02-26)

## 📚 Previous Release: v0.9.65 (2026-02-26)

**Database Schema Integrity & Stability**: Reparación completa de incompatibilidades de mapping entre los modelos JSON legacy y el esquema estricto relacional de SQLite introducido en migraciones previas. Eliminación de todos los crashes de inicialización (unhandledRejection) permitiendo al File Watcher y el analizador en caliente reiniciar y persistir el System Map de forma continua.

### Key Achievements

1. **Error Guardian Fallbacks**: El manejador de crashes (Error Logger y Recovery Handler) ya no colapsa a causa de _undefined paths_ en flujos asíncronos complejos, usando `process.cwd()` inteligentemente.
2. **Strict SQLite Schema Enforcement**:
   - `file-handler.js` sincronizado a columnas exactas sin violar campos.
   - `semantic-handler.js` ahora es completamente robusto ante _issues is not iterable_ con parseo estricto Array/Fallback.
   - `risk-handler.js` cumple el `FOREIGN KEY` insertando referencias virtuales seguras antes que data foránea.
   - `dependency-handler.js` a prueba de fallos si _targets_ es null o corrupto.
3. **Hot-Reload Unlocked**: Al eliminar las fallas de la fase de Persistencia, el `IncrementalAnalyzer` y el Watcher en caliente pueden ahora monitorear en tiempo real y re-analizar el código de forma confiable.

---

## 📚 Previous Release: v0.9.55 (2026-02-22)

**Production-Ready Atomic Editor with Breaking Change Detection**: Sistema completo de edición atómica con detección automática de breaking changes, rollback automático y control de concurrencia optimista. **20+ casos de uso probados**, 100% de precisión en detección de breaking changes, zero falsos positivos.

### Key Achievements

1. **Post-Edit Validation**: Detecta cambios breaking en firmas de funciones automáticamente
2. **Automatic Rollback**: Revierte cambios que rompen dependencias sin intervención humana
3. **Optimistic Concurrency**: File watcher y atomic-edit coexisten sin locks ni deadlocks
4. **Source Tracking**: Cada cambio trackeado con metadata completa (quién, cuándo, qué)
5. **Zero Breaking Changes**: Sistema 100% backward compatible

### Impact

| Métrica | Valor |
|---------|-------|
| Archivos modificados | 7 |
| Líneas de código | 500+ |
| Casos de prueba | 20+ |
| Rollback accuracy | 100% |
| Concurrency conflicts | 0 |

---

## 📚 Previous Release: v0.9.54 (2026-02-22)

**🏆 ZERO Technical Debt Achievement — 13 files refactored (100%), 5,235 → 2,212 LOC (-58%), 80% debt reduction**: Refactorización masiva de 6 archivos core del sistema MCP y CLI, reduciendo la deuda técnica en 75% (de 1,932 a 478 líneas de código). **27 nuevos módulos creados** manteniendo 100% de compatibilidad backward.

### Summary of Changes

| Archivo Original | Líneas Antes | Líneas Después | Nuevos Módulos | Tipo |
|-----------------|--------------|----------------|----------------|------|
| `cli/commands/check.js` | 375 | 75 | 4 módulos | CLI Command |
| `pipeline/phases/atom-extraction/extraction/atom-extractor.js` | 337 | 77 | 4 módulos | Pipeline |
| `extractors/data-flow/core/data-flow-analyzer.js` | 346 | 71 | 5 módulos | Extractor |
| `mcp/tools/find-symbol-instances.js` | 366 | 27 | 7 módulos | MCP Tool |
| `mcp/tools/generate-tests/test-analyzer.js` | 532 | 48 | 7 módulos | MCP Tool |
| `mcp/core/analysis-checker.js` | 291 | 95 | 4 módulos | MCP Core |
| **TOTAL** | **2,247** | **393** | **31 módulos** | |

### Key Improvements

1. **God Functions Eliminated**: 2 god-functions con complejidad >20 divididas en módulos especializados
2. **Separation of Concerns**: Cada módulo tiene una responsabilidad única y clara
3. **Testability**: Funciones puras extraídas permiten testing unitario sencillo
4. **Maintainability**: Archivos <100 líneas, máximo 15 complejidad ciclomática
5. **Backward Compatibility**: Todos los exports originales preservados

### Module Breakdown

#### CLI Commands
- `check/validators.js` - Validación de inputs
- `check/data-loader.js` - Carga de datos del sistema
- `check/formatters.js` - Formateo de salida

#### Pipeline Extraction
- `atom-extractor/variable-atom-builder.js` - Construcción de átomos de variables
- `atom-extractor/extractor-loader.js` - Carga de extractores con cache
- `atom-extractor/extractor-runner.js` - Ejecución de extractores
- `atom-extractor/data-flow-helper.js` - Extracción segura de data flow

#### Data Flow Analysis
- `analyzer/input-analyzer.js` - Análisis de uso de inputs
- `analyzer/dead-variable-finder.js` - Detección de variables muertas
- `analyzer/metrics-calculator.js` - Cálculo de métricas
- `analyzer/coherence-calculator.js` - Cálculo de coherencia
- `analyzer/pattern-detector.js` - Detección de patrones

#### Symbol Finding
- `find-symbol-instances/instance-finder.js` - Búsqueda de instancias
- `find-symbol-instances/usage-analyzer.js` - Análisis de uso
- `find-symbol-instances/instance-helper.js` - Helpers de instancias
- `find-symbol-instances/duplicate-detector.js` - Detección de duplicados
- `find-symbol-instances/recommendation-generator.js` - Generación de recomendaciones
- `find-symbol-instances/auto-detector.js` - Auto-detección de duplicados
- `find-symbol-instances/handlers.js` - Handlers de respuesta

#### Test Analysis
- `test-analyzer/test-creators/happy-path.js` - Tests de happy path
- `test-analyzer/test-creators/throw.js` - Tests de throw conditions
- `test-analyzer/test-creators/edge-case.js` - Tests de edge cases
- `test-analyzer/test-creators/archetype.js` - Tests basados en arquetipos
- `test-analyzer/test-creators/side-effects.js` - Tests de side effects
- `test-analyzer/test-creators/branch.js` - Tests basados en branches
- `test-analyzer/test-utils.js` - Utilidades de testing

#### Analysis Checker
- `analysis-checker/file-scanner.js` - Escaneo de archivos
- `analysis-checker/change-detector.js` - Detección de cambios
- `analysis-checker/llm-analyzer.js` - Análisis LLM pendiente
- `analysis-checker/index-runner.js` - Ejecución de indexing

### Technical Debt Metrics

- **Before**: 6 archivos >250 líneas
- **After**: 0 archivos >250 líneas
- **Complexity Reduction**: Promedio de 11.2 a 4.8 por función
- **Module Count**: +31 módulos especializados
- **Test Coverage**: Todos los tests existentes siguen pasando

---

## 🚀 Previous Release: v0.9.51 (2026-02-21)

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

### Phase 2: Extractors & Preprocessor (Completada)

Refactorización de 3 archivos core del sistema de análisis:

| Archivo Original | Líneas | Nuevos Módulos | Función |
|-----------------|--------|----------------|---------|
| `extractors/metadata/dna-extractor.js` | 484 | 7 módulos | Extracción de DNA de átomos |
| `preprocessor/engine.js` | 376 | 8 módulos | Motor de pre-procesamiento |
| `generate-tests/branch-extractor.js` | 384 | 8 módulos | Extracción de branches para tests |
| **TOTAL Phase 2** | **1,244** | **23 módulos** | **Core system** |

#### Módulos DNA Extractor
- `hash-computer.js` - Cálculo de hashes (structural, contextual, semántico)
- `flow-analyzer.js` - Análisis de flujo de datos
- `semantic-analyzer.js` - Análisis semántico (verb/domain/entity)
- `duplicability-scorer.js` - Scoring de duplicabilidad
- `main-extractor.js` - Función principal extractDNA
- `dna-helpers.js` - Helpers (compareDNA, validateDNA)

#### Módulos Preprocessor Engine
- `language-handlers.js` - Configuración de handlers por lenguaje
- `lookahead-creator.js` - Creación de objetos lookahead
- `context-updater.js` - Actualización de contexto
- `token-tracker.js` - Tracking de tokens
- `code-processor.js` - Procesamiento de código
- `validation-utils.js` - Utilidades de validación
- `main-engine.js` - Clase PreprocessorEngine

#### Módulos Branch Extractor
- `return-extractor.js` - Extracción de expresiones de retorno
- `guard-finder.js` - Búsqueda de condiciones guarda
- `hints-parser.js` - Parseo de condiciones a hints
- `import-resolver.js` - Resolución de imports necesarios
- `assertion-builder.js` - Construcción de assertions
- `test-name-builder.js` - Generación de nombres de test
- `main-extractor.js` - Función principal extractBranches

### Files Changed (Total Sesión)

| Tipo | Cantidad |
|------|----------|
| Nuevos archivos | 63+ |
| Archivos refactorizados | 9 |
| Líneas eliminadas | ~4,200 |
| Deuda técnica reducida | 40% |

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
