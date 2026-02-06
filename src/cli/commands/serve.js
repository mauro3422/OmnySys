#!/usr/bin/env node

/**
 * CLI Command: serve
 * 
 * Inicia el servidor MCP de CogniSystem.
 * Por defecto usa el servidor unificado. Para modo legacy MCP puro usar --legacy.
 */

import fs from 'fs/promises';
import path from 'path';
import { CogniSystemMCPServer } from '../../layer-c-memory/mcp/core/server-class.js';
import { CogniSystemUnifiedServer } from '../../core/unified-server.js';
import { resolveProjectPath } from '../utils/paths.js';

export async function serve(projectPath, options = {}) {
  const absolutePath = resolveProjectPath(projectPath);
  const { 
    unified = true,  // Por defecto usa servidor unificado
    legacy = false   // Modo legacy MCP puro
  } = options;

  // Modo Unified Server (recomendado)
  if (unified && !legacy) {
    console.log('\n╔═══════════════════════════════════════════════════════════════╗');
    console.log('║     CogniSystem Unified Server                                ║');
    console.log('║     HTTP API + WebSocket + MCP Tools                          ║');
    console.log('╚═══════════════════════════════════════════════════════════════╝\n');
    console.log(`📂 Project: ${absolutePath}\n`);

    const server = new CogniSystemUnifiedServer(absolutePath);

    process.on('SIGTERM', () => server.shutdown());
    process.on('SIGINT', () => server.shutdown());

    try {
      await server.initialize();
      console.log('💡 Server running. Press Ctrl+C to stop.\n');
      await new Promise(() => {}); // Keep alive
    } catch (error) {
      console.error('Failed to start server:', error);
      process.exit(1);
    }
    return;
  }

  // Modo Legacy MCP Puro
  console.log('\n╔═══════════════════════════════════════════════════════════════╗');
  console.log('║     CogniSystem MCP Server (Legacy Mode)                      ║');
  console.log('║     MCP Protocol via stdio                                    ║');
  console.log('╚═══════════════════════════════════════════════════════════════╝\n');
  console.log(`📂 Project: ${absolutePath}\n`);

  const server = new CogniSystemMCPServer(absolutePath);

  process.on('SIGTERM', async () => {
    await server.shutdown();
    process.exit(0);
  });

  process.on('SIGINT', async () => {
    await server.shutdown();
    process.exit(0);
  });

  try {
    await server.run();
    console.log('💡 Server running. Press Ctrl+C to stop.\n');
    await new Promise(() => {}); // Keep alive
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
}
