# VS Code Codex WSL Startup Freeze

## Date

2026-04-10

## Summary

Codex dentro de VS Code podia quedar congelado al iniciar cuando la extension
`openai.chatgpt` estaba configurada con:

- `chatgpt.runCodexInWindowsSubsystemForLinux = true`

El panel de Codex aparecia, pero no terminaba de abrir una sesion usable.
Al mismo tiempo:

- el daemon HTTP de OmnySys seguia sano
- el bridge Windows seguia usable
- una sesion Codex fuera de VS Code podia seguir usando tools normalmente

El workaround estable fue desactivar temporalmente ese modo WSL en VS Code para
que Codex vuelva a arrancar por la superficie Windows.

## User-Visible Symptom

- Sidebar de Codex visible pero quieto
- Spinner o pantalla inicial sin terminar de cargar
- OmnySys parecia "sano" desde Windows
- Confusion porque MCP si funcionaba desde otra superficie

## Why This Was Confusing

En paralelo habia muchos cambios locales intentando corregir bugs reales de:

- restart y reconnect
- proxy watchdog double-spawn
- route dedup en WSL
- estandarizacion de configs MCP para clientes mixtos Windows y WSL

Eso hacia facil culpar al daemon, pero la evidencia local no apunto ahi.

## Local Evidence

### 1. La superficie Windows de Codex seguia sana

- `C:\Users\mauro\.vscode\extensions\openai.chatgpt-26.406.31014-win32-x64\bin\windows-x86_64\codex.exe --version`
  devolvio `codex-cli 0.119.0-alpha.11`.
- El daemon de OmnySys estaba inicializado y aceptando tools desde la sesion actual.

### 2. La extension de VS Code si estaba en modo WSL

En `C:\Users\mauro\AppData\Roaming\Code\User\settings.json` estaba activo:

- `chatgpt.runCodexInWindowsSubsystemForLinux = true`

Eso significa que el problema visible en VS Code no estaba obligado a reproducirse
en una sesion Codex externa a VS Code.

### 3. La config WSL de Codex existia

Se encontro `~/.codex/config.toml` dentro de WSL con OmnySys configurado asi:

- `command = "bash"`
- `args = ["/mnt/c/Dev/OmnySystem/scripts/mcp/omnysystem-wsl-bridge.sh"]`
- `OMNYSYS_CLIENT_ROUTE_BASE = "codex-wsl"`
- `OMNYSYS_AUTO_START = "0"`

O sea: no era simplemente "falta la config WSL".

### 4. El wrapper WSL no parecia ser el bloqueo principal

El script `scripts/mcp/omnysystem-wsl-bridge.sh` es corto y hace solo esto:

1. resuelve el project root
2. resuelve el `node.exe` de Windows
3. fija `OMNYSYS_CLIENT_ROUTE_ID` si falta
4. hace `exec` de `node.exe` con `mcp-stdio-bridge.js`

No hace auto-start del daemon y no contiene loops propios.

### 5. La ruta WSL de Codex quedo sospechosa por si misma

Al probar el binario Linux de Codex que trae la extension desde WSL, incluso
operaciones simples como:

- `codex --version`
- `codex --help`

no devolvieron respuesta dentro del timeout local.

Eso no prueba todavia la causa final, pero si marca una frontera importante:

- Windows Codex arrancaba
- Codex por WSL no respondia de forma equivalente

## Related Local Changes Reviewed

Los cambios `untracked` y modificados alrededor de este bug estaban intentando
resolver problemas reales, pero no todos apuntaban al freeze observado.

### A. Estandarizacion target-aware de configs MCP

Archivos principales:

- `src/cli/utils/mcp-standardizer/clients-helpers.js`
- `src/cli/utils/mcp-standardizer/clients.js`
- `src/cli/utils/mcp-standardizer/node-command.js`
- `src/cli/utils/mcp-standardizer/utils.js`
- `src/cli/utils/mcp-standardizer/workspace.js`

Objetivo:

- serializar paths y `node.exe` correctos segun el consumidor sea Windows o Unix/WSL
- evitar escribir configs Windows rotas cuando el instalador corre desde WSL
- mantener `C:/...` para consumidores Windows y `/mnt/c/...` para consumidores WSL

### B. Sync de Codex Windows -> WSL

Archivos principales:

- `src/cli/utils/mcp-standardizer/wsl-codex-sync.js`
- `src/cli/utils/mcp-standardizer/wsl-codex-sync-helpers.js`
- `tests/unit/cli/utils/mcp-standardizer/wsl-codex-sync.test.js`

Objetivo:

- copiar tablas MCP faltantes desde el `config.toml` de Codex en Windows al de WSL
- adaptar OmnySys a un wrapper WSL
- agregar `OMNYSYS_CLIENT_ROUTE_BASE = "codex-wsl"`
- refrescar configs viejas basadas en `node` o `node.exe`

### C. Bridge y recovery mas tolerantes

Archivos principales:

- `src/layer-c-memory/mcp-stdio-bridge.js`
- `src/layer-c-memory/mcp/stdio-bridge-health.js`
- `src/layer-c-memory/mcp/stdio-bridge-lifecycle.js`
- `src/layer-c-memory/mcp/stdio-bridge-recovery.js`
- `src/layer-c-memory/mcp/stdio-bridge-startup.js`
- `src/layer-c-memory/mcp/stdio-bridge-telemetry.js`

Objetivo:

- distinguir daemon `responsive` vs `healthy`
- reconectar antes cuando el daemon ya responde pero sigue inicializando
- separar telemetry por namespace bridge para no mezclar Windows y WSL
- endurecer la reutilizacion de sesiones

### D. Inicializacion con progreso explicito

Archivos principales:

- `src/layer-c-memory/mcp-http-server.js`
- `src/layer-c-memory/mcp/http-session-routing-handlers.impl.js`
- `src/layer-c-memory/mcp/core/initialization/progress-state.js`

Objetivo:

- exponer progreso de inicializacion en `/health`
- devolver respuestas estructuradas de "startup pending" para tool calls tempranos

## Current Local Conclusion

La evidencia local apunta a esto:

1. el daemon Windows de OmnySys no era el bloqueo principal en este caso
2. el bridge Windows no era el bloqueo principal en este caso
3. el freeze visible de VS Code estaba ligado a la superficie WSL de Codex
4. los cambios de WSL y MCP revisados parecen razonables y utiles, pero no bastan por si solos para garantizar que la extension de VS Code arranque bien en WSL

En otras palabras:

- "OmnySys MCP sano" no implica "Codex WSL de VS Code sano"
- "WSL config existente" no implica "Codex WSL arranca bien"

## Workaround Applied

Se desactivo temporalmente en VS Code:

- `chatgpt.runCodexInWindowsSubsystemForLinux = false`

Resultado:

- Codex en VS Code volvio a abrir correctamente usando la superficie Windows

## Safe Reactivation Plan

Para reactivar WSL sin romper VS Code otra vez, tratarlo como un experimento
aislado y reversible:

1. mantener `chatgpt.runCodexInWindowsSubsystemForLinux = false` hasta tener una reproduccion limpia
2. probar el binario Linux de Codex dentro de WSL fuera de VS Code y confirmar que `--version` y `--help` responden
3. si falla, clasificar si el problema esta en:
   - el binario Linux de la extension
   - la forma en que VS Code lo invoca en WSL
   - la integracion con `/mnt/c/...`
4. solo cuando ese paso sea estable, volver a activar la flag WSL en VS Code
5. despues validar OmnySys en este orden:
   - arranque de Codex
   - `mcp_omnysystem_list_tools`
   - `mcp_omnysystem_get_health_panel`
   - reconexion tras restart

## Notes

- Esta nota no invalida los fixes previos de daemon, proxy o reconnect.
- Esta nota documenta una frontera distinta: la superficie de launcher WSL de Codex dentro de VS Code.
- Si el problema reaparece incluso con WSL desactivado, entonces hay que volver a mirar la ruta Windows y el extension host.
