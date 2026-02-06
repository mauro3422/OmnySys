# Refactor Plan (Monolitos Grandes)

> **HISTORICO**: Completado en v0.5.1. Este documento se mantiene como referencia del proceso de refactorizacion. No usar para decisiones actuales.

Este plan evita "vision de tunel" durante el refactor. Se enfoca en dependencias reales y contratos que no deben romperse.

## Objetivo
Dividir archivos grandes sin romper:
- CLI
- Orchestrator
- Unified Server
- Layer A pipeline
- File Watcher

## Estrategia Anti-Tunel (Checklist)
- Congelar contratos publicos (exports) antes de mover codigo.
- Refactor por capas: CLI -> Core -> Layer A -> Watcher.
- Mantener rutas y firmas mientras se hace el split.
- Usar archivos "index.js" como facades.
- Hacer un cambio por commit.

## Hotspots y Dependencias

### 1) `omnysys.js` (CLI)
**Depende de:**
- `indexProject`
- `Orchestrator`
- `OmnySysMCPServer`
- `OmnySysUnifiedServer`
- `LLMClient`, `loadAIConfig`
- `query-service` y `storage-manager`

**Riesgo:** romper comandos y flujo de inicio.

**Split sugerido:**
- `src/cli/index.js` (entry)
- `src/cli/commands/*.js` (analyze, consolidate, serve, status, clean, export, ai)
- `src/cli/utils/*` (paths, output, llm)

### 2) `src/core/unified-server.js`
**Depende de:**
- Orchestrator
- MCP Server
- WebSocket
- Cache

**Riesgo:** romper pipeline `serve`.

**Split sugerido:**
- `src/core/unified-server/index.js` (facade)
- `init.js`, `bridges.js`, `lifecycle.js`, `websocket.js`

### 3) `src/core/orchestrator.js`
**Depende de:**
- `analysis-queue`, `analysis-worker`
- `state-manager`
- `file-watcher`
- `batch-processor`
- `websocket-manager`
- `unified-cache-manager`
- `indexProject`
- `LLMAnalyzer`
- `query-service`

**Riesgo:** romper cola, iteraciones y eventos.

**Split sugerido:**
- `src/core/orchestrator/index.js` (facade)
- `lifecycle.js`
- `queueing.js`
- `llm-analysis.js`
- `iterative.js`
- `issues.js`
- `events.js`

### 4) `src/layer-a-static/indexer.js`
**Depende de:**
- `scanner`, `parser`, `resolver`, `graph-builder`, `analyzer`
- extractores y detectores
- `storage-manager`

**Riesgo:** romper formato de `.omnysysdata/`.

**Split sugerido:**
- `src/layer-a-static/pipeline/scan.js`
- `parse.js`, `resolve.js`, `build-graph.js`, `enhance.js`, `save.js`
- `indexer.js` como orquestador

### 5) `src/core/file-watcher.js`
**Depende de:**
- `parser`, `resolver`
- `storage-manager`
- `query-service`
- extractores

**Riesgo:** inconsistencia en indices y relaciones.

**Split sugerido:**
- `src/core/file-watcher/index.js`
- `change-detector.js`
- `analyze.js`
- `update-graph.js`
- `notifications.js`

### 6) `src/core/unified-cache-manager.js`
**Depende de:**
- FS y metadatos de `.omnysysdata/`

**Riesgo:** invalidaciones incorrectas.

**Split sugerido:**
- `cache/index.js`
- `cache/store.js`
- `cache/invalidation.js`
- `cache/stats.js`

### 7) `src/ai/llm-client.js`
**Depende de:**
- config, fetch, limpieza de JSON

**Riesgo:** romper parsing y validacion.

**Split sugerido:**
- `src/ai/llm/client.js`
- `transport.js`
- `response-cleaner.js`
- `batch.js`

## Orden Recomendado
1. CLI (`omnysys.js`)
2. Unified Server
3. Orchestrator
4. Layer A pipeline
5. File Watcher
6. Cache
7. LLM client

## Definicion de "Listo"
- Compila y corre los comandos principales.
- `.omnysysdata/` sigue igual.
- MCP Server responde a tools.

