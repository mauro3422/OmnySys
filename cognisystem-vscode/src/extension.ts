/**
 * CogniSystem VS Code Extension
 *
 * Integra CogniSystem con VS Code para análisis de impacto en tiempo real.
 *
 * Features:
 * - Status bar indicator
 * - File analysis on save
 * - Impact preview in hover
 * - Queue management
 */

import * as vscode from 'vscode';
import * as path from 'path';
import { CogniSystemAPI } from './api';
import { StatusBarManager } from './statusBar';
import { TreeDataProvider } from './treeProvider';

let api: CogniSystemAPI;
let statusBar: StatusBarManager;
let treeProvider: TreeDataProvider;

/**
 * Extension activation
 */
export function activate(context: vscode.ExtensionContext) {
  console.log('CogniSystem extension activated');

  const config = vscode.workspace.getConfiguration('cognisystem');
  const orchestratorPort = config.get<number>('orchestratorPort', 9999);
  const bridgePort = config.get<number>('bridgePort', 9998);

  // Initialize API client
  api = new CogniSystemAPI(orchestratorPort, bridgePort);

  // Initialize UI components
  statusBar = new StatusBarManager(api);
  treeProvider = new TreeDataProvider(api);

  // Register tree view
  vscode.window.createTreeView('cognisystemExplorer', {
    treeDataProvider,
    showCollapseAll: true
  });

  // Register commands
  context.subscriptions.push(
    vscode.commands.registerCommand('cognisystem.analyzeFile', analyzeFile),
    vscode.commands.registerCommand('cognisystem.showImpact', showImpact),
    vscode.commands.registerCommand('cognisystem.refresh', refresh),
    vscode.commands.registerCommand('cognisystem.startServer', startServer),
    vscode.commands.registerCommand('cognisystem.stopServer', stopServer),
    vscode.commands.registerCommand('cognisystem.openSettings', openSettings)
  );

  // Register event handlers
  context.subscriptions.push(
    vscode.workspace.onDidSaveTextDocument(onFileSave),
    vscode.workspace.onDidOpenTextDocument(onFileOpen),
    vscode.languages.registerHoverProvider({ scheme: 'file' }, hoverProvider())
  );

  // Start polling for status
  statusBar.startPolling();

  // Initial connection check
  checkConnection();
}

/**
 * Analyze current file
 */
async function analyzeFile(uri?: vscode.Uri) {
  const filePath = uri?.fsPath || vscode.window.activeTextEditor?.document.fileName;
  if (!filePath) {
    vscode.window.showWarningMessage('No file selected');
    return;
  }

  const projectPath = vscode.workspace.workspaceFolders?.[0].uri.fsPath;
  if (!projectPath) {
    vscode.window.showErrorMessage('No workspace open');
    return;
  }

  const relativePath = path.relative(projectPath, filePath).replace(/\\/g, '/');

  try {
    statusBar.setAnalyzing(relativePath);
    const result = await api.prioritize(relativePath, 'high');

    if (result.status === 'completed') {
      vscode.window.showInformationMessage(`✅ ${path.basename(relativePath)} already analyzed`);
    } else if (result.status === 'analyzing') {
      vscode.window.showInformationMessage(`⚡ Analyzing ${path.basename(relativePath)}...`);
    } else {
      vscode.window.showInformationMessage(`📥 Queued ${path.basename(relativePath)} at position ${result.position}`);
    }
  } catch (error) {
    vscode.window.showErrorMessage(`Failed to analyze: ${error}`);
  }
}

/**
 * Show impact map for file
 */
async function showImpact(uri?: vscode.Uri) {
  const filePath = uri?.fsPath || vscode.window.activeTextEditor?.document.fileName;
  if (!filePath) {
    vscode.window.showWarningMessage('No file selected');
    return;
  }

  const projectPath = vscode.workspace.workspaceFolders?.[0].uri.fsPath;
  if (!projectPath) return;

  const relativePath = path.relative(projectPath, filePath).replace(/\\/g, '/');

  try {
    const impact = await api.getImpact(relativePath);

    const panel = vscode.window.createWebviewPanel(
      'cognisystemImpact',
      `Impact: ${path.basename(relativePath)}`,
      vscode.ViewColumn.Beside,
      { enableScripts: true }
    );

    panel.webview.html = generateImpactHtml(impact, relativePath);
  } catch (error) {
    vscode.window.showErrorMessage(`Failed to get impact: ${error}`);
  }
}

/**
 * Refresh tree view
 */
async function refresh() {
  await treeProvider.refresh();
  vscode.window.showInformationMessage('CogniSystem refreshed');
}

/**
 * Start CogniSystem server
 */
async function startServer() {
  const terminal = vscode.window.createTerminal('CogniSystem');
  terminal.sendText('omnysystem serve .');
  terminal.show();

  // Wait for server to start
  let attempts = 0;
  while (attempts < 30) {
    await new Promise(r => setTimeout(r, 1000));
    const health = await api.healthCheck();
    if (health.status === 'healthy') {
      vscode.window.showInformationMessage('✅ CogniSystem server ready');
      statusBar.updateStatus('ready');
      return;
    }
    attempts++;
  }

  vscode.window.showErrorMessage('Server failed to start within 30 seconds');
}

/**
 * Stop server (not implemented - manual kill for now)
 */
async function stopServer() {
  vscode.window.showInformationMessage('Use Ctrl+C in terminal to stop server');
}

/**
 * Open settings
 */
function openSettings() {
  vscode.commands.executeCommand('workbench.action.openSettings', 'cognisystem');
}

/**
 * Handle file save
 */
function onFileSave(document: vscode.TextDocument) {
  const config = vscode.workspace.getConfiguration('cognisystem');
  const analyzeOnSave = config.get<boolean>('analyzeOnSave', true);

  if (analyzeOnSave && isJavaScriptFile(document)) {
    analyzeFile(document.uri);
  }
}

/**
 * Handle file open
 */
async function onFileOpen(document: vscode.TextDocument) {
  if (!isJavaScriptFile(document)) return;

  const config = vscode.workspace.getConfiguration('cognisystem');
  const showImpactOnOpen = config.get<boolean>('showImpactOnOpen', false);

  if (showImpactOnOpen) {
    const projectPath = vscode.workspace.workspaceFolders?.[0].uri.fsPath;
    if (!projectPath) return;

    const relativePath = path.relative(projectPath, document.fileName).replace(/\\/g, '/');

    try {
      const impact = await api.getImpact(relativePath);
      statusBar.showQuickStats(impact);
    } catch (error) {
      // Ignore errors on open
    }
  }
}

/**
 * Check server connection
 */
async function checkConnection() {
  try {
    const health = await api.healthCheck();
    if (health.status === 'healthy') {
      statusBar.updateStatus('connected');
    } else {
      statusBar.updateStatus('disconnected');
    }
  } catch (error) {
    statusBar.updateStatus('disconnected');
  }
}

/**
 * Hover provider for impact info
 */
function hoverProvider(): vscode.HoverProvider {
  return {
    async provideHover(document, position) {
      const config = vscode.workspace.getConfiguration('cognisystem');
      const enableHover = config.get<boolean>('enableHover', true);
      if (!enableHover) return;

      const projectPath = vscode.workspace.workspaceFolders?.[0].uri.fsPath;
      if (!projectPath) return;

      const relativePath = path.relative(projectPath, document.fileName).replace(/\\/g, '/');

      try {
        const impact = await api.getImpact(relativePath);
        if (impact.error) return;

        const content = new vscode.MarkdownString();
        content.appendMarkdown(`### 🧠 CogniSystem Impact\n\n`);
        content.appendMarkdown(`**Risk Level:** ${impact.riskLevel || 'unknown'}\n\n`);
        content.appendMarkdown(`**Directly Affects:** ${impact.directlyAffects?.length || 0} files\n\n`);
        content.appendMarkdown(`**Semantic Connections:** ${impact.semanticConnections?.length || 0}\n\n`);

        if (impact.directlyAffects?.length > 0) {
          content.appendMarkdown(`**Top Dependents:**\n`);
          impact.directlyAffects.slice(0, 5).forEach((f: string) => {
            content.appendMarkdown(`- \`${f}\`\n`);
          });
        }

        content.appendMarkdown(`\n*[Click to view full impact]*`);
        content.isTrusted = true;

        return new vscode.Hover(content);
      } catch (error) {
        return;
      }
    }
  };
}

/**
 * Check if document is JavaScript/TypeScript
 */
function isJavaScriptFile(document: vscode.TextDocument): boolean {
  return /\.(js|ts|jsx|tsx)$/.test(document.fileName);
}

/**
 * Generate HTML for impact panel
 */
function generateImpactHtml(impact: any, filePath: string): string {
  const dependents = impact.directlyAffects || [];
  const transitive = impact.transitiveAffects || [];
  const semantic = impact.semanticConnections || [];

  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <style>
    body { font-family: var(--vscode-font-family); padding: 20px; color: var(--vscode-foreground); }
    h1 { font-size: 1.5em; margin-bottom: 0.5em; }
    h2 { font-size: 1.2em; margin-top: 1.5em; margin-bottom: 0.5em; }
    .stats { display: flex; gap: 20px; margin: 20px 0; }
    .stat { background: var(--vscode-panel-background); padding: 15px; border-radius: 5px; min-width: 120px; }
    .stat-value { font-size: 2em; font-weight: bold; color: var(--vscode-textLink-foreground); }
    .stat-label { font-size: 0.9em; opacity: 0.8; }
    .file-list { list-style: none; padding: 0; }
    .file-list li { padding: 5px 0; border-bottom: 1px solid var(--vscode-panel-border); }
    .risk-critical { color: #f48771; }
    .risk-high { color: #cca700; }
    .risk-medium { color: #75beff; }
    .risk-low { color: #89d185; }
  </style>
</head>
<body>
  <h1>Impact Analysis: ${path.basename(filePath)}</h1>

  <div class="stats">
    <div class="stat">
      <div class="stat-value ${getRiskClass(impact.riskLevel)}">${impact.riskLevel || '?'}</div>
      <div class="stat-label">Risk Level</div>
    </div>
    <div class="stat">
      <div class="stat-value">${dependents.length}</div>
      <div class="stat-label">Direct Dependents</div>
    </div>
    <div class="stat">
      <div class="stat-value">${transitive.length}</div>
      <div class="stat-label">Transitive</div>
    </div>
    <div class="stat">
      <div class="stat-value">${semantic.length}</div>
      <div class="stat-label">Semantic Connections</div>
    </div>
  </div>

  <h2>Direct Dependents (${dependents.length})</h2>
  <ul class="file-list">
    ${dependents.slice(0, 20).map((f: string) => `<li>${f}</li>`).join('')}
    ${dependents.length > 20 ? `<li>... and ${dependents.length - 20} more</li>` : ''}
  </ul>

  <h2>Semantic Connections (${semantic.length})</h2>
  <ul class="file-list">
    ${semantic.slice(0, 10).map((c: any) => `
      <li>
        <strong>${c.type}</strong>: ${c.target}
        ${c.key ? `(${c.key})` : ''}
      </li>
    `).join('')}
  </ul>
</body>
</html>`;
}

function getRiskClass(risk: string): string {
  switch (risk) {
    case 'critical': return 'risk-critical';
    case 'high': return 'risk-high';
    case 'medium': return 'risk-medium';
    default: return 'risk-low';
  }
}

export function deactivate() {
  statusBar?.stopPolling();
}
