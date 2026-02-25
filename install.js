#!/usr/bin/env node

/**
 * OmnySys standard installer.
 *
 * Purpose:
 * - Apply a single MCP standard across all supported clients.
 * - Generate workspace MCP config files.
 * - Ensure VS Code auto-start task for the shared daemon.
 *
 * No servers are started here to avoid duplicate background processes.
 */

import { standardizeMcpInstallation } from './src/cli/utils/mcp-client-standardizer.js';
import { resolveProjectPath } from './src/cli/utils/paths.js';
import { PORTS } from './src/cli/utils/port-checker.js';

const ICON = {
  info: '[INFO]',
  ok: '[OK]',
  warn: '[WARN]',
  err: '[ERROR]'
};

function log(type, message) {
  console.log(`${ICON[type]} ${message}`);
}

function getNodeMajorVersion() {
  return Number(process.versions.node.split('.')[0] || 0);
}

function printClientResults(clientResults = []) {
  for (const item of clientResults) {
    if (item.applied) {
      log('ok', `${item.client}: ${item.path || '(skipped path)'}`);
    } else {
      log('warn', `${item.client}: ${item.error || 'not applied'}`);
    }
  }
}

async function main() {
  if (process.env.OMNYSYS_SKIP_POSTINSTALL === '1') {
    log('warn', 'Skipping install standardization (OMNYSYS_SKIP_POSTINSTALL=1).');
    return;
  }

  const nodeMajor = getNodeMajorVersion();
  if (nodeMajor < 18) {
    log('err', `Node.js ${process.versions.node} detected. Node.js 18+ is required.`);
    process.exit(1);
  }

  const projectArg = process.argv[2];
  const projectPath = resolveProjectPath(projectArg || process.cwd());

  log('info', `Applying OmnySys MCP standard in: ${projectPath}`);

  const result = await standardizeMcpInstallation({ projectPath });

  printClientResults(result.clientResults);

  if (!result.success) {
    log('err', 'MCP standardization finished with errors.');
    process.exit(1);
  }

  log('ok', 'MCP standardization applied successfully.');
  log('info', `MCP URL: ${result.mcpUrl}`);
  log('info', `Health URL: http://127.0.0.1:${PORTS.mcp}/health`);
  log('info', `Unified config: ${result.unifiedConfigPath}`);
  log('info', `Workspace .mcp.json: ${result.workspace.files.dotMcp}`);
  log('info', `Workspace mcp-servers.json: ${result.workspace.files.mcpServers}`);
  log('info', `Workspace schema: ${result.workspace.files.mcpServersSchema}`);
  log('info', `VS Code task: ${result.vscode.paths.tasks}`);
  log('info', `VS Code settings: ${result.vscode.paths.settings}`);
  log('info', `Qwen global config: ${result.clientResults.find(r => r.client === 'qwen')?.projectConfigPath || '(not applied)'}`);

  console.log('');
  log('info', 'Next steps:');
  console.log('  1) Open VS Code in this workspace (daemon task auto-runs).');
  console.log('  2) Or start manually: node src/layer-c-memory/mcp-http-server.js');
  console.log('  3) Re-apply standard anytime: npm run setup');
}

main().catch((error) => {
  log('err', error.message || 'Unknown installation error');
  process.exit(1);
});
