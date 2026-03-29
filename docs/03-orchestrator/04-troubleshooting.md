# Troubleshooting - Problemas Comunes

**Documento**: 04-TROUBLESHOOTING.md  
**Versión**: v0.7.1  
**Descripción**: Problemas comunes y sus soluciones

---

## 🚨 Problema 1: Cambios No Visibles (Cache Desync)

### Síntomas
- Editas un archivo
- Guardas
- Las tools MCP siguen mostrando datos viejos

### Diagnóstico

```bash
# Verificar si el cache está desincronizado
# En los logs deberías ver:

# ❌ MAL (cache NO se invalida):
[Worker] ✅ Analysis complete for helpers.js
[Tool]   get_molecule_summary("helpers.js")  
# ↑ Retorna datos viejos

# ✅ BIEN (fix aplicado):
[Worker] ✅ Analysis complete for helpers.js
[Worker] 🗑️  Cache invalidated for: helpers.js
[Tool]   get_molecule_summary("helpers.js")
# ↑ Retorna datos nuevos
```

### Causa
El Worker guardaba en disco pero NO invalidaba el cache.

### Solución
✅ **Ya arreglado en commit `f21f3ee`**

Si persists:
```bash
# Forzar re-análisis completo
rm -rf .omnysysdata/
npm run analyze
```

---

## 🚨 Problema 2: Procesos Zombie (Orchestrator no muere)

### Síntomas
- Cierras el MCP
- Reinicias
- Varios procesos `node` corriendo
- Logs duplicados

### Diagnóstico

```bash
# Windows (PowerShell)
Get-Process node | Select-Object Id, ProcessName

# Debería haber 1 proceso
# Si hay 2-3 → Hay zombies
```

### Causa
El `shutdown()` no llamaba `orchestrator.stop()`.

### Solución
✅ **Ya arreglado en commit `f21f3ee`**

Si persists (procesos viejos):
```bash
# Matar todos los procesos node
Get-Process node | Stop-Process -Force

# O más selectivo:
Get-Process | Where-Object {$_.ProcessName -like "*node*" -and $_.Parent.Id -eq (Get-Process -Id $PID).Parent.Id} | Stop-Process
```

---

## 🚨 Problema 3: Hot-Reload No Funciona

### Síntomas
- Cambias código del MCP
- No se recarga
- O se recarga pero queda en estado inconsistente

### Causa
Timeouts pendientes en hot-reload manager.

### Solución
✅ **Ya arreglado en commit `f21f3ee`**

---

## 🚨 Problema 4: LLM No Inicia

### Síntomas
```
[LLM Setup] ⚠️  LLM server not available: Connection refused
```

### Diagnóstico

```bash
# Verificar si llama-server está corriendo
curl http://localhost:8000/health

# Debería retornar:
# { "status": "ok", "model": "..." }
```

### Soluciones

**Opción 1**: Iniciar manualmente
```bash
# GPU
src/ai/scripts/brain_gpu.bat

# CPU
src/ai/scripts/brain_cpu.bat
```

**Opción 2**: Sistema funciona sin LLM
- Layer A sigue funcionando
- Solo se pierden insights semánticos

---

## 🚨 Problema 5: Análisis Lento

### Síntomas
- Análisis tarda minutos
- Cola crece sin procesarse

### Diagnóstico

```javascript
// Verificar en logs:
[Orchestrator] Queue: 50 files pending
[Orchestrator] Active: 0/4

# Si Active = 0 y Queue > 0 → Workers no iniciaron
```

### Solución

```javascript
// En orchestrator/lifecycle.js
// Verificar que se llama _processNext()

// Si no, iniciar manualmente:
orchestrator._processNext();
```

---

## 🚨 Problema 6: File Watcher No Detecta Cambios

### Síntomas
- Editas archivo
- No pasa nada
- No hay logs

### Diagnóstico

```bash
# Verificar que file watcher está activo
[Orchestrator] ✅ File Watcher ready

# Si no aparece → No se inicializó
```

### Solución

```javascript
// Verificar opciones del orchestrator
new Orchestrator(projectPath, {
  enableFileWatcher: true  // ← Debe ser true
});
```

---

## 🚨 Problema 7: Codex se queda en `Reconnecting...` aunque el daemon responde

### Síntomas
- La GUI o el chat del cliente muestra `Reconnecting...`
- `get_server_status()` no llega a ejecutarse desde la surface MCP del chat
- El daemon local sigue respondiendo por `/health`
- Un `initialize` directo al MCP HTTP devuelve `200 OK`
- `tools/list` directo devuelve el catálogo completo

### Diagnóstico

```bash
# 1) Verificar salud del daemon
curl http://127.0.0.1:9999/health

# 2) Verificar handshake directo MCP HTTP
# initialize -> tools/list deben responder sin error

# 3) Verificar el bridge stdio
# El bridge debe responder initialize y tools/list sin reusar una session vieja
```

### Interpretación
- Si `health` y `initialize/tools/list` directos funcionan, el problema no está en OmnySys.
- Si la surface MCP del chat sigue reintentando, la causa probable está en la capa de cliente/app-server de Codex o en el puente stdio, no en el daemon HTTP.
- Si el daemon loguea `MCP JSON PARSE`, revisar el body bruto y los headers antes de concluir que el backend está caído.

### Causas comunes
- Session expired reusada demasiado pronto
- `notifications/initialized` reenviado antes de que la session quede establecida
- Payload JSON truncado o mal formado en el cliente
- Client discovery que se reinicia mientras el bridge sigue vivo
- Crash de hot-reload por `emit` no protegido en `restart-coordinator.js` o
  `reload-handler.js` después de separar el flujo de recuperación

### Solucion

1. Confirmar primero `GET /health`.
2. Confirmar `initialize` y `tools/list` directos.
3. Si esos dos pasos funcionan, tratar el bug como cliente/bridge, no como caída del daemon.
4. Revisar `MCP JSON PARSE` con body y headers completos antes de tocar el runtime.
5. Si el bridge stdio entra en loop, revisar primero el hot-reload manager y los
   guards de `emit` antes de reiniciar el cliente que lo consume.
6. Solo si `health` y MCP HTTP siguen sanos después de eso, reiniciar el
   cliente/bridge y volver a probar una sola tool.

### Nota operativa
- No usar reinicios completos como diagnostico por defecto.
- Si el runtime esta sano y el MCP HTTP responde, el siguiente punto a revisar es la entrega de tools del cliente, no la base de OmnySys.
- Si el log muestra `Cannot read properties of undefined (reading 'emit')`,
  el incidente suele estar en la capa de hot-reload, no en la session manager.

### Fix recordado

El incidente de 2026-03-29 quedó corregido con guards defensivos en:

- `src/layer-c-memory/mcp/core/hot-reload-manager/restart-coordinator.js`
- `src/layer-c-memory/mcp/core/hot-reload-manager/handlers/reload-handler.js`

Y con regresión cubierta en:

- `tests/unit/layer-c-memory/mcp/restart-coordinator.test.js`
- `tests/unit/layer-c-memory/mcp/reload-handler.test.js`

---

## 🛠️ Comandos Útiles de Debug

### Ver Estado Completo

```javascript
// MCP Tool: get_server_status
{
  "initialized": true,
  "orchestrator": {
    "isRunning": true,
    "queue": {
      "size": 5,
      "active": 2
    }
  },
  "cache": {
    "totalFiles": 618
  }
}
```

### Forzar Re-análisis

```bash
# Borrar cache y re-analizar todo
rm -rf .omnysysdata/
npm run analyze
```

### Ver Logs en Tiempo Real

```bash
# Windows
type logs\mcp-server.log -Wait

# o
tail -f logs/mcp-server.log
```

### Verificar Conexiones

```javascript
// MCP Tool: explain_connection
// Args: { "fileA": "src/api.js", "fileB": "src/db.js" }
```

---

## 📋 Checklist de Diagnóstico

```
□ ¿El MCP server inició? (logs: "MCP Server connected")
□ ¿Orchestrator está running? (get_server_status)
□ ¿File watcher está activo? (logs: "File Watcher ready")
□ ¿Hay jobs en cola? (queue.size)
□ ¿Se están procesando jobs? (active > 0)
□ ¿Cache se invalida después de guardar? (logs: "Cache invalidated")
□ ¿No hay procesos zombie? (Get-Process node)
□ ¿LLM está disponible? (curl localhost:8000/health)
```

---

## 🆘 Si Nada Funciona

1. **Matá todo**:
   ```bash
   Get-Process node | Stop-Process -Force
   ```

2. **Borrá datos**:
   ```bash
   rm -rf .omnysysdata/
   ```

3. **Reiniciá**:
   ```bash
   npm start
   ```

4. **Re-analizá**:
   ```bash
   npm run analyze
   ```

---

## 📚 Referencias y Recursos

### Documentación Relacionada
| Documento | Para qué sirve |
|-----------|----------------|
| [05-CAMBIOS-RECIENTES.md](./05-CAMBIOS-RECIENTES.md) | Historial completo de fixes aplicados |
| [MCP_PROBLEMS_ANALYSIS.md](../../MCP_PROBLEMS_ANALYSIS.md) | Análisis histórico detallado de problemas (540 líneas) |
| [02-SISTEMA-CACHE.md](./02-SISTEMA-CACHE.md) | Problemas específicos de los 4 cachés |
| [HOT_RELOAD_USAGE.md](../../HOT_RELOAD_USAGE.md) | Guía completa de hot-reload |

### Documentos Externos Útiles
- [CHANGELOG.md](../../../CHANGELOG.md) - Todos los cambios del proyecto
- [docs/INDEX.md](../../INDEX.md) - Índice general de documentación

---

**Volver al [README](./README.md)**
