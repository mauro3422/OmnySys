#!/usr/bin/env node

/**
 * CogniSystem MCP Server - Entry Point Único
 * 
 * Usage: node src/layer-c-memory/mcp/index.js /path/to/project
 * 
 * Flujo:
 * 1. AI Server Setup (LLM)
 * 2. Layer A - Static Analysis (si no existe)
 * 3. Initialize Orchestrator (con datos de Layer A)
 * 4. Orchestrator detecta arquetipos → prompting engine
 * 5. LLM analysis selectiva (solo archivos que necesitan)
 * 6. MCP Server listo para queries
 */

import { CogniSystemMCPServer } from './core/server-class.js';
import path from 'path';

async function main() {
  const projectPath = process.argv[2] || process.cwd();
  const absolutePath = path.resolve(projectPath);

  const server = new CogniSystemMCPServer(absolutePath);

  // Stats cada 30 segundos (silencioso en producción)
  server.startStatsInterval((stats) => {
    // Silent - solo para debugging si es necesario
  }, 30000);

  // Cleanup
  process.on('SIGINT', async () => {
    await server.shutdown();
    process.exit(0);
  });

  process.on('SIGTERM', async () => {
    await server.shutdown();
    process.exit(0);
  });

  try {
    await server.run();
  } catch (error) {
    console.error('Fatal error:', error);
    process.exit(1);
  }
}

main();
