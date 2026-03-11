# OmnySys

**OmnySys is a governance layer for AI-generated code.**

It is not just an MCP server, a code indexer, or a retrieval graph.
It is an attempt to make fast, agent-driven software production survivable:

- detect architectural drift before it spreads
- persist canonical truth instead of relying on agent memory
- expose impact, duplication, runtime freshness, and pipeline integrity as contracts
- keep multiple AI agents from fragmenting the same codebase in parallel

In short: **OmnySys exists because AI can now generate code faster than humans can metabolize it.**

## Why This Project Exists

Modern coding agents can create large systems very quickly.
That changes the bottleneck.

The hard problem is no longer only "how do we generate code?"
The hard problem becomes:

- how do we stop local changes from breaking global coherence?
- how do we know which surface is canonical?
- how do we prevent duplicate mini-APIs from appearing everywhere?
- how do we know whether the runtime answering us is stale?
- how do we keep architecture readable when the code volume explodes?

OmnySys is designed as an answer to that problem.

## Core Thesis

Most AI coding tools focus on:

- code search
- graph retrieval
- summaries
- context windows

OmnySys focuses on something stricter:

- **governance**
- **canonicity**
- **drift detection**
- **reconciliation**
- **runtime freshness**
- **persistent contracts**

That is the difference between "AI can see the repo" and "AI is forced to respect the repo".

## What OmnySys Already Does

Today, OmnySys already provides a substantial part of that governance loop:

- analyzes the project into persisted atoms, files, relations, and support tables
- exposes the system through MCP tools backed by SQLite
- detects structural and conceptual duplication
- distinguishes canonical vs advisory surfaces
- tracks runtime freshness and restart requirements
- measures file-universe coverage, graph coverage, and pipeline integrity
- warns when the watcher/runtime/tooling are out of sync
- helps agents inspect impact before editing and recent errors after editing

This is already closer to a **governor/compiler for AI-assisted codebases** than to a typical "code context server".

## What Makes OmnySys Different

The interesting part is not that OmnySys has MCP.
Many projects will have MCP.

The interesting part is that OmnySys is trying to make the following explicit and enforceable:

- which data is **canonical**
- which surfaces are only **advisory**
- which metrics are comparable and which are not
- which runtime answers are fresh and which are stale
- which helpers should stay local and which should be promoted
- when an agent is reimplementing an existing contract

That is the foundation of an actual AI-era compiler/governor.

## Architecture

OmnySys is organized around three main layers:

### Layer A: Static Extraction

Parses source files and persists:

- atoms
- files
- atom relations
- file dependencies
- system metadata

This is the mechanical layer.
It builds the persisted graph that all higher reasoning depends on.

### Layer B: Semantic and Governance Analysis

Builds higher-order signals such as:

- semantic relations
- risk scores
- duplicate analysis
- health signals
- drift detection
- policy findings

This is where raw extracted data becomes usable system knowledge.

### Layer C: Memory, Persistence, MCP Transport

Exposes the system through:

- SQLite-backed query surfaces
- MCP tools
- runtime status
- initialization summaries
- recent notifications and watcher alerts

This is where agents interact with the system.

## The Operating Model

OmnySys works best when agents follow a disciplined loop:

1. Before creating code: check whether it already exists.
2. Before editing code: inspect impact.
3. After editing code: inspect watcher/runtime errors.

That discipline is not optional decoration.
It is the minimum needed to keep fast AI-driven changes coherent.

### Minimal Workflow

Before creating:

```js
query_graph({ queryType: "instances", symbolName: "myFunction" })
aggregate_metrics({ aggregationType: "duplicates" })
```

Before editing:

```js
traverse_graph({ traverseType: "impact_map", filePath: "src/file.js" })
validate_imports({ filePath: "src/file.js", checkBroken: true })
```

After editing:

```js
get_recent_errors()
```

## Current Strengths

At the current stage, OmnySys is already strong in a few important areas:

- persisted graph and SQLite-backed analysis
- runtime freshness awareness
- duplicate governance
- file-universe and semantic-surface contracts
- startup and status explainability
- multi-client MCP visibility
- health and integrity reporting

This matters because governance cannot be built on volatile, in-memory-only context.

## Current Weaknesses

OmnySys is not finished.
Its real weaknesses are visible and known:

- some hotspots still carry too much logic
- complexity remains high in a few meta-detector / dashboard areas
- there are still places where enforcement should be harder
- some heuristics remain more advisory than contractual
- startup/reindex phases can still produce transient summaries that need careful wording

That is normal for a system of this age.
What matters is that the project is increasingly able to detect and explain those weaknesses itself.

## Why This Matters Now

This project was built in a world where one person, with AI assistance, can generate a system of meaningful complexity in a few weeks.
That was much harder before.

As that becomes normal, codebases will increasingly suffer from:

- too much local optimization
- too little architectural memory
- too many semantically similar surfaces
- too much code for any single human or model to fully hold in context

OmnySys is aimed at that future.

It is a tool for the moment when **context windows stop being enough**.

## Current MCP Tool Families

Source of truth: [src/layer-c-memory/mcp/tools/index.js](src/layer-c-memory/mcp/tools/index.js)

### Read / Query

- `query_graph`
- `traverse_graph`
- `impact_atomic`
- `aggregate_metrics`

### Safe Mutation / Refactor

- `atomic_edit`
- `atomic_write`
- `move_file`
- `fix_imports`
- `execute_solid_split`
- `suggest_refactoring`
- `suggest_architecture`
- `validate_imports`
- `generate_tests`
- `generate_batch_tests`

### Admin / Diagnostics

- `get_schema`
- `get_server_status`
- `get_recent_errors`
- `restart_server`
- `detect_performance_hotspots`
- `execute_sql`

## Practical Identity

The simplest honest description of OmnySys is:

> A governance and compiler-like control layer for AI-assisted codebases.

Not because it already fully enforces everything.
But because that is the direction of the architecture:

- from context to contract
- from indexing to governance
- from retrieval to system truth

## My Assessment

OmnySys already feels more serious than a typical AI code-context project.

The differentiator is not "it can search the repo".
The differentiator is that it is trying to answer harder questions:

- what is the source of truth?
- what is only a projection?
- what is stale?
- what is duplicated?
- what is risky to change?
- what is drifting?

That gives it real potential.

If the project keeps moving toward:

- stronger contracts
- clearer canonical surfaces
- lower hotspot complexity
- better enforcement

then yes, it can become a meaningful "compiler for AIs" in practice.

## Quick Start

```bash
git clone https://github.com/mauro3422/OmnySys.git
cd OmnySys
npm install
npm start
```

Useful commands:

```bash
npm start
npm stop
npm status
npm tools
npm test
npm run analyze
npm run mcp:proxy
npm run mcp:bridge
```

## MCP Configuration

```json
{
  "mcpServers": {
    "omnysys": {
      "type": "http",
      "url": "http://127.0.0.1:9999/mcp"
    }
  }
}
```

## Related Docs

- [AGENTS.md](AGENTS.md)
- [docs/INDEX.md](docs/INDEX.md)
- [docs/05-roadmap/OMNYSYS_POSITIONING.md](docs/05-roadmap/OMNYSYS_POSITIONING.md)
- [CHANGELOG.md](CHANGELOG.md)
- [changelogs/README.md](changelogs/README.md)

## License

MIT
