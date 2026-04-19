import path from 'path';
import fs from 'fs/promises';
import { normalizeSnapshotPath } from './snapshot-path.js';
import { validateCompilerExports } from './mutation-settlement-bridge.js';

function resolveBarrelRewritePath(barrelPath, moveTargets = []) {
  const normalizedBarrelPath = normalizeSnapshotPath(barrelPath);
  if (!normalizedBarrelPath) {
    return null;
  }

  const directTarget = moveTargets.find((target) => normalizeSnapshotPath(target?.from) === normalizedBarrelPath);
  return directTarget?.to || normalizedBarrelPath;
}

async function resolveExistingBarrelPath(projectPath, barrelPath, moveTargets = []) {
  const candidatePaths = Array.from(new Set([
    resolveBarrelRewritePath(barrelPath, moveTargets),
    normalizeSnapshotPath(barrelPath)
  ].filter(Boolean)));

  for (const candidatePath of candidatePaths) {
    const absPath = path.resolve(projectPath, candidatePath);
    try {
      await fs.access(absPath);
      return {
        absPath,
        reportedPath: candidatePath
      };
    } catch {
      // Try the next candidate path.
    }
  }

  return null;
}

export async function applyFolderizationBarrelRewrite(barrelPath, projectPath, moveTargets = [], options = {}) {
  const shouldValidateExports = options?.validate !== false;
  const resolvedBarrel = await resolveExistingBarrelPath(projectPath, barrelPath, moveTargets);

  if (!resolvedBarrel) {
    return { success: true, path: barrelPath, rewrites: [], atomic: true };
  }

  const rewriteFile = async (filePath, reportedPath, recoveredFrom = null) => {
    const code = await fs.readFile(filePath, 'utf8');
    const lines = code.split('\n');
    const rewrites = [];

    for (let i = 0; i < lines.length; i++) {
      let line = lines[i];

      for (const target of moveTargets) {
        const oldName = path.basename(target.from, '.js');
        const newName = path.basename(target.to, '.js');

        if (line.includes(oldName) && (line.includes('from') || line.includes('export'))) {
          line = line.replace(new RegExp(oldName, 'g'), newName);
          lines[i] = line;
          rewrites.push({
            line: i + 1,
            from: oldName,
            to: newName,
            lineContent: line
          });
        }
      }
    }

    if (rewrites.length > 0) {
      await fs.writeFile(filePath, lines.join('\n'), 'utf8');
    }

    const exportValidation = shouldValidateExports
      ? await validateCompilerExports({ filePath: reportedPath }, { projectPath })
      : null;
    if (shouldValidateExports && exportValidation?.valid === false) {
      return {
        success: false,
        path: reportedPath,
        error: exportValidation?.error || 'Atomic barrel rewrite validation failed',
        atomic: true,
        exportValidation,
        rewrites,
        recoveredFrom
      };
    }

    return {
      success: true,
      path: reportedPath,
      rewrites,
      atomic: true,
      exportValidation,
      recoveredFrom
    };
  };

  try {
    return await rewriteFile(resolvedBarrel.absPath, resolvedBarrel.reportedPath);
  } catch (error) {
    return {
      success: false,
      path: resolvedBarrel.reportedPath,
      error: error.message,
      atomic: true
    };
  }
}
