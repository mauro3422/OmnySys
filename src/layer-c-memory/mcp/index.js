#!/usr/bin/env node

/**
 * CogniSystem MCP Server - Entry Point
 * 
 * Usage: node src/layer-c-memory/mcp/index.js /path/to/project
 */

import { CogniSystemMCPServer } from './server.js';
import path from 'path';

async function main() {
  const projectPath = process.argv[2] || process.cwd();
  const absolutePath = path.resolve(projectPath);

  const server = new CogniSystemMCPServer(absolutePath);

  process.on('SIGINT', async () => {
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
