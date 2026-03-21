import { statsPool } from '../../shared/utils/stats-pool.js';
import { stat } from 'fs/promises';

export const WATCHER_SURFACE_KIND = {
  CODE: 'code',
  MANIFEST: 'manifest',
  BUILD_CONFIG: 'build-config',
  DEPENDENCY_METADATA: 'dependency-metadata',
  PROVENANCE_ONLY: 'provenance-only',
  IGNORED: 'ignored',
  UNKNOWN: 'unknown'
};

const CODE_FILE_PATTERN = /\.(js|ts|jsx|tsx|mjs|cjs)$/i;
const METADATA_FILE_NAMES = new Set([
  'package.json',
  'package-lock.json',
  'pnpm-lock.yaml',
  'yarn.lock',
  'tsconfig.json',
  'jsconfig.json'
]);
const BUILD_CONFIG_PATTERNS = [
  /^\.github\/workflows\//i,
  /^\.github\/dependabot\.ya?ml$/i,
  /^dockerfile$/i,
  /^compose\.ya?ml$/i,
  /^docker-compose\.ya?ml$/i,
  /^turbo\.json$/i,
  /^nx\.json$/i
];

function normalizePath(filePath) {
  return String(filePath || '').replace(/\\/g, '/');
}

/**
 * Verifica si un archivo es relevante para analisis
 */
export function classifyWatcherSurface(filePath) {
  const normalized = normalizePath(filePath);
  const lower = normalized.toLowerCase();
  const baseName = lower.split('/').pop() || lower;

  if (shouldIgnore(normalized)) {
    return {
      kind: WATCHER_SURFACE_KIND.IGNORED,
      relevant: false,
      queueForAnalysis: false,
      analysisScope: 'ignored'
    };
  }

  if (CODE_FILE_PATTERN.test(normalized)) {
    return {
      kind: WATCHER_SURFACE_KIND.CODE,
      relevant: true,
      queueForAnalysis: true,
      analysisScope: 'atom-reindex'
    };
  }

  if (METADATA_FILE_NAMES.has(baseName)) {
    return {
      kind: WATCHER_SURFACE_KIND.MANIFEST,
      relevant: true,
      queueForAnalysis: false,
      analysisScope: 'metadata'
    };
  }

  if (BUILD_CONFIG_PATTERNS.some((pattern) => pattern.test(lower))) {
    return {
      kind: WATCHER_SURFACE_KIND.BUILD_CONFIG,
      relevant: true,
      queueForAnalysis: false,
      analysisScope: 'build-config'
    };
  }

  return {
    kind: WATCHER_SURFACE_KIND.UNKNOWN,
    relevant: false,
    queueForAnalysis: false,
    analysisScope: 'unknown'
  };
}

export function isRelevantFile(filePath) {
  return classifyWatcherSurface(filePath).relevant;
}

/**
 * Verifica si un archivo debe ser ignorado
 */
export function shouldIgnore(filePath) {
  const ignorePatterns = [
    'node_modules/',
    '.git/',
    'dist/',
    'build/',
    '.omnysysdata/',
    'coverage/',
    '.vscode/'
  ];

  return ignorePatterns.some(pattern => filePath.includes(pattern));
}

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
  const kind = surface?.kind || WATCHER_SURFACE_KIND.UNKNOWN;

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
  const kind = surface?.kind || WATCHER_SURFACE_KIND.UNKNOWN;
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

/**
 * Obtiene estadisticas del watcher
 */
export function getStats(...args) {
  const pooled = statsPool.getStats('watcher', ...args) || {};
  return {
    ...pooled,
    isRunning: this.isRunning,
    pendingChanges: this.pendingChanges?.size || 0,
    trackedFiles: this.fileHashes?.size || 0,
    startupNoiseSuppressed: this.startupNoiseSuppressed || 0,
    startupSuppressionWindowMs: 1500,
    originCounts: { ...(this.changeOrigins || {}) },
    lastChangeOrigin: this.lastChangeOrigin || null,
    lastChangeAt: this.lastChangeAt || null,
    surfaceCounts: { ...(this.surfaceCounts || {}) },
    lastChangeSurface: this.lastChangeSurface || null
  };
}
