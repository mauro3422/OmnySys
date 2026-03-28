function isTransientDatabaseError(error) {
  const message = String(error?.message || '').toLowerCase();
  return (
    error?.code === 'SQLITE_BUSY' ||
    error?.code === 'SQLITE_LOCKED' ||
    message.includes('database connection is not open') ||
    message.includes('database is locked') ||
    message.includes('database is busy')
  );
}

async function wait(ms) {
  if (!Number.isFinite(ms) || ms <= 0) return;
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function getRepositoryRetryDelay(attempts, baseDelayMs = 100, maxDelayMs = 2000) {
  const safeAttempts = Math.max(1, Number(attempts) || 1);
  const safeBaseDelayMs = Math.max(1, Number(baseDelayMs) || 100);
  const safeMaxDelayMs = Math.max(safeBaseDelayMs, Number(maxDelayMs) || 2000);
  return Math.min(safeBaseDelayMs * safeAttempts, safeMaxDelayMs);
}

async function retryUntilAvailable({ attempts = 5, baseDelayMs = 50, maxDelayMs = 500, operation, shouldRetry }) {
  let lastError = null;

  for (let attempt = 0; attempt < attempts; attempt += 1) {
    try {
      return await operation();
    } catch (error) {
      lastError = error;
      if (!shouldRetry(error) || attempt === attempts - 1) {
        throw error;
      }

      const delay = Math.min(baseDelayMs * (attempt + 1), maxDelayMs);
      await wait(delay);
    }
  }

  throw lastError;
}

export {
  getRepositoryRetryDelay,
  isTransientDatabaseError,
  retryUntilAvailable,
  wait
};
