# CHANGELOG - OmnySys

All notable changes to this project are documented here as a release index. Detailed per-version notes live in `changelog/`.

## Unreleased

- No unreleased changes yet.

## Quick Links

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

## Latest Release: v0.9.99 (2026-03-06)

**Compiler Explainability & Full Canonical Adoption**

### Key Achievements

1. The compiler now exposes `signalConfidence`, `telemetryProvenance`, `compilerExplainability` and canonical-adoption coverage to agents through MCP status surfaces.
2. Canonical shared-state reporting was added and connected to watcher/MCP consumers instead of ad hoc contention scans.
3. The remaining `testability`, `semantic_purity` and `shared_state_hotspots` adoption gaps were closed.
4. Direct conformance scans now return `0` findings for those policy families and status reports `adoptionCoverage: 21/21`.
5. The remaining canonical backlog is now explicit and narrow: `centrality_coverage_adoption` plus normal structural runtime debt.

## What To Do Next

1. Adopt the canonical centrality-coverage policy in the remaining health/pipeline/watcher consumers.
2. Reduce complexity in runtime-heavy modules like atomic-edit tools and large coordinators.
3. Keep expanding explainability surfaces only through shared/compiler entry points, not per-tool heuristics.
