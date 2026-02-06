#!/usr/bin/env node

/**
 * OmnySys Auto-Installer
 * 
 * Instalación Plug & Play para cualquier usuario:
 * 1. Clona repo
 * 2. npm install
 * 3. node install.js
 * 4. ¡Listo! LLM + MCP corriendo en background
 */

import { spawn } from 'child_process';
import fs from 'fs/promises';
import path from 'path';
import os from 'os';
import http from 'http';

const PORTS = {
  llm: 8000,
  mcp: 9999
};

async function log(msg, type = 'info') {
  const icons = { info: '•', success: '✅', error: '❌', warning: '⚠️', loading: '⏳' };
  console.log(`${icons[type]} ${msg}`);
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

async function main() {
  console.log('\n🧠 OMNYsys - Auto Installer\n');
  console.log('═'.repeat(60));

  // Paso 1: Verificar Node.js
  log('Verificando Node.js...', 'loading');
  const nodeVersion = process.version;
  if (parseInt(nodeVersion.slice(1)) < 18) {
    log(`Node.js ${nodeVersion} detectado (se requiere v18+)`, 'error');
    process.exit(1);
  }
  log(`Node.js ${nodeVersion} ✅`, 'success');

  // Paso 2: Verificar si ya está corriendo
  const llmRunning = await checkPort(PORTS.llm);
  const mcpRunning = await checkPort(PORTS.mcp);

  if (llmRunning && mcpRunning) {
    log('\n✅ OmnySys ya está corriendo!', 'success');
    log('   LLM:  http://localhost:8000/health');
    log('   MCP:  http://localhost:9999/health');
    log('\n💡 Las herramientas están disponibles para tu IA\n');
    return;
  }

  // Paso 3: Iniciar servicios
  log('\nIniciando servicios...', 'loading');

  // Iniciar LLM si no está corriendo
  if (!llmRunning) {
    log('Iniciando LLM Server (GPU)...', 'loading');
    const llmProcess = spawn('node', ['src/ai/scripts/brain_gpu.js'], {
      detached: true,
      stdio: 'ignore'
    });
    llmProcess.unref();
    
    // Esperar
    for (let i = 0; i < 15; i++) {
      await new Promise(r => setTimeout(r, 1000));
      if (await checkPort(PORTS.llm)) break;
      process.stdout.write('.');
    }
    console.log('');
  }

  // Iniciar MCP si no está corriendo
  if (!mcpRunning) {
    log('Iniciando MCP Server...', 'loading');
    const mcpProcess = spawn('node', ['mcp-http-server.js', PORTS.mcp.toString()], {
      detached: true,
      stdio: 'ignore'
    });
    mcpProcess.unref();
    
    // Esperar
    for (let i = 0; i < 15; i++) {
      await new Promise(r => setTimeout(r, 1000));
      if (await checkPort(PORTS.mcp)) break;
      process.stdout.write('.');
    }
    console.log('');
  }

  // Verificar
  const llmOk = await checkPort(PORTS.llm);
  const mcpOk = await checkPort(PORTS.mcp);

  if (llmOk && mcpOk) {
    log('\n🎉 OmnySys está listo!', 'success');
    console.log('\n╔════════════════════════════════════════════════════════╗');
    console.log('║  ✅ LLM Server:  http://localhost:8000/health          ║');
    console.log('║  ✅ MCP Server:  http://localhost:9999/health          ║');
    console.log('║  ✅ Tools:       9 herramientas disponibles            ║');
    console.log('╚════════════════════════════════════════════════════════╝\n');

    // Configurar OpenCode automáticamente
    await setupOpenCode();

    console.log('📋 Comandos disponibles:');
    console.log('   npm start     - Iniciar OmnySys');
    console.log('   npm stop      - Detener OmnySys');
    console.log('   npm status    - Ver estado');
    console.log('   npm tools     - Listar herramientas\n');

    console.log('🤖 Tu IA ahora puede usar las herramientas:');
    console.log('   • get_impact_map - Analizar impacto de archivos');
    console.log('   • get_call_graph - Ver quién llama a qué');
    console.log('   • explain_value_flow - Flujo de datos');
    console.log('   • Y 6 herramientas más...\n');

  } else {
    log('\n❌ Error al iniciar servicios', 'error');
    if (!llmOk) log('   LLM Server no inició', 'error');
    if (!mcpOk) log('   MCP Server no inició', 'error');
    process.exit(1);
  }
}

async function setupOpenCode() {
  try {
    const opencodeDir = path.join(os.homedir(), '.config', 'opencode');
    const opencodeConfig = path.join(opencodeDir, 'opencode.json');
    
    await fs.mkdir(opencodeDir, { recursive: true });
    
    let config = {};
    try {
      const content = await fs.readFile(opencodeConfig, 'utf-8');
      config = JSON.parse(content);
    } catch {}
    
    if (!config.mcpServers) config.mcpServers = {};
    
    config.mcpServers.omnysys = {
      type: 'http',
      url: `http://localhost:${PORTS.mcp}`,
      description: 'OmnySys HTTP MCP Server'
    };
    
    await fs.writeFile(opencodeConfig, JSON.stringify(config, null, 2));
    log('✅ OpenCode configurado automáticamente', 'success');
  } catch (e) {
    log('⚠️  No se pudo configurar OpenCode automáticamente', 'warning');
  }
}

main().catch(err => {
  console.error('Error:', err.message);
  process.exit(1);
});
