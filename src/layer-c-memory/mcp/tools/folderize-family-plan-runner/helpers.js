/**
 * @fileoverview Helper utilities for folderize family plan runner.
 * Pure functions for sorting, building targets, and snapshot creation.
 */

import { normalizeSnapshotPath, buildFolderizedFamilyGroups, buildFolderizedFamilySuggestion } from '../../../../shared/compiler/index.js';

export function sortMoveTargets(moveTargets = [], barrelPath = null) {
  return moveTargets.slice().sort((a, b) => {
    const aIsBarrel = barrelPath && a.from === barrelPath;
    const bIsBarrel = barrelPath && b.from === barrelPath;

    if (aIsBarrel !== bIsBarrel) {
      return aIsBarrel ? 1 : -1;
    }

    return a.from.localeCompare(b.from);
  });
}

export function buildAutoRenameTargets(moveTargets = []) {
  const syntheticRows = moveTargets
    .map((target) => {
      const normalizedPath = normalizeSnapshotPath(target?.to || '');
      if (!normalizedPath) {
        return null;
      }

      return {
        path: normalizedPath,
        directory: normalizedPath.includes('/')
          ? normalizedPath.slice(0, normalizedPath.lastIndexOf('/'))
          : ''
      };
    })
    .filter(Boolean);

  if (syntheticRows.length === 0) {
    return [];
  }

  const groups = buildFolderizedFamilyGroups(syntheticRows);
  if (groups.length === 0) {
    return [];
  }

  return buildFolderizedFamilySuggestion(groups[0])?.renameTargets || [];
}

export function buildFinalMoveTargets(moveTargets = [], renameTargets = []) {
  const renameMap = new Map(
    renameTargets
      .map((target) => [normalizeSnapshotPath(target?.from), normalizeSnapshotPath(target?.to)])
      .filter(([from, to]) => from && to)
  );

  return moveTargets.map((target) => ({
    from: normalizeSnapshotPath(target.from),
    to: renameMap.get(normalizeSnapshotPath(target.to)) || normalizeSnapshotPath(target.to)
  }));
}

export function buildFolderizationMoveSnapshot(focusPlan) {
  const impactedFiles = Array.isArray(focusPlan?.importImpact?.impactedFiles)
    ? focusPlan.importImpact.impactedFiles
        .map((item) => normalizeSnapshotPath(item?.filePath || item))
        .filter(Boolean)
    : [];

  const dependentsBySourcePath = new Map();

  for (const target of focusPlan?.moveTargets || []) {
    const key = normalizeSnapshotPath(target?.from);
    if (!key) {
      continue;
    }

    dependentsBySourcePath.set(key, impactedFiles);
  }

  return {
    createdAt: new Date().toISOString(),
    candidate: {
      familyRoot: focusPlan?.candidate?.familyRoot || null,
      recommendedFolder: focusPlan?.candidate?.recommendedFolder || null,
      barrelFile: focusPlan?.candidate?.barrelFile || null
    },
    impactedFiles,
    dependentsBySourcePath,
    getDependentsForPath(filePath) {
      const normalized = normalizeSnapshotPath(filePath);
      return dependentsBySourcePath.get(normalized) || impactedFiles;
    }
  };
}
