# API Governance Phases

## Purpose

This file defines the practical control loop for MCP APIs, semantic surfaces, and persisted telemetry.

## P0

- Fix broken contracts that make MCP routes lie or fail.
- Align runtime authority with persisted schema.
- Align release metadata with the actual shipped version.

## P1

- Treat `atom_relations`, `atoms`, and schema introspection as primary truth.
- Treat summary surfaces such as `semantic_connections` as advisory until parity is restored.
- Run `npm run audit:contracts` after changes that touch MCP queries, persistence, or changelog/release metadata.

## P2

- Keep a meta-auditor outside the runtime it audits.
- Compare live SQLite schema, MCP query source, and release metadata on every critical consolidation step.
- Block promotion of a surface to canonical if:
  - its backing table is empty,
  - its query references columns that do not exist,
  - its totals drift from the source-of-truth surface without an explicit contract.

## Current source-of-truth policy

- Structural truth: `atoms`, `atom_relations`, `compiler_scanned_files`, SQLite schema.
- Advisory only: `semantic_connections`, risk/event/version claims when backing tables are thin or empty.
- Documentation is not authoritative unless it matches runtime and persisted state.
