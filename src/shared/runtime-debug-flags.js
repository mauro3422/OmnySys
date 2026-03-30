const TRUTHY_VALUES = new Set(['1', 'true', 'yes', 'on', 'debug']);

function isTruthyEnv(value) {
  return TRUTHY_VALUES.has(String(value ?? '').trim().toLowerCase());
}

function summarizeObject(value, depth = 0, maxDepth = 2, maxEntries = 8) {
  if (value == null) {
    return value;
  }

  if (typeof value === 'string') {
    return value.length > 240 ? `${value.slice(0, 237)}...` : value;
  }

  if (typeof value === 'number' || typeof value === 'boolean') {
    return value;
  }

  if (typeof value === 'function') {
    return `[function ${value.name || 'anonymous'}]`;
  }

  if (Array.isArray(value)) {
    return {
      kind: 'array',
      length: value.length,
      sample: value.slice(0, maxEntries).map((item) => summarizeObject(item, depth + 1, maxDepth, maxEntries))
    };
  }

  if (typeof value === 'object') {
    if (depth >= maxDepth) {
      return '[object]';
    }

    const summary = {};
    const entries = Object.entries(value).slice(0, maxEntries);
    for (const [key, entryValue] of entries) {
      summary[key] = summarizeObject(entryValue, depth + 1, maxDepth, maxEntries);
    }

    const remaining = Object.keys(value).length - entries.length;
    if (remaining > 0) {
      summary.__truncated = remaining;
    }

    return summary;
  }

  return String(value);
}

export function isBugModeEnabled() {
  return isTruthyEnv(process.env.OMNYSYS_BUG_MODE)
    || isTruthyEnv(process.env.OMNYSYS_TRACE_TOOLS)
    || isTruthyEnv(process.env.OMNYSYS_TRACE_GUARDS);
}

export function isToolTraceEnabled() {
  return isBugModeEnabled() || isTruthyEnv(process.env.OMNYSYS_TRACE_TOOLS);
}

export function isGuardTraceEnabled() {
  return isBugModeEnabled() || isTruthyEnv(process.env.OMNYSYS_TRACE_GUARDS);
}

export function summarizeDebugValue(value, options = {}) {
  const {
    maxDepth = 2,
    maxEntries = 8
  } = options;

  return summarizeObject(value, 0, maxDepth, maxEntries);
}

export function summarizeDebugContext(context = {}) {
  const value = context && typeof context === 'object' ? context : {};
  return {
    keys: Object.keys(value).sort(),
    projectPath: value.projectPath || null,
    hasOrchestrator: Boolean(value.orchestrator),
    hasCache: Boolean(value.cache),
    hasSessionDb: Boolean(value.sessionDb),
    bugMode: isBugModeEnabled()
  };
}
