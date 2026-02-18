#!/usr/bin/env node
/**
 * Wrapper script para reinicio automático del servidor OmnySys
 * 
 * Uso: node restart-server.mjs [projectPath]
 * 
 * Este script:
 * 1. Inicia el servidor
 * 2. Si el servidor termina con código 0 (reinicio solicitado), lo reinicia
 * 3. Si termina con otro código, muestra el error
 */

import { spawn } from 'child_process';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const projectPath = process.argv[2] || process.cwd();

let restartCount = 0;
const MAX_RESTARTS = 10;

function startServer() {
  if (restartCount >= MAX_RESTARTS) {
    console.error('❌ Demasiados reinicios. Deteniendo.');
    process.exit(1);
  }

  restartCount++;
  console.log(`\n🚀 Iniciando servidor OmnySys (intento ${restartCount})...`);
  console.log(`📁 Proyecto: ${projectPath}\n`);

  const serverPath = path.join(__dirname, 'src', 'core', 'unified-server', 'index.js');
  
  const server = spawn('node', [serverPath, projectPath], {
    stdio: 'inherit',
    env: { ...process.env, NODE_ENV: 'production' }
  });

  server.on('close', (code) => {
    if (code === 0) {
      // Código 0 = reinicio solicitado
      console.log('\n♻️  Reinicio solicitado. Reiniciando...\n');
      setTimeout(startServer, 1000);
    } else {
      // Otro código = error
      console.error(`\n💥 Servidor terminó con código ${code}`);
      process.exit(code);
    }
  });

  server.on('error', (err) => {
    console.error('\n❌ Error al iniciar servidor:', err.message);
    process.exit(1);
  });
}

// Manejar señales de terminación
process.on('SIGINT', () => {
  console.log('\n👋 Deteniendo wrapper...');
  process.exit(0);
});

process.on('SIGTERM', () => {
  console.log('\n👋 Deteniendo wrapper...');
  process.exit(0);
});

// Iniciar
startServer();
