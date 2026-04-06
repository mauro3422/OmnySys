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
import { distributeAgentsTemplate } from './src/cli/utils/agents-distributor.js';
import { resolveProjectPath } from './src/cli/utils/paths.js';
import { PORTS } from './src/cli/utils/port-checker.js';

const ICON = {
  info: '[INFO]',
  ok: '[OK]',
  warn: '[WARN]',
  err: '[ERROR]'
};

function installerLog(type, message) {
  console.log(`${ICON[type]} ${message}`);
}

function getNodeMajorVersion() {
  return Number(process.versions.node.split('.')[0] || 0);
}

function printClientResults(clientResults = []) {
  for (const item of clientResults) {
    if (item.applied) {
      installerLog('ok', `${item.client}: ${item.path || '(skipped path)'}`);
    } else {
      installerLog('warn', `${item.client}: ${item.error || 'not applied'}`);
    }
  }
}

function printAgentsResult(agentsResult) {
  if (agentsResult.applied) {
    if (agentsResult.action === 'created_full') {
      installerLog('ok', `AGENTS.md template created at: ${agentsResult.path}`);
    } else {
      installerLog('ok', `Tools workflow injected into ${agentsResult.path}`);
    }
  } else {
    installerLog('info', `AGENTS.md: ${agentsResult.reason || agentsResult.error}`);
  }
}

function printTerminalResults(terminal) {
  if (!terminal?.results) return;
  console.log('');
  installerLog('info', 'Terminal auto-start configuration:');
  for (const r of terminal.results) {
    if (r.applied) {
      installerLog('ok', `${r.shell}: ${r.profile}`);
    } else if (r.alreadyConfigured) {
      installerLog('info', `${r.shell}: already configured`);
    } else {
      installerLog('warn', `${r.shell}: ${r.error || 'not applied'}`);
    }
  }
}

function printNextSteps(result) {
  console.log('');
  installerLog('info', 'Next steps:');
  console.log('  1) Open VS Code in this workspace (daemon task auto-runs).');
  console.log('  2) Or start manually: node src/layer-c-memory/mcp-http-proxy.js');
  console.log('  3) Re-apply standard anytime: npm run setup');
  console.log('  4) Terminal auto-start will run when you open a new terminal');
}

async function main() {
  if (process.env.OMNYSYS_SKIP_POSTINSTALL === '1') {
    installerLog('warn', 'Skipping install standardization (OMNYSYS_SKIP_POSTINSTALL=1).');
    return;
  }

  const nodeMajor = getNodeMajorVersion();
  if (nodeMajor < 18) {
    installerLog('err', `Node.js ${process.versions.node} detected. Node.js 18+ is required.`);
    process.exit(1);
  }

  const projectArg = process.argv[2];
  const projectPath = resolveProjectPath(projectArg || process.cwd());

  installerLog('info', `Applying OmnySys MCP standard in: ${projectPath}`);

  const result = await standardizeMcpInstallation({ projectPath });
  printAgentsResult(distributeAgentsTemplate(projectPath));
  printClientResults(result.clientResults);
  printTerminalResults(result.terminal);

  if (!result.success) {
    installerLog('err', 'MCP standardization finished with errors.');
    process.exit(1);
  }

  installerLog('ok', 'MCP standardization applied successfully.');
  installerLog('info', `MCP URL: ${result.mcpUrl}`);
  installerLog('info', `Health URL: http://127.0.0.1:${PORTS.mcp}/health`);
  installerLog('info', `Unified config: ${result.unifiedConfigPath}`);
  installerLog('info', `Workspace .mcp.json: ${result.workspace.files.dotMcp}`);
  installerLog('info', `Workspace mcp-servers.json: ${result.workspace.files.mcpServers}`);
  installerLog('info', `Workspace schema: ${result.workspace.files.mcpServersSchema}`);
  installerLog('info', `VS Code task: ${result.vscode.paths.tasks}`);
  installerLog('info', `VS Code settings: ${result.vscode.paths.settings}`);
  const qwenConfig = result.clientResults.find(r => r.client === 'qwen')?.projectConfigPath || '(not applied)';
  installerLog('info', `Qwen global config: ${qwenConfig}`);
  const antigravityConfig = result.clientResults.find(r => r.client === 'antigravity')?.path || '(not applied)';
  installerLog('info', `Antigravity config: ${antigravityConfig}`);
  const geminiConfig = result.clientResults.find(r => r.client === 'geminiCli')?.path || '(not applied)';
  installerLog('info', `Gemini CLI config: ${geminiConfig}`);

  printNextSteps();
}

main().catch((error) => {
  installerLog('err', error.message || 'Unknown installation error');
  process.exit(1);
});
