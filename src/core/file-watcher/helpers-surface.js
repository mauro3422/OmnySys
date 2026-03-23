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

export const WATCHER_SURFACE_KIND = {
  CODE: 'code',
  MANIFEST: 'manifest',
  BUILD_CONFIG: 'build-config',
  DEPENDENCY_METADATA: 'dependency-metadata',
  PROVENANCE_ONLY: 'provenance-only',
  IGNORED: 'ignored',
  UNKNOWN: 'unknown'
};

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

  return ignorePatterns.some((pattern) => filePath.includes(pattern));
}

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
