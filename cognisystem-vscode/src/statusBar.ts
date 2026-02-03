/**
 * Status Bar Manager
 *
 * Muestra el estado de CogniSystem en la barra de estado de VS Code.
 */

import * as vscode from 'vscode';
import { CogniSystemAPI } from './api';

export class StatusBarManager {
  private statusBarItem: vscode.StatusBarItem;
  private api: CogniSystemAPI;
  private pollingInterval: NodeJS.Timeout | null = null;

  constructor(api: CogniSystemAPI) {
    this.api = api;
    this.statusBarItem = vscode.window.createStatusBarItem(
      vscode.StatusBarAlignment.Right,
      100
    );
    this.statusBarItem.command = 'cognisystem.showImpact';
    this.statusBarItem.show();
  }

  /**
   * Update status bar display
   */
  updateStatus(status: 'connected' | 'disconnected' | 'ready' | 'analyzing') {
    switch (status) {
      case 'ready':
      case 'connected':
        this.statusBarItem.text = '$(brain) CogniSystem';
        this.statusBarItem.tooltip = 'CogniSystem connected - Click to view impact';
        this.statusBarItem.backgroundColor = undefined;
        break;

      case 'analyzing':
        this.statusBarItem.text = '$(sync~spin) Analyzing...';
        this.statusBarItem.tooltip = 'Analysis in progress';
        this.statusBarItem.backgroundColor = undefined;
        break;

      case 'disconnected':
        this.statusBarItem.text = '$(debug-disconnect) CogniSystem';
        this.statusBarItem.tooltip = 'CogniSystem disconnected - Click to start server';
        this.statusBarItem.command = 'cognisystem.startServer';
        this.statusBarItem.backgroundColor = new vscode.ThemeColor('statusBarItem.warningBackground');
        break;
    }
  }

  /**
   * Show analyzing status
   */
  setAnalyzing(fileName: string) {
    this.statusBarItem.text = `$(sync~spin) Analyzing ${fileName}...`;
    this.statusBarItem.tooltip = `Analyzing ${fileName}`;
  }

  /**
   * Show quick stats from impact
   */
  showQuickStats(impact: any) {
    const affected = impact.totalAffected || 0;
    const risk = impact.riskLevel || 'unknown';

    this.statusBarItem.text = `$(brain) ${affected} deps · ${risk}`;
    this.statusBarItem.tooltip = `${affected} dependent files · Risk: ${risk}`;
  }

  /**
   * Start polling for status
   */
  startPolling(intervalMs: number = 5000) {
    this.pollingInterval = setInterval(async () => {
      try {
        const status = await this.api.getBridgeStatus();

        if (status.orchestrator?.currentJob) {
          this.setAnalyzing(status.orchestrator.currentJob.filePath);
        } else {
          this.updateStatus('connected');
        }
      } catch (error) {
        this.updateStatus('disconnected');
      }
    }, intervalMs);
  }

  /**
   * Stop polling
   */
  stopPolling() {
    if (this.pollingInterval) {
      clearInterval(this.pollingInterval);
      this.pollingInterval = null;
    }
  }

  dispose() {
    this.stopPolling();
    this.statusBarItem.dispose();
  }
}
