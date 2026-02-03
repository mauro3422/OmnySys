/**
 * Tree Data Provider
 *
 * Muestra la estructura del proyecto y estado de análisis en el panel lateral.
 */

import * as vscode from 'vscode';
import * as path from 'path';
import { CogniSystemAPI } from './api';

export class TreeDataProvider implements vscode.TreeDataProvider<TreeItem> {
  private _onDidChangeTreeData: vscode.EventEmitter<TreeItem | undefined> = new vscode.EventEmitter();
  readonly onDidChangeTreeData: vscode.Event<TreeItem | undefined> = this._onDidChangeTreeData.event;

  private api: CogniSystemAPI;
  private files: any[] = [];

  constructor(api: CogniSystemAPI) {
    this.api = api;
  }

  async refresh(): Promise<void> {
    try {
      const result = await this.api.getFiles();
      this.files = result.files || [];
    } catch (error) {
      this.files = [];
    }
    this._onDidChangeTreeData.fire(undefined);
  }

  getTreeItem(element: TreeItem): vscode.TreeItem {
    return element;
  }

  async getChildren(element?: TreeItem): Promise<TreeItem[]> {
    if (!element) {
      // Root level - show categories
      return [
        new CategoryItem('High Risk Files', 'high-risk', this.getHighRiskCount()),
        new CategoryItem('Recent Analysis', 'recent', 0),
        new CategoryItem('All Files', 'all', this.files.length)
      ];
    }

    if (element instanceof CategoryItem) {
      switch (element.id) {
        case 'high-risk':
          return this.files
            .filter(f => f.riskSeverity === 'high' || f.riskSeverity === 'critical')
            .map(f => new FileItem(f, this.getFileUri(f.path)));

        case 'all':
          return this.files
            .slice(0, 100) // Limit for performance
            .map(f => new FileItem(f, this.getFileUri(f.path)));

        default:
          return [];
      }
    }

    return [];
  }

  private getHighRiskCount(): number {
    return this.files.filter(f => f.riskSeverity === 'high' || f.riskSeverity === 'critical').length;
  }

  private getFileUri(relativePath: string): vscode.Uri {
    const workspacePath = vscode.workspace.workspaceFolders?.[0].uri.fsPath;
    return vscode.Uri.file(path.join(workspacePath || '', relativePath));
  }
}

/**
 * Base tree item
 */
class TreeItem extends vscode.TreeItem {
  constructor(
    label: string,
    collapsibleState: vscode.TreeItemCollapsibleState
  ) {
    super(label, collapsibleState);
  }
}

/**
 * Category item (root level)
 */
class CategoryItem extends TreeItem {
  id: string;

  constructor(label: string, id: string, count: number) {
    super(`${label} (${count})`, vscode.TreeItemCollapsibleState.Collapsed);
    this.id = id;
    this.iconPath = this.getIcon(id);
  }

  private getIcon(id: string): vscode.ThemeIcon {
    switch (id) {
      case 'high-risk': return new vscode.ThemeIcon('warning');
      case 'recent': return new vscode.ThemeIcon('history');
      case 'all': return new vscode.ThemeIcon('files');
      default: return new vscode.ThemeIcon('folder');
    }
  }
}

/**
 * File item
 */
class FileItem extends TreeItem {
  fileInfo: any;

  constructor(fileInfo: any, uri: vscode.Uri) {
    super(path.basename(fileInfo.path), vscode.TreeItemCollapsibleState.None);
    this.fileInfo = fileInfo;
    this.resourceUri = uri;
    this.tooltip = this.buildTooltip();
    this.iconPath = this.getRiskIcon();
    this.command = {
      command: 'vscode.open',
      title: 'Open File',
      arguments: [uri]
    };
  }

  private buildTooltip(): string {
    return [
      `Path: ${this.fileInfo.path}`,
      `Risk: ${this.fileInfo.riskSeverity} (${this.fileInfo.riskScore})`,
      `Exports: ${this.fileInfo.exports}`,
      `Imports: ${this.fileInfo.imports}`,
      `Subsystem: ${this.fileInfo.subsystem || 'none'}`
    ].join('\n');
  }

  private getRiskIcon(): vscode.ThemeIcon {
    switch (this.fileInfo.riskSeverity) {
      case 'critical':
      case 'high':
        return new vscode.ThemeIcon('error');
      case 'medium':
        return new vscode.ThemeIcon('warning');
      default:
        return new vscode.ThemeIcon('file-code');
    }
  }
}
