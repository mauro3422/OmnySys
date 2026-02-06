# Auto Serve - Pipeline Unificado

Documento canonico del comportamiento esperado de `omnysys serve`.

## Objetivo
Un solo comando deja el sistema operativo:
- Analisis estatico listo
- Orchestrator activo
- MCP Server disponible

## Diagrama
```text
serve
  |
  +-> ensure Layer A
  +-> ensure LLM server
  +-> start Orchestrator
  +-> optional consolidate
  +-> start MCP Server
```

## Pipeline Canonico
1. Verificar `.omnysysdata/`.
2. Si no existe, ejecutar `omnysys analyze`.
3. Verificar LLM server y arrancar si es necesario.
4. Inicializar Orchestrator en modo servicio.
5. Ejecutar consolidacion inicial (opcional, segun config).
6. Iniciar MCP Server.

## Salida esperada
- MCP tools disponibles
- `.omnysysdata/` actualizado

Ultima actualizacion: 2026-02-05
