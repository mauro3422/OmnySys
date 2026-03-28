const FOLDERIZATION_SUFFIXES = new Set([
  'analysis',
  'atom',
  'atoms',
  'builder',
  'builders',
  'churn',
  'context',
  'contract',
  'contracts',
  'count',
  'counts',
  'core',
  'cycles',
  'dataflow',
  'detection',
  'detect',
  'event',
  'events',
  'evidence',
  'execution',
  'finding',
  'findings',
  'filters',
  'graph',
  'growth',
  'helper',
  'helpers',
  'issue',
  'issues',
  'lifecycle',
  'list',
  'lists',
  'models',
  'orphan',
  'orphanage',
  'orphans',
  'payload',
  'persistence',
  'policy',
  'query',
  'report',
  'reporting',
  'reports',
  'result',
  'results',
  'reuse',
  'scan',
  'safety',
  'score',
  'scores',
  'severity',
  'shape',
  'skip',
  'slow',
  'state',
  'stats',
  'summary',
  'summaries',
  'validation',
  'violations'
]);

function normalizeFileName(filePath = '') {
  const normalized = String(filePath || '').replace(/\\/g, '/').split('/').pop() || '';
  return normalized.replace(/\.js$/i, '');
}

export function deriveFlatFamilyRoot(filePath = '') {
  const baseName = normalizeFileName(filePath);
  if (!baseName || baseName === 'index') {
    return '';
  }

  const segments = baseName.split('-').filter(Boolean);
  if (segments.length <= 1) {
    return '';
  }

  while (segments.length > 2 && FOLDERIZATION_SUFFIXES.has(segments[segments.length - 1])) {
    segments.pop();
  }

  return segments.join('-');
}

export function findFolderizationCandidates(filePaths = [], { minFileCount = 4 } = {}) {
  const groups = new Map();

  for (const rawPath of filePaths) {
    const filePath = String(rawPath || '').replace(/\\/g, '/');
    const directory = filePath.slice(0, filePath.lastIndexOf('/'));
    const familyRoot = deriveFlatFamilyRoot(filePath);

    if (!familyRoot || !directory) {
      continue;
    }

    const groupKey = `${directory}::${familyRoot}`;
    if (!groups.has(groupKey)) {
      groups.set(groupKey, {
        directory,
        familyRoot,
        files: []
      });
    }

    groups.get(groupKey).files.push(filePath);
  }

  return Array.from(groups.values())
    .filter((group) => group.files.length >= minFileCount)
    .map((group) => ({
      ...group,
      fileCount: group.files.length,
      files: group.files.sort()
    }))
    .sort((a, b) => b.fileCount - a.fileCount || a.familyRoot.localeCompare(b.familyRoot));
}
