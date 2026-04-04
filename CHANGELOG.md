# CHANGELOG - OmnySys

All notable changes to this project are documented here as a release index. Detailed per-version notes live in `changelogs/`.

## Unreleased

- Added a folderization automation planner that reuses propagation, normalization, policy coverage, canonical promotion, and connected-system metadata so the system can decide when a folderization move is safe to execute.
- Centralized the control-plane contract resolution for status payloads and the compiler health dashboard so inventory, promotion, propagation, and policy coverage now come from shared helpers instead of repeated fallback chains.
- Added normalization summary to folderization, compiler metrics, technical debt, and explainability snapshots so naming debt now surfaces as an actionable metric instead of staying hidden inside folderized-family analysis.
- Added a safe folderized-name normalizer that plans naming debt from the canonical folderization report and only executes via the existing rename flow when the plan is explicitly safe.
- Exposed propagation contract metadata on the folderized rename/normalization tool definitions so the watcher sees the naming surface as a canonical contract instead of an ad-hoc local policy.
- Surfaced `propagation` directly in `status-server-details`, `get-system-inventory-report`, and `get-canonical-promotion-report` so the public control-plane surfaces expose the shared contract instead of burying it in nested snapshot payloads.
- Split `diagnose-tool-health` into analysis/rules/core helpers and moved the canonical promotion report orchestration into a runner helper to keep the public tool files flatter and watcher-friendly.
- Split `diagnose-tool-health` into analysis/report helpers, exposed the canonical propagation plan on the tool response, and surfaced `propagation` in `pipeline_health` so both surfaces now publish the shared contract directly.
- Surfaced the canonical propagation plan in `diagnose-tool-health` and `check-pipeline-integrity` so tool-health and integrity reports now carry the same plan language as folderization, status, and metrics consumers.
- Split the technical-debt report load path into a dedicated helper so the core report loader stays flatter and easier for the watcher to reason about.
- Added canonical proxy runtime telemetry so MCP status and health can detect restart/crash thrashing instead of inferring daemon instability from logs alone.
- Surfaced proxy runtime telemetry in the system table, structured status payload, and compiler metrics snapshot so restart loops, crash loops, and clean exits are visible alongside startup telemetry.
- Added canonical bridge runtime telemetry so client disconnects, transport closes, session expiry, and reconnect loops are visible instead of forcing shell fallback when the MCP client transport drops.
- Preserved proxy and bridge runtime telemetry across restarts so status can distinguish fresh boot noise from a real reconnect or crash pattern.
- Added canonical startup regression telemetry so bootstrap summaries can distinguish expected full reindex startup from a real regression and surface the result in status, health, and dashboard consumers.
- Simplified the health and system inventory snapshot tools into thin wrappers so their exported MCP contracts stay below the watcher complexity threshold.
- Moved canonical promotion compacting into the shared explainability helpers and reused the canonical score clamp helper to remove duplicate scoring logic.
- Surfaced canonical promotion in the raw compiler health dashboard daily payload so the live dashboard keeps the promotion signal aligned with the archive and snapshot consumers.
- Split the compiler health dashboard test fixture into a dedicated helper file so the main dashboard test stays under the watcher file-size threshold.
- Added a canonical promotion layer above folderization so folderized families and emergent system surfaces can be evaluated for promotion into canonical APIs without moving files inside the same tool.
- Surfaced canonical promotion in the metrics snapshot, health dashboard, status payload, and status table so the runtime can show when a family is ready to become a canonical surface.
- Added a dedicated `mcp_omnysystem_get_canonical_promotion_report` tool to combine system inventory with folderization evidence and produce a reusable promotion plan.
- Added a canonical system inventory layer so the compiler health stack can classify canonical surfaces, emergent systems, bridges, wrappers, and promotion candidates in one reusable report.
- Surfaced system inventory in the metrics snapshot, health dashboard, status payload, and status table so the runtime can show system centrality alongside tool inventory and cache policy.
- Surfaced canonical promotion in the archive daily summary and compact metrics snapshot daily shape so historical and derived views keep the promotion signal without recomputing it.
- Surfaced folderization propagation in the compiler health dashboard tool telemetry so the derived plan is visible in the same collection that reports tool noise and cache policy.
- Preserved folderization propagation in the daily archive summary so historical health snapshots can replay the same propagation plan without recomputing it.
- Split the compiler metrics snapshot summary builders into a dedicated helper module so the compact snapshot path stays under the watcher complexity and file-size thresholds.
- Surfaced folderization propagation in the compiler health dashboard so the compact health view can read the derived plan directly.
- Added folderization propagation to the one-line health panel summary so the runtime panel can show the decision without drilling into folderization internals.
- Split the health dashboard panel test into a dedicated file to keep the watcher-aware test surface under the file-size threshold.
- Elevated folderization propagation into the compact compiler metrics snapshot so the derived plan is visible outside the folderization family.
- Surfaced propagation explicitly in the structured status payload so downstream consumers can read the plan without drilling into folderization internals.
- Kept the propagation contract reusable by preserving cache keys, decision mode, and connected systems in the compact snapshot path.
- Added a canonical `propagation_expansion` policy area so watcher and tool surfaces can report when propagation is not being surfaced where expected.
- Surfaced propagation-expansion drift in the compiler health dashboard, status table, and drift assessment so the live panel shows the recommendation alongside the reason.
- Expanded the propagation-expansion detector to cover watcher and tool surfaces that emit status, health, snapshot, summary, or report payloads without attaching the shared propagation contract.
- Connected pipeline-health issue builders to the shared propagation engine so shadow-volume, zero-atom, and slow-analysis issues now carry a cacheable propagation summary.
- Connected pipeline-orphan reporting payloads to the shared propagation engine so orphan findings now propagate into watcher persistence and downstream consumers.
- Connected duplicate-risk remediation contexts to the shared propagation engine so duplicate finding clusters now expose propagation guidance for folderization and renaming.
- Connected integrity-guard data-flow violations to the shared propagation engine so low-coherence and unused-input findings now include propagation coverage.
- Connected `impact-wave` to the shared propagation engine so file-guard alerts now carry a cacheable propagation plan alongside the evidence.
- Connected topology-regression and semantic-coverage guards to the shared propagation engine so their persisted watcher issues and emitted events now include propagation summaries.
- Connected compiler policy drift reporting to the shared propagation engine so governance findings now propagate into the shared cache, status, and explainability surfaces.
- Connected the `impact-wave` file-guard flow to the shared propagation engine so alerts now carry a cacheable propagation plan alongside the evidence.
- Persisted the impact-wave propagation summary inside the watcher issue context and surfaced it in the emitted `arch:impact-wave` event.
- Added impact-wave propagation coverage to the shared propagation engine, including change-type defaults and watcher-connected systems.
- Made the shared propagation engine derive its own stable cache key when callers do not provide one, so the plan can be cached immediately instead of depending on a manual key.
- Kept the propagation cache contract reusable by preserving the key and cache-hit state in the folderization report summary and explainability compactors.
- Added a shared propagation engine that computes a reusable plan for folderization changes, including cache keys, connected systems, move targets, impacted files, rewrites, and validation targets.
- Gave the propagation plan an in-memory cache contract so repeated callers can reuse the same derived plan while the underlying folderization fingerprint remains stable.
- Rewired folderization report generation to read and write the shared propagation cache instead of maintaining a one-off local propagation shape.
- Surfaced propagation cache keys and cache-hit state through folderization explainability so the live dashboard can show when a plan was reused versus recomputed.
- Declared folderization propagation as a first-class cacheable surface in the cache policy summary, alongside the other derived snapshot tiers.
- Added a shared propagation engine so folderization changes now derive a single propagation plan with connected systems, move targets, impacted files, rewrites, and validation targets from one canonical place.
- Rewired `folderization-report` to build propagation through the shared engine instead of maintaining a local propagation shape.
- Preserved the propagation signal in compiler explainability compactors so the live dashboard can surface connected systems and change scope consistently.
- Added an explicit folderization propagation summary so snapshots and technical-debt reports now show move targets, impacted files, rewrites, and validation targets as first-class signals.
- Threaded that propagation summary through the folderization snapshot service, technical-debt report, and compiler explainability compactors so the same impact shape is visible in both live status and persisted history.
- Expanded folderization candidate actions to report dependent file impact alongside the move and rewrite counts.
- Reused the latest DB-backed folderization snapshot inside `technical_debt_report` so naming debt no longer disappears when the live compiler snapshot starts empty.
- Added a short TTL cache to `get_server_status` so repeated panel polls reuse the same status envelope instead of recomputing every field on every call.
- Reexported the status response cache through the canonical compiler barrel and removed the private helper import that was still surfacing as policy drift.
- Rewired `SemanticQueryTool` to import canonical compiler helpers directly instead of pulling the whole barrel, reducing the risk of loader cycles in heavy query tools.
- Split `SemanticQueryTool` duplicate/society helpers into a dedicated semantic helper module so the coordinator stays under the complexity threshold.
- Classified the heavy MCP tools into explicit cache tiers and centralized the shared sampling helpers used by the snapshot and dashboard layers.
- Removed the remaining compiler policy drift findings by routing testability, shared-state hotspot, semantic-coverage, semantic-purity, and metadata-propagation paths through canonical shared compiler helpers.
- Exposed the compiler explainability policy and standardization projections in the health snapshot so the live dashboard now shows the remaining debt surface directly.
- Exposed `policySummary` and `standardization` in the health snapshot response so the remaining compiler explainability debt can be surfaced in the live dashboard instead of being hidden by a narrow projection.
- Split the compiler explainability policy, standardization, and contract-layer compactors into dedicated shared modules while keeping the explainability summary as a thin wrapper.
- Split the canonical compiler explainability summary into shared compact helpers so policy, standardization, contract, drift, metadata, and folderization projections now live behind a thin wrapper.
- Slimmed the technical-debt cache persistence path and centralized snapshot-path normalization into shared compiler helpers so the last hot warning clears while keeping fingerprinted persistence intact.
- Added a shared async boundary helper and wrapped noisy watcher/MCP surfaces so observation-only flows stop being counted as async-error noise.
- Fixed the database-health summary load order so live DB health and metrics snapshots no longer collapse to zero after daemon restarts.
- Centralized repeated `asNumber` and `isRepositoryReady` helpers into shared canonical utilities to remove the last conceptual duplicate debt group.
- Split the tool-run and pipeline timing telemetry mappers into smaller helpers so the remaining telemetry warnings clear after reload.

- Reduced live `policy_drift` by moving the status summary modules back onto canonical barrels and removing manual summary recomposition paths.
- Restored `tool-run-telemetry` as a single canonical implementation with a shared summary helper and tightened the repair classifier so observation-only tools no longer count as repair thrash.
- Added a short TTL cache around telemetry summaries to avoid repeated DB aggregation in tight polling loops.
- Kept recent errors clean while preserving the live health and status surfaces.

- Reworked the tool inventory report to compute real subgroups for query/action/admin tools so concentration is measured at a more useful granularity than the coarse category buckets.
- Promoted the tool inventory snapshot/report builder into `shared/compiler` so status and list tools share one canonical inventory policy.
- Updated the control-plane status surface to show both category concentration and subgroup concentration for the tool inventory instead of only the broad category bucket.
- Added an explicit update-surface summary to the status panel so atom/function changes now expose the live sync chain across `files`, `system_files`, dependencies, watcher state, and repository integrity.
- Mirrored that same update-surface summary into the bootstrap dashboard so startup output now reflects the same sync signal the runtime status panel shows.
- Wired the file watcher and single-file save path through incremental system-map sync so every analyzed file refreshes the file mirror, dependency rows, and `used_by_json` without waiting for a full reindex.
- Hardened repository integrity reporting so the status surface can fail closed when SQLite quick-check/integrity probes degrade.
- Added `mcp_omnysystem_detect_folderization_opportunities` pipeline: DETECTION-ONLY tool that scans for monoliths (>300L), semantic-dna duplication, folderization candidates, and naming debt without making changes.
- Extracted `split-large-file-helpers.js` into `shared/compiler/` so the split-large-file barrel stays under 200 lines and the grouping strategies are reusable from the compiler surface.
- Exported split grouping helpers (`groupAtomsByResponsibility`, `buildSplitPlan`, `buildBarrelContent`, etc.) through the compiler barrel.
- Extracted `schema-registry-definitions.js` (TABLE_DEFINITIONS) and `schema-registry-helpers.js` (getColumnDefinitionSQL) so the schema registry barrel drops from 766 to ~170 lines.
- Consolidated repository adapters into a barrel (`adapters/adapter.js`) re-exporting SQLiteAdapter from consolidated modules.
- Fixed `directory-structure-folderization-naming-helpers.js` path resolution for directory candidates without .js extension.
- Fixed broken imports in `repository/index.js` and `adapters/adapter.js` after adapter consolidation.
- Fixed `repository/index.js` corruption (`self/**` prefix removal).
- Registered `split_large_file` in ActionEngine and tool-handler-action.
- Refactored `SyntaxValidator` class to extract helpers (`_prepareContent`, `_runNodeCheck`, `_parseValidationResult`), reducing from 108 to <100 lines.
- Fixed arch_policy_drift in `tool-handler-action.js` by routing through canonical `performAction` from `shared/compiler/index.js`.
- Added a canonical metric dictionary so health and status surfaces can explain
  visible metrics in terms of source-of-truth surfaces, SQLite tables, graph
  layers, and caveats.
- Added cross-layer reliability scoring and a composed `globalHealthScore` so
  the executive summary no longer reflects database health alone.
- Hardened the Codex/VS Code reconnect path by normalizing degraded MCP HTTP
  request headers all the way down to the raw Node request surfaces used by the
  live transport adapter, not only the parsed header bag.
- Added a phased stability and metrics-unification plan in
  `docs/04-maintenance/system-stability-phased-plan.md` so future agents can
  continue the reconnect, trust, and debt work with a clear execution order.
- Added read-only MCP discovery resources (`omnysys://status`, `omnysys://health`, `omnysys://sessions`, `omnysys://tools`, `omnysys://schema`) so the client can list useful runtime state before it calls a tool.
- Hardened MCP session recovery with resumable Streamable HTTP, shared event-store replay, and duplicate-session auto-healing so reconnect loops can be repaired instead of amplified.
- Documented the Codex connector failure mode where a later successful tool call does not erase earlier `Reconnecting...` retries, because the loop can still point to stale client/session state.
- Recorded the reconnect/latency regression as a bug, not a normal cost: the channel can still enter retries or stall before tools arrive, and that behaviour did not exist in the previously stable path.
- Persisted lightweight folderization snapshots as a historical series so DB-backed naming guidance and sync drift can be tracked independently of the full health snapshot.
- Added a dedicated `mcp_omnysystem_get_folderization_snapshot` tool so folderization guidance, naming debt, DB sync drift, and role stems can be queried without loading the full compiler health pipeline.
- Added active atom counts and historical pipeline timing telemetry to the compiler health snapshot so the system can alert on data drift and ms regressions, not just logical issues.
- Surfaced the compact health panel one-liner in the bootstrap terminal summary so the startup log shows `health | trend | tools | ready` without dumping the full dashboard.
- Added a one-screen `mcp_omnysystem_get_health_panel` tool and wired the compiler status surface to expose a compact panel with status now, trend, top regressions, top improvements, and next action.
- Added a compact `mcp_omnysystem_get_health_snapshot` dashboard on top of the canonical metrics snapshot so one call can report current health, trend, repair telemetry, top regressors, and MVP readiness.
- Added a persisted compiler metrics snapshot layer with historical trend, velocity, and scope-aware comparisons, plus a new `mcp_omnysystem_get_metrics_snapshot` admin tool and bootstrap/status visibility.
- Added causal tool-run telemetry so MCP tool calls now persist before/after snapshots, repair scores, and success-rate aggregates in a dedicated SQLite history table.
- Added behavioral readiness metrics (`driftScore`, `stabilityScore`, `successScore`, `mvpReady`) to the compiler snapshot so the system can track an MVP success threshold over time.
- Added a dedicated metrics snapshot backlog and linked it to the folderization/naming roadmap so health progress can be tracked across runs instead of only as point-in-time summaries.
- Added scope-aware duplicate consolidation hints so architectural debt scoring can prefer the nearest DB-backed folderized family before falling back to a global duplicate hint.
- Added DB-first `scopePath` / `focusPath` folderization guidance so the system can prefer the nearest reusable family, distinguish helper and barrel policies, and stop selecting a far-away family when the local scope is clearer.
- Added folderization creation guidance so the system can suggest where new code should land, which role stems to prefer, and which folderized family to reuse before creating another helper surface.
- Added explicit `namingPatterns` visibility to folderization reporting and exposed a standalone `normalize_folderized_family_names` MCP action so basename cleanup can run independently of the folder move step.
- Added explicit `namingDebt` visibility to compiler explainability and the technical debt report so already-folderized families with many rename targets no longer hide behind the generic folderization summary.
- Stabilized the `src/shared/compiler` rename wave by separating the policy-conformance summary surface into `policy-conformance-summary.js`, reconnecting `detection.js` to the canonical reuse imports, and keeping `summary.js` reserved for database-health reporting.
- Clarified bootstrap dashboard duplicate reporting so `0 conceptual groups` now shows raw conceptual candidate counts when present, avoiding the appearance of a disconnected metric source during startup.
- Folderized the `dead-code` guard family into `src/core/file-watcher/guards/dead-code` and moved the structural duplicate detection core into `src/core/file-watcher/guards/duplicate-structural` with a folder barrel.
- Folderized `integrity-guard` into `src/core/file-watcher/guards/integrity-guard` and normalized the guard loader to import the new folderized wrapper.
- Simplified `runtime-boundary-recovery.js` to expose named recovery helpers alongside the `RecoveryStrategies` object so the static data-flow extractor stops tripping on the recovery surface.
- Moved the bulk atom event/version persistence into the same SQLite transaction as the bulk atom save so the hottest write path stops paying autocommit overhead per atom.
- Added a troubleshooting note for the case where Codex stays on `Reconnecting...` while the OmnySys daemon and direct MCP HTTP handshake are healthy.
- Folderization now auto-normalizes foldered family filenames during the move step so canonical names and import rewrites happen in one pass.
- Finished the `impact-wave` family normalization by fixing the remaining internal aliases and updating the loader path to the folderized barrel.
- Folderized `unified-duplicate-guard` into `src/core/file-watcher/guards/unified-duplicate-guard` with role-based filenames and repaired the parent-level imports that feed it.
- Folderized `semantic-persistence` into `src/core/file-watcher/guards/semantic-persistence` and normalized the evidence/query/analysis/reporting split behind a thin barrel.
- Folderized `circular-guard` into `src/core/file-watcher/guards/circular-guard` and moved the cycle/repository/persistence helpers behind a single barrel.
- Folderized `duplicate-risk-remediation` into `src/core/file-watcher/guards/duplicate-risk-remediation` and moved the structural duplicate remediation helpers behind a barrel.
- Folderized `metadata-completeness` and `semantic-coverage` into dedicated guard folders and updated both semantic loader tables to import the folderized barrels.
- Completed the `async-safety` family cleanup by moving the remaining `collection` and `guard` bridges into the folderized family and fixing the compiler barrel export chain used by folderization analysis.
- Folderization settlement now reindexes final move targets before validation, so newly moved families are reconciled into the canonical compiler DB instead of being left as transient `DB_MISSING` paths.
- Reduced hot-reload/debt noise by splitting `move-orchestrator` helpers, routing mutation settlement through the public compiler surface, and clearing the remaining watcher alerts on those paths.
- Tightened MCP session routing, stdio bridge recovery, and repository bridge state handling so reconnect/replay flows stay consistent across daemon restarts.
- Split the static pipeline analysis coordinator and worker logic into dedicated helpers so the incremental analysis path stays smaller and easier to maintain.
- Folderized `contract-taxonomy` into its own compiler subfolder and updated the compiler barrel plus snapshot test mock to point at the new barrel path.
- Normalized the `contract-taxonomy` folder basenames to role-only names (`classification`, `query`, `report`, `summary-helpers`) so the folderized convention stays consistent.
- Folderized `event-leak` into its own guard subfolder and normalized the basenames to role-only names with a barrel at `event-leak/index.js`.
- [v0.9.395 - Canonical Status Summary Refactor & Debt Cleanup](changelogs/v0.9.395.md)
- [v0.9.396 - Canonical Tool Inventory Subgroups & Ownership Cleanup](changelogs/v0.9.396.md)
- [v0.9.394 - Incremental Update Surface & Repository Integrity](changelogs/v0.9.394.md)
- [v0.9.393 - Tool Health Trending & Automatic Alerts](changelogs/v0.9.393.md)
- [v0.9.392 - Sistema de Diagnóstico Inteligente de Herramientas MCP](changelogs/v0.9.392.md)
- [v0.9.391 - Error Handling & Async Safety Improvements](changelogs/v0.9.391.md)
- [v0.9.390 - Policy Drift Fix: Canonical Compiler API](changelogs/v0.9.390.md)
- [v0.9.389 - Globalizar análisis de acoplamiento + 3 estrategias educativas](changelogs/v0.9.389.md)
- [v0.9.388 - Folderization Pipeline & Split-Large-File Integration](changelogs/v0.9.388.md)
- [v0.9.387 - Metrics Dictionary and Cross-Layer Reliability](changelogs/v0.9.387.md)
- [v0.9.384 - Sprint 16: Repository Bridge Diagnostics Split and Session-Stable Worker Settlement](changelogs/v0.9.384.md)
- [v0.9.383 - Sprint 16: Serialized Worker Settlement and Non-Recursive Repository Flush](changelogs/v0.9.383.md)
- [v0.9.382 - Sprint 16: Worker-Aware Repository Mutations and Deferred Hash Flush](changelogs/v0.9.382.md)
- [v0.9.381 - Sprint 16: Canonical Mutation Settlement and Duplicate Conceptual Folderization](changelogs/v0.9.381.md)
- [v0.9.380 - Sprint 16: Runtime Metrics Folder Rename Cleanup](changelogs/v0.9.380.md)
- [v0.9.379 - Sprint 16: Folderization Dependency Rewrite Repair](changelogs/v0.9.379.md)
- [v0.9.378 - Sprint 16: Policy Conformance Rename Repair and Barrel Compatibility](changelogs/v0.9.378.md)
- [v0.9.377 - Sprint 16: Folderization Naming Split and Live-Row Drift Suppression](changelogs/v0.9.377.md)
- [v0.9.376 - Sprint 16: Session Persistence Transparency in Runtime Status](changelogs/v0.9.376.md)
- [v0.9.375 - Sprint 16: Folderization Barrel Repair and Session Status Quieting](changelogs/v0.9.375.md)
- [v0.9.374 - Sprint 16: Repository Bridge, Runtime Health, and Durable SQLite Recovery](changelogs/v0.9.374.md)
- [v0.9.373 - Sprint 16: Folderized Naming Normalization and Rename Guidance](changelogs/v0.9.373.md)
- [v0.9.372 - Sprint 16: Folderization Metrics in Status and Technical Debt](changelogs/v0.9.372.md)
- [v0.9.371 - Sprint 16: Folderization Family State Reporting](changelogs/v0.9.371.md)
- [v0.9.370 - Sprint 16: Folderization Evolution and Existing Family Hints](changelogs/v0.9.370.md)
- [v0.9.369 - Sprint 16: Mutation Batch Guard and Status Summary Finalization](changelogs/v0.9.369.md)
- [v0.9.368 - Sprint 16: Status Summary Helpers and Assembly Split](changelogs/v0.9.368.md)
- [v0.9.367 - Sprint 16: Status Tool Inventory Summary Refactor](changelogs/v0.9.367.md)
- [v0.9.366 - Sprint 16: Deferred Runtime Reload for Reindex-Worthy Changes](changelogs/v0.9.366.md)
- [v0.9.365 - Sprint 16: Folderization Rewrite Map, Tool Inventory, and Metadata Cleanup Fixes](changelogs/v0.9.365.md)
- [v0.9.364 - Sprint 16: Folderization Migration Planner and Approved Family Moves](changelogs/v0.9.364.md)
- [v0.9.363 - Sprint 16: Duplicate-Aware Folderization Guidance](changelogs/v0.9.363.md)
- [v0.9.362 - Sprint 16: DB-Driven Folderization Candidate Scoring](changelogs/v0.9.362.md)
- [v0.9.361 - Sprint 16: Architectural Debt Score Calculators Folderization Pilot](changelogs/v0.9.361.md)
- [v0.9.360 - Sprint 16: Folderization Candidate Detection Batch](changelogs/v0.9.360.md)
- [v0.9.359 - Sprint 16: Pipeline Orphan Evidence Split Batch](changelogs/v0.9.359.md)
- [v0.9.358 - Sprint 16: Circular Guard Detection Split Batch](changelogs/v0.9.358.md)
- [v0.9.357 - Sprint 16: Integrity Guard Data-Flow Split Batch](changelogs/v0.9.357.md)
- [v0.9.356 - Sprint 16: Semantic Persistence, Pipeline Orphan, and Registry Lifecycle Split Batch](changelogs/v0.9.356.md)
- [v0.9.355 - Sprint 16: Conceptual Duplicate Pipeline and Unified Reporting Split Batch](changelogs/v0.9.355.md)
- [v0.9.354 - Sprint 16: Duplicate Guard Execution Safety Fix](changelogs/v0.9.354.md)
- [v0.9.353 - Sprint 16: Conceptual and Structural Duplicate Execution Split](changelogs/v0.9.353.md)
- [v0.9.352 - Sprint 16: Runtime Registry Evidence and Unified Duplicate Execution Split](changelogs/v0.9.352.md)
- [v0.9.351 - Sprint 16: Structural Duplicate Remediation and Core Split Batch](changelogs/v0.9.351.md)
- [v0.9.350 - Sprint 16: Impact, Registry, Shared-State, and Conceptual Duplicate Split Batch](changelogs/v0.9.350.md)
- [v0.9.349 - Sprint 16: Unified Duplicate Coordination Split](changelogs/v0.9.349.md)
- [v0.9.348 - Sprint 16: Event Leak Core Split](changelogs/v0.9.348.md)
- [v0.9.347 - Sprint 16: Async Safety Core Split](changelogs/v0.9.347.md)
- [v0.9.346 - Sprint 16: Hotspot Issues Split](changelogs/v0.9.346.md)
- [v0.9.345 - Sprint 16: Unified Duplicate Persistence Split](changelogs/v0.9.345.md)
- [v0.9.344 - Sprint 16: Circular Persistence Split](changelogs/v0.9.344.md)
- [v0.9.343 - Sprint 16: Runtime Registry Health Split](changelogs/v0.9.343.md)
- [v0.9.342 - Sprint 16: Metadata Completeness Guard Split](changelogs/v0.9.342.md)
- [v0.9.341 - Sprint 16: Semantic Coverage Guard Split](changelogs/v0.9.341.md)
- [v0.9.340 - Sprint 16: Pipeline Health Issues Split](changelogs/v0.9.340.md)
- [v0.9.339 - Sprint 16: Semantic Persistence Guard Split](changelogs/v0.9.339.md)
- [v0.9.338 - Sprint 16: Topology Regression Guard Split](changelogs/v0.9.338.md)
- [v0.9.337 - Sprint 16: Pipeline Orphan Guard Split](changelogs/v0.9.337.md)
- [v0.9.336 - Sprint 16: Conceptual Duplicate Risk Split](changelogs/v0.9.336.md)
- [v0.9.335 - Sprint 16: Unified Duplicate Guard Split](changelogs/v0.9.335.md)
- [v0.9.334 - Sprint 16: Structural Duplicate Risk Split](changelogs/v0.9.334.md)
- [v0.9.333 - Sprint 16: Conceptual Duplicate Core Split](changelogs/v0.9.333.md)
- [v0.9.332 - Sprint 16: Dead Code Guard Split](changelogs/v0.9.332.md)
- [v0.9.331 - Sprint 16: Shared State Guard Split](changelogs/v0.9.331.md)
- [v0.9.330 - Sprint 16: Hotspot Guard Split](changelogs/v0.9.330.md)
- [v0.9.329 - Sprint 16: Async Safety Guard Split](changelogs/v0.9.329.md)
- [v0.9.328 - Sprint 16: Pipeline Health Guard Split](changelogs/v0.9.328.md)
- [v0.9.327 - Sprint 16: Event Leak Guard Split](changelogs/v0.9.327.md)
- [v0.9.326 - Sprint 16: Integrity Follow-up and Runtime Registry Health Split](changelogs/v0.9.326.md)
- [v0.9.325 - Sprint 16: Impact Wave Guard Split](changelogs/v0.9.325.md)
- [v0.9.324 - Sprint 16: Integrity Guard Barrel Split](changelogs/v0.9.324.md)
- [v0.9.323 - Sprint 16: Circular Guard Split Batch](changelogs/v0.9.323.md)
- [v0.9.322 - Sprint 16: File Watcher Modified and Delete Helpers Split Batch](changelogs/v0.9.322.md)
- [v0.9.321 - Sprint 16: File Watcher Core Helper Rename Batch](changelogs/v0.9.321.md)
- [v0.9.320 - Sprint 16: File Watcher Core Helpers Split Batch](changelogs/v0.9.320.md)
- [v0.9.319 - Sprint 16: File Watcher Guard Definitions Split Batch](changelogs/v0.9.319.md)
- [v0.9.318 - Sprint 16: File Watcher Analyze Utils Split Batch](changelogs/v0.9.318.md)
- [v0.9.317 - Sprint 16: Analysis Generation Split Batch](changelogs/v0.9.317.md)
- [v0.9.316 - Sprint 16: Policy Conformance Split Batch](changelogs/v0.9.316.md)
- [v0.9.315 - Sprint 16: Live Row Utils Split Batch](changelogs/v0.9.315.md)
- [v0.9.314 - Sprint 16: Database Health Report and Runtime Boundary Execution Split Batch](changelogs/v0.9.314.md)
- [v0.9.313 - Sprint 16: Compiler Persistence Split Batch](changelogs/v0.9.313.md)
- [v0.9.312 - Sprint 16: Watcher Issue Storage Runtime Split Batch](changelogs/v0.9.312.md)
- [v0.9.311 - Sprint 16: Architectural Debt Score Calculator Split Batch](changelogs/v0.9.311.md)
- [v0.9.310 - Sprint 16: Signal Coverage Aggregations Split Batch](changelogs/v0.9.310.md)
- [v0.9.309 - Sprint 16: Duplicate Debt and Contract Taxonomy Split Batch](changelogs/v0.9.309.md)
- [v0.9.308 - Sprint 16: Architectural Pattern Detector Split Batch](changelogs/v0.9.308.md)
- [v0.9.307 - Sprint 16: Metadata Coverage Report and Semantic Connection Split Batch](changelogs/v0.9.307.md)
- [v0.9.306 - Sprint 16: Database Health Assessment and Data Gateway Split Batch](changelogs/v0.9.306.md)
- [v0.9.305 - Sprint 16: Diagnostics Snapshot, Helper Reuse, and Contract Split Batch](changelogs/v0.9.305.md)
- [v0.9.304 - Sprint 16: Policy Conformance, Surface, and Guidance Split Batch](changelogs/v0.9.304.md)
- [v0.9.303 - Sprint 16: Compiler Persistence Export Repair and Core Split Batch](changelogs/v0.9.303.md)
- [v0.9.302 - Sprint 16: Layer B Validators Factory Split](changelogs/v0.9.302.md)
- [v0.9.301 - Sprint 16: Proxy Shutdown Helper Split](changelogs/v0.9.301.md)
- [v0.9.300 - Sprint 16: Server Shutdown Helper Split](changelogs/v0.9.300.md)
- [v0.9.299 - Sprint 16: Atom Extractor Complexity Split and Cache Invalidator Run Helper](changelogs/v0.9.299.md)
- [v0.9.298 - Sprint 16: Orchestrator Runtime Ops Extraction](changelogs/v0.9.298.md)
- [v0.9.297 - Sprint 16: HTTP Listener Proxy Mode Purge and Test Harness Split](changelogs/v0.9.297.md)
- [v0.9.296 - Sprint 16: Cache Manager Namespaced Key Helpers](changelogs/v0.9.296.md)
- [v0.9.295 - Sprint 16: Shared Cache Lifecycle Canonicalization and Atom Version Manager Cleanup](changelogs/v0.9.295.md)
- [v0.9.294 - Sprint 16: Real Project Factory Lifecycle Rename](changelogs/v0.9.294.md)
- [v0.9.293 - Sprint 16: Cache Invalidator Barrel Demotion](changelogs/v0.9.293.md)
- [v0.9.292 - Sprint 16: Cache Invalidator Modular Split and Test Extraction](changelogs/v0.9.292.md)
- [v0.9.291 - Sprint 16: Invalidator File Status Rename](changelogs/v0.9.291.md)
- [v0.9.290 - Sprint 16: Orchestrator Server Health Delegation](changelogs/v0.9.290.md)
- [v0.9.289 - Sprint 16: Cache, Atom Tracking, and PatternMatcher Helper Extraction](changelogs/v0.9.289.md)
- [v0.9.288 - Sprint 16: Canonical Batch Consolidation & Detector Export Fix](changelogs/v0.9.288.md)
- [v0.9.287 - Sprint 16: Runtime Canonicalization & Stability Hardening](changelogs/v0.9.287.md)
- [v0.9.286 - Sprint 16: Canonical System Map Test Coverage & Zombie Eradication](changelogs/v0.9.286.md)
- [v0.9.285 - Sprint 16: E2E Testing DB Enforcements Stabilized](changelogs/v0.9.285.md)
- [v0.9.186 - Sprint 16: Smart Batch Processor Complexity Split](changelogs/v0.9.186.md)
- [v0.9.185 - Sprint 16: Canonical Smart Batch Processor Factory](changelogs/v0.9.185.md)
- [v0.9.184 - Sprint 16: Canonical Phase 2 Pending Count Helper](changelogs/v0.9.184.md)
- [v0.9.183 - Sprint 16: Canonical Metadata Surface Gateway](changelogs/v0.9.183.md)
- [v0.9.182 - Sprint 16: Tree-Sitter Freshness and DB-Only File Surfaces](changelogs/v0.9.182.md)
- [v0.9.181 - Sprint 16: Database Health Auto-Repair for System Map Persistence](changelogs/v0.9.181.md)
- [v0.9.180 - Sprint 16: Framework Tracker Hook Policy](changelogs/v0.9.180.md)
- [v0.9.179 - Sprint 16: Database Health Orchestration Split and Orphan Reconciliation](changelogs/v0.9.179.md)
- [v0.9.178 - Sprint 16: Watcher Provenance and Live Database Health Auto-Sync](changelogs/v0.9.178.md)
- [v0.9.177 - Sprint 16: Atom Metadata Surface Backfill](changelogs/v0.9.177.md)
- [v0.9.176 - Sprint 16: Metadata Extraction Coverage Aggregation Fix](changelogs/v0.9.176.md)
- [v0.9.175 - Sprint 16: Surface Audit Reason Normalization](changelogs/v0.9.175.md)
- [v0.9.174 - Sprint 16: Surface Audit Status Envelope Wiring](changelogs/v0.9.174.md)
- [v0.9.173 - Sprint 16: Surface Audit Status Propagation](changelogs/v0.9.173.md)
- [v0.9.172 - Sprint 16: Canonical Surface Audit Unification](changelogs/v0.9.172.md)
- [v0.9.171 - Sprint 16: Atom-Semantic Surface Repair](changelogs/v0.9.171.md)
- [v0.9.170 - Sprint 16: Compiler Governance Data Gateway Integration](changelogs/v0.9.170.md)
- [v0.9.169 - Sprint 16: Active Files Parity Alignment](changelogs/v0.9.169.md)
- [v0.9.168 - Sprint 16: Data Gateway Freshness Contract](changelogs/v0.9.168.md)
- [v0.9.167 - Sprint 16: System Map Coverage and Dependency Repair Heuristics](changelogs/v0.9.167.md)
- [v0.9.166 - Sprint 16: Dead-Code Barrel Compatibility Fix](changelogs/v0.9.166.md)
- [v0.9.165 - Sprint 16: Dead-Code Core Split and Taxonomy Extraction](changelogs/v0.9.165.md)
- [v0.9.164 - Sprint 16: Framework Lifecycle Hook Policy](changelogs/v0.9.164.md)
- [v0.9.163 - Sprint 16: Analysis Generation & System Map Recovery](changelogs/v0.9.163.md)
- [v0.9.162 - Sprint 16: Barrel Surface Governance](changelogs/v0.9.162.md)
- [v0.9.161 - Sprint 16: Framework Hook Duplicate Policy](changelogs/v0.9.161.md)
- [v0.9.160 - Sprint 16: Chain Builder Contract Simplification](changelogs/v0.9.160.md)
- [v0.9.159 - Sprint 16: MCP Zombie Cleanup Alignment](changelogs/v0.9.159.md)
- [v0.9.158 - Sprint 15: Import Validation Error Boundary Hardening](changelogs/v0.9.158.md)
- [v0.9.157 - Sprint 15: Circular Dependency Split for Import Validation](changelogs/v0.9.157.md)
- [v0.9.156 - Sprint 15: DB-Only Import and Export Validation](changelogs/v0.9.156.md)
- [v0.9.155 - Sprint 15: Call Relation Helpers and Surface Noise Reduction](changelogs/v0.9.155.md)
- [v0.9.154 - Sprint 15: Shared-State Linkage Helper Split](changelogs/v0.9.154.md)
- [v0.9.153 - Sprint 15: Validator Split & Bulk Orchestration Simplification](changelogs/v0.9.153.md)
- [v0.9.152 - Sprint 15: Import Validation & Relation Path Canonicalization](changelogs/v0.9.152.md)
- [v0.9.151 - Sprint 15: Call Relation Orchestration Split](changelogs/v0.9.151.md)
- [v0.9.150 - Sprint 15: Canonical ID Helper Centralization](changelogs/v0.9.150.md)
- [v0.9.149 - Sprint 15: Canonical Atom-ID Reconciliation](changelogs/v0.9.149.md)
- [v0.9.148 - Sprint 15: Relation Cascade Fix for File Deletions](changelogs/v0.9.148.md)
- [v0.9.147 - Sprint 15: Live-Row Hotfix & Helper Hygiene](changelogs/v0.9.147.md)
- [v0.9.146 - Sprint 15: Call Graph Preservation & Bootstrap Hardening](changelogs/v0.9.146.md)
- [v0.9.145 - Sprint 15: Canonical DB Enforcement](changelogs/v0.9.145.md)
- [v0.9.144 - Sprint 15: DB Health & Canonical Reconciliation](changelogs/v0.9.144.md)
- [v0.9.143 - Sprint 15: Call Graph Integrity & Fallback Deprecation](changelogs/v0.9.143.md)
- [v0.9.142 - Sprint 15: Deep Stabilization & Optimization](changelogs/v0.9.142.md)
- [v0.9.130 - Sprint 13: Zero Structural Debt & Reliability Hardening](changelogs/v0.9.130.md)

- [v0.9.128 - File Watcher Memory Leak Fix & Orchestration Triage](changelogs/v0.9.128.md)
- [v0.9.127 - Conceptual Duplicate Eradication & Test Configuration](changelogs/v0.9.127.md)
- [v0.9.126 - MCP Export Chain Validation & Runtime Crash Prevention](changelogs/v0.9.126.md)
- [v0.9.125 - Architectural Intelligence & Modular Policy Structure](changelogs/v0.9.125.md)
- [v0.9.124 - Policy Gap Closure & Duplicate Debt Reduction](changelogs/v0.9.124.md)
- [v0.9.123 - Runtime Freshness & Watcher Signal Hardening](changelogs/v0.9.123.md)
- [v0.9.122 - MCP Registry And Guard Catalog Decomposition](changelogs/v0.9.122.md)
- [v0.9.121 - MCP Runtime & Watcher Canonicalization](changelogs/v0.9.121.md)
- [v0.9.120 - Debt Reduction & Performance Cleanup](changelogs/v0.9.120.md)
- [v0.9.119 - Watcher Hardening & Coordinator Decomposition](changelogs/v0.9.119.md)
- [v0.9.110 - Semantic Chests & V4 Fingerprinting](changelogs/v0.9.110.md)

- [v0.9.108 - Compiler Stabilization & Integrity](changelogs/v0.9.108.md)
- [v0.9.105 - SOLID Standardization & Git Unification](changelogs/v0.9.105.md)
- [v0.9.104 - Core Consolidation & Genetic Lineage](changelogs/v0.9.104.md)
- [v0.9.103 - Genetic Preservation Policy & Stabilization](changelogs/v0.9.103.md)
- [v0.9.102 - Pipeline Integrity Detector & Auto-Audit System](changelogs/v0.9.102.md)

## Quick Links

- [v0.9.286 - Sprint 16: Canonical System Map Test Coverage & Zombie Eradication](changelogs/v0.9.286.md)
- [v0.9.285 - Sprint 16: E2E Testing DB Enforcements Stabilized](changelogs/v0.9.285.md)
- [v0.9.183 - Sprint 16: Canonical Metadata Surface Gateway](changelogs/v0.9.183.md)
- [v0.9.182 - Sprint 16: Tree-Sitter Freshness and DB-Only File Surfaces](changelogs/v0.9.182.md)
- [v0.9.175 - Sprint 16: Surface Audit Reason Normalization](changelogs/v0.9.175.md)
- [v0.9.174 - Sprint 16: Surface Audit Status Envelope Wiring](changelogs/v0.9.174.md)
- [v0.9.173 - Sprint 16: Surface Audit Status Propagation](changelogs/v0.9.173.md)
- [v0.9.172 - Sprint 16: Canonical Surface Audit Unification](changelogs/v0.9.172.md)
- [v0.9.170 - Sprint 16: Compiler Governance Data Gateway Integration](changelogs/v0.9.170.md)
- [v0.9.169 - Sprint 16: Active Files Parity Alignment](changelogs/v0.9.169.md)
- [v0.9.168 - Sprint 16: Data Gateway Freshness Contract](changelogs/v0.9.168.md)
- [v0.9.164 - Sprint 16: Framework Lifecycle Hook Policy](changelogs/v0.9.164.md)
- [v0.9.163 - Sprint 16: Analysis Generation & System Map Recovery](changelogs/v0.9.163.md)
- [v0.9.162 - Sprint 16: Barrel Surface Governance](changelogs/v0.9.162.md)
- [v0.9.158 - Sprint 15: Import Validation Error Boundary Hardening](changelogs/v0.9.158.md)
- [v0.9.157 - Sprint 15: Circular Dependency Split for Import Validation](changelogs/v0.9.157.md)
- [v0.9.156 - Sprint 15: DB-Only Import and Export Validation](changelogs/v0.9.156.md)
- [v0.9.155 - Sprint 15: Call Relation Helpers and Surface Noise Reduction](changelogs/v0.9.155.md)
- [v0.9.154 - Sprint 15: Shared-State Linkage Helper Split](changelogs/v0.9.154.md)
- [v0.9.153 - Sprint 15: Validator Split & Bulk Orchestration Simplification](changelogs/v0.9.153.md)
- [v0.9.152 - Sprint 15: Import Validation & Relation Path Canonicalization](changelogs/v0.9.152.md)
- [v0.9.151 - Sprint 15: Call Relation Orchestration Split](changelogs/v0.9.151.md)
- [v0.9.150 - Sprint 15: Canonical ID Helper Centralization](changelogs/v0.9.150.md)
- [v0.9.149 - Sprint 15: Canonical Atom-ID Reconciliation](changelogs/v0.9.149.md)
- [v0.9.148 - Sprint 15: Relation Cascade Fix for File Deletions](changelogs/v0.9.148.md)
- [v0.9.147 - Sprint 15: Live-Row Hotfix & Helper Hygiene](changelogs/v0.9.147.md)
- [v0.9.146 - Sprint 15: Call Graph Preservation & Bootstrap Hardening](changelogs/v0.9.146.md)
- [v0.9.145 - Sprint 15: Canonical DB Enforcement](changelogs/v0.9.145.md)
- [v0.9.144 - Sprint 15: DB Health & Canonical Reconciliation](changelogs/v0.9.144.md)
- [v0.9.143 - Sprint 15: Call Graph Integrity & Fallback Deprecation](changelogs/v0.9.143.md)
- [v0.9.142 - Sprint 15: Deep Stabilization & Optimization](changelogs/v0.9.142.md)
- [v0.9.130 - Sprint 13: Zero Structural Debt & Reliability Hardening](changelogs/v0.9.130.md)
- [v0.9.128 - File Watcher Memory Leak Fix & Orchestration Triage](changelogs/v0.9.128.md)
- [v0.9.127 - Conceptual Duplicate Eradication & Test Configuration](changelogs/v0.9.127.md)
- [v0.9.126 - MCP Export Chain Validation & Runtime Crash Prevention](changelogs/v0.9.126.md)
- [v0.9.125 - Architectural Intelligence & Modular Policy Structure](changelogs/v0.9.125.md)
- [v0.9.124 - Policy Gap Closure & Duplicate Debt Reduction](changelogs/v0.9.124.md)
- [v0.9.122 - MCP Registry And Guard Catalog Decomposition](changelogs/v0.9.122.md)
- [v0.9.121 - MCP Runtime & Watcher Canonicalization](changelogs/v0.9.121.md)
- [v0.9.120 - Debt Reduction & Performance Cleanup](changelogs/v0.9.120.md)
- [v0.9.119 - Watcher Hardening & Coordinator Decomposition](changelogs/v0.9.119.md)
- [v0.9.110 - Semantic Chests & V4 Fingerprinting](changelogs/v0.9.110.md)

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

| **0.9.188** | 2026-03-25 | Sprint 16: Canonical System Map Test Coverage & Zombie Eradication, eliminated all traces of JSON storage logic to pure SQLite boundaries, and parallelized test generation for the new query endpoints and watcher guards. |
| **0.9.187** | 2026-03-25 | Sprint 16: E2E Testing DB Enforcements Stabilized, purged obsolete JSON-based integration & e2e testing, fixed missing DB storage imports to restore Phase 3 pipeline execution, achieving 100% health across all test suites. |
| **0.9.174** | 2026-03-21 | Sprint 16: Surface Audit Status Envelope Wiring, carried raw `surfaceAudit` into the live status envelope so compact summary rendering no longer depends on an empty default. |
| **0.9.173** | 2026-03-21 | Sprint 16: Surface Audit Status Propagation, carried `surfaceAudit` through compact status explainability so the live summary no longer collapses it to an empty default. |
| **0.9.172** | 2026-03-21 | Sprint 16: Canonical Surface Audit Unification, unified status and explainability behind `surfaceAudit`, added DB-only metadata extraction coverage, and consolidated governance reporting across canonical surfaces. |
| **0.9.171** | 2026-03-21 | Sprint 16: Atom-Semantic Surface Repair, repopulated `semantic_connections` and `system_files.semantic_connections_json` from atom semantic metadata, aligned semantic contracts to atoms, and restored A+ database health after cleanup. |
| **0.9.164** | 2026-03-21 | Sprint 16: Framework Lifecycle Hook Policy, classified initialization rollback and extraction-strategy confidence hooks as framework contracts and reduced duplicate-signal noise on the policy surface. |
| **0.9.167** | 2026-03-21 | Sprint 16: System Map Coverage and Dependency Repair Heuristics, aligned `system_files` coverage checks with active files, split dependency repair into a dedicated helper, and restored DB-only health gating without false lag warnings. |
| **0.9.163** | 2026-03-21 | Sprint 16: Analysis Generation & System Map Recovery, formalized canonical analysis generations, added derived-feature registry surfaces, and restored support-table persistence from DB canonical data. |
| **0.9.162** | 2026-03-21 | Sprint 16: Barrel Surface Governance, introduced mixed-barrel policy coverage, split compiler contract helpers, and added regression coverage for pure vs mixed barrels. |
| **0.9.151** | 2026-03-19 | Sprint 15: Call Relation Orchestration Split, delegated call persistence and shared-state linkage into dedicated helpers and slimmed the linker orchestration layer. |
| **0.9.150** | 2026-03-19 | Sprint 15: Canonical ID Helper Centralization, shared the canonical atom-ID helper across relation writers and added async boundaries to shared-state linkage. |
| **0.9.149** | 2026-03-19 | Sprint 15: Canonical Atom-ID Reconciliation, preserved native atom IDs in relation persistence, and migrated mixed-ID call rows back into a joinable canonical projection. |
| **0.9.148** | 2026-03-19 | Sprint 15: Relation Cascade Fix for File Deletions, cascade-soft-deleted calls on atom/file removal and kept the live DB from accumulating orphan call rows. |
| **0.9.147** | 2026-03-19 | Sprint 15: Live-Row Hotfix & Helper Hygiene, split runtime-health helpers and rehydrated risk rows from live atoms. |
| **0.9.146** | 2026-03-19 | Sprint 15: Call Graph Preservation & Bootstrap Hardening, disabled destructive live-row relation cleanup, reactivated valid calls, and fixed the stale file-handler export crash. |
| **0.9.145** | 2026-03-18 | Sprint 15: Canonical DB Enforcement, removed runtime fallback reads from persisted JSON relation fields, and aligned pipeline health checks with DB relations. |
| **0.9.144** | 2026-03-18 | Sprint 15: DB health metric, orphan atom reconciliation, canonical cleanup, and Node-verified import validation. |
| **0.9.143** | 2026-03-18 | Sprint 15: Call Graph Integrity & Fallback Deprecation, fixed zero-atom file deletion, populated SQL call graph, removed raw JSON memory search fallbacks, fixed Tier3 Critical Risk Math Paradox. |
| **0.9.142** | 2026-03-18 | Sprint 15: Deep Stabilization & Optimization, O(n^2) bottlenecks fixed, 100% tests passing, async hardening. |
| **0.9.141** | 2026-03-18 | Sprint 14: Unified Action API with ActionEngine, consolidated telemetry in StatsPool, filtered test noise, and achieved 100/100 health score. |
| **0.9.130** | 2026-03-18 | Sprint 13: Consolidated structural debt to 0, hardened critical daemons (SocietyPersistor, scoring) with try/catch, and updated duplicate policies to ignore strategic patterns. |

| **0.9.128** | 2026-03-18 | Fixed a critical SQLite memory leak in FileWatcher causing false positive duplicate alerts due to zombie atoms. Completed triage on orchestration scripts yielding 0 new DDD module boundaries. |
| **0.9.127** | 2026-03-18 | Eradicated 35 structural duplicates across builders, pattern registries, and error utilities, reaching Grade A+ health score. |
| **0.9.123** | 2026-03-12 | Runtime freshness false-positive reduction, watcher restart-queue hardening, and semantic-coupling severity normalization for non-production surfaces. |
| **0.9.122** | 2026-03-12 | MCP registry decomposition, watcher guard catalog splits, and continued debt reduction across runtime surfaces. |
| **0.9.121** | 2026-03-12 | MCP runtime false-positive reduction, watcher canonical reconciliation, Layer A language contract scaffolding, and benchmark baselines. |
| **0.9.120** | 2026-03-12 | Coordinator decomposition, hotspot removal, role-taxonomy alignment, and continued debt reduction across analysis/runtime surfaces. |
| **0.9.119** | 2026-03-12 | Watcher hardening, canonical adoption cleanup, and coordinator decomposition across core debt hotspots. |
| **0.9.110** | 2026-03-09 | Semantic Chests architecture, V4 fingerprinting, chest-based severity policy, and reporting refinements. |
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

## Latest Release: v0.9.164 (2026-03-21)

**Framework Lifecycle Hook Policy**

### Key Achievements

1.  **Initialization Rollback Hooks**: the duplicate-signal policy now treats initialization step rollbacks as framework lifecycle contracts.
2.  **Strategy Confidence Hooks**: the type-contract extraction strategies now share a policy exception for `calculateConfidence`.
3.  **Policy Simplification**: the core decision path was compacted into smaller helpers and stayed within the complexity target after the refactor.
4.  **Regression Coverage**: the policy regression test now covers framework and non-framework surfaces for `performAction`, `rollback`, and `calculateConfidence`.

### New & Refactored Files

- `src/shared/compiler/duplicate-signal-policy/detectors/core-policy.js`
- `tests/unit/shared/compiler/duplicate-signal-policy.test.js`
- `changelogs/v0.9.164.md`

---

## Previous Release: v0.9.163 (2026-03-21)

**Analysis Generation & System Map Recovery**

### Key Achievements

1.  **Canonical Generations**: the shared compiler now publishes generation snapshots with drift status and derived-feature metadata.
2.  **System Map Repair**: support tables can be rebuilt from the canonical DB surfaces after a failed or locked reanalysis.
3.  **Derived Feature Registry**: purpose, archetype, topology, risk, contract, and lifecycle features now have a canonical registry.
4.  **DB-Only Validation**: export-chain validation and export resolution remain DB-backed while handling builtin/external and re-export cases.

### New & Refactored Files

- `src/shared/compiler/analysis-generation.js`
- `src/shared/compiler/derived-feature-registry.js`
- `src/shared/compiler/system-map-persistence-repair.js`
- `src/core/orchestrator/static-insights-helpers.js`
- `tests/unit/shared/compiler/analysis-generation.test.js`
- `changelogs/v0.9.163.md`

---

## Previous Release: v0.9.162 (2026-03-21)

**Barrel Surface Governance**

### Key Achievements

1.  **Mixed Barrel Policy**: mixed re-export modules that also define local logic are now flagged as structural drift instead of being treated as clean barrels.
2.  **Canonical Guidance**: the reuse and recommendation layers now explain how to split a barrel from its implementation surface.
3.  **Contract Layer Slimming**: compiler contract helpers now live in a dedicated helper module so the orchestrator stays thin.
4.  **Regression Coverage**: the new barrel policy has a unit regression covering mixed barrels, pure barrels, and governance metrics.

### New & Refactored Files

- `src/shared/compiler/canonical-extension-conformance.js`
- `src/shared/compiler/canonical-reuse-guidance.js`
- `src/shared/compiler/architectural-recommendations.js`
- `src/shared/compiler/compiler-contract-layer.js`
- `src/shared/compiler/compiler-contract-layer-helpers.js`
- `tests/unit/shared/compiler/canonical-extension-conformance.test.js`
- `changelogs/v0.9.162.md`

---

## Previous Release: v0.9.161 (2026-03-21)

**Framework Hook Duplicate Policy**

### Key Achievements

1.  **Framework Hook Policy**: `duplicate-signal-policy` now recognizes canonical MCP tool/base-tool `performAction` hooks as an intentional coordinator surface.
2.  **Heuristic Boundary**: the new policy is narrow and only exempts the canonical MCP framework paths, not arbitrary `performAction` functions elsewhere.
3.  **Regression Coverage**: a unit test now verifies that MCP tool hooks are ignored while non-framework `performAction` surfaces remain actionable.

---

## Previous Release: v0.9.141 (2026-03-18)

**Action API Standardization & Telemetry Unification**

### Key Achievements

1.  **Action API SSOT**: Created `ActionEngine.js` to centralize all system mutations and tool actions.
2.  **Universal Telemetry**: Successfully migrated all core modules to `StatsPool` for a unified metrics view.
3.  **100/100 Health Score**: Eliminated noise from generated tests and stabilized the pipeline integrity.
4.  **Architectural Hardening**: Fixed critical regressions in relative paths and legacy API support.

### New & Refactored Files

- `src/shared/compiler/actions/ActionEngine.js`
- `src/layer-c-memory/mcp/tools/tool-handler-action.js`
- `src/validation/validation-engine/ValidationEngine.js`
- `src/core/file-watcher/guards/registry.js`
- `changelogs/v0.9.141.md`

---

## Previous Release: v0.9.123 (2026-03-12)

**MCP Registry And Guard Catalog Decomposition**

### Key Achievements

1. Removed the last `HIGH` MCP hotspot by splitting HTTP session routing out of `mcp-http-server`.
2. Split watcher guard catalogs into semantic and impact definition modules while keeping the runtime clean.
3. Decomposed the MCP tools registry into thin facades and family-scoped definition/handler catalogs.
4. Kept MCP runtime freshness and watcher noise at zero through repeated reindex and validation cycles.

### New & Refactored Files

- `src/layer-c-memory/mcp-http-listener.js`
- `src/layer-c-memory/mcp/restart-runtime.js`
- `src/layer-c-memory/mcp/tool-registry-runtime.js`
- `src/layer-c-memory/mcp/tools/atomic-edit/atomic-editor-helpers.js`
- `src/shared/compiler/compiler-runtime-metrics-graph.js`
- `src/shared/compiler/compiler-runtime-metrics-sessions.js`
- `src/shared/compiler/compiler-runtime-metrics-support.js`
- `src/shared/compiler/language-contract.js`
- `src/shared/compiler/watcher-issue-duplicate-policy.js`
- `tests/contracts/layer-a-language-adapter.contract.test.js`
- `tests/performance/mcp-startup.benchmark.test.js`
- `tests/performance/mcp-incremental-reindex.benchmark.test.js`
- `tests/performance/mcp-post-edit-guards.benchmark.test.js`
- multiple split/optimized files across `layer-a-static`, `layer-b-semantic`, and `layer-c-memory`
- `changelogs/v0.9.120.md`

---

## Previous Release: v0.9.119 (2026-03-12)

**Watcher Hardening & Coordinator Decomposition**

### Key Achievements

1. Hardened watcher/runtime lifecycle handling so innocent MCP usage no longer dirties the repo state with false file-modified bursts.
2. Reconnected runtime freshness, compiler diagnostics, and canonical adoption surfaces so telemetry reflects live state instead of stale log history.
3. Split multiple monolithic files into thin coordinators plus focused modules, reducing edit fragility for humans and agents.
4. Fixed the `HashCache` stale-delete transaction bug and removed duplicate/ambiguous hash semantics in the storage cache layer.
5. Reduced low-value `impact-wave` churn by filtering callback noise and teaching integrity heuristics about orchestrator bias.

### New & Refactored Files

- `src/core/orchestrator/phase2-indexer/*`
- `src/core/meta-detector/pipeline-integrity-detector/*`
- `src/shared/compiler/standardization-report/recommendations.js`
- `src/layer-c-memory/mcp/tools/handlers/pipeline-health-handler/foundation.js`
- `changelogs/v0.9.119.md`

---

## Previous Release: v0.9.110 (2026-03-09)

**Semantic Chests & V4 Fingerprinting**

### Key Achievements

1. **Semantic Chests Architecture**: Implemented functional categorization into `lifecycle`, `telemetry`, `storage`, `orchestration`, and `logic` to reduce conceptual noise.
2. **V4 Fingerprint Implementation**: Migrated the entire codebase (2,219 files) to the `verb:chest:domain:entity` format.
3. **Smart Severity Policy**: Automated risk assessment where infrastructure concerns (`lifecycle`, `telemetry`) are correctly prioritized as low-risk architectural patterns.
4. **Reporting Refinements**: Standardized the `technical-debt-report` to provide high-fidelity visibility into functional clusters and high-risk business logic.
5. **Project-Wide Re-indexing**: Successfully executed a full system re-analysis to propagate the new semantic metadata across the 20k+ function graph.

### New & Refactored Files

- `src/layer-a-static/extractors/metadata/dna-extractor/semantic-analyzer.js` (V4 Fingerprinting)
- `src/core/file-watcher/guards/conceptual-duplicate-risk.js` (Smart Severity)
- `src/layer-c-memory/mcp/tools/technical-debt-report.js` (High-fidelity reporting)
- `src/layer-c-memory/storage/repository/adapters/sqlite-query-operations.js` (V4 handling)
- `changelogs/v0.9.110.md` (Detailed release notes)

---

## Previous Release: v0.9.108 (2026-03-07)

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

1. Extend the same ÃƒÂ¢Ã¢â€šÂ¬Ã…â€œcanonical manifest + adoption detectionÃƒÂ¢Ã¢â€šÂ¬Ã‚Â pattern to any remaining telemetry families that still compare mismatched universes.
2. Reduce structural debt in runtime-heavy modules and watcher policy files now that the compiler surfaces are aligned.
3. Keep promoting new families through shared/compiler entry points before MCP/runtime consumers add local heuristics.
