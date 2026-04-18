import { createLogger } from '../../../../../utils/logger.js';
import { RecoveryStrategies, validateCompilerExports, validateCompilerImports } from '../../../../../shared/compiler/index.js';
import { getRepository } from '../../../../storage/repository/repository-factory.js';
import { isRepositoryReady } from '../../../../storage/repository/repository-bridge-utils.js';
import { inspectDiskPresence, normalizeMutationPath } from './paths.js';
import { reindexMutationTarget } from './reindex.js';

const logger = createLogger('OmnySys:mcp:mutation-settlement');

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

function buildValidationSnapshot(importValidation, exportValidation) {
  const importInvalid = importValidation?.success === false
    || String(importValidation?.status || '').toUpperCase() !== 'CLEAN'
    || Number(importValidation?.invalidCount || 0) > 0
    || (Array.isArray(importValidation?.brokenPaths) && importValidation.brokenPaths.length > 0)
    || (Array.isArray(importValidation?.brokenImports) && importValidation.brokenImports.length > 0);
  const exportInvalid = exportValidation?.valid === false
    || exportValidation?.success === false
    || Number(exportValidation?.invalidCount || 0) > 0
    || Number(exportValidation?.invalid?.length || 0) > 0;

  return {
    success: !importInvalid && !exportInvalid,
    importInvalid,
    exportValidation,
    exportInvalid
  };
}

async function reindexTransientTarget(projectPath, filePath, retryState, disk, allowReindexOnTransient) {
  if (!allowReindexOnTransient || !disk.exists || retryState.reindexed) {
    return;
  }

  const reindexResult = await reindexMutationTarget(projectPath, filePath);
  retryState.reindexed = !!reindexResult?.success;
  logger.debug(`[mutation-settlement] Reindexed transient target ${filePath} -> ${reindexResult?.success ? 'ok' : 'failed'}`);
}

function buildTransientError(combinedValidation, filePath) {
  const error = new Error(combinedValidation?.message || combinedValidation?.error || `Transient settlement drift for ${filePath}`);
  error.retryable = true;
  error.validation = combinedValidation;
  return error;
}

async function validateMutationTargetOnce({
  projectPath,
  filePath,
  context = {},
  allowReindexOnTransient = true,
  validationOptions = {},
  retryState
}) {
  retryState.attempts += 1;

  const repo = getRepository(projectPath);
  if (!isRepositoryReady(repo)) {
    retryState.transient = true;
    const error = new Error('database connection is not open');
    error.retryable = true;
    throw error;
  }

  const validationContext = {
    ...context,
    projectPath
  };
  const importValidation = await validateCompilerImports({
    filePath,
    checkBroken: validationOptions.checkBroken ?? true,
    checkUnused: validationOptions.checkUnused ?? true,
    checkCircular: validationOptions.checkCircular ?? false,
    checkFileExistence: validationOptions.checkFileExistence ?? true
  }, validationContext);
  const exportValidation = await validateCompilerExports({
    filePath
  }, validationContext);
  const combinedValidation = {
    ...importValidation,
    ...buildValidationSnapshot(importValidation, exportValidation)
  };
  retryState.lastValidation = combinedValidation;

  if (isTransientSettlementProblem(combinedValidation)) {
    retryState.transient = true;

    const disk = await inspectDiskPresence(projectPath, filePath);
    await reindexTransientTarget(projectPath, filePath, retryState, disk, allowReindexOnTransient);
    throw buildTransientError(combinedValidation, filePath);
  }

  retryState.transient = false;
  return combinedValidation;
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

  try {
    const validation = await RecoveryStrategies.retryWithBackoff(
      () => validateMutationTargetOnce({
        projectPath,
        filePath: normalizedFilePath,
        context,
        allowReindexOnTransient,
        validationOptions,
        retryState
      }),
      {
        maxRetries: retryOptions.maxRetries ?? 3,
        baseDelayMs: retryOptions.baseDelayMs ?? 75,
        maxDelayMs: retryOptions.maxDelayMs ?? 500
      }
    );

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
