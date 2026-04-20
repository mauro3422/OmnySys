import { isMainThread } from 'worker_threads';
import { retryUntilAvailable, isTransientDatabaseError } from '../repository-bridge-utils.js';
import { getRepositoryStatus } from './status.js';
import { enqueueRepositoryMutation } from './queue.js';
import { REPOSITORY_MUTATION_DURABILITY } from './constants.js';

async function retryMutationUntilAvailable(projectPath, mutation, retryOptions = {}) {
  const attempts = Math.max(1, retryOptions.maxRetries ?? 5);
  const baseDelayMs = Math.max(1, retryOptions.baseDelayMs ?? 50);
  const maxDelayMs = Math.max(baseDelayMs, retryOptions.maxDelayMs ?? 500);

  try {
    const result = await retryUntilAvailable({
      attempts,
      baseDelayMs,
      maxDelayMs,
      shouldRetry: isTransientDatabaseError,
      operation: async () => {
        const status = getRepositoryStatus(projectPath);
        if (!status.ready) {
          throw new Error(status.reason || 'repository is not ready');
        }

        const mutationResult = await mutation.run(status.repo, status);
        return { state: status, result: mutationResult };
      }
    });

    return {
      success: true,
      queued: false,
      skipped: false,
      reason: null,
      state: result.state,
      result: result.result
    };
  } catch (error) {
    if (!isTransientDatabaseError(error)) {
      throw error;
    }

    return {
      success: false,
      queued: false,
      skipped: false,
      reason: error?.message || 'repository mutation retry exhausted',
      state: getRepositoryStatus(projectPath),
      result: null,
      error: error?.message || 'repository mutation retry exhausted'
    };
  }
}

export async function runRepositoryMutation(projectPath, mutation, options = {}) {
  const durability = options.durability || REPOSITORY_MUTATION_DURABILITY.REBUILDABLE;
  const status = getRepositoryStatus(projectPath);

  if (status.ready) {
    try {
      const result = await mutation.run(status.repo, status);
      return { success: true, queued: false, skipped: false, reason: null, state: status, result };
    } catch (error) {
      if (durability === REPOSITORY_MUTATION_DURABILITY.DURABLE && isTransientDatabaseError(error)) {
        if (!isMainThread) {
          return await retryMutationUntilAvailable(projectPath, mutation, options.retryOptions || {});
        }

        enqueueRepositoryMutation(projectPath, {
          ...mutation,
          durability,
          metadata: { ...(mutation.metadata || {}), lastError: error.message }
        });
        return { success: true, queued: true, skipped: false, reason: error.message, state: status, result: null };
      }
      throw error;
    }
  }

  if (durability === REPOSITORY_MUTATION_DURABILITY.DURABLE) {
    if (!isMainThread) {
      return {
        success: false,
        queued: false,
        skipped: true,
        reason: status.reason,
        state: status,
        result: null,
        error: status.reason
      };
    }

    enqueueRepositoryMutation(projectPath, mutation);
    return { success: true, queued: true, skipped: false, reason: status.reason, state: status, result: null };
  }

  return { success: true, queued: false, skipped: true, reason: status.reason, state: status, result: null };
}
