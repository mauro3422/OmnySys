# CHANGELOG - OmnySys

All notable changes are documented as individual files in [`changelogs/`](changelogs/).

**Historial completo archivado**: [`changelogs/CHANGELOG-archived-v0.0-v0.9.432.md`](changelogs/CHANGELOG-archived-v0.0-v0.9.432.md)

---

## v0.9.437 — Folderize Naming Repair + Import Resolution Plan (2026-04-10)

- Fixed `folderize_family` producing redundant folder/file names (strip directory context prefix + family prefix)
- Added `history` and `snapshot` to `FOLDERIZATION_SUFFIXES` for correct family detection
- Removed broken `buildActualMoveMap` from folderize flow (was matching wrong files by token similarity)
- Added `rewriteRelativeImportsForNewLocation()` (partial — detects but cannot fix all cases yet)
- Folderized 5 families: `persistence/`, `graph-builder/`, `restart-runtime/`, `move-orchestrator/`, `websocket-server/`
- Created Import Resolution Engine plan (`docs/development/plan-import-resolution-engine.md`)
- Documented gap: Layer Graph is reactive-only; needs proactive pre-compute mode for safe folderization

**Detalle completo**: [changelogs/v0.9.437.md](changelogs/v0.9.437.md)

---

## v0.9.436 — Control Plane Foundations & Propagation Alignment (2026-04-09)

- Centralizacion de `controlPlaneFoundations` para status, metrics, schema y snapshots
- Limpieza de wrappers locales en handlers MCP/runtime
- Propagacion explicita en health/pipeline/watcher/backlog
- Reconciliacion automatica de archivos fuera de `compiler_scanned_files`
- Renombre de helper en backlog para evitar duplicados conceptuales

**Detalle completo**: [changelogs/v0.9.436.md](changelogs/v0.9.436.md)

---

## v0.9.435 — Folderize Family Naming Repair (2026-04-09)

- Fixed `folderize_family` producing redundant folder names (`compiler/compiler-metrics-snapshot/` → `compiler/metrics/`)
- Fixed `folderize_family` keeping redundant file basenames (`compiler-metrics-snapshot-helpers.js` → `metrics/helpers.js`)
- Added `history` and `snapshot` to `FOLDERIZATION_SUFFIXES` for correct family detection
- Added `skipSelfRewrite` to `MoveOrchestrator` to defer import rewriting to folderize rewriter
- Removed `buildActualMoveMap` from folderize flow (was matching wrong files by token similarity)
- Expanded `rewriteIntraFamilyImports` regex to match `../` relative imports
- Folderized `src/shared/compiler/metrics/` (5 files from `compiler-metrics-snapshot*`)
- Folderized `src/shared/compiler/metrics-current/` (3 files from `compiler-metrics-current*`)

**Detalle completo**: [changelogs/v0.9.435.md](changelogs/v0.9.435.md)

---

## v0.9.434 — Propagation Drift & Control-Plane Repair (2026-04-09)

- Repaired `consolidate_policy_drifts` batch resolution path
- Cleared last `data_gateway` drift via canonical data-gateway contract
- Repaired control-plane propagation adoption coverage
- Expanded watcher guard propagation payloads across `async-safety` and `circular-guard`

**Detalle completo**: [changelogs/v0.9.434.md](changelogs/v0.9.434.md)

---

## v0.9.433 — (2026-04-09)

**Detalle completo**: [changelogs/v0.9.433.md](changelogs/v0.9.433.md)

---

## v0.9.432 — Restart Process Split (2026-04-09)

- Process-restart lifecycle extracted to dedicated module
- Folderization snapshots reuse canonical drift/semantic contracts
- Bridge telemetry persists derived settled state

**Detalle completo**: [changelogs/v0.9.432.md](changelogs/v0.9.432.md)

---

## v0.9.431 — MCP Restart Recovery & Observability (2026-04-09)

- Restart ACK/recovery flow survives `processRestart` cycles
- Canonical observability contract aggregates propagation/policy/gateway
- Compiler dashboard split to stay below watcher file-size threshold

**Detalle completo**: [changelogs/v0.9.431.md](changelogs/v0.9.431.md)

---

## v0.9.430 → v0.9.100

Individual release notes in [`changelogs/`](changelogs/).

---

## v0.9.99 — Compiler Explainability & Full Canonical Adoption

**Detalle completo**: [changelogs/v0.9.99.md](changelogs/v0.9.99.md)

---

## v0.9.98 — Compiler Foundations & Docs Sync

**Detalle completo**: [changelogs/v0.9.98.md](changelogs/v0.9.98.md)

---

**Para releases anteriores** (v0.9.97 → v0.0.0), ver [`changelogs/`](changelogs/) o el archivo histórico [`changelogs/CHANGELOG-archived-v0.0-v0.9.432.md`](changelogs/CHANGELOG-archived-v0.0-v0.9.432.md).
