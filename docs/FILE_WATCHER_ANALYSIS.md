# File Watcher - Contrato

Documento canonico del comportamiento esperado del file watcher.

## Objetivo
Mantener `.OmnySysData/` consistente ante cambios en archivos del proyecto.

## Diagrama
```text
FS Change -> Queue -> Analyze -> Update Graph -> Invalidate Cache
```

## Reglas
- Debounce para evitar duplicados.
- Lock por archivo para evitar doble analisis.
- Actualizacion bidireccional de dependencias.
- Invalidacion de caches en MCP/Unified Server.
- Si el parseo falla, no escribir datos nuevos.

## Eventos
- `file:created`
- `file:modified`
- `file:deleted`
- `cache:invalidate`

Ultima actualizacion: 2026-02-05
