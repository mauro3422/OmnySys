import * as vscode from 'vscode';
import * as path from 'path';
import { CogniSystemProvider } from '../core/CogniSystemProvider';
import { COMMANDS, SEVERITY_ICONS } from '../config';

/**
 * Item del TreeView
 */
class CogniSystemTreeItem extends vscode.TreeItem {
  constructor(
    public readonly label: string,
    public readonly collapsibleState: vscode.TreeItemCollapsibleState,
    public readonly command?: vscode.Command,
    public readonly contextValue?: string,
    public readonly tooltip?: string
  ) {
    super(label, collapsibleState);
    this.tooltip = tooltip || label;
    if (command) {
      this.command = command;
    }
  }
}

/**
 * TreeView Provider para el panel lateral de CogniSystem
 */
export class CogniSystemTreeProvider
  implements vscode.TreeDataProvider<CogniSystemTreeItem>
{
  private _onDidChangeTreeData: vscode.EventEmitter<
    CogniSystemTreeItem | undefined | null | void
  > = new vscode.EventEmitter<CogniSystemTreeItem | undefined | null | void>();

  readonly onDidChangeTreeData: vscode.Event<
    CogniSystemTreeItem | undefined | null | void
  > = this._onDidChangeTreeData.event;

  constructor(private cogni: CogniSystemProvider) {}

  refresh(): void {
    this._onDidChangeTreeData.fire();
  }

  getTreeItem(element: CogniSystemTreeItem): vscode.TreeItem {
    return element;
  }

  async getChildren(
    element?: CogniSystemTreeItem
  ): Promise<CogniSystemTreeItem[]> {
    if (!this.cogni.isAnalyzed()) {
      return [];
    }

    if (!element) {
      return this.getRootItems();
    }

    if (element.label?.startsWith('🔥')) {
      return this.getHighRiskItems();
    }

    return [];
  }

  private getRootItems(): CogniSystemTreeItem[] {
    const highRisk = this.cogni.getHighRiskFiles().slice(0, 10);

    return [
      new CogniSystemTreeItem(
        '🔥 Archivos de Alto Riesgo',
        highRisk.length > 0
          ? vscode.TreeItemCollapsibleState.Expanded
          : vscode.TreeItemCollapsibleState.Collapsed
      ),
      new CogniSystemTreeItem(
        '📊 Ver Grafo Completo',
        vscode.TreeItemCollapsibleState.None,
        {
          command: COMMANDS.SHOW_GRAPH,
          title: 'Mostrar Grafo',
          arguments: [],
        },
        'showGraph'
      ),
      new CogniSystemTreeItem(
        '🔄 Refrescar Análisis',
        vscode.TreeItemCollapsibleState.None,
        {
          command: COMMANDS.REFRESH,
          title: 'Refrescar',
          arguments: [],
        }
      ),
    ];
  }

  private getHighRiskItems(): CogniSystemTreeItem[] {
    const highRisk = this.cogni.getHighRiskFiles().slice(0, 10);

    return highRisk.map((file) => {
      const icon = SEVERITY_ICONS[file.severity] || '⚪';
      return new CogniSystemTreeItem(
        `${icon} ${path.basename(file.path)}`,
        vscode.TreeItemCollapsibleState.None,
        {
          command: 'vscode.open',
          title: 'Abrir archivo',
          arguments: [
            vscode.Uri.file(
              path.join(this.cogni.getProjectRoot(), file.path)
            ),
          ],
        },
        'riskFile',
        `Riesgo: ${file.score}/10`
      );
    });
  }
}
