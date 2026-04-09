# Evidencia de Sesión: Codex + WSL + MCP + OmnySys

**Fecha:** 2026-04-09  
**Proyecto:** OmnySys  
**Contexto:** Diagnóstico de pérdida aparente de MCP al activar WSL en Codex y discusión sobre reconnect, ownership del daemon, y diferencias entre configuración Windows vs WSL.

---

## Propósito

Este documento deja evidencia explícita de:

- lo que el usuario afirmó durante la sesión
- lo que el asistente negó, minimizó o interpretó de forma incorrecta
- lo que luego quedó confirmado por evidencia del sistema
- qué patrón de error conversacional debe corregirse a futuro

El objetivo no es “ganar” una discusión sino mejorar el comportamiento operativo del asistente cuando el usuario aporta contexto empírico sobre OmnySys, Codex, WSL, reconnect y sesiones MCP.

---

## Hechos Relevantes Aportados por el Usuario

El usuario sostuvo, antes de que la evidencia terminara de confirmarlo, que:

1. OmnySys no necesariamente estaba “perdido”; muchos problemas anteriores atribuidos a pérdida de conexión eran en realidad problemas de `restart`, `reconnect`, `bridge`, o sesiones stale.
2. Activar WSL podía hacer que Codex cambiara de entorno y por eso “desaparecieran” MCPs que antes estaban disponibles.
3. El daemon de OmnySys seguía teniendo sentido en Windows como owner principal porque:
   - el usuario lo usa para depurar
   - no todos los usuarios tendrán WSL
   - no convenía forzar ownership en Linux por defecto
4. El sistema de reconnect / handshake que ya se había trabajado en OmnySys debía seguir siendo tenido en cuenta antes de concluir que “se perdió el MCP”.
5. El chat / cliente podía mostrar estados engañosos y aun así el backend seguir vivo.
6. Tras el reinicio correcto del IDE/cliente, la conexión `codex` al daemon podía reaparecer.

Todas esas intuiciones fueron relevantes y varias quedaron confirmadas.

---

## Qué Negó o Interpretó Mal el Asistente

Durante la sesión, el asistente sostuvo o insinuó incorrectamente algunas de estas ideas:

1. Que la ausencia de tools MCP en el chat actual podía interpretarse como que OmnySys “no estaba” o “se había perdido”.
2. Que el problema podía resolverse principalmente desde la lógica del daemon, cuando parte importante del fallo estaba en la capa cliente/config/runtime de Codex bajo WSL.
3. Que el cambio a WSL no necesariamente afectaba el set de MCPs disponibles, cuando en la práctica Codex estaba usando una `~/.codex/config.toml` distinta en Linux.
4. Que la sesión actual simplemente “no tenía MCP”, sin distinguir con suficiente claridad entre:
   - MCP configurado en el registry de Codex
   - MCP visible en `/mcp`
   - MCP realmente montado como namespace usable en el chat
   - daemon backend sano
   - launcher inválido para el runtime actual
5. Que el daemon podía ser el principal sospechoso cuando el usuario ya había advertido que varios bugs previos documentados eran de reconnect/session recovery y no de caída real del backend.

---

## Qué Terminó Confirmado por Evidencia

La evidencia observada en esta sesión confirmó que el usuario tenía razón en puntos importantes:

### 1. El daemon no estaba “perdido”

Los logs mostraron repetidamente que:

- el proxy seguía arrancando
- el worker lograba completar `INITIALIZATION COMPLETE`
- se abrían sesiones MCP reales
- aparecía explícitamente `client: codex`

Esto confirma que el backend no estaba simplemente “desconectado para siempre”.

### 2. El problema principal se desplazó a la capa cliente / entorno

Se comprobó que:

- `codex mcp list` en WSL sí veía `omnysystem`
- también veía MCPs globales como `browsermcp` y `openaiDeveloperDocs` después del sync
- pero el chat no montaba correctamente el namespace usable

Eso confirmó que no era correcto reducir el problema a “OmnySys no está”.

### 3. WSL cambió la config global efectiva de Codex

Se verificó que:

- Windows usaba `C:\Users\mauro\.codex\config.toml`
- WSL usaba `/home/maur/.codex/config.toml`

Y que la config de WSL inicialmente no tenía los mismos MCPs globales que Windows.

Esto confirma directamente la teoría del usuario: al pasar a WSL, Codex cambió de entorno y por eso se perdieron MCPs globales de Windows.

### 4. La reconexión de `codex` reapareció

Los logs del daemon mostraron:

- `MCP HTTP session initialized ... (client: codex)`

Esto confirma que la conexión del cliente sí reapareció tras el reinicio adecuado.

### 5. El siguiente bug real ya no era “sin MCP”, sino launcher incompatible

Cuando se intentó usar `omnysystem` desde el lado WSL del chat, apareció:

- `MCP startup failed: No such file or directory (os error 2)`
- `resources/list failed: failed to get client: MCP startup failed: No such file or directory (os error 2)`
- `resources/templates/list failed: failed to get client: MCP startup failed: No such file or directory (os error 2)`

Y se detectó que el server `omnysystem` seguía configurado con:

- `command = C:/Program Files/nodejs/node.exe`
- `args = c:/Dev/OmnySystem/src/layer-c-memory/mcp-stdio-bridge.js`

Esto significa que:

- el registry MCP ya existía
- el reconnect/sync de configuración estaba mejor
- pero el launcher seguía siendo Windows-only para un runtime Linux/WSL

El usuario también tuvo razón en que el problema iba mutando de capa y había que dejar de llamarlo siempre “pérdida”.

---

## Fallo Conversacional a Corregir

El patrón que debe corregirse es este:

1. El usuario aporta contexto operativo concreto basado en experiencia previa.
2. El asistente responde con exceso de cautela o con un modelo demasiado literal del estado del chat.
3. El asistente concluye demasiado rápido que “no está”, “se perdió”, o “esta sesión no lo tiene”.
4. Más tarde la evidencia confirma que el usuario describía correctamente una capa distinta del problema.

Eso genera fricción innecesaria, retrabajo y desgaste.

### Nueva regla explícita

Cuando el usuario afirme que un problema de OmnySys/Codex/WSL/MCP ya ocurrió antes y suele deberse a restart, reconnect, bridge o sesión stale:

- no concluir “se perdió” como hipótesis principal
- separar explícitamente:
  - daemon backend
  - registry MCP del cliente
  - sesión/chat actual
  - bridge/reconnect
  - launcher/config del entorno
- tratar primero de falsar la hipótesis del usuario con evidencia antes de descartarla

---

## Resultado de Ingeniería Derivado de Esta Sesión

Como consecuencia de esta investigación se implementó además:

- sincronización automática y conservadora de MCPs globales de Codex desde Windows hacia WSL
- modo `missing-only` para evitar acoplamiento excesivo si Codex resuelve esto nativamente en el futuro
- detección del bug concreto donde el MCP existe en el registry pero el launcher sigue siendo Windows-only dentro de WSL

---

## Conclusión

El usuario tenía razón en lo central:

- no era correcto diagnosticar el problema como simple “pérdida del MCP”
- WSL sí estaba afectando la visibilidad/disponibilidad de MCPs globales
- el reconnect y las sesiones seguían importando
- el daemon Windows seguía siendo el owner más razonable
- el problema real fue cambiando de capa y había que diagnosticarlo mejor

Este documento deja constancia para no repetir el mismo patrón.

---

**Firmado:** Codex / GPT-5  
**Sesión de trabajo:** OmnySys + WSL + MCP diagnostics, 2026-04-09
