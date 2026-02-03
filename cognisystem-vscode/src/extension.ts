import * as vscode from 'vscode';
import { CogniSystemProvider } from './core/CogniSystemProvider';
import { CogniSystemTreeProvider } from './providers/CogniSystemTreeProvider';
import { registerCommands } from './commands';
import { VIEWS, CONTEXT_KEYS } from './config';

/**
 * Punto de entrada de la extensión CogniSystem
 */
export function activate(context: vscode.ExtensionContext): void {
  console.log('CogniSystem extension activating...');

  const workspaceRoot = getWorkspaceRoot();
  if (!workspaceRoot) {
    console.log('No workspace folder found');
    return;
  }

  // Inicializar provider principal
  const cogni = new CogniSystemProvider(workspaceRoot);

  // Crear TreeView provider
  const treeProvider = new CogniSystemTreeProvider(cogni);

  // Registrar TreeView
  vscode.window.registerTreeDataProvider(VIEWS.PANEL, treeProvider);

  // Configurar estado inicial
  setupInitialState(cogni);

  // Registrar comandos
  const commands = registerCommands(context, cogni, treeProvider);

  // Configurar watchers
  const watchers = setupFileWatchers(cogni, treeProvider);

  // Agregar todo a las suscripciones
  context.subscriptions.push(...commands, ...watchers);

  console.log('CogniSystem extension activated successfully');
}

/**
 * Obtiene la raíz del workspace
 */
function getWorkspaceRoot(): string | undefined {
  return vscode.workspace.workspaceFolders?.[0]?.uri.fsPath;
}

/**
 * Configura el estado inicial basado en si el proyecto está analizado
 */
async function setupInitialState(cogni: CogniSystemProvider): Promise<void> {
  if (cogni.isAnalyzed()) {
    await vscode.commands.executeCommand(
      'setContext',
      CONTEXT_KEYS.ENABLED,
      true
    );
  }
}

/**
 * Configura los watchers de archivos
 */
function setupFileWatchers(
  cogni: CogniSystemProvider,
  treeProvider: CogniSystemTreeProvider
): vscode.Disposable[] {
  const workspaceRoot = cogni.getProjectRoot();

  const watcher = vscode.workspace.createFileSystemWatcher(
    new vscode.RelativePattern(workspaceRoot, '.aver/**/*')
  );

  watcher.onDidChange(() => {
    cogni.clearCache();
    treeProvider.refresh();
  });

  watcher.onDidCreate(() => {
    vscode.commands.executeCommand('setContext', CONTEXT_KEYS.ENABLED, true);
    cogni.clearCache();
    treeProvider.refresh();
  });

  return [watcher];
}

/**
 * Cleanup al desactivar
 */
export function deactivate(): void {
  console.log('CogniSystem extension deactivated');
}
