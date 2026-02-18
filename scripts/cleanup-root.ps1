$dest = "c:\Dev\OmnySystem\archive\root-cleanup-2026-02-18"
New-Item -ItemType Directory -Path $dest -Force | Out-Null

$files = @(
  "AUDIT_MCP_INITIALIZATION.md",
  "AUDIT_RESULTS.md",
  "GETTING_STARTED.md",
  "INSTALL.md",
  "MCP_SETUP.md",
  "OMNISCIENCIA.md",
  "PLAN_UNIFICACION_FUNCTIONS.md",
  "QUEDO_POR_HACER.md",
  "REFACTORING_SUMMARY_v0.9.4.md",
  "SECURITY-AUTO-FIX.md",
  "run-tests.js",
  "test-results.txt",
  "migration-log.json",
  "audit-context.js",
  "mcp-http-server.js",
  "restart-server.mjs",
  "start-server.js",
  "start-server.mjs",
  "start-mcp-server.cmd"
)

foreach ($f in $files) {
  $src = Join-Path "c:\Dev\OmnySystem" $f
  if (Test-Path $src) {
    Move-Item $src $dest -Force
    Write-Host "Movido: $f"
  } else {
    Write-Host "No existe (skip): $f"
  }
}

# Eliminar archivos basura de Windows
$trash = @("nul", "migration_night_20260216_021643.log")
foreach ($t in $trash) {
  $p = Join-Path "c:\Dev\OmnySystem" $t
  if (Test-Path $p) {
    Remove-Item $p -Force
    Write-Host "Eliminado: $t"
  }
}

# Eliminar directorio relative/ (vacío/error)
$relDir = "c:\Dev\OmnySystem\relative"
if (Test-Path $relDir) {
  Remove-Item $relDir -Recurse -Force
  Write-Host "Eliminado directorio: relative/"
}

Write-Host "`nLimpieza completada."
