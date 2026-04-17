import fs from 'fs/promises';
import path from 'path';
import { createLogger } from '../../../../utils/logger.js';
import { getRepository } from '../../../storage/repository/repository-factory.js';
import { isRepositoryReady } from '../../../storage/repository/repository-bridge-utils.js';
import {
  RecoveryStrategies,
  reindexCompilerFile,
  validateCompilerExports,
  validateCompilerImports
} from '../../../../shared/compiler/index.js';

const logger = createLogger('OmnySys:mcp:mutation-settlement');

export function normalizeMutationPath(filePath = '') {
  return String(filePath || '')
    .trim()
    .replace(/\\/g, '/')
    .replace(/^\.\//, '')
    .replace(/^\/+/, '');
}

export function collectUniquePaths(paths = []) {
  return Array.from(
    new Set(
      (Array.isArray(paths) ? paths : [paths])
        .map((filePath) => normalizeMutationPath(filePath))
        .filter(Boolean)
    )
  );
}

export async function inspectDiskPresence(projectPath, filePath) {
  const absolutePath = path.resolve(projectPath, filePath);

  try {
    await fs.access(absolutePath);
    return { exists: true, absolutePath };
  } catch {
    return { exists: false, absolutePath };
  }
}

export function isTransientSettlementProblem(value) {
  const message = [
    value?.error,
    value?.message,
    value?.validation?.error,
    value?.validation?.message
  ]
    .filter(Boolean)
    .join(' ');

  return /database connection is not open|DB_MISSING|not found in the canonical DB index|not found in index/i.test(message);
}

async function reindexSettlementTargets(projectPath, reindexTargets = []) {
  const results = [];

  for (const filePath of collectUniquePaths(reindexTargets)) {
    const disk = await inspectDiskPresence(projectPath, filePath);
    if (!disk.exists) {
      results.push({
        filePath,
        disk,
        success: false,
        skipped: true,
        reason: 'file_missing'
      });
      continue;
    }

    const reindexResult = await reindexCompilerFile(filePath, projectPath);
    results.push({
      filePath,
      disk,
      success: !!reindexResult?.success,
      skipped: false,
      reindexResult
    });
  }

  return results;
}

export { reindexSettlementTargets };

export function buildMutationSettlementSnapshot({
  reason = 'mutation',
  touchedFiles = [],
  validationTargets = [],
  reindexTargets = []
} = {}) {
  const normalizedTouchedFiles = collectUniquePaths(touchedFiles);

  return {
    createdAt: new Date().toISOString(),
    reason,
    touchedFiles: normalizedTouchedFiles,
    validationTargets: collectUniquePaths(validationTargets.length > 0 ? validationTargets : normalizedTouchedFiles),
    reindexTargets: collectUniquePaths(reindexTargets)
  };
}

export async function settleMutationTarget({
  projectPath,
  filePath,
  context = {},
  allowReindexOnTransient = true,
  retryOptions = {},
  validationOptions = {}
} = {}) {
  const normalizedFilePath = normalizeMutationPath(filePath);
  const disk = await inspectDiskPresence(projectPath, normalizedFilePath);
  const retryState = {
    attempts: 0,
    reindexed: false,
    transient: false,
    lastValidation: null
  };

  const validateOnce = async () => {
    retryState.attempts += 1;

    const repo = getRepository(projectPath);
    if (!isRepositoryReady(repo)) {
      retryState.transient = true;
      const error = new Error('database connection is not open');
      error.retryable = true;
      throw error;
    }

    const importValidation = await validateCompilerImports({
      filePath: normalizedFilePath,
      checkBroken: validationOptions.checkBroken ?? true,
      checkUnused: validationOptions.checkUnused ?? true,
      checkCircular: validationOptions.checkCircular ?? false,
      checkFileExistence: validationOptions.checkFileExistence ?? true
    }, {
      ...context,
      projectPath
    });

    const exportValidation = await validateCompilerExports({
      filePath: normalizedFilePath
    }, {
      ...context,
      projectPath
    });

    const importInvalid = importValidation?.success === false
      || String(importValidation?.status || '').toUpperCase() !== 'CLEAN'
      || Number(importValidation?.invalidCount || 0) > 0
      || (Array.isArray(importValidation?.brokenPaths) && importValidation.brokenPaths.length > 0)
      || (Array.isArray(importValidation?.brokenImports) && importValidation.brokenImports.length > 0);
    const exportInvalid = exportValidation?.valid === false
      || exportValidation?.success === false
      || Number(exportValidation?.invalidCount || 0) > 0
      || Number(exportValidation?.invalid?.length || 0) > 0;

    const combinedValidation = {
      ...importValidation,
      success: !importInvalid && !exportInvalid,
      importInvalid,
      exportValidation,
      exportInvalid
    };
    retryState.lastValidation = combinedValidation;

    if (isTransientSettlementProblem(combinedValidation)) {
      retryState.transient = true;

      if (allowReindexOnTransient && disk.exists && !retryState.reindexed) {
        const reindexResult = await reindexCompilerFile(normalizedFilePath, projectPath);
        retryState.reindexed = !!reindexResult?.success;
        logger.debug(`[mutation-settlement] Reindexed transient target ${normalizedFilePath} -> ${reindexResult?.success ? 'ok' : 'failed'}`);
      }

      const error = new Error(combinedValidation?.message || combinedValidation?.error || `Transient settlement drift for ${normalizedFilePath}`);
      error.retryable = true;
      error.validation = combinedValidation;
      throw error;
    }

    retryState.transient = false;
    return combinedValidation;
  };

  try {
    const validation = await RecoveryStrategies.retryWithBackoff(validateOnce, {
      maxRetries: retryOptions.maxRetries ?? 3,
      baseDelayMs: retryOptions.baseDelayMs ?? 75,
      maxDelayMs: retryOptions.maxDelayMs ?? 500
    });

    return {
      filePath: normalizedFilePath,
      disk,
      attempts: retryState.attempts,
      reindexed: retryState.reindexed,
      settled: true,
      transient: false,
      validation
    };
  } catch (error) {
    const validation = retryState.lastValidation || {
      success: false,
      error: 'SETTLEMENT_FAILED',
      message: error.message
    };

    return {
      filePath: normalizedFilePath,
      disk,
      attempts: retryState.attempts,
      reindexed: retryState.reindexed,
      settled: false,
      transient: isTransientSettlementProblem(error) || retryState.transient,
      validation,
      error: error.message
    };
  }
}

export async function settleMutationSnapshot({
  projectPath,
  context = {},
  snapshot = null,
  retryOptions = {},
  validationOptions = {},
  maxValidationTargets = 10,
  allowReindexOnTransient = true
} = {}) {
  const validationTargets = collectUniquePaths(snapshot?.validationTargets || snapshot?.touchedFiles || [])
    .slice(0, maxValidationTargets);
  const reindexResults = await reindexSettlementTargets(projectPath, snapshot?.reindexTargets || []);
  const validations = [];

  for (const filePath of validationTargets) {
    validations.push(
      await settleMutationTarget({
        projectPath,
        filePath,
        context,
        allowReindexOnTransient,
        retryOptions,
        validationOptions
      })
    );
  }

  const settledCount = validations.filter((entry) => entry.settled).length;
  const transientCount = validations.filter((entry) => entry.transient).length;
  const issueCount = validations.filter((entry) => {
    const validation = entry.validation || {};
    return validation.success === false && !entry.transient;
  }).length;

  return {
    success: true,
    settled: transientCount === 0,
    reason: snapshot?.reason || 'mutation',
    reindexResults,
    validations,
    summary: {
      validationTargets: validationTargets.length,
      reindexedCount: reindexResults.filter((entry) => entry.success).length,
      settledCount,
      transientCount,
      issueCount
    }
  };
}

export async function settleMutationFiles({
  projectPath,
  context = {},
  reason = 'mutation',
  touchedFiles = [],
  validationTargets = [],
  reindexTargets = [],
  retryOptions = {},
  validationOptions = {},
  maxValidationTargets = 10,
  allowReindexOnTransient = true
} = {}) {
  return await settleMutationSnapshot({
    projectPath,
    context,
    snapshot: buildMutationSettlementSnapshot({
      reason,
      touchedFiles,
      validationTargets,
      reindexTargets
    }),
    retryOptions,
    validationOptions,
    maxValidationTargets,
    allowReindexOnTransient
  });
}

export default {
  buildMutationSettlementSnapshot,
  collectUniquePaths,
  inspectDiskPresence,
  isTransientSettlementProblem,
  normalizeMutationPath,
  settleMutationFiles,
  settleMutationSnapshot,
  settleMutationTarget
};
