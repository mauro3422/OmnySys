# Script para transferir archivos desde Giteach a Aver
# Ejecutar desde la raíz de aver: .\transfer-from-giteach.ps1

$giteachPath = "C:\Users\mauro\OneDrive\Escritorio\📁 PROYECTOS\Misceláneos\Giteach"
$averPath = Get-Location

Write-Host "🚀 Transfiriendo archivos desde Giteach..." -ForegroundColor Cyan

# 1. Copiar binarios del servidor
Write-Host "`n📦 Copiando binarios del servidor..." -ForegroundColor Yellow
$serverSource = Join-Path $giteachPath "server"
$serverDest = Join-Path $averPath "src\ai\server"

if (Test-Path $serverSource) {
    Copy-Item -Path "$serverSource\*" -Destination $serverDest -Recurse -Force
    Write-Host "  ✓ Binarios copiados" -ForegroundColor Green
} else {
    Write-Host "  ✗ No se encuentra: $serverSource" -ForegroundColor Red
}

# 2. Copiar modelo
Write-Host "`n🤖 Copiando modelo LLM..." -ForegroundColor Yellow
$modelSource = Join-Path $giteachPath "models\LFM2.5-1.2B-Instruct-Q8_0.gguf"
$modelDest = Join-Path $averPath "src\ai\models"

if (Test-Path $modelSource) {
    Copy-Item -Path $modelSource -Destination $modelDest -Force
    $modelSize = (Get-Item $modelSource).Length / 1GB
    Write-Host "  ✓ Modelo copiado (~$([math]::Round($modelSize, 2)) GB)" -ForegroundColor Green
} else {
    Write-Host "  ✗ No se encuentra: $modelSource" -ForegroundColor Red
}

# 3. Verificar
Write-Host "`n🔍 Verificando archivos..." -ForegroundColor Yellow

$files = @(
    "src\ai\server\llama-server.exe",
    "src\ai\server\ggml-vulkan.dll",
    "src\ai\server\llama.dll",
    "src\ai\models\LFM2.5-1.2B-Instruct-Q8_0.gguf"
)

$allGood = $true
foreach ($file in $files) {
    $fullPath = Join-Path $averPath $file
    if (Test-Path $fullPath) {
        Write-Host "  ✓ $file" -ForegroundColor Green
    } else {
        Write-Host "  ✗ $file" -ForegroundColor Red
        $allGood = $false
    }
}

if ($allGood) {
    Write-Host "`n✅ Transferencia completa! Ahora ejecuta:" -ForegroundColor Green
    Write-Host "   omnysystem ai start gpu" -ForegroundColor Cyan
} else {
    Write-Host "`n⚠️  Algunos archivos faltantes" -ForegroundColor Yellow
}
