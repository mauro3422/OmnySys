import { createLogger } from '../../../utils/logger.js';

const logger = createLogger('OmnySys:mutation-batch');

function getBatchState(server) {
  if (!server) {
    return {
      depth: 0,
      reasons: []
    };
  }

  if (!server._mutationBatchState) {
    server._mutationBatchState = {
      depth: 0,
      reasons: []
    };
  }

  return server._mutationBatchState;
}

function emitBatchEvent(server, eventName, payload) {
  if (typeof server?.emit !== 'function') {
    return;
  }

  try {
    server.emit(eventName, payload);
  } catch (error) {
    logger.debug(`[mutation-batch] Failed to emit ${eventName}: ${error.message}`);
  }
}

export function isMutationBatchActive(server) {
  return getBatchState(server).depth > 0;
}

export function beginMutationBatch(server, { reason = 'mutation-batch', files = [] } = {}) {
  const state = getBatchState(server);
  state.depth += 1;

  if (reason) {
    state.reasons.push(reason);
  }

  emitBatchEvent(server, 'hot-reload:mutation-batch-started', {
    reason,
    files,
    depth: state.depth,
    active: true
  });

  let released = false;

  return {
    active: true,
    release() {
      if (released) {
        return;
      }

      released = true;
      state.depth = Math.max(0, state.depth - 1);

      if (reason) {
        const lastIndex = state.reasons.lastIndexOf(reason);
        if (lastIndex !== -1) {
          state.reasons.splice(lastIndex, 1);
        }
      }

      emitBatchEvent(server, 'hot-reload:mutation-batch-completed', {
        reason,
        files,
        depth: state.depth,
        active: state.depth > 0
      });
    }
  };
}

export async function withMutationBatch(server, options = {}, callback) {
  const batch = beginMutationBatch(server, options);

  try {
    return await callback({
      active: batch.active,
      release: batch.release
    });
  } finally {
    batch.release();
  }
}

