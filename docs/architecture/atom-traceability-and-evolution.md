# Atom Traceability and Evolution

## Purpose

This document defines a better way to store and consume atom history in OmnySys so historical data is not mistaken for garbage.

The goal is to keep three concerns separate:

- current state: what is true now
- historical lineage: what was true before and why it changed
- derived evidence: what the system inferred from the data

## Problem Statement

Today the project already stores several valuable surfaces:

- `atoms`
- `atom_versions`
- `atom_events`
- `file_dependencies`
- `semantic_connections`
- `risk_assessments`

The issue is not that these tables exist. The issue is that some rows remain readable only as raw history, because they still point to entities that are no longer active or no longer resolvable from the current snapshot.

That creates a false impression of bad data.

In practice, it means the system has memory, but not yet a strong enough interpretation layer for that memory.

## Core Principle

Historical rows should not be treated as broken by default.

They should be classified by lifecycle and trust:

- `active`
- `superseded`
- `deprecated`
- `archived`
- `orphaned`
- `deleted`

A row can be inactive and still be useful.
A row can be orphaned and still be valuable as evidence of a past state.

## Recommended Model

### 1. Atom identity must be stable

Each atom should have a persistent identity that survives edits.

Recommended split:

- `atom_id`: stable identity across versions
- `version_id` or `snapshot_id`: immutable state at a specific point in time

If the current design uses `atom_versions` only as a flat version table, it is better to make the relationship explicit:

- one atom
- many snapshots
- one current pointer

### 2. Snapshots should reference the parent snapshot

When an atom changes, the new version should not just overwrite the old one.
It should create a new snapshot linked to its predecessor.

Recommended fields for a versioned snapshot:

- `snapshot_id`
- `atom_id`
- `parent_snapshot_id`
- `generation`
- `created_at`
- `reason`
- `hash`
- `state_json`
- `lifecycle_status`

This answers the exact question of evolution:

- what changed
- from what version
- why it changed
- which snapshot is current

### 3. Relationships must also be versioned

If only the atom is versioned, but its connections are not, then history becomes incomplete.

A useful evolution model should preserve relation snapshots too:

- `atom_relations` for atom-to-atom links
- `file_dependencies` for file-to-file links
- `semantic_connections` for semantic or shared-state links
- `relation_snapshot_id` or `snapshot_id` on every relation row

This lets the system answer:

- what dependencies existed at version N
- what semantic links disappeared
- when a relation was replaced

### 4. Current view should be a projection

Consumers should not read raw history tables directly unless they explicitly want timeline data.

Instead, expose a canonical current view built from snapshots:

- current atom state
- active dependencies
- active semantic connections
- current risk assessment
- latest verified metadata

Raw history stays available, but the default read path should be a projection.

## What Should Be Stored

### Keep as immutable history

- atom creation and updates
- event records for extraction, modification, deletion, and reclassification
- previous dependency graphs
- previous semantic connections
- historical risk scores

### Keep as live projections

- latest atom version
- latest file metadata
- active relation graph
- current risk surface
- current semantic summary

### Keep as derived evidence

- confidence scores
- source of truth markers
- freshness timestamps
- provenance labels
- inferred classifications

## Recommended Tables and Fields

This is a conceptual model, not a forced migration plan.

### Atom snapshot table

- `snapshot_id`
- `atom_id`
- `parent_snapshot_id`
- `file_path`
- `name`
- `atom_type`
- `line_start`
- `line_end`
- `lines_of_code`
- `complexity`
- `signature_json`
- `calls_json`
- `called_by_json`
- `imports_json`
- `exports_json`
- `derived_json`
- `created_at`
- `updated_at`
- `lifecycle_status`

### Atom event table

- `event_id`
- `atom_id`
- `snapshot_id`
- `event_type`
- `before_state`
- `after_state`
- `reason`
- `actor`
- `timestamp`
- `source`

### Relation history table

- `relation_id`
- `relation_type`
- `source_atom_id` or `source_path`
- `target_atom_id` or `target_path`
- `snapshot_id`
- `created_at`
- `updated_at`
- `lifecycle_status`
- `confidence`

## Lifecycle Rules

A relation is not necessarily wrong because it no longer resolves.

It should be labeled according to context:

- `active`: still valid in the current projection
- `superseded`: replaced by a newer relation
- `orphaned`: source or target no longer exists in the current graph
- `archived`: retained only for historical analysis

This is important because the same row can be:

- useless for current navigation
- useful for debugging
- useful for training data
- useful for regression detection

## How The IA Should Consume This

The IA should not ingest raw tables directly as if all rows were equally current.

It should consume a composed context object such as:

- current atom snapshot
- recent event timeline
- active relation summary
- orphaned relation summary
- confidence and freshness
- lineage explanation

That gives the model the right shape of memory:

- current truth
- recent evolution
- historical evidence
- uncertainty markers

## Why This Helps LLM Context

This type of metadata is useful for LLMs, but mainly as structured context, retrieval, and ranking signal.

It helps the model:

- understand change over time
- distinguish current state from prior state
- detect recurring failure modes
- explain why a recommendation exists
- prioritize relevant context in a call

The value is not only "more data".
The value is better structured memory.

## Best Practices

- Never mix current state and history in the same consumer contract without flags.
- Never delete historical evidence just because it is no longer active.
- Always keep a parent link between versions when possible.
- Always label relation rows with lifecycle status.
- Always store provenance for derived signals.
- Always expose a canonical current projection for read paths.

## Practical Recommendation For OmnySys

For OmnySys, the best next step is to formalize a two-layer model:

1. a canonical live projection for current reads
2. a lineage store for history, evolution, and inference

That way, rows that look like "basura" become explainable evidence instead of ambiguous leftovers.

## Suggested Direction

If this evolves into implementation, the next system should probably include:

- stable atom identity
- versioned snapshots
- relation lineage
- lifecycle status on all history rows
- context assembler for IA calls
- confidence and freshness metadata

That gives the platform a real memory model instead of a pile of mutable projections.
