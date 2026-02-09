#!/usr/bin/env node

/**
 * OmnySys MCP Server - Entry Point Único
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

import { OmnySysMCPServer } from './core/server-class.js';
import path from 'path';
import fs from 'fs/promises';
import { createLogger } from '../../utils/logger.js';

const logger = createLogger('OmnySys:index');



// ==========================================
// MAIN
// ==========================================
async function main() {
  const projectPath = process.argv[2] || process.cwd();
  const absolutePath = path.resolve(projectPath);

  logger.error(`📂 Project: ${absolutePath}`);
  logger.error('🚀 Starting OmnySys MCP Server...\n');

  const server = new OmnySysMCPServer(absolutePath);

  // Cleanup graceful
  process.on('SIGINT', async () => {
    logger.error('\n👋 Received SIGINT, shutting down gracefully...');
    await server.shutdown();
    process.exit(0);
  });

  process.on('SIGTERM', async () => {
    logger.error('\n👋 Received SIGTERM, shutting down gracefully...');
    await server.shutdown();
    process.exit(0);
  });

  process.on('uncaughtException', async (error) => {
    logger.error('\n❌ Uncaught exception:', error);
    await server.shutdown();
    process.exit(1);
  });

  try {
    await server.run();
  } catch (error) {
    logger.error('Fatal error:', error);
    await server.shutdown();
    process.exit(1);
  }
}

main();
