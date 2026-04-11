import { getAtomicEditor } from '../../../core/atomic-editor/index.js';
import { AtomicEditor } from '../../../core/atomic-editor/AtomicEditor.js';
import { calculateRelativeImport } from '../../../utils/path-utils.js';
import fs from 'fs';
import path from 'path';
import { spawnSync } from 'child_process';
import { createLogger } from '../../../utils/logger.js';
import { loadConsolidationClusterContext } from '#shared/compiler/index.js';

const logger = createLogger('OmnySys:mcp:consolidate_cluster');

function isBarrelFile(filePath, projectPath) {
  try {
    const fullPath = path.resolve(projectPath, filePath);
    const content = fs.readFileSync(fullPath, 'utf-8');
    const lines = content.trim().split('\n');
    const nonEmptyLines = lines.filter((l) => l.trim() && !l.trim().startsWith('//'));
    const hasOnlyExports = nonEmptyLines.every((l) =>
      l.trim().startsWith('export') || l.trim().startsWith('import') || l.trim() === '');
    return nonEmptyLines.length <= 5 && hasOnlyExports;
  } catch {
    return false;
  }
}

function findFunctionBoundaries(lines, symbolName) {
  let startLine = -1;
  for (let i = 0; i < lines.length; i++) {
    if (lines[i].includes(`function ${symbolName}`) || lines[i].includes(`${symbolName} = function`) || lines[i].includes(`${symbolName} = (`)) {
      startLine = i;
      break;
    }
  }
  if (startLine === -1) return { startLine: -1, endLine: -1 };

  let braceCount = 0;
  let endLine = -1;
  for (let i = startLine; i < lines.length; i++) {
    for (const ch of lines[i]) {
      if (ch === '{') braceCount++;
      else if (ch === '}') {
        braceCount--;
        if (braceCount === 0) {
          endLine = i;
          break;
        }
      }
    }
    if (endLine !== -1) break;
  }
  return { startLine, endLine };
}

function extractFunctionSignature(fullFunctionText) {
  const openBraceIdx = fullFunctionText.indexOf('{');
  if (openBraceIdx === -1) {
    throw new Error('Could not find opening brace');
  }
  return fullFunctionText.substring(0, openBraceIdx + 1);
}

function buildNewFunctionText(signaturePart, newBody) {
  return `${signaturePart.trim()}\n  ${newBody.trim()}\n}`;
}

function findImportInsertionPoint(lines) {
  let lastImportIdx = -1;
  for (let i = 0; i < lines.length; i++) {
    if (lines[i].trim().startsWith('import ')) lastImportIdx = i;
  }
  if (lastImportIdx === -1) {
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();
      if (line && !line.startsWith('//') && !line.startsWith('/*') && !line.startsWith('*') && !line.startsWith('#!') && !line.startsWith('/**')) {
        lastImportIdx = i - 1;
        break;
      }
    }
    if (lastImportIdx === -1) lastImportIdx = 0;
  }
  return lastImportIdx;
}

function validateSyntax(content, projectPath) {
  const tmpFile = path.join(projectPath, '.tmp-validation.js');
  fs.writeFileSync(tmpFile, content, 'utf-8');
  try {
    const result = spawnSync(process.execPath, ['--check', tmpFile], {
      encoding: 'utf-8',
      timeout: 5000,
      windowsHide: true
    });
    if (result.status !== 0) {
      throw new Error(`Syntax validation failed: ${result.stderr?.split('\n')[0] || 'Unknown error'}`);
    }
  } finally {
    fs.unlinkSync(tmpFile);
  }
}

async function applyFragmentEdit(filePath, projectPath, symbolName, newBody, needsImport, importStatement) {
  const absolutePath = path.resolve(projectPath, filePath);
  const originalContent = fs.readFileSync(absolutePath, 'utf-8');
  const lines = originalContent.split('\n');
  const { startLine, endLine } = findFunctionBoundaries(lines, symbolName);
  if (startLine === -1) throw new Error(`Function "${symbolName}" not found in ${filePath}`);
  if (endLine === -1) throw new Error(`Could not find closing brace for "${symbolName}" in ${filePath}`);

  const fullFunctionText = lines.slice(startLine, endLine + 1).join('\n');
  const signaturePart = extractFunctionSignature(fullFunctionText);
  const newFunction = buildNewFunctionText(signaturePart, newBody);
  lines.splice(startLine, endLine - startLine + 1, newFunction);

  if (needsImport && importStatement) {
    lines.splice(findImportInsertionPoint(lines) + 1, 0, importStatement);
  }

  const newContent = lines.join('\n');
  validateSyntax(newContent, projectPath);
  fs.writeFileSync(absolutePath, newContent, 'utf-8');
  return { success: true, file: filePath };
}

function buildWrapperDelegationSuggestion(duplicate, ssotAtom, relPath, projectPath) {
  const ssotImportPath = relPath;
  const ssotName = ssotAtom.name;
  const duplicateName = duplicate.name;

  if (duplicate.atom_type === 'method') {
    return {
      status: 'error',
      error: `Unsafe auto-consolidation: method '${duplicateName}' matches the SSOT symbol name. Extract a coordinator/API helper first and migrate callers manually.`
    };
  }

  const isBarrel = isBarrelFile(duplicate.file_path, projectPath);
  if (isBarrel && duplicateName === ssotName) {
    return { status: 'preview', type: 'file-replace', strategy: 're-export', suggestion: `export { ${ssotName} } from '${ssotImportPath}';` };
  }

  const aliasName = `canonical${ssotName.charAt(0).toUpperCase()}${ssotName.slice(1)}`;
  return {
    status: 'preview',
    type: duplicate.atom_type,
    strategy: 'wrapper-delegation',
    needsImport: true,
    importStatement: `import { ${ssotName} as ${aliasName} } from '${ssotImportPath}';`,
    replacementBody: `return ${aliasName}(...args);`,
    description: `Replace body of '${duplicateName}' with delegation to SSOT '${ssotName}' via ${aliasName}`
  };
}

async function runConsolidateConceptualCluster(args, context) {
  const { semanticFingerprint, ssotFilePath, execute = false } = args;
  const { projectPath, orchestrator } = context;

  if (!semanticFingerprint || !ssotFilePath) {
    return { success: false, error: 'Parametros obligatorios: semanticFingerprint, ssotFilePath' };
  }

  logger.info(`[Tool] consolidating cluster: ${semanticFingerprint} -> ${ssotFilePath}`);

  const atomicEditor = orchestrator?.atomicEditor || getAtomicEditor(() => new AtomicEditor(projectPath, orchestrator));
  const clusterContext = loadConsolidationClusterContext(projectPath, semanticFingerprint, ssotFilePath);
  if (!clusterContext.success) {
    return clusterContext;
  }

  const { ssotAtom, duplicates, totalFound } = clusterContext;
  const results = {
    success: true,
    fingerprint: semanticFingerprint,
    ssot: { name: ssotAtom.name, path: ssotAtom.file_path },
    totalFound,
    duplicatesCount: duplicates.length,
    actions: []
  };

  if (duplicates.length === 0) {
    return { ...results, message: 'No hay duplicados para consolidar.' };
  }

  for (const duplicate of duplicates) {
    const action = { targetFile: duplicate.file_path, targetSymbol: duplicate.name, status: 'pending' };
    try {
      const relPath = calculateRelativeImport(duplicate.file_path, ssotAtom.file_path, projectPath);
      const plan = buildWrapperDelegationSuggestion(duplicate, ssotAtom, relPath, projectPath);
      action.status = plan.status;

      if (plan.error) {
        action.error = plan.error;
        results.actions.push(action);
        continue;
      }

      action.type = plan.type;
      action.strategy = plan.strategy;
      action.suggestion = plan.suggestion;
      action.description = plan.description;

      if (execute) {
        try {
          let result;
          if (plan.strategy === 'wrapper-delegation') {
            result = await applyFragmentEdit(duplicate.file_path, projectPath, duplicate.name, plan.replacementBody, plan.needsImport, plan.importStatement);
          } else if (plan.strategy === 're-export') {
            result = await atomicEditor.edit(duplicate.file_path, null, plan.suggestion, { symbolName: duplicate.name, autoFix: false });
          } else {
            result = await atomicEditor.edit(duplicate.file_path, null, plan.suggestion, { symbolName: duplicate.name, autoFix: true });
          }
          action.status = result.success ? 'consolidated' : 'failed';
          if (!result.success) action.error = result.error;
        } catch (err) {
          action.status = 'failed';
          action.error = err.message;
        }
      } else {
        action.status = 'preview';
      }

      results.actions.push(action);
    } catch (err) {
      action.status = 'error';
      action.error = err.message;
      results.actions.push(action);
    }
  }

  return results;
}

export { runConsolidateConceptualCluster };
