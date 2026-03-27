import { executeWithBoundary } from './runtime-boundary-execution-core.js';

export async function executeWithNetworkBoundary(networkOperation, options = {}) {
  const {
    timeoutMs = 5000,
    retries = 0,
    operationName = 'network-call'
  } = options;

  const operationWithTimeout = async () => {
    const timeoutPromise = new Promise((_, reject) => {
      setTimeout(() => reject(new Error(`Timeout after ${timeoutMs}ms`)), timeoutMs);
    });

    return Promise.race([networkOperation(), timeoutPromise]);
  };

  let lastError;
  for (let attempt = 0; attempt <= retries; attempt++) {
    const result = await executeWithBoundary(operationWithTimeout, {
      operationName: `${operationName}${attempt > 0 ? ` (attempt ${attempt + 1})` : ''}`,
      boundaryType: 'network',
      shouldRecover: false
    });

    if (result.success) {
      return result;
    }

    lastError = result.error;
  }

  return {
    success: false,
    error: lastError,
    boundaryType: 'network'
  };
}
