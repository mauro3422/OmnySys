import * as vscode from 'vscode';
import { OmnyPanel } from './OmnyPanel';
import { McpClient } from './McpClient';
import { SqliteEngine } from './database/SqliteEngine';

let statusBarItem: vscode.StatusBarItem;
let mcpClient: McpClient;
let sqliteEngine: SqliteEngine | null = null;
let pollInterval: ReturnType<typeof setInterval> | undefined;

export async function activate(context: vscode.ExtensionContext) {
  const projectPath = findProjectPath();
  mcpClient = new McpClient('http://127.0.0.1:9999');

  // Initialize SQLite reader (async — WASM)
  const dbPath = findDbPath(projectPath);
  if (dbPath) {
    const engine = new SqliteEngine(dbPath);
    const ok = await engine.init();
    if (ok) {
      sqliteEngine = engine;
      console.log('[OmnySystem Explorer] SQLite engine ready (sql.js WASM)');

      // Watch for DB changes → auto-refresh panel
      engine.onDbChange(() => {
        console.log('[OmnySystem Explorer] DB changed, refreshing panel...');
        OmnyPanel.currentPanel?.refreshData();
      });
    } else {
      console.warn('[OmnySystem Explorer] SQLite init failed, will use MCP fallback');
    }
  } else {
    console.warn('[OmnySystem Explorer] omnysys.db not found in project');
  }

  // Status bar
  statusBarItem = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Left, 50);
  statusBarItem.command = 'omnysystem.openDashboard';
  statusBarItem.text = '$(pulse) OmnySystem';
  statusBarItem.tooltip = 'Click to open OmnySystem Explorer';
  statusBarItem.show();
  context.subscriptions.push(statusBarItem);

  // Commands
  context.subscriptions.push(
    vscode.commands.registerCommand('omnysystem.openDashboard', () => {
      OmnyPanel.createOrShow(context.extensionUri, mcpClient, sqliteEngine, projectPath);
    }),
    vscode.commands.registerCommand('omnysystem.showFileAtoms', () => {
      const activeFile = vscode.window.activeTextEditor?.document.uri.fsPath;
      if (!activeFile) {
        vscode.window.showWarningMessage('No active file to analyze');
        return;
      }
      OmnyPanel.createOrShow(context.extensionUri, mcpClient, sqliteEngine, projectPath);
      setTimeout(() => {
        OmnyPanel.currentPanel?.sendMessage({
          type: 'navigateToFile',
          filePath: makeRelative(activeFile, projectPath)
        });
      }, 500);
    })
  );

  // Watch active editor changes → notify panel
  context.subscriptions.push(
    vscode.window.onDidChangeActiveTextEditor((editor) => {
      if (editor && OmnyPanel.currentPanel) {
        const filePath = makeRelative(editor.document.uri.fsPath, projectPath);
        if (/\.(js|ts|jsx|tsx|mjs)$/.test(filePath)) {
          OmnyPanel.currentPanel.sendMessage({
            type: 'activeFileChanged',
            filePath
          });
        }
      }
    })
  );

  // Poll health every 10 seconds
  pollInterval = setInterval(async () => {
    try {
      const health = await mcpClient.getHealth();
      if (health?.ready) {
        statusBarItem.text = '$(pulse) OmnySystem ✓';
        statusBarItem.backgroundColor = undefined;

        // Check sync between SQLite and MCP
        if (sqliteEngine && health.background) {
          // If DB was modified, check staleness
          if (sqliteEngine.isStale()) {
            statusBarItem.text = '$(sync~spin) OmnySystem ↻';
            sqliteEngine.reload();
          }
        }
      } else {
        statusBarItem.text = '$(warning) OmnySystem';
        statusBarItem.backgroundColor = new vscode.ThemeColor('statusBarItem.warningBackground');
      }
      OmnyPanel.currentPanel?.sendMessage({ type: 'healthUpdate', data: health });
    } catch {
      statusBarItem.text = '$(error) OmnySystem ✗';
      statusBarItem.backgroundColor = new vscode.ThemeColor('statusBarItem.errorBackground');
    }
  }, 10000);

  // Initial health check
  mcpClient.getHealth().then((health) => {
    if (health?.ready) statusBarItem.text = '$(pulse) OmnySystem ✓';
  }).catch(() => {});

  console.log('[OmnySystem Explorer] Extension activated');
}

export function deactivate() {
  if (pollInterval) clearInterval(pollInterval);
  sqliteEngine?.close();
  OmnyPanel.currentPanel?.dispose();
}

function findProjectPath(): string {
  const folders = vscode.workspace.workspaceFolders;
  if (folders && folders.length > 0) return folders[0].uri.fsPath;
  return process.cwd();
}

function findDbPath(projectPath: string): string | null {
  const path = require('path');
  const fs = require('fs');
  const candidates = [
    path.join(projectPath, '.omnysysdata', 'omnysys.db'),
    path.join(projectPath, 'omnysys.db')
  ];
  for (const c of candidates) {
    if (fs.existsSync(c)) {
      console.log('[OmnySystem Explorer] Found DB:', c);
      return c;
    }
  }
  return null;
}

function makeRelative(absPath: string, projectPath: string): string {
  const path = require('path');
  return path.relative(projectPath, absPath).replace(/\\/g, '/');
}
