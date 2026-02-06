#!/usr/bin/env node

/**
 * OmnySys CLI - Sistema Unificado
 * 
 * Un único comando para controlar todo:
 * - omnysys up       : Inicia LLM + MCP + Dashboard
 * - omnysys down     : Detiene todo
 * - omnysys status   : Muestra estado
 * - omnysys setup    : Configura OpenCode automáticamente
 * - omnysys tools    : Lista herramientas disponibles
 * - omnysys call     : Ejecuta una herramienta
 */

import { spawn, exec } from 'child_process';
import http from 'http';
import path from 'path';
import fs from 'fs/promises';
import os from 'os';

const PORTS = {
  llm: 8000,
  mcp: 9999
};

const PROCESSES = {
  llm: null,
  mcp: null
};

// ==========================================
// UTILIDADES
// ==========================================

function log(msg, type = 'info') {
  const icons = { info: 'ℹ️', success: '✅', error: '❌', warning: '⚠️', loading: '⏳' };
  console.log(`${icons[type] || '•'} ${msg}`);
}

async function checkPort(port) {
  return new Promise((resolve) => {
    const req = http.get(`http://localhost:${port}/health`, { timeout: 1000 }, (res) => {
      resolve(res.statusCode === 200);
    });
    req.on('error', () => resolve(false));
    req.on('timeout', () => { req.destroy(); resolve(false); });
  });
}

async function checkLLM() {
  return await checkPort(PORTS.llm);
}

async function checkMCP() {
  return await checkPort(PORTS.mcp);
}

// ==========================================
// COMANDOS
// ==========================================

async function cmdUp() {
  log('Iniciando OmnySys...', 'loading');
  
  // Verificar LLM
  const llmRunning = await checkLLM();
  if (!llmRunning) {
    log('Iniciando LLM Server...', 'loading');
    PROCESSES.llm = spawn('node', ['src/ai/scripts/brain_gpu.js'], {
      detached: true,
      stdio: 'ignore'
    });
    PROCESSES.llm.unref();
    
    // Esperar que inicie
    for (let i = 0; i < 10; i++) {
      await new Promise(r => setTimeout(r, 1000));
      if (await checkLLM()) break;
    }
  }
  
  if (await checkLLM()) {
    log(`LLM Server ready on port ${PORTS.llm}`, 'success');
  } else {
    log('LLM Server failed to start', 'error');
    return;
  }
  
  // Verificar MCP
  const mcpRunning = await checkMCP();
  if (!mcpRunning) {
    log('Iniciando MCP Server...', 'loading');
    PROCESSES.mcp = spawn('node', ['mcp-http-server.js', PORTS.mcp], {
      detached: true,
      stdio: 'ignore'
    });
    PROCESSES.mcp.unref();
    
    // Esperar que inicie
    for (let i = 0; i < 10; i++) {
      await new Promise(r => setTimeout(r, 1000));
      if (await checkMCP()) break;
    }
  }
  
  if (await checkMCP()) {
    log(`MCP Server ready on port ${PORTS.mcp}`, 'success');
  } else {
    log('MCP Server failed to start', 'error');
    return;
  }
  
  log('\n🚀 OmnySys está listo!', 'success');
  log(`   LLM:  http://localhost:${PORTS.llm}/health`);
  log(`   MCP:  http://localhost:${PORTS.mcp}/health`);
  log(`   Tools: http://localhost:${PORTS.mcp}/tools\n`);
  
  // Auto-configurar OpenCode si es necesario
  await setupOpenCode();
}

async function cmdDown() {
  log('Deteniendo OmnySys...', 'loading');
  
  // Matar procesos
  if (PROCESSES.llm) {
    PROCESSES.llm.kill();
    PROCESSES.llm = null;
  }
  if (PROCESSES.mcp) {
    PROCESSES.mcp.kill();
    PROCESSES.mcp = null;
  }
  
  // También buscar y matar procesos huérfanos
  const platform = os.platform();
  if (platform === 'win32') {
    exec('taskkill /F /IM node.exe 2>nul', () => {});
  } else {
    exec('pkill -f "mcp-http-server.js" 2>/dev/null', () => {});
  }
  
  log('OmnySys detenido', 'success');
}

async function cmdStatus() {
  const llm = await checkLLM();
  const mcp = await checkMCP();
  
  console.log('\n╔════════════════════════════════════╗');
  console.log('║      OMNYsys STATUS                ║');
  console.log('╠════════════════════════════════════╣');
  console.log(`║  LLM Server:  ${llm ? '🟢 Running' : '🔴 Stopped'}${' '.repeat(16)}║`);
  console.log(`║  MCP Server:  ${mcp ? '🟢 Running' : '🔴 Stopped'}${' '.repeat(16)}║`);
  console.log(`║  Tools:       ${mcp ? '9 available' : 'N/A'}${' '.repeat(16)}║`);
  console.log('╚════════════════════════════════════╝\n');
  
  if (!llm || !mcp) {
    log('Ejecuta: omnysys up', 'warning');
  }
}

async function cmdTools() {
  const running = await checkMCP();
  if (!running) {
    log('MCP Server no está corriendo', 'error');
    log('Ejecuta: omnysys up', 'warning');
    return;
  }
  
  try {
    const response = await fetch(`http://localhost:${PORTS.mcp}/tools`);
    const data = await response.json();
    
    console.log('\n🛠️  Herramientas disponibles:\n');
    data.tools.forEach((tool, i) => {
      const icon = ['🔍', '🔧', '🔗', '⚠️', '📁', '📊', '🧠', '🔬', '🌊'][i] || '•';
      console.log(`  ${icon} ${tool.name}`);
      console.log(`     ${tool.description}\n`);
    });
  } catch (e) {
    log('Error al obtener herramientas', 'error');
  }
}

async function cmdCall(toolName, args) {
  const running = await checkMCP();
  if (!running) {
    log('MCP Server no está corriendo', 'error');
    log('Ejecuta: omnysys up', 'warning');
    return;
  }
  
  try {
    const response = await fetch(`http://localhost:${PORTS.mcp}/tools/${toolName}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(args || {})
    });
    
    const data = await response.json();
    console.log('\n📤 Resultado:');
    console.log(JSON.stringify(data.result, null, 2));
  } catch (e) {
    log(`Error al ejecutar ${toolName}: ${e.message}`, 'error');
  }
}

async function setupOpenCode() {
  const opencodeDir = path.join(os.homedir(), '.config', 'opencode');
  const opencodeConfig = path.join(opencodeDir, 'opencode.json');
  
  try {
    // Crear directorio si no existe
    await fs.mkdir(opencodeDir, { recursive: true });
    
    // Leer config existente o crear nueva
    let config = {};
    try {
      const content = await fs.readFile(opencodeConfig, 'utf-8');
      config = JSON.parse(content);
    } catch {
      // No existe, crear nuevo
    }
    
    // Agregar MCP config
    if (!config.mcpServers) config.mcpServers = {};
    
    config.mcpServers.omnysys = {
      type: 'http',
      url: `http://localhost:${PORTS.mcp}`,
      description: 'OmnySys HTTP MCP Server'
    };
    
    // Guardar config
    await fs.writeFile(opencodeConfig, JSON.stringify(config, null, 2));
    log('OpenCode configurado automáticamente', 'success');
    log(`Config guardada en: ${opencodeConfig}`);
    
  } catch (e) {
    log('No se pudo configurar OpenCode automáticamente', 'warning');
  }
}

async function cmdSetup() {
  log('Configurando OmnySys...', 'loading');
  await setupOpenCode();
  log('\n✅ Configuración completa', 'success');
  log('   OpenCode: Configurado');
  log('   LLM Port: 8000');
  log('   MCP Port: 9999');
}

// ==========================================
// MAIN
// ==========================================

async function main() {
  const command = process.argv[2] || 'help';
  
  switch (command) {
    case 'up':
    case 'start':
      await cmdUp();
      break;
      
    case 'down':
    case 'stop':
      await cmdDown();
      break;
      
    case 'status':
      await cmdStatus();
      break;
      
    case 'tools':
      await cmdTools();
      break;
      
    case 'call': {
      const toolName = process.argv[3];
      const argsJson = process.argv[4] || '{}';
      if (!toolName) {
        log('Uso: omnysys call <tool-name> [json-args]', 'error');
        return;
      }
      let args = {};
      try {
        args = JSON.parse(argsJson);
      } catch {
        log('Error: args debe ser JSON válido', 'error');
        return;
      }
      await cmdCall(toolName, args);
      break;
    }
    
    case 'setup':
      await cmdSetup();
      break;
      
    case 'help':
    default:
      console.log(`
🧠 OmnySys CLI - Sistema Unificado

Uso: omnysys <comando>

Comandos:
  up, start     Inicia LLM + MCP + configura OpenCode
  down, stop    Detiene todos los servicios
  status        Muestra estado de los servicios
  tools         Lista herramientas disponibles
  call <tool>   Ejecuta una herramienta (ej: omnysys call get_impact_map '{"filePath":"src/test.js"}')
  setup         Configura OpenCode y verifica instalación
  help          Muestra esta ayuda

Ejemplos:
  omnysys up                              # Inicia todo
  omnysys status                          # Ver estado
  omnysys call get_impact_map '{"filePath":"src/core.js"}'  # Analiza impacto
  omnysys tools                           # Ver herramientas
`);
  }
}

main().catch(console.error);
