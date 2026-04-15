import { loadFolderizationRows, normalizeFolderizationPath } from '../directory-structure-folderization-data.js';

export const FOLDERIZATION_SUFFIXES = new Set([
  'analysis', 'atom', 'atoms', 'builder', 'builders', 'churn', 'context',
  'contract', 'contracts', 'count', 'counts', 'core', 'cycles', 'dataflow',
  'detection', 'detect', 'event', 'events', 'evidence', 'execution',
  'finding', 'findings', 'filters', 'graph', 'growth', 'helper', 'helpers',
  'history', 'issue', 'issues', 'lifecycle', 'list', 'lists', 'models',
  'orphan', 'orphanage', 'orphans', 'payload', 'persistence', 'policy',
  'query', 'report', 'reporting', 'reports', 'result', 'results', 'reuse',
  'scan', 'safety', 'score', 'scores', 'severity', 'shape', 'skip', 'slow',
  'snapshot', 'state', 'stats', 'summary', 'summaries', 'validation', 'violations'
]);

export function normalizeFileName(filePath = '') {
  const normalized = normalizeFolderizationPath(filePath);
  const baseName = normalized.split('/').pop() || '';
  return baseName.replace(/\.js$/i, '');
}

export function buildFamilyKey(directory, familyRoot) {
  return `${directory}::${familyRoot}`;
}

export function isAlreadyFolderized(directory = '', familyRoot = '') {
  const normalizedDirectory = normalizeFolderizationPath(directory);
  const directoryBasename = normalizedDirectory.split('/').pop() || '';
  return Boolean(normalizedDirectory) && directoryBasename === familyRoot;
}

export function indexFolderizationRows(rows = []) {
  const pathIndex = new Map();
  for (const row of rows) {
    pathIndex.set(row.path, row);
  }
  return pathIndex;
}

export function getDependencyTargets(row = {}) {
  if (Array.isArray(row?.dependencyTargets)) {
    return row.dependencyTargets;
  }
  const combined = [
    ...(Array.isArray(row?.importTargets) ? row.importTargets : []),
    ...(Array.isArray(row?.exportTargets) ? row.exportTargets : [])
  ];
  return Array.from(new Set(combined.filter(Boolean)));
}

export function toComparableStamp(value) {
  if (value == null || value === '') {
    return null;
  }
  if (typeof value === 'number' && Number.isFinite(value)) {
    return value;
  }
  const parsed = Date.parse(value);
  return Number.isNaN(parsed) ? null : parsed;
}

export function buildCandidateContext(candidate) {
  return {
    familyRoot: candidate.familyRoot,
    directory: candidate.directory,
    fileCount: candidate.fileCount,
    barrelFile: candidate.barrelFile?.path || null,
    confidence: candidate.confidence
  };
}