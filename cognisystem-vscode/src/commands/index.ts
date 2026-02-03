import * as vscode from 'vscode';
import * as path from 'path';
import { CogniSystemProvider } from '../core/CogniSystemProvider';
import { CogniSystemTreeProvider } from '../providers/CogniSystemTreeProvider';
import { GraphPanel } from '../webviews/GraphPanel';
import { COMMANDS, CONTEXT_KEYS } from '../config';

/**
 * Registra todos los comandos de la extensión
 */
export function registerCommands(
  context: vscode.ExtensionContext,
  cogni: CogniSystemProvider,
  treeProvider: CogniSystemTreeProvider
): vscode.Disposable[] {
  const commands: vscode.Disposable[] = [];

  // Comando: Analizar Proyecto
  commands.push(
    vscode.commands.registerCommand(COMMANDS.ANALYZE_PROJECT, async () => {
      await analyzeProjectCommand(cogni, treeProvider);
    })
  );

  // Comando: Mostrar Grafo
  commands.push(
    vscode.commands.registerCommand(COMMANDS.SHOW_GRAPH, () => {
      showGraphCommand(context, cogni);
    })
  );

  // Comando: Mapa de Impacto
  commands.push(
    vscode.commands.registerCommand(
      COMMANDS.SHOW_IMPACT_MAP,
      async (uri?: vscode.Uri) => {
        await showImpactMapCommand(context, cogni, uri);
      }
    )
  );

  // Comando: Refrescar
  commands.push(
    vscode.commands.registerCommand(COMMANDS.REFRESH, () => {
      refreshCommand(cogni, treeProvider);
    })
  );

  return commands;
}

/**
 * Analiza el proyecto ejecutando el indexer
 */
async function analyzeProjectCommand(
  cogni: CogniSystemProvider,
  treeProvider: CogniSystemTreeProvider
): Promise<void> {
  const workspaceRoot = cogni.getProjectRoot();

  const terminal = vscode.window.createTerminal('CogniSystem');
  terminal.sendText(
    `cd "${workspaceRoot}" && node src/layer-a-static/indexer.js .`
  );
  terminal.show();

  // Esperar un poco y refrescar
  await new Promise((resolve) => setTimeout(resolve, 3000));

  cogni.clearCache();
  treeProvider.refresh();

  await vscode.commands.executeCommand(
    'setContext',
    CONTEXT_KEYS.ENABLED,
    true
  );

  vscode.window.showInformationMessage('✅ CogniSystem: Proyecto analizado');
}

/**
 * Muestra el grafo completo
 */
function showGraphCommand(
  context: vscode.ExtensionContext,
  cogni: CogniSystemProvider
): void {
  if (!cogni.isAnalyzed()) {
    vscode.window.showWarningMessage(
      'Primero analiza el proyecto con: CogniSystem: Analizar Proyecto'
    );
    return;
  }
  GraphPanel.createOrShow(context.extensionUri, cogni);
}

/**
 * Muestra el mapa de impacto de un archivo
 */
async function showImpactMapCommand(
  context: vscode.ExtensionContext,
  cogni: CogniSystemProvider,
  uri?: vscode.Uri
): Promise<void> {
  if (!cogni.isAnalyzed()) {
    vscode.window.showWarningMessage('Primero analiza el proyecto');
    return;
  }

  const filePath =
    uri?.fsPath || vscode.window.activeTextEditor?.document.fileName;

  if (!filePath) {
    vscode.window.showErrorMessage('No se seleccionó ningún archivo');
    return;
  }

  const impact = await cogni.getImpactMap(filePath);
  if (!impact) {
    vscode.window.showWarningMessage(
      'No se encontraron datos para este archivo'
    );
    return;
  }

  // Mostrar grafo enfocado
  GraphPanel.createOrShow(context.extensionUri, cogni, filePath);

  // Mostrar mensaje informativo
  const msg = `📊 ${path.basename(filePath)} → Afecta a ${impact.directlyAffects.length} archivos directamente, ${impact.semanticConnections.length} conexiones semánticas`;
  vscode.window.showInformationMessage(msg);
}

/**
 * Refresca los datos desde disco
 */
function refreshCommand(
  cogni: CogniSystemProvider,
  treeProvider: CogniSystemTreeProvider
): void {
  cogni.clearCache();
  treeProvider.refresh();
  vscode.window.showInformationMessage('🔄 CogniSystem: Datos refrescados');
}
