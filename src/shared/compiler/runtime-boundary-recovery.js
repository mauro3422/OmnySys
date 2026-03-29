import { createLogger } from '../../utils/logger.js';

const logger = createLogger('OmnySys:compiler:runtime-boundary');

export async function retryWithBackoff(operation, options = {}) {
  const {
    maxRetries = 3,
    baseDelayMs = 100,
    maxDelayMs = 5000
  } = options;

  let lastError;
  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      return await operation();
    } catch (error) {
      lastError = error;
      const delay = Math.min(baseDelayMs * Math.pow(2, attempt), maxDelayMs);
      logger.debug(`[Recovery] Retry ${attempt + 1}/${maxRetries} after ${delay}ms`);
      await new Promise((resolve) => setTimeout(resolve, delay));
    }
  }

  throw lastError;
}

export function fallbackTo(fallbackValue) {
  return async function fallbackStrategy(error) {
    logger.info(`[Recovery] Using fallback value due to: ${error.message}`);
    return fallbackValue;
  };
}

export async function returnNull() {
  return null;
}

export async function rethrow(error) {
  throw error;
}

export const RecoveryStrategies = {
  retryWithBackoff,
  fallbackTo,
  returnNull,
  rethrow
};

export const RuntimeBoundaryMetadata = {
  version: '1.0.0',
  supportedBoundaryTypes: ['runtime', 'network', 'filesystem', 'database'],
  defaultTimeoutMs: 5000,
  defaultRetries: 0,
  recoveryStrategies: Object.keys(RecoveryStrategies)
};
