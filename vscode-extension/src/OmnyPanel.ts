import * as vscode from 'vscode';
import * as path from 'path';
import * as fs from 'fs';
import { McpClient } from './McpClient';
import { SqliteReader } from './SqliteReader';

export class OmnyPanel {
  public static currentPanel: OmnyPanel | undefined;
  private static readonly viewType = 'omnysystemExplorer';

  private readonly _panel: vscode.WebviewPanel;
  private readonly _extensionUri: vscode.Uri;
  private readonly _mcpClient: McpClient;
  private readonly _sqliteReader: SqliteReader | null;
  private readonly _projectPath: string;
  private _disposed = false;

  public static createOrShow(
    extensionUri: vscode.Uri,
    mcpClient: McpClient,
    sqliteReader: SqliteReader | null,
    projectPath: string
  ) {
    const column = vscode.ViewColumn.Beside;
    if (OmnyPanel.currentPanel) {
      OmnyPanel.currentPanel._panel.reveal(column);
      return;
    }
    const panel = vscode.window.createWebviewPanel(
      OmnyPanel.viewType, 'OmnySystem Explorer', column,
      {
        enableScripts: true,
        retainContextWhenHidden: true,
        localResourceRoots: [
          vscode.Uri.joinPath(extensionUri, 'webview-ui', 'dist'),
          vscode.Uri.joinPath(extensionUri, 'dist')
        ]
      }
    );
    OmnyPanel.currentPanel = new OmnyPanel(panel, extensionUri, mcpClient, sqliteReader, projectPath);
  }

  private constructor(
    panel: vscode.WebviewPanel,
    extensionUri: vscode.Uri,
    mcpClient: McpClient,
    sqliteReader: SqliteReader | null,
    projectPath: string
  ) {
    this._panel = panel;
    this._extensionUri = extensionUri;
    this._mcpClient = mcpClient;
    this._sqliteReader = sqliteReader;
    this._projectPath = projectPath;

    this._panel.webview.html = this._getHtmlForWebview();
    this._panel.onDidDispose(() => this.dispose());

    this._panel.webview.onDidReceiveMessage(async (msg) => {
      try {
        await this._handleMessage(msg);
      } catch (err: any) {
        console.error('[OmnyPanel] Error:', err.message);
        this.sendMessage({ type: 'error', requestId: msg.requestId, error: err.message });
      }
    });

    setTimeout(() => this._sendInitialData(), 300);
  }

  public sendMessage(msg: any) {
    if (!this._disposed) {
      this._panel.webview.postMessage(msg);
    }
  }

  /** Called by extension when DB file changes on disk */
  public refreshData() {
    if (!this._disposed) {
      this._sendInitialData();
    }
  }

  public dispose() {
    this._disposed = true;
    OmnyPanel.currentPanel = undefined;
    this._panel.dispose();
  }

  private async _handleMessage(msg: any) {
    switch (msg.type) {
      case 'requestInitialData':
        await this._sendInitialData();
        break;
      case 'requestFileAtoms':
        await this._sendFileAtoms(msg.filePath, msg.requestId);
        break;
      case 'requestDependencies':
        await this._sendInitialData();
        break;
      case 'requestHealth':
        await this._sendHealthData(msg.requestId);
        break;
      case 'openFile':
        if (msg.filePath) {
          const absPath = path.join(this._projectPath, msg.filePath);
          vscode.window.showTextDocument(vscode.Uri.file(absPath));
        }
        break;
    }
  }

  // ── Data Loading — SQLite direct (primary) ────────────

  private async _sendInitialData() {
    try {
      let files: any[] = [];
      let deps: any[] = [];
      let stats: any = null;
      let dataSource = 'none';

      // SQLite direct — fast, no MCP overhead
      if (this._sqliteReader) {
        try {
          stats = this._sqliteReader.getStats();
          files = this._sqliteReader.getFilesWithRisk(300);
          deps = this._sqliteReader.getFileDependencies();
          dataSource = 'sqlite';
          console.log(`[OmnyPanel] SQLite: ${stats.totalAtoms} atoms, ${files.length} files, ${deps.length} deps`);
        } catch (err: any) {
          console.error('[OmnyPanel] SQLite query failed:', err.message);
        }
      }

      // Get health from MCP (lightweight, just /health endpoint)
      let health = null;
      try {
        health = await this._mcpClient.getHealth();
      } catch {}

      // Sync check: compare DB vs MCP
      let syncStatus = null;
      if (this._sqliteReader && health?.background) {
        const syncInfo = this._sqliteReader.getSyncInfo();
        syncStatus = {
          dbAtoms: syncInfo.dbAtoms,
          dbFiles: syncInfo.dbFiles,
          dbLastModified: syncInfo.lastModified.toISOString(),
          mcpSocieties: health.background.societiesCount || 0,
          mcpPhase2Pending: health.background.phase2PendingFiles || 0,
          inSync: true // Could compare counts for desync detection
        };
      }

      this.sendMessage({
        type: 'initialData',
        data: { files, dependencies: deps, stats, health, dataSource, syncStatus }
      });

    } catch (err: any) {
      console.error('[OmnyPanel] Initial data failed:', err.message);
      this.sendMessage({ type: 'error', error: 'Failed to load: ' + err.message });
    }
  }

  private async _sendFileAtoms(filePath: string, requestId?: string) {
    try {
      let atoms: any[] = [];
      let relations: any[] = [];

      if (this._sqliteReader) {
        atoms = this._sqliteReader.getAtomsForFile(filePath);
        relations = this._sqliteReader.getRelationsForFile(filePath);
      }

      this.sendMessage({
        type: 'fileAtoms',
        requestId,
        data: { filePath, atoms, relations }
      });
    } catch (err: any) {
      this.sendMessage({ type: 'error', requestId, error: err.message });
    }
  }

  private async _sendHealthData(requestId?: string) {
    try {
      const health = await this._mcpClient.getHealth();
      this.sendMessage({ type: 'healthData', requestId, data: health });
    } catch (err: any) {
      this.sendMessage({ type: 'error', requestId, error: err.message });
    }
  }

  private _getHtmlForWebview(): string {
    const webview = this._panel.webview;
    const distPath = vscode.Uri.joinPath(this._extensionUri, 'webview-ui', 'dist');
    const indexPath = path.join(distPath.fsPath, 'index.html');

    if (fs.existsSync(indexPath)) {
      let html = fs.readFileSync(indexPath, 'utf8');
      const baseUri = webview.asWebviewUri(distPath);
      html = html.replace(/(href|src)="\.\/([^"]*)"/g, `$1="${baseUri}/$2"`);
      return html;
    }

    return `<!DOCTYPE html>
    <html><head><style>
      body { font-family:system-ui; color:#cdd6f4; background:#1e1e2e; display:flex; justify-content:center; align-items:center; min-height:100vh; margin:0; }
    </style></head><body>
      <div style="text-align:center"><h2>OmnySystem Explorer</h2><p>Build webview: <code>cd webview-ui && npm run build</code></p></div>
    </body></html>`;
  }
}
