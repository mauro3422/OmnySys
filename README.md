# OmnySys

> **A governance and compiler-like control layer for AI-assisted codebases.**

OmnySys is not just an MCP server, a code indexer, or a retrieval graph.
It is an attempt to make fast, agent-driven software production survivable.

**OmnySys exists because AI can now generate code faster than humans can metabolize it.**

---

## What It Does

- **Analyzes** your project into persisted atoms, files, relations, and support tables
- **Exposes** the system through 45 MCP tools backed by SQLite
- **Detects** structural and conceptual duplication before it spreads
- **Tracks** runtime freshness, restart requirements, and pipeline integrity
- **Warns** when the watcher/runtime/tooling are out of sync
- **Helps agents** inspect impact before editing and recent errors after editing
- **Enforces** canonical surfaces, drift detection, and reconciliation contracts

In short: **the difference between "AI can see the repo" and "AI is forced to respect the repo".**

---

## Key Numbers (April 2026)

| Metric | Value |
|--------|-------|
| **Atoms indexed** | 14,241 active |
| **Files analyzed** | 2,813 active |
| **Call graph edges** | 11,202 |
| **MCP tools** | 45 (6 query · 21 action · 18 admin) |
| **SQLite tables** | 20 (0 schema drift) |
| **Analysis** | 100% static, 0% LLM |
| **Technologies** | Tree-sitter + SQLite + Express + MCP SDK |

---

## Quick Start

```bash
git clone https://github.com/mauro3422/OmnySys.git
cd OmnySys
npm install
npm start          # Starts MCP server on http://127.0.0.1:9999/mcp
```

### Useful Commands

```bash
npm start          # Start MCP server (omny.js up)
npm stop           # Stop server
npm status         # Show server status
npm tools          # List available MCP tools
npm test           # Run all tests (Vitest)
npm run analyze    # Analyze current project
npm run mcp:http   # Start HTTP proxy directly
npm run mcp:stdio  # Start stdio server
```

---

## MCP Configuration

Add to your AI client config:

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

---

## Architecture

OmnySys is organized in **5 layers** with clear, separated responsibilities:

```
src/
├── layer-a-static/     # Static analysis (Tree-sitter AST extraction)
├── layer-b-semantic/   # Semantic enrichment (DNA, archetypes, societies)
├── layer-graph/        # Dependency graph + centrality metrics
├── layer-c-memory/     # SQLite persistence + MCP Server (45 tools)
├── core/               # FileWatcher, Orchestrator, Unified Server
├── shared/             # Compiler contracts, shared utilities
├── cli/                # CLI administration (omny.js)
└── ...                 # ai/, services/, utils/, validation/
```

See [ARCHITECTURE.md](ARCHITECTURE.md) for the complete technical architecture.

---

## The Operating Model

OmnySys works best when agents follow a disciplined loop:

1. **Before creating** code → check whether it already exists
2. **Before editing** code → inspect impact
3. **After editing** code → inspect watcher/runtime errors

### Minimal Workflow

```js
// Before creating:
query_graph({ queryType: "instances", symbolName: "myFunction" })
aggregate_metrics({ aggregationType: "duplicates" })

// Before editing:
traverse_graph({ traverseType: "impact_map", filePath: "src/file.js" })
validate_imports({ filePath: "src/file.js", checkBroken: true })

// After editing:
get_recent_errors()
```

See [AGENTS.md](AGENTS.md) for the complete tool reference and anti-patterns guide.

---

## What Makes OmnySys Different

Most AI coding tools focus on code search, graph retrieval, summaries, and context windows.

OmnySys focuses on something stricter:

| Focus Area | What It Means |
|------------|---------------|
| **Governance** | Who owns what, and is it canonical or advisory? |
| **Canonicity** | Which surface is the source of truth? |
| **Drift Detection** | What has diverged from expected contracts? |
| **Reconciliation** | How do we fix drift without breaking things? |
| **Runtime Freshness** | Is the answer we're getting fresh or stale? |
| **Persistent Contracts** | Are agents respecting the repo structure? |

---

## Tool Families

### Read / Query
`query_graph` · `traverse_graph` · `impact_atomic` · `aggregate_metrics`

### Safe Mutation / Refactor
`atomic_edit` · `atomic_write` · `move_file` · `fix_imports` · `execute_solid_split` · `suggest_refactoring` · `suggest_architecture` · `validate_imports` · `generate_tests`

### Admin / Diagnostics
`get_schema` · `get_server_status` · `get_health_panel` · `get_recent_errors` · `restart_server` · `detect_performance_hotspots` · `execute_sql` · `get_technical_debt_report`

Full list of 45 tools: [ARCHITECTURE.md#catálogo-de-herramientas-mcp](ARCHITECTURE.md#catálogo-de-herramientas-mcp-45-tools)

---

## Database Architecture

| Database | Size | Purpose |
|----------|------|---------|
| `omnysys.db` | ~344 MB | Active data — atoms, files, relations, risk, sessions |
| `atom-history.db` | ~384 MB | Version archive — historical evolution across Git commits |
| `health-history.db` | ~20 MB | Metrics history — health snapshots, trends, comparisons |

All three databases use SQLite with WAL mode, foreign keys, and 64MB cache.
Schema is synchronized — 20 tables, 0 drift.

---

## Current Strengths

- ✅ Persisted graph and SQLite-backed analysis
- ✅ Runtime freshness awareness
- ✅ Duplicate governance (structural + conceptual)
- ✅ File-universe and semantic-surface contracts
- ✅ Startup and status explainability
- ✅ Multi-client MCP visibility
- ✅ Health and integrity reporting
- ✅ 45 deterministic MCP tools

---

## Known Weaknesses

- ⚠️ 136 policy drift findings blocking full control plane trust
- ⚠️ 15 functions with cyclomatic complexity > 30 (target ≤ 15)
- ⚠️ 5 structural duplicate groups (10 instances)
- ⚠️ 1,871 naming normalization targets pending
- ⚠️ Metadata coverage at 84% (target > 90%)

These are detected and explained by the system itself — which is the point.

---

## Why This Matters Now

This project was built in a world where one person, with AI assistance, can generate a system of meaningful complexity in a few weeks. That was much harder before.

As that becomes normal, codebases will increasingly suffer from:
- too much local optimization
- too little architectural memory
- too many semantically similar surfaces
- too much code for any single human or model to fully hold in context

**OmnySys is aimed at that future.** It is a tool for the moment when context windows stop being enough.

---

## Related Documentation

| Document | Description |
|----------|-------------|
| [ARCHITECTURE.md](ARCHITECTURE.md) | Complete technical architecture |
| [AGENTS.md](AGENTS.md) | MCP tools reference + anti-patterns guide |
| [ROADMAP.md](ROADMAP.md) | Development roadmap and future plans |
| [CHANGELOG.md](CHANGELOG.md) | Release history |
| [BACKLOG.md](BACKLOG.md) | Open bugs and operational notes |

---

## License

MIT
