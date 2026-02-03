#!/usr/bin/env pwsh
# Script de prueba rápida para la extensión CogniSystem VS Code

Write-Host "==========================================" -ForegroundColor Cyan
Write-Host "  CogniSystem VS Code - Test Script" -ForegroundColor Cyan
Write-Host "==========================================" -ForegroundColor Cyan
Write-Host ""

# Verificar que estamos en el directorio correcto
if (-not (Test-Path "package.json")) {
    Write-Host "❌ Error: Debes ejecutar este script desde cognisystem-vscode/" -ForegroundColor Red
    exit 1
}

# Paso 1: Instalar dependencias
Write-Host "📦 Paso 1: Instalando dependencias..." -ForegroundColor Yellow
npm install
if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ Error instalando dependencias" -ForegroundColor Red
    exit 1
}
Write-Host "✅ Dependencias instaladas" -ForegroundColor Green
Write-Host ""

# Paso 2: Compilar TypeScript
Write-Host "🔨 Paso 2: Compilando TypeScript..." -ForegroundColor Yellow
npm run compile
if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ Error compilando" -ForegroundColor Red
    exit 1
}
Write-Host "✅ Compilación exitosa" -ForegroundColor Green
Write-Host ""

# Paso 3: Verificar que existe el proyecto CogniSystem
Write-Host "🔍 Paso 3: Verificando proyecto CogniSystem..." -ForegroundColor Yellow
$parentDir = Split-Path -Parent (Get-Location)
if (-not (Test-Path "$parentDir\src\layer-a-static\indexer.js")) {
    Write-Host "⚠️  Advertencia: No se encontró el proyecto CogniSystem padre" -ForegroundColor Yellow
    Write-Host "   Asegúrate de haber ejecutado: node src/layer-a-static/indexer.js ." -ForegroundColor Yellow
} else {
    Write-Host "✅ Proyecto CogniSystem encontrado" -ForegroundColor Green
}
Write-Host ""

# Paso 4: Verificar datos de análisis
Write-Host "🔍 Paso 4: Verificando datos de análisis..." -ForegroundColor Yellow
if (Test-Path "$parentDir\.aver\index.json") {
    Write-Host "✅ Datos de análisis encontrados en .aver/" -ForegroundColor Green
    
    # Mostrar estadísticas básicas
    $index = Get-Content "$parentDir\.aver\index.json" | ConvertFrom-Json
    Write-Host "   📊 Archivos analizados: $($index.metadata.totalFiles)" -ForegroundColor Gray
    Write-Host "   📊 Funciones: $($index.metadata.totalFunctions)" -ForegroundColor Gray
} else {
    Write-Host "⚠️  No se encontraron datos de análisis" -ForegroundColor Yellow
    Write-Host "   Ejecuta primero: node src/layer-a-static/indexer.js ." -ForegroundColor Yellow
}
Write-Host ""

# Paso 5: Instrucciones
Write-Host "==========================================" -ForegroundColor Cyan
Write-Host "  🚀 Listo para probar!" -ForegroundColor Green
Write-Host "==========================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "Para probar la extensión:" -ForegroundColor White
Write-Host ""
Write-Host "  Opción 1 - Modo Desarrollo (Recomendado):" -ForegroundColor Yellow
Write-Host "    1. Abre esta carpeta en VS Code: code ." -ForegroundColor Gray
Write-Host "    2. Presiona F5 para iniciar debugging" -ForegroundColor Gray
Write-Host "    3. Se abrirá una nueva ventana con la extensión cargada" -ForegroundColor Gray
Write-Host ""
Write-Host "  Opción 2 - Empaquetar e instalar:" -ForegroundColor Yellow
Write-Host "    1. npm install -g @vscode/vsce" -ForegroundColor Gray
Write-Host "    2. vsce package" -ForegroundColor Gray
Write-Host "    3. Instala el archivo .vsix generado" -ForegroundColor Gray
Write-Host ""
Write-Host "==========================================" -ForegroundColor Cyan
