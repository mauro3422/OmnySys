import fs from 'fs/promises';
import path from 'path';
import { OmnySysMCPServer } from '../../layer-c-memory/mcp/core/server-class.js';
import { OmnySysUnifiedServer } from '../../core/unified-server.js';
import { resolveProjectPath } from '../utils/paths.js';

export async function serveLogic(projectPath, options = {}) {
  const { silent = false, legacy = false, unified = true, mockServer = false } = options;
  const absolutePath = resolveProjectPath(projectPath);

  const useUnified = unified && !legacy;

  return {
    success: true,
    exitCode: 0,
    projectPath: absolutePath,
    mode: useUnified ? 'unified' : 'legacy',
    serverConfig: {
      unified: useUnified,
      legacy: !useUnified
    }
  };
}

export async function serve(projectPath, options = {}) {
  const absolutePath = resolveProjectPath(projectPath);
  const { 
    unified = true,
    legacy = false
  } = options;

  if (unified && !legacy) {
    console.log('\n╔═══════════════════════════════════════════════════════════════╗');
    console.log('║     OmnySys Unified Server                                ║');
    console.log('║     HTTP API + WebSocket + MCP Tools                          ║');
    console.log('╚═══════════════════════════════════════════════════════════════╝\n');
    console.log(`📂 Project: ${absolutePath}\n`);

    const server = new OmnySysUnifiedServer(absolutePath);

    process.on('SIGTERM', () => server.shutdown());
    process.on('SIGINT', () => server.shutdown());

    try {
      await server.initialize();
      console.log('💡 Server running. Press Ctrl+C to stop.\n');
      await new Promise(() => {});
    } catch (error) {
      console.error('Failed to start server:', error);
      process.exit(1);
    }
    return;
  }

  console.log('\n╔═══════════════════════════════════════════════════════════════╗');
  console.log('║     OmnySys MCP Server (Legacy Mode)                      ║');
  console.log('║     MCP Protocol via stdio                                    ║');
  console.log('╚═══════════════════════════════════════════════════════════════╝\n');
  console.log(`📂 Project: ${absolutePath}\n`);

  const server = new OmnySysMCPServer(absolutePath);

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
    await new Promise(() => {});
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
}
