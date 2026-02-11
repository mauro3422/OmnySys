# 🔍 ANÁLISIS COMPLETO DE PROBLEMAS MCP - OmnySys v0.7.1

**Fecha**: 2026-02-11
**Estado**: PARCIALMENTE FUNCIONAL con bugs críticos
**Commit**: 96b5e31

---

## ✅ PROBLEMAS RESUELTOS

### 1. **Timestamps en Logs** ✅ RESUELTO
**Problema**: Todos los logs tenían timestamps ISO (`2026-02-11T13:35:18.542Z ERROR...`)
**Causa**: `src/utils/logger.js` línea 23 agregaba timestamp automáticamente
**Solución**: Eliminado timestamp del método `_format()`
**Archivo**: `src/utils/logger.js`

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

### 2. **Terminales Minimizadas** ✅ RESUELTO
**Problema**: Las 3 terminales (MCP Logs, LLM GPU, LLM CPU) se abrían minimizadas (invisibles)
**Causa**: Flag `/min` en comandos `spawn('cmd.exe', ['/c', 'start', '/min', ...])`
**Solución**: Quitado `/min` de 3 archivos:
- `src/layer-c-memory/mcp-server.js:55`
- `src/layer-c-memory/mcp/core/llm-starter.js:85` (GPU)
- `src/layer-c-memory/mcp/core/llm-starter.js:105` (CPU)

**Resultado**: Terminales ahora visibles al iniciar

---

### 3. **Import Path Incorrecto en ready-step.js** ✅ RESUELTO - CRÍTICO
**Problema**: `Cannot find module '.../mcp/core/tools/index.js'`
**Causa**: Path relativo incorrecto en `ready-step.js:44`

```javascript
// ANTES (INCORRECTO):
import('../../tools/index.js')  // Resolvía a /core/initialization/tools/

// DESPUÉS (CORRECTO):
import('../../../tools/index.js')  // Resuelve a /core/../tools/ = /mcp/tools/
```

**Ubicación**: `src/layer-c-memory/mcp/core/initialization/steps/ready-step.js`
**Impacto**: Servidor NO iniciaba sin este fix

---

### 4. **Import Path Incorrecto en llm-setup-step.js** ✅ RESUELTO - CRÍTICO
**Problema**: `Cannot find module '.../mcp/core/initialization/llm-starter.js'`
**Causa**: Path relativo incorrecto en `llm-setup-step.js:30`

```javascript
// ANTES (INCORRECTO):
await import('../llm-starter.js')  // Buscaba en /initialization/

// DESPUÉS (CORRECTO):
await import('../../llm-starter.js')  // Sube 2 niveles a /core/
```

**Ubicación**: `src/layer-c-memory/mcp/core/initialization/steps/llm-setup-step.js`
**Impacto**: LLM Server NO se abría sin este fix

---

### 5. **Try-Catch Silenciaba Errores de LLM** ✅ RESUELTO
**Problema**: LLM fallaba pero solo mostraba "⚠️ LLM server not available" sin detalles
**Causa**: `catch (error)` sin logging del error
**Solución**: Agregado `logger.error()` con mensaje del error

```javascript
catch (error) {
  logger.error(`  ⚠️  LLM server not available: ${error.message}`);
  if (process.env.DEBUG) {
    logger.error(`  🐛 Error stack: ${error.stack}`);
  }
  return true;
}
```

---

### 6. **Configs MCP No Existían** ✅ RESUELTO
**Problema**: Claude Code y OpenCode no tenían configs globales para MCP
**Solución**: Creado `setup-mcp-configs.js` que auto-detecta y configura:
- `~/.config/claude/mcp_settings.json` (Claude Code CLI)
- `~/.config/opencode/opencode.json` (OpenCode)
- Archivos locales del proyecto actualizados

**Resultado**:
```
✅ Claude Code: Configurado
✅ OpenCode: Configurado
✅ Archivos locales: Actualizados
```

---

## ❌ PROBLEMAS PENDIENTES (CRÍTICOS)

### 1. **Loop Infinito de EPIPE** ❌ NO RESUELTO - MUY CRÍTICO

**Síntoma**: Servidor entra en loop de reiniciar → crash → reiniciar

```
ERROR [OmnySys:mcp:server]
❌ Uncaught exception: EPIPE: broken pipe, write
ERROR [OmnySys:server:class]
🛑 Shutting down server...
ERROR [OmnySys:server:class]   ✅ Orchestrator cleaned up
ERROR [OmnySys:server:class]   ✅ Cache cleaned up
ERROR [OmnySys:server:class]
👋 Server shutdown complete

[REINICIA AUTOMÁTICAMENTE]
[REPITE EL CICLO 3-5 VECES]
```

**Causa Root**:
El error "EPIPE: broken pipe, write" ocurre cuando el servidor MCP intenta escribir a stdio PERO el pipe ya está cerrado.

**Análisis Técnico**:

1. **Flujo de Inicialización**:
```javascript
async run() {
  await this.initialize();  // ← Escribe logs vía logger.error() a stderr

  const transport = new StdioServerTransport();  // ← Crea transporte MCP
  await this.server.connect(transport);  // ← Conecta stdio para comunicación JSON

  logger.error('🔌 MCP Server connected via stdio\n');  // ← Más escritura
}
```

2. **Problema**:
- MCP Protocol via stdio espera comunicación **JSON pura** por stdin/stdout
- `logger.error()` escribe **texto** a **stderr**
- Si stderr está redirigido a stdout O si el cliente MCP cierra el pipe durante inicialización larga (7+ segundos), ocurre EPIPE

3. **Race Condition**:
- Cliente MCP se conecta
- Servidor inicia (7+ segundos de Layer A analysis, Orchestrator init, etc.)
- Cliente timeout/desconecta
- Servidor termina init y intenta escribir → EPIPE

4. **Loop de Reinicio**:
- `uncaughtException` handler captura EPIPE
- Hace `shutdown()` y `process.exit(1)`
- **ALGO reinicia el proceso** (¿supervisor?, ¿script externo?, ¿watch mode?)
- Vuelve a intentar → mismo error

**Evidencia en Logs**:
```
Últimas 50 líneas de logs muestran 5+ ciclos de:
❌ EPIPE → 🛑 Shutdown → [silencio] → [reinicio] → ❌ EPIPE
```

**Intentos de Solución (NO funcionaron)**:

1. ✗ Suprimir `console.error` completamente:
```javascript
console.error = (...args) => {
  logStream.write(`${message}\n`);
  // NO escribir a stderr
};
```
**Resultado**: EPIPE persiste

2. ✗ Detectar modo MCP stdio:
```javascript
const isMCPStdioMode = process.stdin.isTTY === false;
if (!isMCPStdioMode) {
  originalConsoleError(...args);
}
```
**Resultado**: EPIPE persiste (detección incorrecta)

**Soluciones Propuestas (NO IMPLEMENTADAS)**:

**A) Solución Rápida** - Ignorar EPIPE:
```javascript
process.on('uncaughtException', async (error) => {
  if (error.code === 'EPIPE') {
    // Ignorar broken pipe, es esperado en ciertos casos
    logger.error('⚠️  EPIPE ignorado (cliente desconectado)');
    return;
  }
  // Resto de handling...
});
```

**B) Solución Media** - Retry con Backoff:
```javascript
let retries = 0;
const MAX_RETRIES = 3;

async function startWithRetry() {
  try {
    await server.run();
  } catch (error) {
    if (error.code === 'EPIPE' && retries < MAX_RETRIES) {
      retries++;
      const delay = Math.pow(2, retries) * 1000; // Exponential backoff
      await sleep(delay);
      return startWithRetry();
    }
    throw error;
  }
}
```

**C) Solución Robusta** - Mover Logs a Post-Handshake:
```javascript
async run() {
  // 1. Conectar transporte PRIMERO (sin logs)
  const transport = new StdioServerTransport();
  await this.server.connect(transport);

  // 2. DESPUÉS del handshake, inicializar (ya es seguro logear)
  await this.initialize();

  logger.error('✅ MCP Server ready');
}
```
**Problema**: `this.server` se crea DURANTE `initialize()`, no antes

**D) Solución Definitiva** - File Descriptor Redirect:
```javascript
// Redirigir stderr a archivo ANTES de cualquier log
const fs = require('fs');
const logFd = fs.openSync('logs/mcp-server.log', 'a');
process.stderr.write = (chunk) => fs.writeSync(logFd, chunk);
```

---

### 2. **Proceso Reinicia Automáticamente** ❌ CAUSA DESCONOCIDA

**Síntoma**: Después de `process.exit(1)`, el servidor se reinicia solo

**Posibles Causas**:
1. **Watch Mode**: ¿Algún `nodemon`, `pm2`, o similar?
2. **Supervisor Process**: ¿Hay un script que monitorea y relanza?
3. **IDE Integration**: ¿OpenCode/Claude Code relanzan automáticamente?
4. **Sistema Operativo**: ¿Windows Service Restart Policy?

**Investigación Necesaria**:
- [ ] Buscar procesos padre: `ps -ef | grep mcp-server`
- [ ] Verificar package.json scripts con `watch` o `dev`
- [ ] Revisar si hay `pm2 list` o `forever list`
- [ ] Checkear Task Scheduler de Windows

---

### 3. **Múltiples Instancias Simultáneas** ❌ NO RESUELTO

**Síntoma**: Se observan 2-3 procesos MCP corriendo al mismo tiempo

**Evidencia**:
- Logs muestran duplicación de mensajes
- Path del proyecto aparece duplicado: `C:\Dev\OmnySystem\DevOmnySystem`
- Múltiples "MCP Logs terminal spawned"

**Causa Probable**:
1. Proceso anterior NO termina antes de iniciar nuevo
2. Sin lock file para prevenir múltiples instancias
3. Sin verificación de puerto/socket en uso

**Solución Propuesta**:
```javascript
// Al inicio de mcp-server.js
const lockFile = path.join(os.tmpdir(), 'omnysys-mcp.lock');

async function acquireLock() {
  try {
    const fd = fs.openSync(lockFile, 'wx');
    fs.writeFileSync(fd, process.pid.toString());
    fs.closeSync(fd);
    return true;
  } catch (err) {
    if (err.code === 'EEXIST') {
      const pid = fs.readFileSync(lockFile, 'utf-8');
      logger.error(`⚠️  MCP Server ya está corriendo (PID: ${pid})`);
      return false;
    }
    throw err;
  }
}

// Cleanup en shutdown
process.on('exit', () => {
  try {
    fs.unlinkSync(lockFile);
  } catch {}
});
```

---

## ⚠️ PROBLEMAS MENORES (NO CRÍTICOS)

### 1. **Deprecation Warnings**

```
WARN [OmnySys:ast:analyzer] ⚠️  DEPRECATED: Importing from ast-analyzer.js
WARN [OmnySys:ast:analyzer]    Please update imports to: ./analysis/index.js

WARN [OmnySys:metadata:contract] ⚠️  DEPRECATED: Importing from metadata-contract.js
WARN [OmnySys:metadata:contract]    Please update imports to: metadata-contract/index.js
```

**Acción**: Actualizar imports deprecados

---

### 2. **Timestamps en Analysis Worker**

**Observación**: `analysis-worker` aún usa logger con timestamps:
```
2026-02-11T13:46:52.375Z [32m[INFO][0m [core:analysis-worker] Initializing...
```

**Causa**: Usa otro logger o console.log directo
**Impacto**: Bajo (solo logs internos)

---

### 3. **Path Duplicado en Algunos Casos**

**Observación**: Logs muestran `C:\Dev\OmnySystem\DevOmnySystem`
**Causa**: `path.resolve(projectPath)` cuando projectPath YA es absoluto
**Solución Propuesta**:
```javascript
const absolutePath = path.isAbsolute(projectPath)
  ? projectPath
  : path.resolve(projectPath);
```

---

## 📊 DUPLICACIONES DE CÓDIGO DETECTADAS

### Resumen de Análisis por Subagente:

| Tipo | Cantidad | Severidad | Ubicación |
|------|----------|-----------|-----------|
| Funciones helper duplicadas | 5+ | ALTA | `analysis/*.js` |
| Validaciones idénticas | 3+ | MEDIA | Tools análisis |
| Inicializaciones de logger | 18+ | BAJA | Todos los archivos |
| Patrones de logging "[Tool]" | 9+ | BAJA | Tools principales |
| Auto-análisis pattern | 2 | MEDIA | analyze-change, impact-map |
| Queries de metadatos | 4 | MEDIA | Tools múltiples |
| Regex patterns duplicados | 5+ | MEDIA | analysis/analyzers |

### Top Duplicaciones:

1. **`parseParameters()` / `parseSignature()`** - 2 implementaciones similares
2. **`extractCallParameters()` / `extractArguments()`** - Misma lógica, nombres diferentes
3. **Validación "Missing required parameters"** - Repetida en 3 tools
4. **Pattern de auto-análisis** - Duplicado en analyze-change.js e impact-map.js
5. **Logger initialization** - 18+ archivos crean su propio logger

**Recomendación**: Crear `src/layer-c-memory/mcp/tools/lib/helpers.js` con utilidades compartidas

---

## 🎯 ESTADO ACTUAL DEL SISTEMA

### ✅ FUNCIONA:
- [x] Timestamps eliminados del logger
- [x] 3 Terminales se abren visiblemente
- [x] LLM GPU Server inicia correctamente (puerto 8000)
- [x] 14 MCP Tools registradas
- [x] 425 archivos analizados (Layer A)
- [x] Orchestrator inicializa
- [x] Cache funciona (3981 connections, 431 issues)
- [x] Configs Claude Code y OpenCode creadas

### ❌ NO FUNCIONA:
- [ ] Servidor entra en loop EPIPE (reinicia 3-5 veces)
- [ ] Múltiples instancias simultáneas
- [ ] Proceso reinicia automáticamente sin razón clara
- [ ] Cliente MCP se desconecta durante inicialización larga

### ⚠️ FUNCIONAMIENTO PARCIAL:
- [~] Servidor EVENTUALMENTE se inicializa (después de 3-5 intentos)
- [~] MCP Protocol funciona SI el servidor sobrevive el loop
- [~] Tools MCP funcionan SI se conecta correctamente

---

## 🔧 ARCHIVOS MODIFICADOS EN ESTA SESIÓN

1. **src/utils/logger.js**
   - Eliminado timestamp
   - Agregado modo MCP (no usado aún)

2. **src/layer-c-memory/mcp-server.js**
   - Quitado `/min` de spawn MCP logs
   - Modificado console.error intercept (intento fallido de fix EPIPE)

3. **src/layer-c-memory/mcp/core/llm-starter.js**
   - Quitado `/min` de spawn GPU y CPU
   - Ahora terminales visibles

4. **src/layer-c-memory/mcp/core/initialization/steps/ready-step.js**
   - Corregido import path: `../../../tools/index.js`

5. **src/layer-c-memory/mcp/core/initialization/steps/llm-setup-step.js**
   - Corregido import path: `../../llm-starter.js`
   - Agregado error logging detallado

6. **setup-mcp-configs.js** (NUEVO)
   - Auto-configurador para Claude Code y OpenCode

7. **opencode.json, claude_desktop_config.json, mcp-servers.json**
   - Actualizados con paths correctos

---

## 📝 PRÓXIMOS PASOS RECOMENDADOS

### Prioridad CRÍTICA:
1. **Resolver Loop EPIPE**:
   - Implementar solución A (ignorar EPIPE) como quick fix
   - Implementar solución D (redirect stderr) como fix robusto

2. **Prevenir Múltiples Instancias**:
   - Implementar lock file
   - Verificar puerto en uso antes de iniciar

3. **Identificar Proceso que Reinicia**:
   - Buscar supervisor/watch process
   - Deshabilitar auto-restart temporal

### Prioridad MEDIA:
4. Limpiar duplicaciones de código
5. Actualizar imports deprecados
6. Optimizar inicialización (reducir 7s → 3s)

### Prioridad BAJA:
7. Agregar tests de integración
8. Documentar arquitectura MCP
9. Mejorar logging estructurado

---

## 🐛 DEBUGGING TIPS

### Para investigar EPIPE:
```bash
# Ejecutar con debug
DEBUG=* node src/layer-c-memory/mcp-server.js

# Ver qué proceso reinicia
ps aux | grep mcp-server
pstree -p $(pgrep -f mcp-server)

# Monitorear stderr en tiempo real
tail -f logs/mcp-server.log | grep -E "EPIPE|shutdown|Starting"
```

### Para prevenir reinicio automático:
```javascript
// En mcp-server.js, comentar temporalmente:
// process.on('uncaughtException', async (error) => {
//   logger.error('\n❌ Uncaught exception:', error);
//   await server.shutdown();
//   process.exit(1);  // ← ESTO causa el exit que dispara el reinicio
// });
```

---

## 📚 REFERENCIAS

- **MCP SDK Docs**: https://github.com/modelcontextprotocol/sdk
- **StdioServerTransport**: Espera JSON via stdin/stdout, NO debe haber output extra
- **EPIPE**: Error POSIX cuando se escribe a pipe cerrado (código 32)
- **Node.js Streams**: https://nodejs.org/api/stream.html#stream_event_pipe

---

**AUTOR**: Claude Sonnet 4.5
**COMMIT**: 96b5e31
**SIGUIENTE**: Implementar fix EPIPE + Lock file
