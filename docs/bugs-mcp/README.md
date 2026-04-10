# MCP Bug Evidence - Bugs Recurrentes del Daemon y de la Superficie Codex

**Categoria**: MCP server / daemon stability / Codex launcher surfaces
**Estado**: Evidencia recopilada para analisis y tracking

## Bugs Documentados

| # | Archivo | Bug | Severidad | Estado |
|---|---------|-----|-----------|--------|
| 1 | `mcp-proxy-startup-health-false-negative.md` | El proxy podia tratar como muerto a un daemon que seguia arrancando | High | Investigado |
| 2 | `mcp-proxy-watchdog-double-spawn.md` | El watchdog podia spawnear una segunda instancia del proxy | Critical | Investigado |
| 3 | `mcp-restart-reconnect.md` | Problemas de reconexion tras restart del MCP server | High | Investigado |
| 4 | `mcp-worker-periodic-exit-after-ready.md` | El worker procesal hace exit periodico despues de ready | High | Investigado |
| 5 | `mcp-wsl-route-dedup-transport-closed.md` | Colision de route identity y sesion en launcher WSL | High | Investigado |
| 6 | `vscode-codex-wsl-startup-freeze.md` | Codex de VS Code queda congelado al arrancar por WSL aunque Windows MCP siga sano | High | Investigado localmente |

## Contexto

Estos bugs fueron detectados durante el desarrollo activo de OmnySys.
Cada archivo intenta separar una frontera distinta:

- daemon y proxy ownership
- bridge, reconnect y session handshake
- launcher identity entre Windows y WSL
- superficie de arranque de Codex dentro de VS Code

La leccion repetida es que `Transport closed`, spinner infinito o `healthy` en `/health`
no describen un solo bug. Son sintomas que pueden nacer en capas distintas.

## Evidencia Reciente

### 2026-04-10: el handshake MCP y la superficie de launcher siguen siendo la frontera real

- Un cliente MCP real sobre Windows, usando `StreamableHTTPClientTransport`, conecto al daemon en `http://127.0.0.1:9999/mcp`, listo `45` tools y obtuvo un `sessionId` valido.
- El recurso `omnysys://sessions` mostro `runtimeSessions: 1` y `persistedActiveSessions: 1` solo despues del `initialize` completo.
- `GET /health` puede verse `healthy` con `sessions: 0` hasta que un cliente MCP termine el handshake y sea adoptado por el session manager.
- Una `POST /mcp` cruda sin el handshake completo respondio `400 Bad Request: invalid or missing MCP session`.
- En paralelo, Codex dentro de VS Code podia quedar congelado cuando estaba configurado para arrancar via WSL, aun cuando el daemon Windows y el bridge Windows seguian funcionando.

Esta evidencia se usa como referencia para:

- reconexion tras restart
- colision de route identity en WSL
- session adoption y re-adoption
- diferencia entre daemon sano y cliente realmente conectado
- diferencia entre un launcher Windows sano y un launcher WSL congelado

---

*Ultima actualizacion: 2026-04-10*
