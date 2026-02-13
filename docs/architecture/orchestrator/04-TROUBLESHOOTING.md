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

**Volver al [README](./README.md)**
