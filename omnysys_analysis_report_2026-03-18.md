# OmnySys analysis report
Date: 2026-03-18

## Scope
- Repository review via GitHub connector
- Direct inspection of uploaded SQLite database (`omnysys.db` + WAL/SHM)

## Executive summary

The project is architecturally ambitious and the repo narrative is coherent: OmnySys positions itself as a governance / compiler-like control layer for AI-assisted codebases, with static extraction, semantic/governance analysis, and SQLite/MCP persistence layers.

The database, however, shows several **canonicity and synchronization drifts** that matter more than ordinary code debt:

1. **Call graph persistence is effectively broken at the canonical-table level**
   - `atom_relations`: 119,856 total rows, but **all 119,790 `calls` relations are soft-removed**
   - only 66 active relations remain, all of type `shares_state`
   - `call_graph` has only 19 rows, and those point to removed relative-ID atoms, not active atoms

2. **Mixed identity schemes exist in persisted atoms**
   - active atoms overwhelmingly use Windows absolute IDs like `C:/Dev/OmnySystem/...`
   - removed atoms include a secondary relative-ID scheme
   - this split likely contributes to graph and relation drift

3. **File-universe tables are not fully aligned**
   - `compiler_scanned_files`: 2,080
   - `file_hashes`: 2,080
   - `files`: 2,104 total / 1,843 active
   - `system_files`: 2,078, all active
   - `risk_assessments`: 2,078 total / 1,820 active

4. **`system_files` is lagging behind the repo**
   - newly added files from the latest sprint are present in scan/hash universes but not in `system_files`
   - examples:
     - `src/shared/compiler/actions/ActionEngine.js`
     - `src/shared/compiler/helpers/FileProcessingHelper.js`
     - `src/shared/compiler/recommendations/RecommendationEngine.js`

5. **Some “zero-atom / barrel / re-export” files appear scanned but marked removed in `files`**
   - examples:
     - `omny.js`
     - `mcp-http-server.js`
     - `src/core/index.js`
     - `src/core/file-watcher/handlers.js`
     - `src/ai/llm-client.js`
   - this may be a regression against the intended “persist zero-atom files” policy

6. **Semantic projection coverage is much thinner than atom-level coverage**
   - active atoms: 10,928
   - atoms with embedded `calls_json`: 6,906
   - total embedded call edges from `calls_json`: 55,861
   - but persisted `call_graph`: only 19
   - `system_files.semantic_analysis_json`: 0 populated rows
   - `system_files.semantic_connections_json`: 0 populated rows
   - `semantic_connections` table: only 29 rows

7. **Risk labeling likely needs calibration**
   - 26 files are labeled `critical` with average risk score only 1.0
   - this suggests threshold naming or classification semantics are off

8. **Latest watcher / phase2 output still reports debt**
   - `semantic_issues` contains:
     - `SOLIDNormalizer` data-flow coherence high issue
     - `SOLIDNormalizer` complexity/length medium issue
     - project-wide technical debt issue reporting 50 conceptual groups

## Database table counts

| Table | Rows |
|---|---:|
| atoms | 11,114 |
| atom_health | 11,114 |
| atom_versions | 11,525 |
| atom_events | 97,573 |
| atom_relations | 119,856 |
| files | 2,104 |
| compiler_scanned_files | 2,080 |
| file_hashes | 2,080 |
| file_dependencies | 3,029 |
| risk_assessments | 2,078 |
| system_files | 2,078 |
| semantic_connections | 29 |
| semantic_issues | 3 |
| societies | 1,381 |
| call_graph | 19 |
| modules | 0 |

## Active vs removed

| Table | Active | Removed |
|---|---:|---:|
| atoms | 10,928 | 186 |
| atom_relations | 66 | 119,790 |
| files | 1,843 | 261 |
| risk_assessments | 1,820 | 258 |
| semantic_connections | 29 | 0 |
| semantic_issues | 3 | 0 |
| system_files | 2,078 | 0 |

## Key integrity mismatches

### File-universe drift
- active files not scanned: 21
- scanned files not active in `files`: 258
- hash entries not active in `files`: 258
- active files missing hashes: 21
- `system_files` not scanned: 3
- scanned files not in `system_files`: 5

### Dependency coverage
- total active dependencies: 3,029
- dependencies whose source exists in scan manifest: 3,029
- dependencies whose target exists in scan manifest: 3,029
- dependencies whose source exists in active `files`: 2,975
- dependencies whose target exists in active `files`: 2,505

Interpretation: dependency extraction still “sees” the files, but canonical file activation status is lagging or being downgraded for many surfaces.

### Orphans
- active atoms missing active `files` row: 0
- active atoms missing `system_files` row: 34
- active dependency sources missing active `files` row: 54
- active dependency targets missing active `files` row: 524
- active risk rows missing active `files` row: 3
- `system_files` rows missing active `files` row: 261
- atom_versions with no matching atom: 411

## Identity / canonical ID findings

### Atom ID formats
- `abs_windows`: 10,937 total / 10,928 active
- `relative`: 177 total / 0 active

### Relation ID formats
- `calls` relations use relative IDs only and are all removed
- `shares_state` relations use Windows absolute IDs and remain active

This is one of the strongest signals in the DB: **the active atom universe and the persisted call-relation universe are not using the same canonical identity scheme**.

## Call graph / relation findings

### Persisted graph surfaces
- active `calls` relations in `atom_relations`: 0
- active `shares_state` relations: 66
- `call_graph` rows: 19
- `call_graph` rows matching any atom: 19
- `call_graph` rows matching active atoms: 0

### Embedded atom-level signals
- atoms with populated `called_by_json`: 2,140
- embedded `called_by` edges: 3,214
- atoms with populated `calls_json`: 6,906
- embedded call edges from `calls_json`: 55,861

Interpretation: **the call information still exists inside atom JSON blobs, but the canonical graph tables are not carrying it forward correctly**.

## System projection coverage

### Atom JSON coverage (active atoms)
- `signature_json`: 10,928 / 10,928
- `data_flow_json`: 10,928 / 10,928
- `temporal_json`: 10,928 / 10,928
- `error_flow_json`: 10,928 / 10,928
- `performance_json`: 10,928 / 10,928
- `dna_json`: 10,928 / 10,928
- `derived_json`: 10,928 / 10,928
- `imports_json`: 10,928 / 10,928
- `exports_json`: 10,928 / 10,928
- `uses_json`: 10,928 / 10,928
- `side_effects_json`: 10,928 / 10,928
- `calls_json`: 6,906 / 10,928
- `called_by_json`: 2,140 / 10,928
- `shared_state_json`: 38 / 10,928
- `event_emitters_json`: 67 / 10,928
- `event_listeners_json`: 101 / 10,928

### `system_files` JSON coverage
- `semantic_analysis_json`: 0 / 2,078
- `semantic_connections_json`: 0 / 2,078
- `definitions_json`: 0 / 2,078
- `calls_json`: 0 / 2,078
- `identifier_refs_json`: 0 / 2,078
- `exports_json`: 1,717 / 2,078
- `imports_json`: 1,350 / 2,078
- `used_by_json`: 1,292 / 2,078
- `depends_on_json`: 1,212 / 2,078
- `transitive_depends_json`: 1,212 / 2,078
- `transitive_dependents_json`: 1,292 / 2,078

Interpretation: the low-level extraction layer is populated, but higher-level projection tables remain sparse or stale.

## Risk assessment observations

### Distribution
- `medium`: 53 files, average score 3.17, max 5.0
- `critical`: 26 files, average score 1.0, max 1.0
- `low`: 1,741 files, average score 0.01, max 2.0

The label `critical` does not align with the numeric score distribution. That may be a severity naming bug or a classifier calibration issue.

### Top source risks
- `src/layer-a-static/parser/index.js` — 4.0 (`medium`)
- `src/layer-a-static/pipeline/phases/atom-extraction/extraction/atom-extractor.js` — 3.0 (`medium`)
- `src/layer-a-static/extractors/data-flow/index.js` — 3.0 (`medium`)
- `src/layer-a-static/extractors/metadata/index.js` — 3.0 (`medium`)
- `src/core/file-watcher/analyze.js` — 3.0 (`medium`)
- `src/core/file-watcher/guards/default-impact-guard-definitions.js` — 3.0 (`medium`)
- `src/core/file-watcher/guards/default-semantic-guard-definitions.js` — 3.0 (`medium`)
- `src/core/file-watcher/guards/registry.js` — 3.0 (`medium`)
- `src/core/file-watcher/guards/unified-duplicate-guard.js` — 3.0 (`medium`)
- `src/core/file-watcher/handlers/file-handlers.js` — 3.0 (`medium`)

## Latest persisted issues

1. `src/layer-c-memory/mcp/core/shared/solid-normalizer.js`
   - high: data-flow coherence 0%
   - medium: function/class length 122 lines

2. `project-wide`
   - high: 50 conceptual debt groups detected post-Phase 2
   - top duplicate fingerprints include:
     - `get:telemetry:core:stats` (35)
     - `process:lifecycle:core:clear` (18)
     - `generate:logic:core:recommendations` (11)
     - `process:logic:core:perform_action` (11)
     - `process:telemetry:core:log` (9)

## Repository-level contradictions worth resolving tomorrow

1. **Version drift in repo metadata**
   - `package.json` still reports `0.9.127`
   - changelog / commits already reference `0.9.141` and `0.9.142`

2. **Release claim vs test artifact**
   - release notes claim 100% passing tests
   - `tests_results.json` in the repo shows 102 suites, 98 passed, 4 failed; 244 tests, 241 passed, 3 failed

3. **Recently added canonical helpers are not fully represented in system projection tables**
   - `ActionEngine`
   - `FileProcessingHelper`
   - `RecommendationEngine`

## Concrete hypotheses

### Highest confidence
1. There is a **canonical-ID migration drift** between relative atom IDs and absolute Windows atom IDs.
2. The **call graph persistence layer** is stale or being soft-deleted without a successful re-materialization step.
3. The **file activation policy for zero-atom files** is not behaving consistently with the intended scanned-file manifest contract.
4. `system_files` is a **lagging projection**, not a trustworthy SSOT right now for newly added or reorganized files.

### Medium confidence
5. Risk severity labels (`critical`) are miscalibrated or mapped incorrectly from numeric scores.
6. Layer B / semantic projection is only partially written through to canonical tables after the latest sprint.
7. Some removed test files are still represented in semantic / risk surfaces because cleanup ordering is not fully canonicalized.

## What I would debug first tomorrow

### Priority 1 — call graph / identity canonicity
- Rebuild or inspect the pipeline step that materializes `atom_relations` and `call_graph`
- confirm one canonical atom ID scheme end-to-end
- verify whether any code still emits relative atom IDs after the rest of the system adopted absolute IDs

### Priority 2 — file-universe reconciliation
- inspect why scanned/hash/system universes say files are live while `files.is_removed=1` for many barrels / re-export files
- decide whether zero-atom files must stay active in `files`
- re-run integrity checks after correcting this

### Priority 3 — system projection sync
- rebuild / verify population of:
  - `system_files.semantic_analysis_json`
  - `system_files.semantic_connections_json`
  - `system_files.calls_json`
  - `system_files.definitions_json`
- these are currently empty across the table

### Priority 4 — risk/severity semantics
- trace how `risk_score` maps to `risk_level`
- especially why score `1.0` can be labeled `critical`

### Priority 5 — release/test truthfulness
- sync `package.json` version with actual release state
- decide whether `tests_results.json` is stale, partial, or the release notes are overstating success

## Suggested first debug checklist

1. Compare current atom ID generator to relation/call-graph ID generator
2. Run a focused re-materialization of call relations only
3. Recompute file activation for zero-atom files
4. Rebuild `system_files` from scanned/hash/files SSOTs
5. Recompute risk labels from raw scores and factors
6. Re-run pipeline integrity and export exact deltas

## Useful example paths to inspect
- `src/shared/compiler/actions/ActionEngine.js`
- `src/shared/compiler/helpers/FileProcessingHelper.js`
- `src/shared/compiler/recommendations/RecommendationEngine.js`
- `src/layer-c-memory/mcp/core/shared/solid-normalizer.js`
- `src/core/file-watcher/guards/registry.js`
- `src/layer-a-static/pipeline/phases/calledby/namespace-detector.js`
- `src/layer-a-static/pipeline/phases/registration-detector.js`
- `src/layer-a-static/extractors/data-flow/index.js`
- `src/layer-a-static/parser/extractor.js`
- `src/layer-a-static/parser/extractors/exports.js`
- `src/layer-a-static/parser/extractors/imports.js`

## Notes
- SQLite integrity check returned `ok`
- JSON columns inspected were syntactically valid
- the main problems are not corruption, but **semantic drift, projection lag, and canonicity mismatch**
