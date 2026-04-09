import fs from 'fs/promises';
import fsSync from 'fs';
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

/**
 * Build a moveMap by scanning ACTUAL files on disk after the move.
 * This handles cases where the MoveOrchestrator renamed files differently
 * than the plan predicted (e.g., stripped family prefixes).
 */
async function buildActualMoveMap(projectPath, moveTargets = []) {
  const moveMap = new Map();

  // Group targets by destination directory
  const dirGroups = new Map();
  for (const target of moveTargets) {
    if (!target?.from || !target?.to) continue;
    const toDir = path.dirname(path.resolve(projectPath, target.to));
    if (!dirGroups.has(toDir)) dirGroups.set(toDir, []);
    dirGroups.get(toDir).push(target);
  }

  // For each destination directory, scan actual files
  for (const [toDir, targets] of dirGroups) {
    try {
      const entries = await fs.readdir(toDir, { withFileTypes: true });
      const actualFiles = entries
        .filter(e => e.isFile() && e.name.endsWith('.js'))
        .map(e => path.resolve(toDir, e.name));

      for (const target of targets) {
        const fromPath = normalizeComparablePath(path.resolve(projectPath, target.from));
        const fromBasename = path.basename(target.from).replace(/\.js$/, '');
        const toPath = path.resolve(projectPath, target.to);

        // Try to find the actual file on disk that corresponds to this target
        // Match by basename similarity (stripped prefix)
        let bestMatch = null;
        let bestScore = 0;

        for (const actualFile of actualFiles) {
          const actualBasename = path.basename(actualFile).replace(/\.js$/, '');
          // Score: how many tokens from the original basename are in the actual name
          const tokens = new Set(fromBasename.split(/[-_.]/));
          const actualTokens = new Set(actualBasename.split(/[-_.]/));
          let matchCount = 0;
          for (const t of tokens) {
            if (actualTokens.has(t)) matchCount++;
          }
          const score = matchCount / Math.max(tokens.size, 1);
          if (score > bestScore) {
            bestScore = score;
            bestMatch = actualFile;
          }
        }

        if (bestMatch && bestScore >= 0.5) {
          moveMap.set(fromPath, bestMatch);
        } else {
          // Fallback to plan target
          moveMap.set(fromPath, toPath);
        }
      }
    } catch {
      // If directory doesn't exist yet, use plan targets
      for (const target of targets) {
        const fromPath = normalizeComparablePath(path.resolve(projectPath, target.from));
        moveMap.set(fromPath, path.resolve(projectPath, target.to));
      }
    }
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
  // Build moveMap from the plan — this is the source of truth for folderize.
  // NOTE: We intentionally do NOT use buildActualMoveMap here because it was
  // designed for single-file moves and produces wrong matches during batch
  // folderize (e.g., "compiler-metrics-snapshot-helpers" matched to
  // "snapshot-summary-helpers" because both share "snapshot" and "helpers" tokens).
  // The plan already knows the exact target for every file.
  const moveMap = buildMoveMap(projectPath, moveTargets);

  // Build reverse map: OLD basename → new absolute path (for intra-family imports)
  // When skipSelfRewrite is used, the moved files still have imports pointing
  // to the OLD basenames, so we need to map old → new.
  const internalRenameMap = new Map();
  for (const target of moveTargets) {
    if (!target?.from || !target?.to) continue;
    const oldBasename = path.basename(target.from);
    const newPath = path.resolve(projectPath, target.to);
    internalRenameMap.set(oldBasename.replace(/\.js$/, ''), newPath);
  }

  const rewriteTargets = collectRewriteTargets(moveTargets, impactedFiles);
  const updatedFiles = [];
  const skippedFiles = [];
  const failedFiles = [];
  let rewriteCount = 0;

  for (const filePath of rewriteTargets) {
    try {
      const absFilePath = path.resolve(projectPath, filePath);
      await fs.access(absFilePath);

      // Standard rewrite: imports that point to moved files
      const rewrites = await rewriteImportsInFile(filePath, projectPath, moveMap, context);

      // Intra-family rewrite: if this file was moved, fix its internal imports
      const internalRewrites = await rewriteIntraFamilyImports(
        filePath, projectPath, moveTargets, internalRenameMap, context
      );

      const allRewrites = [...rewrites, ...internalRewrites];

      if (allRewrites.length > 0) {
        rewriteCount += allRewrites.length;
        updatedFiles.push({
          filePath,
          rewrites: allRewrites
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

/**
 * Rewrite imports between files that were moved together (intra-family).
 * E.g., if report-core.js imports './technical-debt-report-core-helpers.js'
 * but the file was renamed to 'report-core-helpers.js', fix the import.
 */
async function rewriteIntraFamilyImports(filePath, projectPath, moveTargets, internalRenameMap, context = {}) {
  const absFilePath = path.resolve(projectPath, filePath);
  let code;
  try {
    code = await fs.readFile(absFilePath, 'utf8');
  } catch {
    return [];
  }

  // Check if this file was one of the moved files
  const movedTarget = moveTargets.find(t => {
    const newPath = normalizeComparablePath(path.resolve(projectPath, t.to));
    return normalizeComparablePath(absFilePath) === newPath;
  });

  if (!movedTarget) {
    // This is an external file (impactedFile), no intra-family rewrites needed
    return [];
  }

  const rewrites = [];
  const lines = code.split('\n');
  let modified = false;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    // Match relative imports: from './something.js', '../something.js' or with backslashes
    const match = line.match(/from\s+['"](\.\.\/[^'"]+|\.\/[^'"]+|\.\\[^'"]+|\.\\.\\[^'"]+)['"]/);
    if (!match) continue;

    const importSource = match[1].replace(/\\/g, '/');
    const importBasename = path.basename(importSource).replace(/\.js$/, '');

    // Check if this import points to a file that was renamed
    const newAbsolutePath = internalRenameMap.get(importBasename);
    if (!newAbsolutePath) continue;

    // Calculate the new relative import
    const fileDir = path.dirname(absFilePath);
    const newRelPath = path.relative(fileDir, newAbsolutePath).replace(/\\/g, '/');
    const newImportSource = newRelPath.startsWith('.') ? newRelPath : './' + newRelPath;

    if (newImportSource === importSource) continue;

    const oldLine = line;
    const newLine = line.replace(importSource, newImportSource);

    lines[i] = newLine;
    modified = true;
    rewrites.push({
      filePath,
      importSource,
      newImportSource,
      status: 'intra_family_rewritten'
    });
  }

  if (modified) {
    const newCode = lines.join('\n');
    await fs.writeFile(absFilePath, newCode, 'utf8');
  }

  return rewrites;
}
