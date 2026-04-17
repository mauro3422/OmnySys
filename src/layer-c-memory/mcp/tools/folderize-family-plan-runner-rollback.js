import path from 'path';
import fs from 'fs/promises';
import { createLogger } from '../../../utils/logger.js';
import { MoveOrchestrator } from '../core/shared/move-orchestrator/orchestrator.js';

const logger = createLogger('OmnySys:mcp:folderize_family:rollback');

function collectNormalizedPaths(groups = []) {
  const targets = new Set();

  for (const group of groups) {
    for (const value of Array.isArray(group) ? group : [group]) {
      const normalized = String(value || '').trim();
      if (normalized) {
        targets.add(normalized);
      }
    }
  }

  return Array.from(targets);
}

async function readSnapshotRecord(absPath) {
  try {
    const content = await fs.readFile(absPath, 'utf8');
    return { existed: true, content };
  } catch (error) {
    if (error?.code === 'ENOENT') {
      return { existed: false, content: null };
    }

    throw error;
  }
}

async function writeSnapshotRecord(snapshot) {
  if (snapshot.existed) {
    await fs.mkdir(path.dirname(snapshot.absPath), { recursive: true });
    await fs.writeFile(snapshot.absPath, snapshot.content ?? '', 'utf8');
    return {
      filePath: snapshot.filePath,
      action: 'restored',
      success: true
    };
  }

  await fs.rm(snapshot.absPath, { force: true });
  return {
    filePath: snapshot.filePath,
    action: 'removed',
    success: true
  };
}

function buildRollbackMoveTarget(entry, phase) {
  return {
    from: entry.to,
    to: entry.from,
    phase
  };
}

export function collectFolderizationRollbackTargets({
  focusPlan,
  moveTargets = [],
  renameTargets = []
}) {
  return collectNormalizedPaths([
    focusPlan?.candidate?.barrelFile,
    ...moveTargets.flatMap((target) => [target?.from, target?.to]),
    ...renameTargets.flatMap((target) => [target?.from, target?.to]),
    ...(Array.isArray(focusPlan?.importImpact?.impactedFiles)
      ? focusPlan.importImpact.impactedFiles.map((impacted) => impacted?.filePath || impacted)
      : [])
  ]);
}

export async function captureFolderizationRollbackSnapshot(projectPath, filePaths = []) {
  const snapshots = [];
  const seen = new Set();

  for (const filePath of filePaths) {
    const normalized = String(filePath || '').trim();
    if (!normalized || seen.has(normalized)) {
      continue;
    }

    seen.add(normalized);
    const absPath = path.resolve(projectPath, normalized);
    const snapshot = await readSnapshotRecord(absPath);
    snapshots.push({
      filePath: normalized,
      absPath,
      ...snapshot
    });
  }

  return snapshots;
}

export async function restoreFolderizationRollbackSnapshot(snapshots = []) {
  const results = [];

  for (const snapshot of [...snapshots].reverse()) {
    try {
      results.push(await writeSnapshotRecord(snapshot));
    } catch (error) {
      results.push({
        filePath: snapshot.filePath,
        action: snapshot.existed ? 'restore_failed' : 'remove_failed',
        success: false,
        error: error.message
      });
    }
  }

  return results;
}

export function buildFolderizeWarnings(failureResult = {}, circularRisks = []) {
  return [
    ...(Array.isArray(failureResult?.warnings) ? failureResult.warnings : []),
    ...circularRisks.map((risk) => risk.message)
  ];
}

export function buildFolderizeFailureResult({
  failureResult = {},
  stage,
  executionGate,
  rollback
}) {
  return {
    ...failureResult,
    success: false,
    mode: 'rolled_back',
    failedStage: stage,
    executionGate,
    rollback,
    warnings: buildFolderizeWarnings(failureResult, failureResult?.circularRisks || [])
  };
}

export async function rollbackFolderizationTransaction({
  projectPath,
  moveContext,
  moveResult,
  renameResult,
  rollbackSnapshot = []
}) {
  const rollbackOperations = [];

  const rollbackTargets = [
    ...(Array.isArray(renameResult?.results) ? renameResult.results : [])
      .filter((entry) => entry?.result?.success)
      .map((entry) => buildRollbackMoveTarget(entry, 'rename'))
      .reverse(),
    ...(Array.isArray(moveResult?.results) ? moveResult.results : [])
      .filter((entry) => entry?.result?.success)
      .map((entry) => buildRollbackMoveTarget(entry, 'move'))
      .reverse()
  ];

  for (const target of rollbackTargets) {
    try {
      const rollbackResult = await MoveOrchestrator.moveFile(target.from, target.to, projectPath, {
        ...moveContext,
        rollbackMode: true,
        skipSelfRewrite: true,
        skipSettlement: true,
        deferGuards: true
      });
      rollbackOperations.push({
        ...target,
        result: rollbackResult
      });
    } catch (error) {
      rollbackOperations.push({
        ...target,
        result: { success: false, error: error.message },
        error: error.message
      });
    }
  }

  const restoredSnapshots = await restoreFolderizationRollbackSnapshot(rollbackSnapshot);
  const restoreTargets = rollbackSnapshot
    .filter((entry) => entry?.existed === true)
    .map((entry) => entry.filePath)
    .filter(Boolean);

  if (restoreTargets.length > 0) {
    try {
      const { analyzeSingleFile } = await import('#layer-a/pipeline/single-file.js');
      await Promise.allSettled(
        restoreTargets.map((filePath) => analyzeSingleFile(projectPath, filePath, { verbose: false, incremental: true }))
      );
    } catch (error) {
      logger.warn(`[ROLLBACK] Reindex after rollback failed: ${error.message}`);
    }
  }

  const rollbackSuccess = rollbackOperations.every((entry) => entry?.result?.success !== false)
    && restoredSnapshots.every((entry) => entry.success !== false);

  return {
    success: rollbackSuccess,
    rollbackOperations,
    restoredSnapshots,
    restoreTargets
  };
}
