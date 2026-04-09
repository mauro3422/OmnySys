# TODO Pendientes

## MCP / Runtime

- Evaluar soporte híbrido Windows + WSL como caso borde explícito.
  Contexto: algunos usuarios desarrollarán en Windows puro, otros en WSL, y otros alternarán ambos según el cliente/IDE.
  Objetivo: evitar que la configuración del workspace cambie la ownership del daemon por accidente o genere instancias duplicadas cuando un cliente en WSL intente auto-start mientras el daemon principal vive en Windows.
  Follow-up sugerido:
  - definir estrategia oficial de ownership del daemon (`windows-owner`, `wsl-owner`, `attach-only`)
  - documentar cuándo el bridge debe usar `OMNYSYS_AUTO_START=0`
  - separar mejor config de workspace por entorno para no pisar Windows cuando se trabaja desde WSL
  - verificar alcance real de `localhost:9999` entre Windows y WSL2 en los clientes soportados
