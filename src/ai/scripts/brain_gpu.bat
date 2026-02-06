@echo off
setlocal EnableDelayedExpansion

REM Prevenir ejecuciÃ³n mÃºltiple - verificar si ya hay una instancia iniciÃ¡ndose
set "LOCK_FILE=%TEMP%\omny_brain_gpu.lock"

if exist "%LOCK_FILE%" (
    echo [WARNING] Brain GPU is already starting! Lock file exists: %LOCK_FILE%
    echo [INFO] If you're sure no instance is running, delete the lock file and retry.
    timeout /t 3 /nobreak >nul
    exit /b 1
)

REM Crear archivo de lock
echo %DATE% %TIME% > "%LOCK_FILE%"

title OmnySys Brain (GPU - Vulkan) - LFM2-Extract [PID:%RANDOM%]
color 0B

echo ============================================
echo SCRIPT EJECUTADO: %DATE% %TIME%
echo PID: %RANDOM%
echo LOCK: %LOCK_FILE%
echo ============================================

REM Matar procesos anteriores de llama-server
echo [INFO] Stopping any existing llama-server instances...
taskkill /F /IM llama-server.exe 2>nul
timeout /t 1 /nobreak >nul

REM Verificar que se cerrÃ³ completamente
:CHECK_PROCESS
tasklist /FI "IMAGENAME eq llama-server.exe" 2>nul | find /I "llama-server.exe" >nul
if %errorlevel%==0 (
    echo [WAIT] Waiting for llama-server to close...
    timeout /t 1 /nobreak >nul
    goto CHECK_PROCESS
)
echo [OK] All llama-server instances closed

REM Cambiar al directorio raÃ­z del proyecto
cd /d "%~dp0..\..\..\"

set MODEL_PATH=src\ai\models\LFM2-1.2B-Extract-Q8_0.gguf

if not exist "%MODEL_PATH%" (
    echo [ERROR] Model not found: %MODEL_PATH%
    echo [DEBUG] Current directory: %CD%
    del "%LOCK_FILE%" 2>nul
    pause
    exit /b 1
)

echo [READY] Starting Brain Server (GPU Vulkan Mode)...
echo [INFO] Port 8000 - Parallel 2 - Context 48K (24K per slot)
echo [INFO] Working directory: %CD%
echo [INFO] Optimized for LFM2-Extract 1.2B with large code contexts

REM Crear directorio de logs si no existe
if not exist logs mkdir logs

REM Configuracion optimizada para 8GB VRAM con LFM2-Extract 1.2B:
REM - Modelo Q8_0: ~1.2GB
REM - Overhead GPU: ~0.5GB  
REM - KV Cache disponible: ~6.3GB
REM - LFM2 hibrido usa ~0.2MB/token (vs 1MB+ transformers)
REM - 6.3GB / 0.2MB = ~31,500 tokens totales
REM - Con 2 slots: ~15,750 tokens por slot (margen seguro)
src\ai\server\llama-server.exe --model "%MODEL_PATH%" --port 8000 --host 127.0.0.1 --n-gpu-layers 999 --ctx-size 32768 --parallel 2 -cb --temp 0.0 --cache-type-k q8_0 --cache-type-v q8_0 --chat-template chatml

REM Limpiar archivo de lock al terminar
echo [INFO] Cleaning up lock file...
del "%LOCK_FILE%" 2>nul

echo [INFO] Brain server stopped.
pause

