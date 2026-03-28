import fs from 'fs/promises';
import path from 'path';
import { createLogger } from '../../../utils/logger.js';
import { calculateRelativeImport, normalizeImportToAbsolute } from '../../../utils/path-utils.js';
import { normalizeComparablePath } from '#shared/utils/path-utils.js';
import { atomic_edit } from './atomic-edit/index.js';
import { extractModuleDependencySourcesFromCode } from './atomic-edit/exports.js';

const logger = createLogger('OmnySys:mcp:folderize_family:rewriter');

function buildMoveMap(projectPath, moveTargets = []) {
  const moveMap = new Map();

  for (const target of moveTargets) {
    if (!target?.from || !target?.to) {
      continue;
    }

    const fromPath = normalizeComparablePath(path.resolve(projectPath, target.from));
    const toPath = path.resolve(projectPath, target.to);
    moveMap.set(fromPath, toPath);
  }

  return moveMap;
}

function collectRewriteTargets(moveTargets = [], impactedFiles = []) {
  const targets = [];
  const seen = new Set();

  for (const value of [
    ...moveTargets.map((target) => target?.to),
    ...impactedFiles
  ]) {
    const normalized = String(value || '').replace(/\\/g, '/');
    if (!normalized || seen.has(normalized)) {
      continue;
    }

    seen.add(normalized);
    targets.push(normalized);
  }

  return targets;
}

function findImportLine(lines, importSource) {
  return lines.findIndex((line) => line.includes(`'${importSource}'`) || line.includes(`"${importSource}"`));
}

async function rewriteLineDirectly(absFilePath, code, oldLine, newLine, allowDirectFallback = false) {
  if (!allowDirectFallback) {
    return {
      success: false,
      reason: 'direct rewrite fallback disabled'
    };
  }

  const updatedCode = code.replace(oldLine, newLine);

  if (updatedCode === code) {
    return {
      success: false,
      reason: 'direct rewrite produced no change'
    };
  }

  await fs.writeFile(absFilePath, updatedCode, 'utf8');

  return {
    success: true,
    fallback: true
  };
}

async function rewriteImportsInFile(filePath, projectPath, moveMap, context = {}) {
  const absFilePath = path.resolve(projectPath, filePath);
  let code = await fs.readFile(absFilePath, 'utf8');
  const importSources = extractModuleDependencySourcesFromCode(code);
  const rewrites = [];
  const allowDirectFallback = context?.allowUnsafeDirectRewriteFallback === true
    || context?.allowDirectImportRewriteFallback === true;

  for (const importSource of importSources) {
    const resolvedImport = normalizeImportToAbsolute(importSource, filePath, projectPath);
    const resolvedKey = normalizeComparablePath(resolvedImport);
    const newTarget = moveMap.get(resolvedKey);

    if (!newTarget) {
      continue;
    }

    const newImportSource = calculateRelativeImport(filePath, path.relative(projectPath, newTarget), projectPath);

    if (newImportSource === importSource) {
      continue;
    }

    const lines = code.split('\n');
    const lineIndex = findImportLine(lines, importSource);

    if (lineIndex === -1) {
      rewrites.push({
        filePath,
        importSource,
        newImportSource,
        status: 'line_not_found'
      });
      continue;
    }

    const oldLine = lines[lineIndex];
    const newLine = oldLine.replace(importSource, newImportSource);

    if (newLine === oldLine) {
      continue;
    }

    const editResult = await atomic_edit({
      filePath,
      oldString: oldLine,
      newString: newLine
    }, {
      ...context,
      projectPath
    });

    if (!editResult?.success) {
      const directRewrite = await rewriteLineDirectly(absFilePath, code, oldLine, newLine, allowDirectFallback);

      if (directRewrite.success) {
        code = code.replace(oldLine, newLine);
        rewrites.push({
          filePath,
          importSource,
          newImportSource,
          status: 'rewritten_direct'
        });
        continue;
      }

      rewrites.push({
        filePath,
        importSource,
        newImportSource,
        status: 'edit_failed',
        reason: editResult?.message || directRewrite.reason || 'atomic_edit failed'
      });
      continue;
    }

    rewrites.push({
      filePath,
      importSource,
      newImportSource,
      status: 'rewritten'
    });
    code = code.replace(oldLine, newLine);
  }

  return rewrites;
}

export async function rewriteFolderizedFamilyImports({
  projectPath,
  moveTargets = [],
  impactedFiles = [],
  context = {}
}) {
  const moveMap = buildMoveMap(projectPath, moveTargets);
  const rewriteTargets = collectRewriteTargets(moveTargets, impactedFiles);
  const updatedFiles = [];
  const skippedFiles = [];
  const failedFiles = [];
  let rewriteCount = 0;

  for (const filePath of rewriteTargets) {
    try {
      const absFilePath = path.resolve(projectPath, filePath);
      await fs.access(absFilePath);
      const rewrites = await rewriteImportsInFile(filePath, projectPath, moveMap, context);

      if (rewrites.length > 0) {
        rewriteCount += rewrites.length;
        updatedFiles.push({
          filePath,
          rewrites
        });
      } else {
        skippedFiles.push(filePath);
      }
    } catch (error) {
      failedFiles.push({
        filePath,
        reason: error.message
      });
      logger.warn(`[folderize_family] Failed to rewrite ${filePath}: ${error.message}`);
    }
  }

  return {
    success: failedFiles.length === 0,
    rewriteCount,
    updatedFiles,
    skippedFiles,
    failedFiles
  };
}
