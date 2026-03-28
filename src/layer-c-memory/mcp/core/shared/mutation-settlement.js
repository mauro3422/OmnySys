import fs from 'fs/promises';
import path from 'path';
import { createLogger } from '../../../../utils/logger.js';
import { getRepository } from '../../../storage/repository/repository-factory.js';
import { RecoveryStrategies } from '../../../../shared/compiler/runtime-boundary-recovery.js';
import { validate_imports } from '../../tools/validate-imports.js';
import { reindexFile } from '../../tools/atomic-edit/reindex.js';

const logger = createLogger('OmnySys:mcp:mutation-settlement');

function normalizeMutationPath(filePath = '') {
  return String(filePath || '')
    .trim()
    .replace(/\\/g, '/')
    .replace(/^\.\//, '')
    .replace(/^\/+/, '');
}

function collectUniquePaths(paths = []) {
  return Array.from(
    new Set(
      (Array.isArray(paths) ? paths : [paths])
        .map((filePath) => normalizeMutationPath(filePath))
        .filter(Boolean)
    )
  );
}

function isRepositoryReady(repo) {
  return !!(repo?.initialized && repo?.db && repo.db.open !== false);
}

function isTransientSettlementProblem(value) {
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

async function inspectDiskPresence(projectPath, filePath) {
  const absolutePath = path.resolve(projectPath, filePath);

  try {
    await fs.access(absolutePath);
    return {
      exists: true,
      absolutePath
    };
  } catch {
    return {
      exists: false,
      absolutePath
    };
  }
}

export function buildMutationSettlementSnapshot({
  reason = 'mutation',
  touchedFiles = [],
  validationTargets = [],
  reindexTargets = []
} = {}) {
  const normalizedTouchedFiles = collectUniquePaths(touchedFiles);
  const normalizedValidationTargets = collectUniquePaths(
    validationTargets.length > 0 ? validationTargets : normalizedTouchedFiles
  );
  const normalizedReindexTargets = collectUniquePaths(reindexTargets);

  return {
    createdAt: new Date().toISOString(),
    reason,
    touchedFiles: normalizedTouchedFiles,
    validationTargets: normalizedValidationTargets,
    reindexTargets: normalizedReindexTargets,
    getValidationTargets(filePath) {
      const normalized = normalizeMutationPath(filePath);
      return normalizedValidationTargets.includes(normalized) ? [normalized] : [];
    },
    getReindexTargets(filePath) {
      const normalized = normalizeMutationPath(filePath);
      return normalizedReindexTargets.includes(normalized) ? [normalized] : [];
    }
  };
}

async function settleMutationFile({
  projectPath,
  filePath,
  context = {},
  allowReindexOnTransient = true,
  retryOptions = {},
  validationOptions = {}
}) {
  const normalizedFilePath = normalizeMutationPath(filePath);
  const disk = await inspectDiskPresence(projectPath, normalizedFilePath);
  const retryState = {
    attempts: 0,
    reindexed: false,
    transient: false,
    lastValidation: null
  };

  try {
    const validation = await RecoveryStrategies.retryWithBackoff(async () => {
      retryState.attempts += 1;

      const repo = getRepository(projectPath);
      if (!isRepositoryReady(repo)) {
        retryState.transient = true;
        const error = new Error('database connection is not open');
        error.retryable = true;
        throw error;
      }

      const result = await validate_imports({
        filePath: normalizedFilePath,
        checkBroken: validationOptions.checkBroken ?? true,
        checkUnused: validationOptions.checkUnused ?? true,
        checkCircular: validationOptions.checkCircular ?? false,
        checkFileExistence: validationOptions.checkFileExistence ?? true
      }, {
        ...context,
        projectPath
      });

      retryState.lastValidation = result;

      if (isTransientSettlementProblem(result)) {
        retryState.transient = true;

        if (allowReindexOnTransient && disk.exists && !retryState.reindexed) {
          const reindexResult = await reindexFile(normalizedFilePath, projectPath);
          retryState.reindexed = !!reindexResult?.success;
          logger.debug(`[mutation-settlement] Reindexed transient target ${normalizedFilePath} -> ${reindexResult?.success ? 'ok' : 'failed'}`);
        }

        const error = new Error(result?.message || result?.error || `Transient settlement drift for ${normalizedFilePath}`);
        error.retryable = true;
        error.validation = result;
        throw error;
      }

      retryState.transient = false;
      return result;
    }, {
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

  const validations = [];
  for (const filePath of validationTargets) {
    validations.push(
      await settleMutationFile({
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
    validations,
    summary: {
      validationTargets: validationTargets.length,
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

export { isTransientSettlementProblem };
