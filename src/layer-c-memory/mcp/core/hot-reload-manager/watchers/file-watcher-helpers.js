import { stat } from 'fs/promises';
import path from 'path';

const STARTUP_SUPPRESSION_WINDOW_MS = 1500;
const PRE_RESTART_FILE_GRACE_MS = 2000;
const DUPLICATE_WINDOW_FLOOR_MS = 750;

function normalizeWatcherFilename(filename) {
  return path.normalize(filename).replace(/\\/g, '/');
}

async function isPostRestartFile(projectPath, normalizedFilename, startedAt, logger) {
  try {
    const fullPath = path.resolve(projectPath, 'src', normalizedFilename);
    const stats = await stat(fullPath);

    if (stats.mtimeMs < startedAt - PRE_RESTART_FILE_GRACE_MS) {
      const ageMs = startedAt - stats.mtimeMs;
      logger.debug(
        `Ignoring pre-restart file change: ${normalizedFilename} (modified ${Math.round(ageMs / 1000)}s before watcher)`
      );
      return false;
    }

    return true;
  } catch (error) {
    logger.debug(`Could not stat file ${normalizedFilename}: ${error.message}`);
    return true;
  }
}

function getDuplicateWindowMs(debounceMs) {
  return Math.max(debounceMs, DUPLICATE_WINDOW_FLOOR_MS);
}

export function buildFileWatcherStats(startupNoiseSuppressed, isWatching) {
  return {
    startupNoiseSuppressed,
    startupSuppressionWindowMs: STARTUP_SUPPRESSION_WINDOW_MS,
    isWatching
  };
}

export async function processFileWatcherChange({
  eventType,
  filename,
  projectPath,
  startedAt,
  warmupPeriodMs,
  debounceMs,
  lastChangeEvents,
  clearDebounce,
  onChange,
  logger,
  recordStartupNoiseSuppressed
}) {
  if (!filename || !filename.endsWith('.js')) {
    return false;
  }

  const normalizedFilename = normalizeWatcherFilename(filename);
  const timeSinceStart = Date.now() - startedAt;

  if (timeSinceStart < STARTUP_SUPPRESSION_WINDOW_MS) {
    recordStartupNoiseSuppressed?.();
    logger.debug(`Ignoring startup watcher noise: ${normalizedFilename}`);
    return false;
  }

  if (timeSinceStart < warmupPeriodMs) {
    const remaining = Math.round((warmupPeriodMs - timeSinceStart) / 1000);
    logger.debug(
      `Ignoring post-restart warmup event: ${normalizedFilename} (${remaining}s remaining in warmup)`
    );
    return false;
  }

  const isRecentFile = await isPostRestartFile(projectPath, normalizedFilename, startedAt, logger);
  if (!isRecentFile) {
    return false;
  }

  const now = Date.now();
  const dedupeKey = normalizedFilename.toLowerCase();
  const lastEventAt = lastChangeEvents.get(dedupeKey) || 0;
  const duplicateWindowMs = getDuplicateWindowMs(debounceMs);

  if (lastEventAt > 0 && (now - lastEventAt) < duplicateWindowMs) {
    return false;
  }

  lastChangeEvents.set(dedupeKey, now);
  logger.info(`File change detected: ${normalizedFilename} (${timeSinceStart}ms after watcher start)`);

  clearDebounce();

  const fullPath = path.normalize(path.join('src', normalizedFilename)).replace(/\\/g, '/');
  const timeout = setTimeout(() => {
    onChange(eventType, fullPath);
  }, debounceMs);

  if (timeout.unref) {
    timeout.unref();
  }

  return true;
}
