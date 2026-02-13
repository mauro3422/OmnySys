# Cambios Recientes

**Documento**: 05-CAMBIOS-RECIENTES.md  
**Versión**: v0.7.1  
**Fecha**: 2026-02-12  

---

## 📅 Timeline de Fixes

### 2026-02-11 - Problemas de Inicialización Resueltos

#### 1. **Timestamps en Logs**
**Problema**: Todos los logs tenían timestamps ISO muy largos (`2026-02-11T13:35:18.542Z ERROR...`)

**Archivo**: `src/utils/logger.js`

**Cambio**:
```javascript
// ANTES:
_format(message, level) {
  const timestamp = new Date().toISOString();
  return `${timestamp} ${level.toUpperCase()} ${this.prefix} ${message}`;
}

// DESPUÉS:
_format(message, level) {
  return `${level.toUpperCase()} ${this.prefix} ${message}`;
}
```

---

#### 2. **Terminales Minimizadas**
**Problema**: Las 3 terminales (MCP Logs, LLM GPU, LLM CPU) se abrían minimizadas (invisibles)

**Causa**: Flag `/min` en comandos `spawn('cmd.exe', ['/c', 'start', '/min', ...])`

**Archivos**:
- `src/layer-c-memory/mcp-server.js:55`
- `src/layer-c-memory/mcp/core/llm-starter.js:85` (GPU)
- `src/layer-c-memory/mcp/core/llm-starter.js:105` (CPU)

**Solución**: Quitado `/min` de los 3 archivos

---

#### 3. **Import Path Incorrecto en ready-step.js**
**Problema**: `Cannot find module '.../mcp/core/tools/index.js'`

**Archivo**: `src/layer-c-memory/mcp/core/initialization/steps/ready-step.js:44`

**Cambio**:
```javascript
// ANTES (INCORRECTO):
import('../../tools/index.js')  // Resolvía a /core/initialization/tools/

// DESPUÉS (CORRECTO):
import('../../../tools/index.js')  // Resuelve a /mcp/tools/
```

---

#### 4. **Import Path Incorrecto en llm-setup-step.js**
**Problema**: `Cannot find module '.../mcp/core/initialization/llm-starter.js'`

**Archivo**: `src/layer-c-memory/mcp/core/initialization/steps/llm-setup-step.js:30`

**Cambio**:
```javascript
// ANTES (INCORRECTO):
await import('../llm-starter.js')  // Buscaba en /initialization/

// DESPUÉS (CORRECTO):
await import('../../llm-starter.js')  // Sube 2 niveles a /core/
```

---

#### 5. **Try-Catch Silenciaba Errores de LLM**
**Problema**: LLM fallaba pero solo mostraba "⚠️ LLM server not available" sin detalles

**Cambio**:
```javascript
// DESPUÉS:
catch (error) {
  logger.error(`  ⚠️  LLM server not available: ${error.message}`);
  if (process.env.DEBUG) {
    logger.error(`  🐛 Error stack: ${error.stack}`);
  }
  return true;
}
```

---

#### 6. **Configs MCP No Existían**
**Problema**: Claude Code y OpenCode no tenían configs globales para MCP

**Solución**: Creado `setup-mcp-configs.js` que auto-detecta y configura:
- `~/.config/claude/mcp_settings.json` (Claude Code CLI)
- `~/.config/opencode/opencode.json` (OpenCode)
- Archivos locales del proyecto actualizados

---

#### 7. **Loop Infinito de EPIPE**
**Problema**: Servidor entraba en loop de reiniciar → crash → reiniciar

**Error**: `EPIPE: broken pipe, write`

**Causa**: `logger.error()` escribía a stderr durante el handshake MCP (que espera JSON puro)

**Solución**: Redirigir stderr a archivo ANTES de cualquier import:

```javascript
// ⚡ STEP 1: Redirect stderr to file BEFORE ANY OTHER CODE
const logFile = path.join(projectRoot, 'logs', 'mcp-server.log');

const originalStderrWrite = process.stderr.write.bind(process.stderr);
process.stderr.write = function(chunk, encoding, callback) {
  fs.appendFileSync(logFile, chunk);
  // ... callback handling
  return true;
};

// ⚡ STEP 2: NOW import modules (logging is now safe)
import { OmnySysMCPServer } from './mcp/core/server-class.js';
```

---

### 2026-02-12 - Fixes Críticos (Commit: `f21f3ee`)

#### 1. Cache Invalidation en Analysis Worker

**Problema**: Worker guardaba en disco pero NO invalidaba cache. Resultado: datos viejos.

**Archivo**: `src/core/analysis-worker.js`

**Cambio**:
```javascript
// DESPUÉS de saveFileAnalysis(), AGREGAR:

// FIX: Invalidar cache para forzar re-carga
const { getCacheInvalidator } = await import('../cache-invalidator/index.js');
const invalidator = getCacheInvalidator({ projectPath: this.rootPath });
await invalidator.invalidateSync(job.filePath);
```

**Impacto**: ✅ Cambios ahora visibles inmediatamente

---

#### 2. Orchestrator Stop en Shutdown

**Problema**: `shutdown()` no llamaba `orchestrator.stop()`. Resultado: procesos zombie.

**Archivo**: `src/layer-c-memory/mcp/core/server-class.js`

**Cambio**:
```javascript
// ANTES:
if (this.orchestrator) {
  // Orchestrator cleanup if needed  // ← SOLO COMENTARIO
  logger.info('  ✅ Orchestrator cleaned up');
}

// DESPUÉS:
if (this.orchestrator) {
  await this.orchestrator.stop();    // ← AHORA SÍ LLAMA
  logger.info('  ✅ Orchestrator stopped');
}
```

**Impacto**: ✅ No más procesos zombie al reiniciar

---

#### 3. Hot-Reload Timeout Cleanup

**Problema**: `stop()` no limpiaba `_reloadTimeout`. Resultado: procesos no morían.

**Archivo**: `src/layer-c-memory/mcp/core/hot-reload-manager.js`

**Cambios**:
1. En `stop()`: Agregar limpieza de timeout
2. En `_onFileChange()`: Agregar `unref()` al timeout

**Impacto**: ✅ Limpieza completa de recursos

---

## 📊 Estadísticas del Commit

```
4 files changed, 607 insertions(+), 2 deletions(-)

src/core/analysis-worker.js                       | 23 +++++++++++++++++
src/layer-c-memory/mcp/core/hot-reload-manager.js | 11 +++++++++
src/layer-c-memory/mcp/core/server-class.js       |  4 ++--
FLUJO_DATOS_OMNYSYS_MAESTRO.md                     | 569 ++++++++++++++++++
```

---

## 🎯 Pendientes (Para Próximos Commits)

### P0 - Crítico
- [ ] **Mover LLM al final del pipeline**
  - Archivo: `server-class.js` (cambiar orden de steps)
  - Impacto: Reduce tiempo de inicio
  
- [ ] **Remover autoStartLLM del Orchestrator**
  - Archivo: `src/core/orchestrator/index.js:22`
  - Cambio: `autoStartLLM: true` → `false`
  - Impacto: LLM solo cuando se necesita

### P1 - Alto
- [ ] **Consolidar 4 cachés**
  - Unificar en un solo CacheManager con estrategias
  - Ver: `02-SISTEMA-CACHE.md`
  
- [ ] **Remover LLM de InstanceDetectionStep**
  - Archivo: `instance-detection-step.js:186-188`
  - Evita duplicación de inicialización

### P2 - Medio
- [ ] **Implementar confidence-based LLM trigger**
  - Archivo: `orchestrator/lifecycle.js`
  - Solo iniciar LLM si hay archivos con `confidence < 0.8`

---

## 📝 Notas para Mantenedores

### Antes de Hacer Cambios
1. Leer documentación en `docs/architecture/orchestrator/`
2. Verificar que el cambio no rompe flujo en `01-FLUSO-VIDA-ARCHIVO.md`
3. Actualizar este documento si es un fix importante

### Después de Hacer Cambios
1. Agregar entrada a este documento
2. Actualizar CHANGELOG.md
3. Hacer commit con mensaje descriptivo

---

## 🔗 Referencias

- [Flujo de Vida de un Archivo](./01-FLUSO-VIDA-ARCHIVO.md)
- [Sistema de Caché](./02-SISTEMA-CACHE.md)
- [Troubleshooting](./04-TROUBLESHOOTING.md)
- [CHANGELOG.md](../../../CHANGELOG.md)

---

**Volver al [README](./README.md)**
