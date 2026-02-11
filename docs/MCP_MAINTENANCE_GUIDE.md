# 🔧 Guía de Mantenimiento del Sistema MCP

**Autor**: Claude Sonnet 4.5
**Fecha**: 2026-02-11
**Versión**: 1.0

---

## 📚 Índice

1. [Arquitectura del Sistema MCP](#arquitectura)
2. [Problemas Comunes y Soluciones](#problemas-comunes)
3. [Cómo Editar Logs de Forma Segura](#editar-logs)
4. [Debugging y Troubleshooting](#debugging)
5. [Flujo de Inicialización](#flujo)
6. [Archivos Críticos](#archivos-criticos)

---

## 🏗️ Arquitectura del Sistema MCP {#arquitectura}

### ¿Qué es MCP?

**MCP (Model Context Protocol)** es un protocolo de comunicación entre Claude/OpenCode y tu proyecto OmnySys.

**Componentes clave**:
```
┌─────────────────┐
│ Claude/OpenCode │  ← Cliente MCP
└────────┬────────┘
         │ stdio (stdin/stdout)
         │ JSON-RPC Messages
         ▼
┌─────────────────┐
│  mcp-server.js  │  ← Entry point
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ OmnySysMCPServer│  ← Clase principal
│  (server-class) │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ 6 Steps Pipeline│
│ 1. LLM Setup    │
│ 2. Layer A      │
│ 3. Orchestrator │
│ 4. Cache        │
│ 5. MCP Setup    │
│ 6. Ready        │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  14 MCP Tools   │  ← Herramientas disponibles
└─────────────────┘
```

### Flujo de Comunicación

1. **Cliente** (Claude Code) ejecuta: `node src/layer-c-memory/mcp-server.js C:\Dev\OmnySystem`
2. **MCP Server** inicia en modo `stdio` (usa stdin/stdout para JSON)
3. **Handshake MCP**:
   - Cliente → `initialize` request
   - Servidor → responde con capabilities
   - Cliente → `initialized` notification
   - **CRÍTICO**: Durante handshake, stderr NO debe tener output (causa EPIPE)
4. **Servidor listo**: Tools disponibles via JSON-RPC

---

## ⚠️ Problemas Comunes y Soluciones {#problemas-comunes}

### 1. EPIPE: broken pipe, write

**Síntoma**: Servidor crashea con "EPIPE: broken pipe, write" y entra en loop de reinicio.

**Causa**: El MCP SDK usa `stdin/stdout` para comunicación JSON limpia. Si **stderr** recibe output durante el handshake, causa broken pipe.

**Solución Implementada** (Commit 7902757):
```javascript
// En mcp-server.js - ANTES de cualquier import
const logFile = path.join(projectRoot, 'logs', 'mcp-server.log');

// Redirect ALL stderr writes to log file
process.stderr.write = function(chunk, encoding, callback) {
  fs.appendFileSync(logFile, chunk);
  if (typeof encoding === 'function') {
    encoding();
  } else if (callback) {
    callback();
  }
  return true;
};

// AHORA sí: imports seguros
import { OmnySysMCPServer } from './mcp/core/server-class.js';
```

**⚠️ NUNCA MUEVAS ESTE CÓDIGO** - debe estar ANTES de cualquier import.

### 2. Path Duplication (C:\Dev\OmnySystem\DevOmnySystem)

**Síntoma**: Layer A analiza 0 archivos, path aparece duplicado.

**Causa**: `path.resolve()` duplica paths en Windows cuando cwd está dentro del target.

**Solución Implementada** (Commit b1a4079):
```javascript
// En mcp-server.js
const absolutePath = path.isAbsolute(projectPath)
  ? path.normalize(projectPath)   // ← Para paths absolutos
  : path.resolve(projectPath);     // ← Solo para relativos
```

**Test**:
```bash
node -e "const path = require('path'); console.log(path.normalize('C:\\Dev\\OmnySystem'));"
# Debe devolver: C:\Dev\OmnySystem (sin duplicar)
```

### 3. Logs Confusos (ERROR para todo)

**Síntoma**: Todos los logs dicen "ERROR" aunque sean informativos.

**Causa**: `logger.error()` usado para todos los mensajes (para escribir a stderr).

**Solución Implementada** (Commits d90188a, 44c9621):
```javascript
// src/utils/logger.js
info(message, ...args) {
  if (this._shouldLog('info')) {
    process.stderr.write(this._format(message, 'info') + '\n');
  }
}
```

**Actualizado**:
- ✅ 22 archivos del MCP system
- ✅ `logger.info()` para mensajes normales
- ✅ `logger.warn()` para advertencias
- ✅ `logger.error()` solo para errores reales

### 4. Terminales No Se Abren

**Síntoma**: No se abren las 3 terminales (MCP, LLM, agent).

**Causa**: Flag `/min` en spawn commands oculta las terminales.

**Solución**: Remover `/min` de spawn():
```javascript
// EN: llm-starter.js, mcp-server.js
spawn('cmd.exe', ['/c', 'start', scriptPath], { // ← Sin /min
  detached: true,
  stdio: 'ignore'
});
```

### 5. LLM Server No Arranca

**Síntoma**: "LLM server not available" aunque scripts existen.

**Causa**: Import path incorrecto en `llm-setup-step.js`.

**Solución**:
```javascript
// ANTES (incorrecto):
await import('../llm-starter.js');

// DESPUÉS (correcto):
await import('../../llm-starter.js');  // ← Up 2 niveles, no 1
```

**Regla**: Desde `steps/`, necesitas `../../../` para llegar a `/mcp/`.

---

## 📝 Cómo Editar Logs de Forma Segura {#editar-logs}

### Niveles de Log Correctos

```javascript
// ✅ CORRECTO
logger.info('Starting server...');       // Información normal
logger.warn('Config file missing');      // Advertencia (no crítico)
logger.error('Failed to connect', err);  // Error real (crítico)

// ❌ INCORRECTO
logger.error('Starting server...');      // NO usar error para info
logger.info('Connection failed');        // NO usar info para errores
```

### Formato de Mensajes

```javascript
// ✅ CORRECTO - User-friendly
logger.info('✓ Server ready in 7.1s');
logger.info('[1/6] llm-setup...');

// ❌ INCORRECTO - Demasiado técnico
logger.info('━━━━━━━━━━━━━━━━━━━━━━━━━━');
logger.info('STEP 1: AI Server Setup');
logger.info('━━━━━━━━━━━━━━━━━━━━━━━━━━');
```

### Emojis en Logs

**Usar emojis ASCII seguros**:
```javascript
✅ ✓ → Check mark (safe)
❌ ✗ → Error (safe)
⚠️  ⚠ → Warning (safe)
📂 📊 → Puede fallar en consola Windows (usar con cuidado)
```

**Evitar emojis complejos** que rompen encoding:
```javascript
// ❌ Se rompe en logs:
🔧 → aparece como ðŸ"§
🚀 → aparece como corrupto

// ✅ Usar en su lugar:
logger.info('✓ Tool configured');  // En lugar de 🔧
logger.info('Starting...');          // En lugar de 🚀
```

---

## 🐛 Debugging y Troubleshooting {#debugging}

### Ver Logs en Tiempo Real

```bash
# Terminal 1: Ver logs MCP
tail -f logs/mcp-server.log

# Terminal 2: Ver solo errores
tail -f logs/mcp-server.log | grep -i error

# Terminal 3: Ver progreso
tail -f logs/mcp-server.log | grep -E "\[.*\]|✅|❌"
```

### Matar Procesos MCP Viejos

```bash
# Windows PowerShell
Get-WmiObject Win32_Process -Filter "name='node.exe'" |
  Where-Object {$_.CommandLine -like '*mcp-server*'} |
  ForEach-Object { Stop-Process -Id $_.ProcessId -Force }

# O crear script kill-mcp.ps1:
$processes = Get-WmiObject Win32_Process -Filter "name='node.exe'"
foreach ($p in $processes) {
  if ($p.CommandLine -like '*mcp-server*') {
    Write-Host "Killing PID $($p.ProcessId)"
    Stop-Process -Id $p.ProcessId -Force
  }
}
```

### Verificar que MCP Funciona

```javascript
// Desde Node.js REPL:
const path = require('path');
const { spawn } = require('child_process');

// Probar arranque manual
const server = spawn('node', [
  'src/layer-c-memory/mcp-server.js',
  process.cwd()
], { stdio: 'inherit' });

// Ver si inicia sin errores
```

### Logs de Debugging

Activar logs detallados:
```bash
# En terminal antes de arrancar:
set DEBUG=true
set LOG_LEVEL=debug

node src/layer-c-memory/mcp-server.js C:\Dev\OmnySystem
```

---

## 🔄 Flujo de Inicialización Completo {#flujo}

### Secuencia de Pasos

```
1️⃣ LLM Setup (llm-setup-step.js)
   ├─ Check if LLM already running
   ├─ Start GPU server (brain_gpu.bat)
   ├─ Wait for health check (60 retries)
   └─ ✅ LLM ready

2️⃣ Layer A Analysis (layer-a-analysis-step.js)
   ├─ Check existing analysis
   ├─ If valid → skip analysis
   ├─ If not → run Layer A (425 files)
   └─ ✅ Analysis complete

3️⃣ Orchestrator Init (orchestrator-init-step.js)
   ├─ Load Layer A data
   ├─ Initialize file watcher
   ├─ Setup LLM analysis queue
   └─ ✅ Orchestrator ready

4️⃣ Cache Init (cache-init-step.js)
   ├─ Load metadata (425 files)
   ├─ Cache connections (3981)
   ├─ Cache risk assessment (431 issues)
   └─ ✅ Cache ready

5️⃣ MCP Setup (mcp-setup-step.js)
   ├─ Create Server instance
   ├─ Register 14 tools
   ├─ Setup request handlers
   └─ ✅ MCP configured

6️⃣ Ready (ready-step.js)
   ├─ Display stats
   ├─ List tools
   └─ ✅ Server ready

🔌 Connect via stdio
   └─ ✅ INITIALIZATION COMPLETE
```

### Timeouts Importantes

```javascript
LLM Health Check: 60 retries × 2s = 120s max
Layer A Analysis: No timeout (puede tomar 30-60s)
Orchestrator Init: ~2s
Cache Init: ~0.3s
MCP Setup: Instant
Ready: Instant
```

---

## 📁 Archivos Críticos - NO TOCAR SIN CUIDADO {#archivos-criticos}

### 🚨 CRÍTICO - Cambios Rompen el Sistema

#### 1. `src/layer-c-memory/mcp-server.js`
**Líneas críticas 23-49**: Redirect de stderr
```javascript
// ⚠️ NUNCA mover este código ANTES de línea 50
process.stderr.write = function(chunk, encoding, callback) {
  fs.appendFileSync(logFile, chunk);
  // ...
};
```

**Si tocás esto**: EPIPE loop infinito, servidor no arranca.

#### 2. `src/utils/logger.js`
**Métodos críticos**: `info()`, `warn()`, `error()`
```javascript
// ⚠️ SIEMPRE escribir a process.stderr (ya redirigido)
process.stderr.write(this._format(message, level) + '\n');
```

**Si tocás esto**: Logs se pierden o vuelven a causar EPIPE.

#### 3. `src/layer-c-memory/mcp/core/server-class.js`
**Método crítico**: `async run()`
```javascript
// ⚠️ ORDEN IMPORTA:
await this.initialize();           // 1. Primero inicializar
const transport = new StdioServerTransport();
await this.server.connect(transport);  // 2. Luego conectar
```

**Si tocás esto**: Handshake falla, servidor no conecta.

### ⚠️ IMPORTANTE - Cambios Requieren Testing

#### 4. `src/layer-c-memory/mcp/core/initialization/pipeline.js`
**Muestra progreso [1/6], [2/6]...**

#### 5. `src/layer-c-memory/mcp/core/initialization/steps/*-step.js`
**6 steps de inicialización**

#### 6. `src/layer-c-memory/mcp/tools/*.js`
**14 herramientas MCP**

### ✅ Seguro Modificar (con cuidado)

- Mensajes de log (texto)
- Descripción de tools
- Timeouts (con razón)
- Config files (mcp-servers.json, opencode.json)

---

## 🔍 Investigación del SDK MCP

### Archivos del SDK Analizados

```
node_modules/@modelcontextprotocol/sdk/dist/esm/
├── server/
│   ├── stdio.js          ← StdioServerTransport
│   ├── stdio.d.ts        ← TypeScript definitions
│   ├── index.js          ← Server class
│   └── mcp.js            ← McpServer class
├── shared/
│   ├── protocol.js       ← Protocol.connect()
│   └── transport.js      ← Transport interface
└── types.js              ← MCP types
```

### Handshake MCP Descubierto

```javascript
// 1. Protocol.connect(transport)
async connect(transport) {
  this._transport = transport;

  // Setup callbacks
  transport.onmessage = (msg) => {
    if (isJSONRPCRequest(msg)) this._onrequest(msg);
    if (isJSONRPCNotification(msg)) this._onnotification(msg);
  };

  // ⚡ CRÍTICO: Aquí empieza a leer stdin
  await transport.start();
}

// 2. StdioServerTransport.start()
async start() {
  this._started = true;
  this._stdin.on('data', this._ondata);  // ← Lee JSON de stdin
  this._stdin.on('error', this._onerror);
}

// 3. Server._oninitialize() - Handler para "initialize" request
async _oninitialize(request) {
  this._clientCapabilities = request.params.capabilities;
  return {
    protocolVersion: '2024-11-05',
    capabilities: this._capabilities,
    serverInfo: this._serverInfo
  };
}

// 4. oninitialized callback - Handler para "initialized" notification
setNotificationHandler(InitializedNotificationSchema, () => {
  this.oninitialized?.();  // ← Handshake completo
});
```

**Conclusión clave**: Durante `transport.start()` → `initialized` notification, NO puede haber output a stderr o stdout.

---

## 🎯 Checklist de Mantenimiento

### Antes de Modificar Código MCP

- [ ] Hacer backup del código actual
- [ ] Leer esta guía completa
- [ ] Entender qué archivo vas a tocar
- [ ] Verificar si está en la lista de "Archivos Críticos"
- [ ] Si es crítico: hacer commit antes de cambiar

### Después de Modificar Código MCP

- [ ] Matar procesos MCP viejos
- [ ] Probar arranque manual: `node src/layer-c-memory/mcp-server.js`
- [ ] Verificar que completa sin EPIPE
- [ ] Verificar que analiza 425 files (no 0)
- [ ] Verificar que LLM arranca
- [ ] Verificar que 14 tools están disponibles
- [ ] Probar desde Claude Code/OpenCode
- [ ] Si todo funciona: commit con mensaje descriptivo

### Si Algo Se Rompe

1. **Ver logs**: `tail -f logs/mcp-server.log`
2. **Identificar error**: EPIPE? Path? Import?
3. **Buscar en esta guía** la solución
4. **Si no está documentado**:
   - Revisar commits recientes: `git log --oneline -10`
   - Hacer `git diff` para ver cambios
   - Considerar `git revert` al último commit bueno
5. **Documentar** el problema y solución aquí

---

## 📞 Comandos Útiles

```bash
# Ver estado git
git status

# Ver últimos commits
git log --oneline -10

# Ver cambios sin commit
git diff

# Volver a commit anterior
git revert HEAD

# Limpiar procesos MCP
powershell -ExecutionPolicy Bypass -File scripts/kill-mcp.ps1

# Probar servidor manualmente
node src/layer-c-memory/mcp-server.js C:\Dev\OmnySystem

# Ver logs filtrados
tail -f logs/mcp-server.log | grep -E "\[.*\]|✅|❌|EPIPE"

# Verificar path resolution
node -e "const path=require('path'); console.log(path.normalize('C:\\Dev\\OmnySystem'));"
```

---

## 🎓 Resumen de Lo Aprendido

### Problemas Resueltos

1. ✅ **EPIPE**: Redirect stderr antes de imports
2. ✅ **Path duplication**: normalize() para paths absolutos
3. ✅ **Logger levels**: info/warn/error correctos
4. ✅ **Terminales ocultas**: Remover /min flag
5. ✅ **Import paths**: Contar niveles correctamente
6. ✅ **Logs confusos**: Progreso claro [1/6], mensajes concisos

### Commits Importantes

- `7902757`: EPIPE fix (stderr redirect)
- `b1a4079`: Path duplication fix
- `d90188a`: Logger levels fix
- `44c9621`: Logs user-friendly

### Lecciones Clave

1. **MCP usa stdio** - No contaminar stdout/stderr durante handshake
2. **Orden importa** - Redirect stderr ANTES de imports
3. **Path.resolve() duplica** - Usar normalize() en Windows
4. **Logger levels matter** - info/warn/error para UX
5. **Unicode rompe** - Usar ASCII seguro en logs
6. **Import paths** - Contar niveles desde archivo actual

---

**Fin de la Guía de Mantenimiento MCP**

¿Preguntas? Revisar commits o buscar en esta guía.
