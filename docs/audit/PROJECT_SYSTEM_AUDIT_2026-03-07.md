# Project System Audit - 2026-03-07

## Scope

This audit consolidates what is currently known about the OmnySys codebase, runtime, metadata, MCP APIs, SQLite persistence, architectural drift, and the reliability of the system's own self-critique.

It is based on:

- MCP runtime inspection
- pipeline integrity checks
- schema registry inspection
- raw SQL verification
- current code inspection
- recent changelog and git history review

Date reference:

- Runtime observed on 2026-03-07
- Package version observed: `0.9.108`

## Executive Summary

The system is valuable and partially trustworthy, but it is not yet self-consistent enough to be treated as its own final authority.

Current position:

- The structural atom graph is relatively strong.
- The schema layer is mostly healthy at the DDL level.
- Several higher-level MCP summary surfaces drift from the underlying data.
- At least one important MCP API is broken because code, registry, and real table shape disagree.
- Some features are implemented in code but not operationally reflected in the database.
- The documentation and release narrative are ahead of runtime truth in several places.

Bottom line:

- Trust the low-level graph and SQL more than the dashboards.
- Trust the dashboards as early warning, not as source of truth.
- A second-order auditor is justified and recommended.

## What Seems Reliable

### 1. Runtime availability

The MCP server is alive and materially functional.

Observed:

- 23 tools registered
- watcher active
- 1881 live atom files
- 12678 atoms
- phase 2 complete

This means the system is not conceptually broken. It is operational, analyzable, and already useful.

### 2. Atom metadata core

The foundational atom layer looks strong.

Observed through MCP:

- required atom metadata coverage: 100%
- `calledBy` resolution: 100%
- DNA coverage: 100%
- field coverage in atom schema inventory: 100%

This is the most trustworthy layer right now.

### 3. Scanner/manifests alignment

The scanner and persisted manifest appear aligned.

Observed:

- scanned files: 2187
- manifest files: 2187
- persisted file coverage synchronized: true

This means the scanner/manifests contract is better than the runtime/live-index contract.

### 4. Duplicate structural signal

Structural duplicate detection appears useful and materially actionable.

Examples repeatedly surfaced:

- `toArray`
- `detectOrphanModule`
- `fileExists`
- `isLikelyParserNoiseUnusedInput`
- `readAllEvents`

This signal is concrete enough to drive refactors.

## What Is Not Fully Reliable

### 1. Health scores and executive grades

The system reports multiple incompatible states.

Observed:

- runtime and integrity check: `38/100`, grade `F`
- pipeline health handler: `55/100`, grade `C`
- release narrative claims structural grade `A`
- roadmap claims `63/100`

Interpretation:

- these surfaces are measuring different universes
- some of them mix live rows, scanned files, zero-atom files, and support tables inconsistently
- health exists as signal, but not yet as a stable contract

### 2. Semantic summary/detail surfaces

This is one of the biggest contract drifts in the whole system.

Current reality:

- `semantic_connections` table has `0` rows
- atom-level semantic relations in `atom_relations` are present: `66`

The code already admits the problem:

- file-level summary surface: `semantic_connections`
- atom-level detail surface: `atom_relations`
- they are related but not equivalent
- direct comparison is unsafe

Impact:

- any API, dashboard, or policy that compares both totals as if they were equivalent is unreliable
- semantic architecture conclusions drawn from file-level semantic summaries are currently weak

### 3. Society APIs

This is a real API break, not just a noisy metric.

Observed:

- `aggregate_metrics(society)` failed with `no such column: is_removed`

Cause:

- `querySocieties()` filters on `is_removed`
- the actual `societies` table does not have `is_removed`
- the persistor for societies also does not write such a column

Important consequence:

- the system can count societies
- the system can read societies via direct SQL in some places
- but the canonical MCP query path for societies is broken

This makes any society-backed architectural guidance lower-confidence until fixed.

### 4. Risk reporting

Risk surfaces are mostly empty or underpopulated.

Observed:

- `risk_assessments = 0`
- risk report explicitly says risk assessment not yet computed

Impact:

- risk APIs cannot yet be treated as authoritative
- they may still expose derived heuristics, but persisted risk state is not there

### 5. Event sourcing / version history persistence

The code exists, but the operational data does not match the release narrative.

Observed:

- `atom_events = 0`
- `atom_versions = 1`

Yet the code in `sqlite-crud-operations.js` logs create/update/delete events.

Interpretation:

- either the operational save path bypasses these methods
- or the system is not exercising the feature in the real indexing flow
- or the feature was integrated only partially

This is a classic "implemented in code, absent in reality" problem.

### 6. Documentation / changelog trust

The docs are useful as intent, not as state-of-truth.

Observed:

- `CHANGELOG.md` still says latest release is `v0.9.105`
- `package.json` and git point to `0.9.108`
- roadmap health number is stale relative to runtime

Impact:

- docs should not be used as evidence for whether a capability is operational

## Core Contradictions Found

### Contradiction A: schema health vs API health

`get_schema(database)` reports the schema as healthy and synchronized.

That is true only at the table/column registration level it checks.

But:

- `aggregate_metrics(society)` breaks on a missing column assumption
- `societies` queries are not aligned with the actual stored shape

Conclusion:

- schema registry health is necessary but insufficient
- query-contract validation is missing

### Contradiction B: societies exist, but society API fails

Observed via SQL:

- total societies: 1462
- `functional`: 76
- `structural`: 1386

Observed via MCP aggregate:

- societies total returned: 0
- plus SQL error on `is_removed`

Conclusion:

- society persistence exists
- society reporting path is broken

### Contradiction C: event sourcing advertised, but table empty

Observed:

- changelog claims native atom lifecycle audit trail
- code inserts into `atom_events`
- real table has `0` rows

Conclusion:

- release narrative overstates operational adoption

### Contradiction D: semantic canonicalization acknowledged, but not enforced

The code explicitly warns that semantic surfaces are not equivalent, and the health handler already knows that.

Yet the broader system still exposes canonical-family language and summary metrics that can be misread as maturity.

Conclusion:

- the project is correctly diagnosing its own drift
- but it has not yet operationalized that diagnosis into hard usage boundaries

## Reliable Source Ranking

From most trustworthy to least trustworthy:

1. Raw SQL against SQLite
2. `atoms` and `atom_relations`
3. low-level atom detail MCP outputs
4. duplicate structural findings
5. pipeline integrity detector
6. standardization and health summaries
7. society/risk summary APIs
8. roadmap/changelog prose

## Current System State by Area

### Atom graph

Status: strong

- usable for dependency reasoning
- usable for duplicate hunting
- usable for impact navigation

### Semantic graph

Status: partial

- atom-level semantic relations exist
- file-level semantic summary surface is empty
- direct semantic topology conclusions remain risky

### Societies

Status: persisted but query contract broken

- data exists
- one key MCP access path is broken
- architecture suggestions are lower confidence until society contract is repaired

### Risk model

Status: mostly inactive

- risk tables are empty
- runtime-grade conclusions about risk are weak

### Event sourcing and history

Status: partially integrated, not operationally proven

- code exists
- data does not reflect meaningful runtime use

### Documentation

Status: useful, stale, non-authoritative

## Important Quantitative Snapshot

Observed during audit:

- package version: `0.9.108`
- tools registered: `23`
- scanned files: `2187`
- manifest files: `2187`
- live atom files: `1881`
- zero-atom / stale support rows: `306`
- atoms: `12678`
- atom relations: `121667`
- semantic atom-level links: `66`
- file-level semantic connections: `0`
- societies rows: `1462`
- functional societies: `76`
- structural societies: `1386`
- risk rows: `0`
- atom events: `0`
- atom versions: `1`
- conceptual duplicate groups: `50`
- structural duplicate groups reported by debt/watcher families: roughly `27` clusters / `165` instances

## What The System Is Already Good At

- Detecting real duplicate logic pressure
- Producing useful atom-level detail
- Surfacing large fragile functions
- Warning about semantic drift in some compiler families
- Preserving enough graph state to support targeted refactors

## What The System Still Lacks

- Query-contract auditing against real schema
- Enforcement between summary and detail surfaces
- Truthful operational readiness criteria for "canonical" APIs
- Reliable risk persistence
- Reliable event trail persistence
- A single health score derived from one declared universe
- Automatic release/doc reconciliation

## Recommended Governance Model

The project should distinguish three categories explicitly:

### Category A: Source-of-truth APIs

These are safe enough to build on:

- atom-level detail
- atom relations
- raw schema inspection
- duplicate DNA inspection
- impact map and call graph where backed by atoms/relations

### Category B: Advisory APIs

These should be shown as guidance only:

- standardization report
- health scores
- debt scores
- async summaries
- performance summaries

### Category C: Untrusted or experimental APIs

These should be marked unstable until fixed:

- society aggregate path
- file-level semantic summary comparisons
- persisted risk-driven decisions
- event-sourcing-backed history claims

## Recommended Meta-Auditor

Yes, a second-order critic should exist.

It should not trust the runtime summaries it audits.

It should verify:

- actual table shape from `sqlite_master`
- schema registry declarations
- SQL queries embedded in MCP tools
- invariant ranges for persisted scores
- empty-but-claimed-integrated subsystems
- mismatches between persisted tables and handler assumptions
- mismatches between docs/changelog and operational tables

Preferred scope:

- separate script and/or separate MCP tool
- runnable in CI
- should fail if a query references a non-existent column
- should fail if a feature is marked canonical but its backing table is empty or its API errors

## Phase Plan

### P0 - Repair broken contracts and false authority

Goal:

- stop shipping contradictory or broken surfaces

Actions:

- fix the `societies` query contract
- decide whether `societies` gets `is_removed`, or remove that predicate from its consumers
- mark society aggregate responses as unstable until fixed
- hard-gate `semantic_connections` so consumers cannot treat them as equivalent to `atom_relations`
- make health/report surfaces declare which universe they are measuring
- correct `CHANGELOG.md` latest-release pointer

Exit criteria:

- `aggregate_metrics(society)` works
- no MCP SQL path queries non-existent columns
- semantic summary/detail contract is explicit in every consumer-facing output

### P1 - Rebuild trustworthy telemetry

Goal:

- turn advisory metrics into dependable operational telemetry

Actions:

- reconcile the 306 stale/live file-row drift
- populate or intentionally disable `risk_assessments`
- verify why `atom_events` is empty and either wire it fully or downgrade the feature claim
- verify why `atom_versions` is effectively unused
- split `buildCompilerStandardizationReport`
- split `handlePipelineHealth`
- reduce reliance on broad god-functions in watcher/compiler surfaces

Exit criteria:

- risk tables meaningfully populated or explicitly deprecated
- event/version tables meaningfully populated or explicitly removed from claims
- health and standardization surfaces produce stable, contract-backed numbers

### P2 - Install meta-governance and policy enforcement

Goal:

- make drift detectable before release

Actions:

- add a meta-auditor over MCP SQL and schema contracts
- add CI checks for query/schema mismatch
- add CI checks for empty claimed subsystems
- add release validation that compares changelog claims against operational table counts
- create canonical policy labels: `stable`, `advisory`, `experimental`
- fail release if a `stable` API errors or depends on empty backing data

Exit criteria:

- new drift is detected before shipping
- documentation cannot outrun runtime truth without an explicit override
- canonical APIs have enforceable readiness gates

## Recommended Immediate Work Order

If execution begins now, the safest order is:

1. P0 society contract fix
2. P0 semantic surface usage guardrails
3. P0 changelog/runtime reconciliation
4. P1 live-row and telemetry repair
5. P1 event/risk operational verification
6. P2 meta-auditor and CI enforcement

## Final Assessment

The project is not failing because it lacks introspection.

It is failing because introspection has outpaced contract discipline.

That is a much better problem than blindness, because the path forward is clear:

- reduce false authority
- tighten contracts
- separate source-of-truth from advisory views
- install a meta-auditor that verifies the auditors

The system is worth consolidating.

But it should not yet be trusted to certify its own higher-level APIs without external verification.
