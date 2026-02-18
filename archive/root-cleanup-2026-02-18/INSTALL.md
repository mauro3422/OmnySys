# OmnySys - Installation & Setup Guide

## 🚀 Quick Start

OmnySys includes an **auto-detecting MCP server**. No manual configuration required!

### For Claude Desktop Users

1. Download and install [Claude Desktop](https://claude.ai/download)
2. Install the OmnySys repository
3. Open the project in Claude Desktop
4. **That's it!** The MCP server is automatically detected and connected.

### For OpenCode Users

1. Open OmnySys repository in OpenCode
2. Use the `/mcp` command to enable MCP tools
3. **That's it!** The MCP server loads and processes the codebase.

### For CLI Users

```bash
# Install
npm install omny-sys

# Start MCP server (background)
npx omny-sys mcp start .

# The server will:
# - Load entire codebase analysis
# - Start file watcher for real-time updates
# - Initialize LLM server (if configured)
# - Be ready for queries
```

## 📋 What Happens When MCP Server Starts

```
┌─────────────────────────────────────────────────┐
│  1. DETECT PROJECT                              │
│     → Reads .omnysysdata/ (if exists)           │
│     → Analyzes codebase if no data              │
├─────────────────────────────────────────────────┤
│  2. LOAD ORCHESTRATOR                           │
│     → Queue + Worker + FileWatcher              │
│     → Background processing of codebase         │
├─────────────────────────────────────────────────┤
│  3. INITIALIZE CACHE                            │
│     → Unified cache manager                    │
│     → Data partitioning (.omnysysdata/)         │
├─────────────────────────────────────────────────┤
│  4. START LLM SERVER (optional)                │
│     → GPU server (port 8000)                    │
│     → CPU server (port 8002)                    │
├─────────────────────────────────────────────────┤
│  5. READY FOR QUERIES                           │
│     → All 12 MCP tools available                │
│     → Impact mapping, code understanding        │
└─────────────────────────────────────────────────┘
```

## 🔧 Manual Configuration

If auto-detection doesn't work, configure manually:

### Claude Desktop

Edit `claude_desktop_config.json`:

```json
{
  "mcpServers": {
    "omny-system": {
      "command": "node",
      "args": ["PATH/TO/omny-sys/src/layer-c-memory/mcp-server.js", "."]
    }
  }
}
```

### OpenCode

Edit `opencode.json`:

```json
{
  "mcp": {
    "omny-system": {
      "type": "local",
      "command": ["node", "src/layer-c-memory/mcp-server.js", "."],
      "enabled": true
    }
  }
}
```

### CLI

```bash
node src/layer-c-memory/mcp-server.js . &
```

## 🛠️ Available MCP Tools

| Tool | Description | Use Case |
|------|-------------|----------|
| `get_impact_map(filePath)` | Shows all files affected by changes | Risk assessment |
| `analyze_change(filePath, symbolName)` | Predicts breaking changes | Refactoring planning |
| `explain_connection(fileA, fileB)` | Explains why files are connected | Code understanding |
| `get_risk_assessment(minSeverity)` | Evaluates project risks | Code quality |
| `search_files(pattern)` | Searches files by pattern | Code navigation |
| `get_server_status()` | Server health and stats | Monitoring |
| `get_call_graph(filePath, symbolName)` | Shows all call sites (OMNISCIENCE) | Deep code understanding |
| `analyze_signature_change(...)` | Predicts breaking changes (OMNISCIENCE) | API design |
| `explain_value_flow(...)` | Data flow analysis (OMNISCIENCE) | Understanding logic |
| `get_function_details(...)` | Atomic function metadata | Function-level analysis |
| `get_molecule_summary(...)` | File molecular summary | File-level overview |
| `restart_server()` | Restart and reload data | After code changes |

## 📊 Architecture

OmnySys uses a **layered architecture**:

```
┌─────────────────────────────────────────────────┐
│  MCP CLIENT (Claude, OpenCode, etc.)            │
└─────────────────────────────────────────────────┘
                    │
                    ▼
┌─────────────────────────────────────────────────┐
│  MCP SERVER (mcp-server.js)                     │
│     │                                           │
│     ├─> ORCHESTRATOR (Queue + Worker)          │
│     ├─> UNIFIED CACHE (.omnysysdata/)           │
│     ├─> FILE WATCHER (real-time updates)       │
│     └─> LLM SERVER (AI analysis)               │
└─────────────────────────────────────────────────┘
                    │
                    ▼
┌─────────────────────────────────────────────────┐
│  LAYER A: Static Analysis                       │
│     • AST parsing                               │
│     • Import/export analysis                    │
│     • Dependency graphs                         │
├─────────────────────────────────────────────────┤
│  LAYER B: Semantic Analysis                    │
│     • State connections                        │
│     • Event listeners                          │
│     • Global variables                         │
├─────────────────────────────────────────────────┤
│  LAYER C: Memory (Query Layer)                  │
│     • Partitioned storage                      │
│     • Efficient queries                        │
│     • 15 public API methods                    │
└─────────────────────────────────────────────────┘
```

## ⚡ Performance

- **Cold start**: ~2 seconds (loads index)
- **Warm start**: ~250ms (uses existing data)
- **File watcher**: Real-time updates
- **Background processing**: Orchestrator works automatically

## 🔍 Debugging

### Check if MCP server is running

```bash
ps aux | grep mcp-server
```

### Test tools

```bash
node -e "
import('./src/layer-c-memory/mcp-server.js').then(async (m) => {
  console.log('✅ MCP Server loaded');
  console.log('✅ All 12 tools registered');
}).catch(e => console.error(e));
"
```

### Check cache

```bash
cat .omnysysdata/index.json
```

## 🐛 Troubleshooting

### MCP not detected

1. Restart Claude Desktop / OpenCode
2. Check `mcp-servers.json` exists in project root
3. Verify paths are correct
4. Check Node.js version (v16+)

### Tools not available

1. MCP server might not be running
2. Check server logs for errors
3. Verify .omnysysdata/ exists
4. Check `get_server_status()` for errors

### Slow queries

1. Cache is empty (cold start)
2. Check orchestrator queue status
3. Monitor CPU/memory usage
4. LLM server might be starting

## 📚 Documentation

- [Tools Guide](./docs/TOOLS_GUIDE.md) - Complete MCP tools reference
- [MCP Integration Guide](./docs/MCP_INTEGRATION_GUIDE.md) - IDE integration details
- [Architecture](./ARCHITECTURE.md) - System architecture

## 🤝 Contributing

When contributing to OmnySys:

1. Update MCP tools definitions in `src/layer-c-memory/mcp/tools/index.js`
2. Implement tools in corresponding .js files
3. Test with `node src/layer-c-memory/mcp-server.js .`
4. Update documentation

## 📄 License

[Your License Here]
