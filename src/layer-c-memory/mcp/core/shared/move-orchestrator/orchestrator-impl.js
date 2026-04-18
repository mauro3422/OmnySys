import fs from 'fs/promises';
import path from 'path';
import { createLogger } from '../../../../../utils/logger.js';
import { calculateRelativeImport, normalizeImportToAbsolute } from '../../../../../utils/path-utils.js';
import { atomic_edit } from '../../../tools/atomic-edit/index.js';
import { extractModuleDependencySourcesFromCode } from '../../../tools/atomic-edit/exports.js';
import { evaluateAtomSemanticPurity, removePersistedAtomMetadata, removePersistedFileMetadata } from '../../../../../shared/compiler/index.js';
import { withMutationBatch } from '../mutation-batch.js';
import { settleMutationFiles } from '../mutation-settlement.js';
import {
  collectMoveDependents,
  findMatchingMoveImport,
  findModuleSourceLineIndex,
  waitForBackgroundIndexer
} from './index.js';

const logger = createLogger('OmnySys:move:orchestrator');

async function rewriteMovedFileReferences(oldPath, newPath, projectPath, context = {}) {
  const absNew = path.resolve(projectPath, newPath);
  let code = await fs.readFile(absNew, 'utf-8');
  const moduleSources = extractModuleDependencySourcesFromCode(code);
  const rewrites = [];
  for (const moduleSource of moduleSources) {
    if (!moduleSource.startsWith('.') && !moduleSource.startsWith('#')) continue;
    const resolvedTarget = normalizeImportToAbsolute(moduleSource, oldPath, projectPath);
    if (!resolvedTarget || resolvedTarget === moduleSource) continue;
    const newModuleSource = calculateRelativeImport(newPath, path.relative(projectPath, resolvedTarget), projectPath);
    if (!newModuleSource || newModuleSource === moduleSource) continue;
    const lineIndex = findModuleSourceLineIndex(code, moduleSource);
    if (lineIndex === -1) continue;
    const lines = code.split('\n');
    const oldLine = lines[lineIndex];
    const newLine = oldLine.replace(moduleSource, newModuleSource);
    if (newLine === oldLine) continue;
    const editRes = await atomic_edit({ filePath: newPath, oldString: oldLine, newString: newLine }, { ...context, projectPath });
    if (editRes.success) {
      rewrites.push({ filePath: newPath, from: moduleSource, to: newModuleSource });
      code = code.replace(oldLine, newLine);
    }
  }
  return rewrites;
}

async function updateDependentFile(depPath, oldPath, newPath, projectPath, context = {}) {
  const absDep = path.resolve(projectPath, depPath);
  const code = await fs.readFile(absDep, 'utf-8');
  const imports = extractModuleDependencySourcesFromCode(code);
  const matchingImport = findMatchingMoveImport(imports, depPath, oldPath, projectPath);
  if (!matchingImport) return { file: depPath, updated: false, reason: 'matching_import_not_found' };

  const newImportStr = calculateRelativeImport(depPath, newPath, projectPath);
  const lineIndex = findModuleSourceLineIndex(code, matchingImport);
  if (lineIndex === -1) return { file: depPath, updated: false, reason: 'import_line_not_found' };

  const lines = code.split('\n');
  const oldLine = lines[lineIndex];
  const newLine = oldLine.replace(matchingImport, newImportStr);
  if (newLine === oldLine) return { file: depPath, updated: false, reason: 'import_unchanged' };

  const editRes = await atomic_edit({ filePath: depPath, oldString: oldLine, newString: newLine }, { ...context, projectPath });
  if (!editRes.success) return { file: depPath, updated: false, reason: editRes.message || 'atomic_edit_failed' };
  return { file: depPath, updated: true };
}

async function updateMoveDependents(dependents, oldPath, newPath, projectPath, context = {}) {
  const updatedFiles = [];
  const failedUpdates = [];
  for (const depPath of dependents) {
    try {
      const update = await updateDependentFile(depPath, oldPath, newPath, projectPath, context);
      if (update.updated) updatedFiles.push(depPath);
      else if (update.reason !== 'matching_import_not_found') failedUpdates.push({ file: depPath, reason: update.reason || 'update_failed' });
    } catch (err) {
      logger.error(`[MoveOrchestrator] Failed to process dependent ${depPath}: ${err.message}`);
      failedUpdates.push({ file: depPath, reason: err.message });
    }
  }
  return { updatedFiles, failedUpdates };
}

function buildBarrelMatchPattern(oldPath) {
  const leafName = oldPath.replace(/\\/g, '/').split('/').pop().replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  return new RegExp(`export\\s+(\\{[^}]*\\}|\\*)\\s+from\\s+['"]([^'"]*(?:${leafName}))['"]`);
}

function collectBarrelImporters(repo, oldPath) {
  if (!repo?.db) return [];

  return repo.db.prepare(`
      SELECT DISTINCT f.path
      FROM files f, json_each(f.imports_json) as imp
      WHERE f.is_removed = 0
      AND imp.value LIKE ?
  `).all(`%${oldPath.replace(/\\/g, '/').split('/').pop()}%`);
}

async function rewriteBarrelFile(absPath, filePath, oldPath, newPath, projectPath, pattern) {
  const code = await fs.readFile(absPath, 'utf-8');
  const lines = code.split('\n');
  let fileModified = false;
  const barrelUpdates = [];

  for (let i = 0; i < lines.length; i++) {
    const match = pattern.exec(lines[i]);
    if (!match) continue;

    const oldImportPath = match[2];
    const newImportPath = calculateRelativeImport(filePath, newPath, projectPath);
    if (!newImportPath || newImportPath === oldImportPath) continue;

    lines[i] = lines[i].replace(oldImportPath, newImportPath);
    fileModified = true;
    barrelUpdates.push({ filePath, from: oldImportPath, to: newImportPath });
  }

  if (fileModified) {
    await fs.writeFile(absPath, lines.join('\n'), 'utf-8');
  }

  return barrelUpdates;
}

async function detectAndUpdateBarrelFiles(oldPath, newPath, projectPath, context = {}) {
  const barrelUpdates = [];
  const { server } = context || {};
  const orchestrator = context?.orchestrator || server;
  const repo = orchestrator?.cache?.getRepository?.() || null;
  const importers = collectBarrelImporters(repo, oldPath);
  if (importers.length === 0) return barrelUpdates;

  const pattern = buildBarrelMatchPattern(oldPath);
  for (const row of importers) {
    const filePath = row.path;
    if (filePath === oldPath || filePath === newPath) continue;
    const absPath = path.resolve(projectPath, filePath);
    try {
      const rewritten = await rewriteBarrelFile(absPath, filePath, oldPath, newPath, projectPath, pattern);
      barrelUpdates.push(...rewritten);
    } catch (err) {
      logger.warn(`[MoveOrchestrator] Failed to check barrel file ${filePath}: ${err.message}`);
    }
  }

  return barrelUpdates;
}

async function executeMoveMutation(oldPath, newPath, projectPath, context, dependents) {
  const absOld = path.resolve(projectPath, oldPath);
  const absNew = path.resolve(projectPath, newPath);
  const mutationServer = context.server || context.orchestrator?.server || null;
  const skipSelfRewrite = context?.skipSelfRewrite === true;

  return await withMutationBatch(mutationServer, { reason: 'move_file', files: [oldPath, newPath] }, async () => {
    await fs.mkdir(path.dirname(absNew), { recursive: true });
    await fs.rename(absOld, absNew);
    const selfRewrites = skipSelfRewrite ? [] : await rewriteMovedFileReferences(oldPath, newPath, projectPath, context);
    await Promise.allSettled([
      removePersistedFileMetadata(projectPath, oldPath),
      removePersistedAtomMetadata(projectPath, oldPath)
    ]);
    const dependencyUpdates = await updateMoveDependents(dependents, oldPath, newPath, projectPath, context);
    const barrelUpdates = await detectAndUpdateBarrelFiles(oldPath, newPath, projectPath, context);
    return {
      success: true,
      moved: { from: oldPath, to: newPath },
      selfUpdated: selfRewrites.length > 0,
      selfRewrites,
      updatedFiles: [...dependencyUpdates.updatedFiles, ...barrelUpdates.map((b) => b.filePath)],
      barrelUpdates,
      failedUpdates: dependencyUpdates.failedUpdates,
      semanticPurity: evaluateAtomSemanticPurity({
        semantic: {
          isPure: false,
          hasReturnValue: true
        },
        sharedStateAccess: [],
        eventEmitters: [],
        eventListeners: [],
        hasNetworkCalls: false
      })
    };
  });
}

async function settleMoveMutation(projectPath, context, oldPath, newPath, dependents, moveResult) {
  const barrelFiles = (moveResult.barrelUpdates || []).map((b) => b.filePath);
  return await settleMutationFiles({
    projectPath,
    context,
    reason: 'move_file',
    touchedFiles: [oldPath, newPath, ...dependents, ...(moveResult.updatedFiles || []), ...barrelFiles],
    validationTargets: [newPath, ...(moveResult.updatedFiles || []), ...dependents, ...barrelFiles],
    reindexTargets: [newPath, ...(moveResult.updatedFiles || []), ...barrelFiles],
    maxValidationTargets: 10
  });
}

export class MoveOrchestrator {
  static async moveFile(oldPath, newPath, projectPath, context = {}) {
    logger.info(`[MoveOrchestrator] Starting move: ${oldPath} -> ${newPath}`);
    await waitForBackgroundIndexer(context.orchestrator);
    const snapshot = context.folderizationSnapshot || context.analysisSnapshot || null;
    const dependents = await collectMoveDependents(oldPath, projectPath, snapshot);
    try {
      const moveResult = await executeMoveMutation(oldPath, newPath, projectPath, context, dependents);
      if (!moveResult?.success) return moveResult;
      if (context?.skipSettlement) {
        return { ...moveResult, settlement: null, skippedSettlement: true };
      }
      const settlement = await settleMoveMutation(projectPath, context, oldPath, newPath, dependents, moveResult);
      return { ...moveResult, settlement };
    } catch (err) {
      logger.error(`[MoveOrchestrator] Fatal move error: ${err.message}`);
      return { success: false, error: err.message, moved: false };
    }
  }
}

export default MoveOrchestrator;
