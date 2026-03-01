# MCP System Configuration Guide

## Overview

OmnySys uses a **shared MCP HTTP daemon** that runs on port `9999` and serves multiple AI clients simultaneously.

## Quick Start

### First Time Setup
```bash
cd C:\Dev\OmnySystem
node install.js
```

### Start the MCP Daemon
```bash
# Option 1: Manual start
node omny.js up

# Option 2: Terminal auto-start (configure once, works every time)
node omny.js setup-terminal
```

### Verify It's Working
```bash
node omny.js status
curl http://127.0.0.1:9999/health
```

## Connection Methods

### 1. **HTTP Direct** (Claude CLI, Gemini CLI)
- Connects directly to `http://127.0.0.1:9999/mcp`
- Requires daemon to be running before CLI starts
- Configuration location:
  - Claude: `~/.claude.json` (global + per-project)
  - Gemini: `~/.gemini/settings.json`

### 2. **STDIO Bridge** (Qwen CLI, Antigravity)
- Uses `mcp-stdio-bridge.js` as intermediary
- Bridge can auto-start the daemon if not running
- Configuration location:
  - Qwen: `~/.qwen/settings.json`
  - Antigravity: `~/.gemini/antigravity/mcp_config.json`

## Starting the MCP Daemon

### Option 1: Manual Start
```bash
cd C:\Dev\OmnySystem
node omny.js up
```

### Option 2: Terminal Auto-Start (Recommended)
The daemon will automatically start when you open any terminal.

**Setup:**
```bash
# Run once to configure
node omny.js setup-terminal
```

This adds auto-start code to your shell profiles:
- **Bash**: `~/.bashrc`, `~/.bash_profile`
- **Zsh**: `~/.zshrc`
- **PowerShell**: `Microsoft.PowerShell_profile.ps1`

### Option 3: VS Code Auto-Start
When you open the OmnySystem workspace in VS Code, a background task automatically starts the daemon.

## Configuration Files

### Global MCP Configurations

| Client | Config Path | Method |
|--------|-------------|--------|
| Qwen CLI | `~/.qwen/settings.json` | STDIO Bridge |
| Claude CLI | `~/.claude.json` | HTTP |
| Gemini CLI | `~/.gemini/settings.json` | HTTP |
| Antigravity | `~/.gemini/antigravity/mcp_config.json` | STDIO Bridge |
| Cline (VS Code) | `%APPDATA%\Code\User\globalStorage\saoudrizwan.claude-dev\settings\cline_mcp_settings.json` | HTTP |
| Cursor | `%APPDATA%\Cursor\User\globalStorage\saoudrizwan.claude-dev\settings\cline_mcp_settings.json` | HTTP |
| OpenCode | `~/.config\opencode\opencode.json` | HTTP |

### Workspace Configuration

- `.mcp.json` - Workspace MCP servers
- `mcp-servers.json` - Alternative workspace config
- `mcp-unified.config.json` - Unified configuration reference

## Troubleshooting

### Daemon Not Starting

1. **Check if port 9999 is in use:**
   ```bash
   netstat -ano | findstr :9999
   ```

2. **Manually start the daemon:**
   ```bash
   node src/layer-c-memory/mcp-http-server.js
   ```

3. **Check health endpoint:**
   ```bash
   curl http://127.0.0.1:9999/health
   ```

### CLI Can't Connect

1. **Verify daemon is running:**
   ```bash
   node omny.js status
   ```

2. **Restart the daemon:**
   ```bash
   node omny.js down
   node omny.js up
   ```

3. **Re-apply configuration:**
   ```bash
   node install.js
   ```

### Auto-Start Not Working

1. **Check shell profile:**
   - PowerShell: `notepad $PROFILE`
   - Bash: `cat ~/.bashrc`
   
2. **Verify script path is correct:**
   The auto-start script should point to: `C:\Dev\OmnySystem\scripts\mcp-autostart.js`

3. **Re-run setup:**
   ```bash
   node omny.js setup-terminal
   ```

## Available Tools

Once connected, you have access to 16 MCP tools:

- `mcp_omnysystem_query_graph` - Search and inspect symbols
- `mcp_omnysystem_traverse_graph` - Navigate dependencies (BFS/DFS)
- `mcp_omnysystem_aggregate_metrics` - Extract grouped metrics
- `mcp_omnysystem_atomic_edit` - Safe file editing with validation
- `mcp_omnysystem_atomic_write` - Safe file writing
- `mcp_omnysystem_move_file` - Move files and update imports
- `mcp_omnysystem_fix_imports` - Fix broken imports
- `mcp_omnysystem_execute_solid_split` - Analyze and split functions
- `mcp_omnysystem_suggest_refactoring` - Suggest improvements
- `mcp_omnysystem_validate_imports` - Validate imports
- `mcp_omnysystem_generate_tests` - Generate tests
- `mcp_omnysystem_generate_batch_tests` - Batch test generation
- `mcp_omnysystem_get_schema` - Query database schemas
- `mcp_omnysystem_get_server_status` - Server status
- `mcp_omnysystem_get_recent_errors` - Recent error logs
- `mcp_omnysystem_restart_server` - Graceful server restart

## Quick Start Commands

```bash
# Full setup (all clients + terminal auto-start)
node install.js

# Just terminal auto-start
node omny.js setup-terminal

# Start daemon manually
node omny.js up

# Check status
node omny.js status

# View available tools
node omny.js tools
```

## Architecture Notes

- **Single daemon**: One MCP HTTP server serves all clients
- **Session management**: Each client connection gets a unique session ID
- **Hot-reload**: Tool registry can be refreshed without restart
- **Graceful restart**: Use `mcp_omnysystem_restart_server` tool instead of killing process
- **Auto-recovery**: STDIO bridge attempts to reconnect if daemon restarts
