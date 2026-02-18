@echo off
chcp 65001 >nul
echo ===========================================
echo  OmnySys MCP Server Launcher
echo ===========================================
echo.
echo Starting MCP server with 4GB memory limit...
echo.

set NODE_OPTIONS=--max-old-space-size=8192

node src/layer-c-memory/mcp-server.js

if %ERRORLEVEL% NEQ 0 (
  echo.
  echo Server exited with error code %ERRORLEVEL%
  pause
)
