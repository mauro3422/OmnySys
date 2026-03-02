@echo off
REM Qwen CLI Wrapper with MCP Auto-Start for Windows
REM This script starts the OmnySys MCP daemon before running Qwen CLI

REM Check if MCP is running
curl -s -o nul -w "%%{http_code}" http://127.0.0.1:9999/health > "%TEMP%\mcp_status.txt" 2>nul
set /p MCP_STATUS=<"%TEMP%\mcp_status.txt"

if "%MCP_STATUS%"=="200" (
    REM MCP already running, skip start
    goto :RUN_QWEN
)

REM MCP not running, try to start it
REM Find repo root - check common locations
if exist "C:\Dev\OmnySystem\src\layer-c-memory\mcp-http-server.js" (
    set OMNY_REPO=C:\Dev\OmnySystem
) else if exist "%USERPROFILE%\OneDrive\Escritorio\PROYECTOS\Desarrollo\OmnySystem\src\layer-c-memory\mcp-http-server.js" (
    set OMNY_REPO=%USERPROFILE%\OneDrive\Escritorio\PROYECTOS\Desarrollo\OmnySystem
) else if exist "%USERPROFILE%\OneDrive\Escritorio\OmnySystem\src\layer-c-memory\mcp-http-server.js" (
    set OMNY_REPO=%USERPROFILE%\OneDrive\Escritorio\OmnySystem
) else (
    REM Try current directory traversal
    set OMNY_REPO=%CD%
    :FIND_REPO
    if not exist "%OMNY_REPO%\src\layer-c-memory\mcp-http-server.js" (
        set OMNY_REPO=%OMNY_REPO%\..
        if not "%OMNY_REPO%"=="C:\" goto FIND_REPO
    )
)

if exist "%OMNY_REPO%\src\layer-c-memory\mcp-http-server.js" (
    echo Starting OmnySys MCP daemon...
    start "" /MIN node "%OMNY_REPO%\src\layer-c-memory\mcp-http-server.js" "%OMNY_REPO%" "9999"
    
    REM Wait for MCP to be ready (max 15s)
    for /l %%i in (1,1,30) do (
        timeout /t 1 /nobreak >nul
        curl -s -o nul -w "%%{http_code}" http://127.0.0.1:9999/health > "%TEMP%\mcp_status.txt" 2>nul
        set /p MCP_STATUS=<"%TEMP%\mcp_status.txt"
        if "!MCP_STATUS!"=="200" goto :MCP_READY
    )
    :MCP_READY
    if "!MCP_STATUS!"=="200" (
        echo MCP daemon started successfully
    ) else (
        echo Warning: MCP daemon may not have started correctly
    )
)

:RUN_QWEN
REM Run Qwen CLI
set QWEN_DIR=%APPDATA%\npm\node_modules\@qwen-code\qwen-code
if exist "%QWEN_DIR%\cli.js" (
    node "%QWEN_DIR%\cli.js" %*
) else (
    echo Error: Qwen CLI not found at %QWEN_DIR%\cli.js
    exit /b 1
)
