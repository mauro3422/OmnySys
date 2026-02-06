# MCP Tools - Contrato

Version: v0.5.0
Ultima actualizacion: 2026-02-05

## Objetivo
Exponer contexto del proyecto a una IA antes de editar codigo.

## Diagrama
```text
MCP Tool -> Query Service -> .OmnySysData/ -> Response
```

## Tools
- `get_impact_map(filePath)`
- `analyze_change(filePath, symbolName)`
- `explain_connection(fileA, fileB)`
- `get_risk_assessment(minSeverity)`
- `search_files(pattern)`
- `get_server_status()`

## Fuente de datos
Todas las tools leen desde `.OmnySysData/`.

## Nota
Este documento es contrato. El MCP Server debe adherirse a estas firmas.
