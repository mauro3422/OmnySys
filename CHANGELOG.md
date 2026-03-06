# CHANGELOG - OmnySys

All notable changes to this project are documented here as a release index. Detailed per-version notes live in `changelog/`.

## Unreleased

- No unreleased changes yet.

## Quick Links

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

## Latest Release: v0.9.101 (2026-03-06)

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
