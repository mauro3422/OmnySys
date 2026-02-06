#!/usr/bin/env node

/**
 * OmnySys MCP Server - Entry Point Único
 * 
 * Usa OmnySysMCPServer con MCP SDK oficial
 * Compatible con Claude Desktop, OpenCode, y otros clientes MCP
 * 
 * Usage: node src/layer-c-memory/mcp-server.js /path/to/project
 */

import { OmnySysMCPServer } from './mcp/core/server-class.js';
import path from 'path';

async function main() {
  const projectPath = process.argv[2] || process.cwd();
  const absolutePath = path.resolve(projectPath);

  console.error(`📂 Project: ${absolutePath}`);
  console.error('🚀 Starting OmnySys MCP Server...\n');

  const server = new OmnySysMCPServer(absolutePath);

  // Cleanup graceful
  process.on('SIGINT', async () => {
    console.error('\n👋 Received SIGINT, shutting down gracefully...');
    await server.shutdown();
    process.exit(0);
  });

  process.on('SIGTERM', async () => {
    console.error('\n👋 Received SIGTERM, shutting down gracefully...');
    await server.shutdown();
    process.exit(0);
  });

  process.on('uncaughtException', async (error) => {
    console.error('\n❌ Uncaught exception:', error);
    await server.shutdown();
    process.exit(1);
  });

  try {
    // El servidor se inicializa en background después del handshake MCP
    await server.run();
  } catch (error) {
    console.error('Fatal error:', error);
    await server.shutdown();
    process.exit(1);
  }
}

main();
