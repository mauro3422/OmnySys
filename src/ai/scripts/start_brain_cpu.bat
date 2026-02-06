@echo off
title OmnySys Mappers (CPU)
color 0E

set MODEL_PATH=src\ai\models\LFM2.5-1.2B-Instruct-Q8_0.gguf

if not exist "%MODEL_PATH%" (
    echo [ERROR] Model not found: %MODEL_PATH%
    pause
    exit /b
)

echo [READY] Starting Mapper Server (CPU Mode)...
echo [INFO] Port 8002 - Threads 4 - Parallel 4

src\ai\server\llama-server.exe --model "%MODEL_PATH%" --port 8002 --host 127.0.0.1 -ngl 0 --ctx-size 65536 --threads 4 --parallel 4 --batch-size 512 -cb --cache-type-k q8_0 --cache-type-v q8_0 --chat-template chatml --log-file logs\ai_mapper_cpu.log
