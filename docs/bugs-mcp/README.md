# MCP Bug Evidence — Bugs Recurrentes del Daemon

**Categoría**: MCP Server / Daemon Stability
**Estado**: Evidencia recopilada para análisis y tracking

## Bugs Documentados

| # | Archivo | Bug | Severidad | Estado |
|---|---------|-----|-----------|--------|
| 1 | `mcp-proxy-startup-health-false-negative.md` | El proxy reporta "healthy" antes de que el daemon esté realmente listo | High | Investigado |
| 2 | `mcp-proxy-watchdog-double-spawn.md` | El watchdog spawnea dos instancias del proxy en lugar de una | Critical | Investigado |
| 3 | `mcp-restart-reconnect.md` | Problemas de reconexión tras restart del MCP server | High | Investigado |
| 4 | `mcp-worker-periodic-exit-after-ready.md` | El worker procesal hace exit periódico después de ready | High | Investigado |

## Contexto

Estos bugs fueron detectados durante el desarrollo activo de OmnySys (v0.9.66+).
Cada archivo contiene:
- Descripción del bug
- Pasos para reproducir
- Evidencia de logs
- Fix aplicado (si corresponde)

Esta carpeta sirve como **evidencia técnica** de la estabilidad del sistema MCP
y los problemas recurrentes que se encontraron y resolvieron durante las 6 semanas
de desarrollo.

---

*Última actualización: 2026-04-09*
