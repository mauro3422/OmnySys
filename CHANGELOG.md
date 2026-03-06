# CHANGELOG - OmnySys

All notable changes to this project are documented here as a release index. Detailed per-version notes live in `changelog/`.

## Unreleased

- No unreleased changes yet.

## Quick Links

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
| **0.9.96** | 2026-03-06 | Canonical persistence sync, manual runtime restart, service-boundary cleanup, detector hardening. |
| **0.9.95** | 2026-03-06 | Compiler canonicalization, remediation/reporting unification, watcher diagnostics lifecycle, runtime ownership hardening. |
| **0.9.94** | 2026-03-05 | File Watcher Guard System v2.0, guard standardization, error-handling detection fix. |
| **0.9.93** | 2026-03-05 | Critical error-handling hardening, live debugging validation, UTF-8 MCP fixes. |
| **0.9.92** | 2026-03-05 | Unified Analysis Core, Dynamic Shadow Volume, queue consolidation. |
| **0.9.91** | 2026-03-05 | Real-time integrity guards, shared-state contention alerts, atomic naming validation. |
| **0.9.90** | 2026-03-05 | Daemon intelligence, shared-state tracking, Node.js resource leak detection. |
| **0.9.89** | 2026-03-05 | Session persistence, syntax shield, daemon health heuristics. |

See `changelog/README.md` for the full historical index.

## Latest Release: v0.9.96 (2026-03-06)

**Canonical Persistence Sync & Runtime Drift Reduction**

### Key Achievements

1. New canonical persistence bridge in `shared/compiler` for indexed files, stale metadata cleanup and import orphan emission.
2. Live-row sync now acts as the runtime entrypoint for DB drift reconciliation across MCP/query consumers.
3. Runtime restart behavior is decoupled from DB/cache refresh through manual restart mode and better pending-restart visibility.
4. Service-boundary, canonical-extension and async-error detectors were hardened so they report code reality instead of comments/strings/noisy helper names.
5. Policy drift was reduced to the remaining real backlog: mostly `testability`, `semantic_purity` and one shared-state hotspot family.

## What To Do Next

1. Use the new standardization report to close adoption gaps instead of adding more ad-hoc helpers.
2. Reduce complexity in the compiler runtime itself, especially policy/conformance modules and bridge logic.
3. Keep historical release details in `changelog/` and use this file only as the live release index.
