# MCP Process Management Guide

## Understanding Node.js Processes in OmnySys

When you open Task Manager and see multiple `node.exe` processes, here's what they are:

### Process Types

| Type | Script | Purpose | Typical Memory |
|------|--------|---------|----------------|
| **Daemon** | `mcp-http-server.js` | Main MCP server (shared by all IDEs) | 400-800 MB |
| **Proxy** | `mcp-http-proxy.js` | Wrapper that manages daemon restarts | 50-100 MB |
| **Bridge** | `mcp-stdio-bridge.js` | Per-IDE connection (stdio ↔ HTTP) | 30-80 MB |

### Healthy Process Count

For a typical Qwen Code + VS Code session:
- **1** Daemon (PID visible in `/health` endpoint)
- **1** Proxy (manages the daemon)
- **1-2** Bridges (one per IDE/client)

**Total: 3-4 Node.js processes for OmnySys** (not counting other MCP servers like GitHub)

## Identifying OmnySys Processes

### Method 1: Command Line
```cmd
wmic process where "name='node.exe'" get commandline,processid /format:csv
```

### Method 2: Health Endpoint
```cmd
curl http://127.0.0.1:9999/health
```

Look for:
```json
{
  "processType": "daemon",
  "pid": 3468,
  "projectPath": "C:\\Dev\\OmnySystem"
}
```

### Method 3: Task Manager
- Right-click process → "Go to details"
- Check command line in Details tab (add "Command line" column)

## New Protection Features (2026-04-08)

### 1. Orphan Detection
Before starting a new daemon, the system now:
- Scans for existing Node.js processes running OmnySys scripts
- Checks if they're healthy daemons for the same project
- Cleans up orphaned/unhealthy processes automatically

### 2. Process Identification
The health endpoint now includes:
- `processType`: Identifies if it's a "daemon", "proxy", or "bridge"
- `pid`: Process ID for easy identification
- `projectPath`: Full path to verify it's for your project

### 3. Start Lock Metadata
Lock files now include:
```json
{
  "pid": 12345,
  "type": "bridge-auto-start",
  "port": "9999",
  "projectPath": "C:/Dev/OmnySystem",
  "createdAt": "2026-04-08T00:00:00.000Z",
  "nodeVersion": "v20.x.x"
}
```

## Common Scenarios

### Scenario 1: Multiple Bridges (Normal)
You might see 2+ bridge processes if:
- You have multiple IDEs open (VS Code + Cursor)
- Qwen Code reconnected without closing old bridge
- **This is NORMAL** - old bridges will timeout and clean up

### Scenario 2: Orphaned Daemon (Fixed)
Before: Could have 2+ daemons consuming 1GB+ each
Now: System detects and cleans up orphans on startup

### Scenario 3: Proxy + Daemon (Normal)
The proxy spawns and manages the daemon:
- Proxy keeps the port open
- Daemon can restart without dropping connections
- **This is the correct architecture**

## Troubleshooting

### High Memory Usage
If you see processes using >1GB:
1. Check if it's the daemon (normal for large projects)
2. Check if there are multiple daemons (run the wmic command)
3. If duplicates exist, they should auto-clean on next bridge reconnect

### "Too Many Node Processes"
Expected for OmnySys + GitHub MCP:
- 1 Daemon + 1 Proxy + 1-2 Bridges = 3-4 processes
- GitHub MCP might add 1-2 more
- **Total: 4-6 Node.js processes is normal**

### Manual Cleanup
If you need to force cleanup:
```cmd
# Kill all OmnySys processes (they will restart automatically)
taskkill /F /IM node.exe /FI "CMDLINE eq *OmnySystem*"
```

## Architecture Diagram

```
┌─────────────────┐     ┌─────────────────┐
│   VS Code/Qwen  │     │    Cursor/CLI   │
└────────┬────────     └────────┬────────┘
         │ stdio                 │ stdio
         ▼                       ▼
┌─────────────────┐     ┌─────────────────┐
│  Bridge (PID1)  │     │  Bridge (PID2)  │
└────────┬────────┘     └────────┬────────┘
         │                       │
         └───────────┬───────────┘
                     │ HTTP localhost:9999
                     ▼
         ┌─────────────────────┐
         │    Proxy (wrapper)  │
         └──────────┬──────────┘
                    │ manages
                    ▼
         ┌─────────────────────┐
         │   Daemon (main MCP) │ ← Only ONE of these!
         │   PID visible in    │
         │   /health endpoint  │
         └─────────────────────┘
```

## Best Practices

1. **Don't manually kill processes** - Let the system manage them
2. **Use `omny restart` or MCP tool** for controlled restarts
3. **Check /health endpoint** to verify which daemon is active
4. **Expect 1-2 bridges per IDE** - old ones cleanup automatically
5. **Memory usage 400-800MB for daemon** is normal for large codebases
