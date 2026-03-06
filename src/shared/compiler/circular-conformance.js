import { normalizePath } from '#shared/utils/path-utils.js';

const RUNTIME_LIFECYCLE_FILES = [
  '/mcp-http-proxy.js',
  '/mcp-stdio-bridge.js'
];

const LIFECYCLE_NAME_PATTERN = /schedule|spawn|restart|reconnect|recover|wait|connect|disconnect|shutdown|start|stop|close/i;
const ALGORITHMIC_NAME_PATTERN = /^(dfs|bfs|walk|visit|traverse|findCycleDFS|scan|search)$/i;

function getCycleFileSet(atomCycle = []) {
  return new Set(
    atomCycle
      .map((atomId) => String(atomId || '').split('::')[0])
      .filter(Boolean)
  );
}

export function isRuntimeLifecycleFile(filePath = '') {
  const normalized = normalizePath(filePath);
  return RUNTIME_LIFECYCLE_FILES.some((suffix) => normalized.endsWith(suffix));
}

export function isSameFileCycle(atomCycle = []) {
  return getCycleFileSet(atomCycle).size === 1;
}

export function isIntentionalAlgorithmicCycle(atomCycle = [], atomNames = []) {
  if (atomCycle.length < 3 || !isSameFileCycle(atomCycle)) {
    return false;
  }

  const matches = atomNames.filter((name) => ALGORITHMIC_NAME_PATTERN.test(String(name || ''))).length;
  return matches >= Math.max(2, atomNames.length - 1);
}

export function isEventDrivenLifecycleCycle(filePath, atomCycle = [], atomNames = []) {
  if (!isRuntimeLifecycleFile(filePath) || atomCycle.length < 3 || !isSameFileCycle(atomCycle)) {
    return false;
  }

  const lifecycleHits = atomNames.filter((name) => LIFECYCLE_NAME_PATTERN.test(String(name || ''))).length;
  return lifecycleHits >= Math.max(2, atomNames.length - 1);
}

export function classifyCircularCycle(filePath, atomCycle = [], atomNames = []) {
  if (isIntentionalAlgorithmicCycle(atomCycle, atomNames)) {
    return 'algorithmic';
  }

  if (isEventDrivenLifecycleCycle(filePath, atomCycle, atomNames)) {
    return 'lifecycle';
  }

  return 'structural';
}
