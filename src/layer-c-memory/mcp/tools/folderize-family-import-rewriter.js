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
    
    // Store multiple keys for flexible matching:
    // 1. Full resolved path
    // 2. Path without extension (for extensionless imports)
    // 3. Relative path from project root
    moveMap.set(fromPath, toPath);
    
    const fromWithoutExt = fromPath.replace(/\.js$/, '');
    if (fromWithoutExt !== fromPath) {
      moveMap.set(fromWithoutExt, toPath);
    }
    
    const fromRelative = target.from.replace(/\\/g, '/');
    if (!moveMap.has(fromRelative)) {
      moveMap.set(fromRelative, toPath);
    }
  }

  return moveMap;
}

/**
 * Normalize import source path for comparison.
 * FIXED: Handle TypeScript (.ts/.tsx) and extensionless imports
 */
function normalizeImportSourceForComparison(source) {
  // Normalize path separators
  let normalized = source.replace(/\\/g, '/');
  
  // Add .js extension if missing and not an alias or node_modules
  if (!normalized.match(/\.(js|ts|tsx|mjs|cjs)$/)) {
    // Don't add extension to aliases like #layer-a/... or node_modules
    if (!normalized.startsWith('#') && !normalized.startsWith('node:')) {
      normalized = normalized + '.js';
    }
  }
  
  return normalized;
}

/**
 * Resolve aliased imports (#layer-a/...) to absolute paths.
 * Uses DB metadata to resolve the actual file paths.
 */
async function resolveAliasImport(aliasImport, projectPath, repo) {
  if (!aliasImport.startsWith('#')) {
    return null;
  }

  // Remove the alias prefix
  const relativePath = aliasImport.replace(/^#layer-a\//, '');
  
  if (!repo?.db) {
    return null;
  }

  try {
    // Try to find the file in the atoms table
    const row = repo.db.prepare(`
      SELECT path FROM files 
      WHERE path LIKE ? AND is_removed = 0 
      LIMIT 1
    `).get(`%${relativePath.replace(/\.js$/, '')}%`);
    
    return row ? row.path : null;
  } catch {
    return null;
  }
}

/**
 * Check if a file exists at the given path.
 */
async function fileExists(path) {
  try {
    await fs.access(path);
    return true;
  } catch {
    return false;
  }
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

async function validatePlannedFolderizedImports({
  projectPath,
  moveTargets = [],
  impactedFiles = [],
  context = {}
}) {
  const moveMap = buildMoveMap(projectPath, moveTargets);
  const validationTargets = collectRewriteTargets(moveTargets, impactedFiles);
  const futurePathToMoveTarget = new Map(
    moveTargets
      .filter((target) => target?.to)
      .map((target) => [normalizeComparablePath(path.resolve(projectPath, target.to)), target])
  );
  const errors = [];
  const checkedFiles = [];

  for (const filePath of validationTargets) {
    const normalizedFilePath = normalizeComparablePath(path.resolve(projectPath, filePath));
    const movedTarget = futurePathToMoveTarget.get(normalizedFilePath) || null;
    const sourcePath = movedTarget?.from ? movedTarget.from : filePath;
    const absSourcePath = path.resolve(projectPath, sourcePath);

    let code;
    try {
      code = await fs.readFile(absSourcePath, 'utf8');
    } catch (error) {
      errors.push({
        filePath,
        sourcePath,
        reason: 'source_missing',
        message: error.message
      });
      continue;
    }

    checkedFiles.push(filePath);
    const importSources = extractModuleDependencySourcesFromCode(code);

    for (const importSource of importSources) {
      if (!importSource) continue;

      const resolvedImport = normalizeImportToAbsolute(importSource, sourcePath, projectPath);
      if (!resolvedImport) {
        continue;
      }

      const resolvedKey = normalizeComparablePath(resolvedImport);
      const movedDependencyTarget = moveMap.get(resolvedKey);
      const isRelativeImport = importSource.startsWith('.');
      const shouldValidate = isRelativeImport || Boolean(movedDependencyTarget);

      if (!shouldValidate) {
        continue;
      }

      const nextImportSource = movedDependencyTarget
        ? calculateRelativeImport(filePath, path.relative(projectPath, movedDependencyTarget), projectPath)
        : calculateRelativeImport(filePath, path.relative(projectPath, resolvedImport), projectPath);

      const rewrittenResolvedPath = normalizeImportToAbsolute(nextImportSource, filePath, projectPath);
      if (!rewrittenResolvedPath) {
        errors.push({
          filePath,
          sourcePath,
          importSource,
          nextImportSource,
          reason: 'unresolvable_rewrite'
        });
        continue;
      }

      try {
        await fs.access(rewrittenResolvedPath);
      } catch {
        errors.push({
          filePath,
          sourcePath,
          importSource,
          nextImportSource,
          resolvedPath: rewrittenResolvedPath,
          reason: 'missing_module_after_folderize'
        });
      }
    }
  }

  return {
    success: errors.length === 0,
    checkedFiles: Array.from(new Set(checkedFiles)),
    errors,
    moveCount: moveTargets.length,
    impactedCount: impactedFiles.length,
    validationTargets
  };
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

  const appliedBarrelPath = context?.appliedBarrelPath
    ? normalizeComparablePath(path.resolve(projectPath, context.appliedBarrelPath))
    : null;
  const rewriteTargets = collectRewriteTargets(moveTargets, impactedFiles).filter((filePath) => {
    if (!appliedBarrelPath) {
      return true;
    }

    return normalizeComparablePath(path.resolve(projectPath, filePath)) !== appliedBarrelPath;
  });
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

      // Location-relative rewrite: when a file moves to a new folder, ALL relative
      // imports need recalculation (even to files that didn't move).
      // E.g., './core-utils.js' → '../core-utils.js' when file moves to a subfolder.
      const locationRewrites = await rewriteRelativeImportsForNewLocation(
        filePath, projectPath, moveTargets, context
      );

      const allRewrites = [...rewrites, ...internalRewrites, ...locationRewrites];

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
 * Rewrite relative imports when a file moves to a new folder location.
 * This handles imports to files that DIDN'T move but need path recalculation
 * because the importing file changed location.
 * E.g., './core-utils.js' → '../core-utils.js' when file moves to a subfolder.
 */
async function rewriteRelativeImportsForNewLocation(filePath, projectPath, moveTargets, context = {}) {
  const absFilePath = path.resolve(projectPath, filePath);
  let code;
  try {
    code = await fs.readFile(absFilePath, 'utf8');
  } catch {
    return [];
  }

  // Find which move target this file corresponds to
  const movedTarget = moveTargets.find(t => {
    const newPath = normalizeComparablePath(path.resolve(projectPath, t.to));
    return normalizeComparablePath(absFilePath) === newPath;
  });

  if (!movedTarget) {
    // This is an external impacted file, not a moved file
    return [];
  }

  // The original location of this file before the move
  const originalPath = path.resolve(projectPath, movedTarget.from);
  const originalDir = path.dirname(originalPath);
  const newDir = path.dirname(absFilePath);

  // If file didn't change directory, no need to rewrite relative imports
  if (originalDir === newDir) {
    return [];
  }

  const rewrites = [];
  const lines = code.split('\n');
  let modified = false;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    // Match relative imports
    const match = line.match(/from\s+['"](\.\.\/[^'"]+|\.\/[^'"]+|\.\\[^'"]+|\.\\.\\[^'"]+)['"]/);
    if (!match) continue;

    const importSource = match[1].replace(/\\/g, '/');
    
    // Skip if this is an intra-family import (handled by rewriteIntraFamilyImports)
    const importBasename = path.basename(importSource).replace(/\.js$/, '');
    const isIntraFamily = moveTargets.some(t => {
      const oldBasename = path.basename(t.from).replace(/\.js$/, '');
      return oldBasename === importBasename;
    });
    if (isIntraFamily) continue;

    // Resolve the import from the NEW location
    const resolvedFromNew = normalizeImportToAbsolute(importSource, filePath, projectPath);
    if (!resolvedFromNew) continue;

    // Check if the file actually exists at the resolved path
    try {
      await fs.access(resolvedFromNew);
    } catch {
      // File doesn't exist at this path from new location — needs rewriting
      // Try to find where it actually is by resolving from the ORIGINAL location
      const resolvedFromOriginal = normalizeImportToAbsolute(importSource, movedTarget.from, projectPath);
      if (!resolvedFromOriginal) continue;

      try {
        await fs.access(resolvedFromOriginal);
        // File exists at original resolution — calculate new relative path from new location
        const newImportSource = calculateRelativeImport(filePath, path.relative(projectPath, resolvedFromOriginal), projectPath);
        if (!newImportSource || newImportSource === importSource) continue;

        const oldLine = line;
        const newLine = line.replace(importSource, newImportSource);
        if (newLine === oldLine) continue;

        lines[i] = newLine;
        modified = true;
        rewrites.push({
          filePath,
          importSource,
          newImportSource,
          status: 'location_relative_rewritten'
        });
      } catch {
        // File doesn't exist at original resolution either — skip
      }
    }
  }

  if (modified) {
    const newCode = lines.join('\n');
    await fs.writeFile(absFilePath, newCode, 'utf8');
  }

  return rewrites;
}

/**
 * Rewrite imports between files that were moved together (intra-family).
 * E.g., if report-core.js imports './technical-debt-report-core-helpers.js'
 * but the file was renamed to 'report-core-helpers.js', fix the import.
 * 
 * CRITICAL FIX: Also handles the case where the barrel file (index.js)
 * imports sibling files that were renamed during folderization.
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
    // Also match re-exports: export * from './something.js' or export { foo } from './something.js'
    const importMatch = line.match(/from\s+['"](\.\.\/[^'"]+|\.\/[^'"]+|\.\\[^'"]+|\.\\.\\[^'"]+)['"]/);
    const exportMatch = !importMatch && line.match(/export\s+(?:\*|\{[^}]*\})\s+from\s+['"](\.\.\/[^'"]+|\.\/[^'"]+|\.\\[^'"]+|\.\\.\\[^'"]+)['"]/);
    const match = importMatch || exportMatch;
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

export { validatePlannedFolderizedImports };
