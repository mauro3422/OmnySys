#!/usr/bin/env pwsh
# Qwen CLI Wrapper with MCP Auto-Start for Windows PowerShell
# This script starts the OmnySys MCP daemon before running Qwen CLI

$ErrorActionPreference = 'SilentlyContinue'

# Function to check if MCP is running
function Test-McpRunning {
    try {
        $response = Invoke-WebRequest -Uri "http://127.0.0.1:9999/health" -TimeoutSec 2 -UseBasicParsing
        return $response.StatusCode -eq 200
    } catch {
        return $false
    }
}

# Function to find OmnySystem repo root
function Find-OmnyRepo {
    # Check common locations
    $commonPaths = @(
        "C:\Dev\OmnySystem",
        "$env:USERPROFILE\OneDrive\Escritorio\PROYECTOS\Desarrollo\OmnySystem",
        "$env:USERPROFILE\OneDrive\Escritorio\OmnySystem",
        "$env:USERPROFILE\source\repos\OmnySystem"
    )
    
    foreach ($path in $commonPaths) {
        if (Test-Path "$path\src\layer-c-memory\mcp-http-server.js") {
            return $path
        }
    }
    
    # Try current directory traversal
    $current = Get-Location
    while ($current.Parent) {
        if (Test-Path "$current\src\layer-c-memory\mcp-http-server.js") {
            return $current.Path
        }
        $current = $current.Parent
    }
    
    return $null
}

# Function to start MCP daemon
function Start-McpDaemon {
    $repoRoot = Find-OmnyRepo
    
    if (-not $repoRoot) {
        Write-Host "Warning: OmnySystem repo not found, skipping MCP auto-start" -ForegroundColor Yellow
        return $false
    }
    
    $mcpScript = Join-Path $repoRoot "src\layer-c-memory\mcp-http-server.js"
    
    Write-Host "Starting OmnySys MCP daemon from $repoRoot..." -ForegroundColor Cyan
    
    # Start MCP in background
    $process = Start-Process -FilePath "node" -ArgumentList $mcpScript, $repoRoot, "9999" -WindowStyle Hidden -PassThru
    
    # Wait for MCP to be ready (max 15s)
    for ($i = 0; $i -lt 30; $i++) {
        Start-Sleep -Milliseconds 500
        if (Test-McpRunning) {
            Write-Host "MCP daemon started successfully" -ForegroundColor Green
            return $true
        }
    }
    
    Write-Host "Warning: MCP daemon may not have started correctly" -ForegroundColor Yellow
    return $false
}

# Main logic
if (-not (Test-McpRunning)) {
    Start-McpDaemon
}

# Find Qwen CLI
$qwenCliPath = "$env:APPDATA\npm\node_modules\@qwen-code\qwen-code\cli.js"

if (Test-Path $qwenCliPath) {
    & node $qwenCliPath $args
} else {
    Write-Host "Error: Qwen CLI not found at $qwenCliPath" -ForegroundColor Red
    exit 1
}
