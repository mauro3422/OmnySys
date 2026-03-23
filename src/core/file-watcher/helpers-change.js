export function normalizeWatcherOrigin(origin, fallback = 'unknown') {
  const normalized = String(origin || '').trim().toLowerCase();
  return normalized || fallback;
}

export function buildWatcherChangeInfo({
  filePath,
  fullPath,
  changeType,
  timestamp = Date.now(),
  metadata = {},
  surface = null
}) {
  const origin = normalizeWatcherOrigin(metadata.origin);
  const kind = surface?.kind || 'unknown';

  return {
    filePath,
    type: changeType,
    timestamp,
    fullPath,
    origin,
    actor: metadata.actor || null,
    detector: metadata.detector || null,
    transport: metadata.transport || null,
    source: metadata.source || origin,
    requestedBy: metadata.requestedBy || null,
    surfaceKind: kind,
    surfaceScope: surface?.analysisScope || 'unknown',
    queueForAnalysis: surface?.queueForAnalysis !== false
  };
}

export function recordWatcherOrigin(watcher, origin) {
  const normalized = normalizeWatcherOrigin(origin);
  if (!watcher.changeOrigins) {
    watcher.changeOrigins = {};
  }
  if (watcher.changeOrigins[normalized] === undefined) {
    watcher.changeOrigins[normalized] = 0;
  }
  watcher.changeOrigins[normalized] += 1;
  watcher.lastChangeOrigin = normalized;
  watcher.lastChangeAt = Date.now();
  return normalized;
}

export function recordWatcherSurface(watcher, surface) {
  const kind = surface?.kind || 'unknown';
  if (!watcher.surfaceCounts) {
    watcher.surfaceCounts = {};
  }
  if (watcher.surfaceCounts[kind] === undefined) {
    watcher.surfaceCounts[kind] = 0;
  }
  watcher.surfaceCounts[kind] += 1;
  watcher.lastChangeSurface = kind;
  return kind;
}

export async function shouldSkipModifiedWatcherChange(watcher, filePath, relativePath, options = {}) {
  const verbose = !!options.verbose;

  try {
    const { stat } = await import('fs/promises');
    const currentStats = await stat(filePath);
    const previousStats = watcher.fileStats?.get(relativePath);

    if (
      previousStats &&
      previousStats.mtimeMs === currentStats.mtimeMs &&
      previousStats.size === currentStats.size
    ) {
      return { skip: true, reason: 'unchanged_stats' };
    }

    const nextHash = await watcher._calculateContentHash(filePath);
    const previousHash = watcher.fileHashes?.get(relativePath);

    if (nextHash && previousHash && nextHash === previousHash) {
      if (watcher.fileStats) {
        watcher.fileStats.set(relativePath, {
          mtimeMs: currentStats.mtimeMs,
          size: currentStats.size
        });
      }

      return { skip: true, reason: 'unchanged_hash' };
    }

    return {
      skip: false,
      currentStats,
      nextHash,
      previousHash,
      verbose
    };
  } catch (error) {
    return { skip: false, error: error.message };
  }
}

export function queueWatcherChange(watcher, relativePath, changeInfo) {
  watcher.pendingChanges.set(relativePath, changeInfo);

  if (watcher.batchProcessor && watcher.options.useSmartBatch) {
    watcher.batchProcessor.addChange(relativePath, changeInfo);
  }

  watcher.stats.totalChanges++;

  return changeInfo;
}

export function emitWatcherSurfaceChange(watcher, changeInfo) {
  watcher.stats.totalChanges++;
  watcher.emit('surface:changed', {
    filePath: changeInfo.filePath,
    type: changeInfo.type,
    origin: changeInfo.origin,
    actor: changeInfo.actor,
    detector: changeInfo.detector,
    source: changeInfo.source,
    surface: changeInfo.surfaceKind,
    scope: changeInfo.surfaceScope
  });
  return changeInfo;
}
