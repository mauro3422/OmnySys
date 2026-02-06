# OmnySys MCP Server Configuration

This directory is detected by MCP clients (Claude Desktop, OpenCode, etc.) to find and connect to the OmnySys MCP server.

## Setup

The MCP server is automatically detected when you:

1. Install this project
2. Open it in a folder with `.omnysysdata/` directory
3. Use an MCP client (Claude Desktop, OpenCode, etc.)

## Files

- `omnysysdata/` - Analysis data and cache
- `opencode.json` - OpenCode MCP configuration
- `claude_desktop_config.json` - Claude Desktop MCP configuration (if needed)

## Installation

No manual configuration needed! The MCP server will be automatically detected and connected to when you:

- Start Claude Desktop
- Use OpenCode
- Use any MCP-compatible client

The server will:
1. Load the entire codebase analysis
2. Start the Orchestrator in background
3. Initialize the file watcher for real-time updates
4. Start the LLM server if configured
5. Be ready for queries and tool calls
