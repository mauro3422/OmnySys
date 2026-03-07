# CHANGELOG - OmnySys

All notable changes to this project are documented here as a release index. Detailed per-version notes live in `changelog/`.

## Unreleased

- [v0.9.108 - Compiler Stabilization & Integrity](changelogs/v0.9.108.md)
- [v0.9.105 - SOLID Standardization & Git Unification](changelogs/v0.9.105.md)
- [v0.9.104 - Core Consolidation & Genetic Lineage](changelogs/v0.9.104.md)
- [v0.9.103 - Genetic Preservation Policy & Stabilization](changelogs/v0.9.103.md)
- [v0.9.102 - Pipeline Integrity Detector & Auto-Audit System](changelogs/v0.9.102.md)

## Quick Links

- [v0.9.103 - Genetic Preservation Policy & Stabilization](changelogs/v0.9.103.md)
- [v0.9.102 - Pipeline Integrity Detector & Auto-Audit System](changelogs/v0.9.102.md)
- [v0.9.101 - Scanned File Manifest Unification](changelog/v0.9.101.md)
- [v0.9.100 - Centrality Coverage Adoption](changelog/v0.9.100.md)
- [v0.9.99 - Compiler Explainability & Full Canonical Adoption](changelog/v0.9.99.md)
- [v0.9.98 - Compiler Foundations & Docs Sync](changelog/v0.9.98.md)
- [v0.9.97 - Canonical Testability & Semantic Purity APIs](changelog/v0.9.97.md)
- [v0.9.96 - Canonical Persistence Sync & Runtime Drift Reduction](changelog/v0.9.96.md)
- [v0.9.95 - Compiler Canonicalization & Runtime Self-Healing](changelog/v0.9.95.md)
- [v0.9.94 - File Watcher Guard System v2.0](changelog/v0.9.94.md)
- [v0.9.93 - Critical Error Handling & Live Debugging](changelogs/v0.9.93.md)
- [v0.9.92 - Sprint 12: Unified Analysis Core](changelogs/v0.9.92.md)
- [v0.9.91 - Sprint 11: Real-time Integrity Guards](changelogs/v0.9.91.md)
- [Changelog Directory](changelog/README.md)

## Version Index

| Version | Date | Summary |
|---------|------|---------|
| **0.9.108** | 2026-03-07 | Compiler stabilization, utility canonization, SOLID persistence handlers, and Grade A structural integrity. |
| **0.9.107** | 2026-03-07 | Fix missing imports in conformance layer and repository regressions. |
| **0.9.105** | 2026-03-07 | SOLID standardization of tool handlers, Git bridge unification, event-sourcing prototype, and database health cleanup. |
| **0.9.103** | 2026-03-07 | Genetic Preservation Policy, Soft Delete migration for atoms/issues, schema stabilization, and 100/100 Health Score recovery. |
| **0.9.102** | 2026-03-07 | Pipeline Integrity Detector, auto-audit system, technical debt consolidation, unified duplicate detection API. |
| **0.9.101** | 2026-03-06 | Unified scanned-file manifest, aligned scanner/hash/index file universes, and exposed persisted file coverage in compiler explainability. |
| **0.9.100** | 2026-03-06 | Canonical centrality-coverage adoption wired into health and pipeline reporting surfaces. |
| **0.9.99** | 2026-03-06 | Compiler explainability, signal confidence, telemetry provenance and full canonical adoption closure. |
| **0.9.98** | 2026-03-06 | Compiler foundations, docs sync, base compiler/runtime files committed and indexed cleanly. |
| **0.9.97** | 2026-03-06 | Canonical testability and semantic-purity APIs wired into MCP/query consumers. |
| **0.9.96** | 2026-03-06 | Canonical persistence sync, manual runtime restart, service-boundary cleanup, detector hardening. |
| **0.9.95** | 2026-03-06 | Compiler canonicalization, remediation/reporting unification, watcher diagnostics lifecycle, runtime ownership hardening. |
| **0.9.94** | 2026-03-05 | File Watcher Guard System v2.0, guard standardization, error-handling detection fix. |
| **0.9.93** | 2026-03-05 | Critical error-handling hardening, live debugging validation, UTF-8 MCP fixes. |
| **0.9.92** | 2026-03-05 | Unified Analysis Core, Dynamic Shadow Volume, queue consolidation. |
| **0.9.91** | 2026-03-05 | Real-time integrity guards, shared-state contention alerts, atomic naming validation. |
| **0.9.90** | 2026-03-05 | Daemon intelligence, shared-state tracking, Node.js resource leak detection. |
| **0.9.89** | 2026-03-05 | Session persistence, syntax shield, daemon health heuristics. |

See `changelog/README.md` for the full historical index.

## Latest Release: v0.9.105 (2026-03-07)

**SOLID Standardization & Git Unification**

### Key Achievements

1. **SOLID Handler Pattern**: Decoupled `SemanticQueryTool` and `QueryGraphTool` logic into specialized handlers (`GraphQueryHandler`, `SocietyHandler`, `DuplicateHandler`, etc.), improving maintainability and reducing "God Object" complexity.
2. **Git Bridge Unification**: Created `GitTerminalBridge` as the central authority for all shell and git interactions, replacing fragmented `exec` calls across the project.
3. **Database Health Restoration**: Developed and executed `cleanup-orphans.js`, purging **~4600 orphaned records** (atoms and relations) and resolving the "Grade F" integrity issue.
4. **Event Sourcing Prototype**: Implemented native event tracking in `SQLiteCrudOperations`, capturing `created`, `updated`, and `deleted` events in the `atom_events` table for better traceability.
5. **High-Coherence History**: Refactored `get_atom_history` to provide strict input correlation and include historical code snippets in the response.

### New & Refactored Files

- `src/shared/utils/git-terminal-bridge.js` (Canonical Git service)
- `src/layer-c-memory/mcp/tools/semantic/handlers/` (New SOLID handlers)
- `scripts/cleanup-orphans.js` (Database janitor)
- `src/layer-c-memory/storage/repository/adapters/sqlite-crud-operations.js` (Event sourcing logic)

---

## Previous Release: v0.9.103 (2026-03-07)

## Previous Release: v0.9.102 (2026-03-07)

**Pipeline Integrity Detector & Auto-Audit System**

### Key Achievements

1. Implemented `PipelineIntegrityDetector` with 8 critical verifications: scan-to-atom coverage, metadata completeness, calledBy resolution, guard execution, issue persistence, MCP data access, orphaned data, and relation consistency.
2. Created `IntegrityDashboard` that calculates overall health score (0-100), assigns grade (A+ to F), and generates prioritized recommendations.
3. Added MCP tool `mcp_omnysystem_check_pipeline_integrity` for on-demand pipeline auditing.
4. Integrated auto-execution post-Phase 2 that logs results and persists critical issues in `semantic_issues`.
5. Unified duplicate detection API with `duplicate-utils.js` providing shared functions for structural, conceptual, and unified duplicate guards.
6. Implemented technical debt consolidation with debt score (0-100), trend tracking, and priority actions.
7. Created metadata utilities API for standardized metadata handling across guards and MCP tools.

### System Now Self-Audits

- **Automatic post-Phase 2:** Pipeline integrity check runs after every Phase 2 completion
- **On-demand via MCP:** `check_pipeline_integrity(fullCheck: true)` returns comprehensive report
- **Critical issues persisted:** Issues with severity 'high' are stored in `semantic_issues` for tracking
- **Console logging:** Executive summary with health score, grade, and top recommendations

### New Files

- `src/core/meta-detector/pipeline-integrity-detector.js` (367 lines)
- `src/core/meta-detector/integrity-dashboard.js` (237 lines)
- `src/layer-c-memory/mcp/tools/check-pipeline-integrity.js` (87 lines)
- `src/layer-c-memory/mcp/tools/technical-debt-report.js` (194 lines)
- `src/shared/compiler/duplicate-utils.js` (366 lines)
- `src/shared/compiler/metadata-utils.js` (151 lines)
- `src/core/file-watcher/guards/unified-duplicate-guard.js` (447 lines)

**Total:** 1,849 new lines + 3 comprehensive documentation files

## What To Do Next

1. Consider implementing auto-fix for simple issues (dead code, async safety)
2. Add webhook notifications for critical pipeline integrity issues
3. Create visual dashboard for real-time health monitoring
4. Implement historical trends tracking for health score by sprint
5. Integrate with CI/CD to block PRs with health score below threshold

---

## Previous Release: v0.9.101 (2026-03-06)

**Scanned File Manifest Unification**

### Key Achievements

1. Added a canonical scanned-file manifest API so the compiler can persist files that intentionally produce `0` atoms.
2. Aligned `discoverProjectSourceFiles()`, hash-cache change detection and persisted-file coverage around the same file universe.
3. `get_server_status()` now exposes `compilerExplainability.persistedFileCoverage` so agents can verify scanner/hash/index synchronization directly.
4. The previous startup recovery noise for files present in hash cache but missing from the persisted index is now resolved through manifest sync instead of repeated recovery.
5. Canonical guidance and standardization reporting can now recommend the scanned-file manifest pattern when this drift reappears elsewhere.

## What To Do Next

1. Extend the same “canonical manifest + adoption detection” pattern to any remaining telemetry families that still compare mismatched universes.
2. Reduce structural debt in runtime-heavy modules and watcher policy files now that the compiler surfaces are aligned.
3. Keep promoting new families through shared/compiler entry points before MCP/runtime consumers add local heuristics.
