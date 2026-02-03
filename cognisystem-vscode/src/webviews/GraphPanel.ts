import * as vscode from 'vscode';
import * as path from 'path';
import { CogniSystemProvider } from '../core/CogniSystemProvider';
import { generateGraphHtml } from './graphTemplate';

/**
 * Panel del grafo interactivo
 */
export class GraphPanel {
  public static currentPanel: GraphPanel | undefined;
  public static readonly viewType = 'cognisystemGraph';

  private readonly panel: vscode.WebviewPanel;
  private disposables: vscode.Disposable[] = [];

  public static createOrShow(
    extensionUri: vscode.Uri,
    cogni: CogniSystemProvider,
    initialFile?: string
  ): void {
    const column = vscode.window.activeTextEditor
      ? vscode.ViewColumn.Beside
      : vscode.ViewColumn.One;

    if (GraphPanel.currentPanel) {
      GraphPanel.currentPanel.panel.reveal(column);
      if (initialFile) {
        GraphPanel.currentPanel.highlightFile(initialFile);
      }
      return;
    }

    const panel = vscode.window.createWebviewPanel(
      GraphPanel.viewType,
      'CogniSystem Graph',
      column,
      {
        enableScripts: true,
        retainContextWhenHidden: true,
        localResourceRoots: [extensionUri],
      }
    );

    GraphPanel.currentPanel = new GraphPanel(panel, cogni, initialFile);
  }

  private constructor(
    panel: vscode.WebviewPanel,
    private cogni: CogniSystemProvider,
    private initialFile?: string
  ) {
    this.panel = panel;
    this.panel.title = initialFile
      ? `CogniSystem: ${path.basename(initialFile)}`
      : 'CogniSystem Graph';

    this.loadAndRender();
    this.setupMessageHandling();

    this.panel.onDidDispose(() => this.dispose(), null, this.disposables);
  }

  private async loadAndRender(): Promise<void> {
    const graphData = await this.cogni.getAllConnections();
    const relativeInitialFile = this.initialFile
      ? path
          .relative(this.cogni.getProjectRoot(), this.initialFile)
          .replace(/\\/g, '/')
      : null;

    this.panel.webview.html = generateGraphHtml(graphData, relativeInitialFile);
  }

  private setupMessageHandling(): void {
    this.panel.webview.onDidReceiveMessage(
      async (message) => {
        switch (message.command) {
          case 'openFile':
            await this.handleOpenFile(message.file);
            return;
        }
      },
      null,
      this.disposables
    );
  }

  private async handleOpenFile(filePath: string): Promise<void> {
    const fullPath = path.join(this.cogni.getProjectRoot(), filePath);
    const doc = await vscode.workspace.openTextDocument(fullPath);
    await vscode.window.showTextDocument(doc);
  }

  private highlightFile(filePath: string): void {
    const relativePath = path
      .relative(this.cogni.getProjectRoot(), filePath)
      .replace(/\\/g, '/');
    this.panel.webview.postMessage({
      command: 'highlightFile',
      file: relativePath,
    });
  }

  public dispose(): void {
    GraphPanel.currentPanel = undefined;
    this.panel.dispose();
    while (this.disposables.length) {
      const x = this.disposables.pop();
      if (x) {
        x.dispose();
      }
    }
  }
}
