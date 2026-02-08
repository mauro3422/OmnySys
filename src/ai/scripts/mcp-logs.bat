@echo off
title OmnySys MCP Server Logs
color 0A

echo ============================================
echo  OmnySys MCP Server - Live Logs
echo  Started: %DATE% %TIME%
echo ============================================
echo.

REM Cambiar al directorio raiz del proyecto
cd /d "%~dp0..\..\..\"

REM Crear directorio de logs si no existe
if not exist logs mkdir logs

REM Crear archivo de log si no existe
if not exist "logs\mcp-server.log" (
    echo [%DATE% %TIME%] MCP Log file created > "logs\mcp-server.log"
)

echo [INFO] Tailing logs\mcp-server.log ...
echo [INFO] Press Ctrl+C to stop
echo.

powershell -Command "[Console]::OutputEncoding = [System.Text.Encoding]::UTF8; Get-Content 'logs\mcp-server.log' -Encoding UTF8 -Wait -Tail 50"

pause
