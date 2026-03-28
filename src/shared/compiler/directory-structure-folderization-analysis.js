import { getRecommendation } from './recommendations/RecommendationEngine.js';
import { loadFolderizationRows, normalizeFolderizationPath } from './directory-structure-folderization-data.js';

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
  const normalized = normalizeFolderizationPath(filePath);
  const baseName = normalized.split('/').pop() || '';
  return baseName.replace(/\.js$/i, '');
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

function buildFamilyKey(directory, familyRoot) {
  return `${directory}::${familyRoot}`;
}

function isAlreadyFolderized(directory = '', familyRoot = '') {
  const normalizedDirectory = normalizeFolderizationPath(directory);
  const directoryBasename = normalizedDirectory.split('/').pop() || '';
  return Boolean(normalizedDirectory) && directoryBasename === familyRoot;
}

function indexFolderizationRows(rows = []) {
  const pathIndex = new Map();

  for (const row of rows) {
    pathIndex.set(row.path, row);
  }

  return pathIndex;
}

function buildBarrelCandidate(members, groupSet, importerIndex) {
  const scored = members.map((member) => {
    const internalImportCount = member.importTargets.filter((target) => groupSet.has(target)).length;
    const inboundImporters = importerIndex.get(member.path)?.size || 0;
    const isIndexFile = member.basename === 'index';
    const score = (
      member.exportCount * 4 +
      inboundImporters * 3 +
      internalImportCount * 2 +
      (isIndexFile ? 5 : 0) +
      (member.moduleName ? 1 : 0)
    );

    return {
      ...member,
      internalImportCount,
      outboundImportCount: member.importTargets.length - internalImportCount,
      inboundImporters,
      score,
      isIndexFile
    };
  });

  scored.sort((a, b) => b.score - a.score || b.exportCount - a.exportCount || a.path.localeCompare(b.path));
  return scored[0] || null;
}

function buildCandidateContext(candidate) {
  return {
    familyRoot: candidate.familyRoot,
    directory: candidate.directory,
    fileCount: candidate.fileCount,
    barrelFile: candidate.barrelFile?.path || null,
    confidence: candidate.confidence
  };
}

export function findFolderizationCandidateForPaths(candidates = [], filePaths = []) {
  const normalizedPaths = filePaths
    .map((filePath) => normalizeFolderizationPath(filePath))
    .filter(Boolean);

  if (normalizedPaths.length === 0) {
    return null;
  }

  const candidateByPath = new Map();

  for (const candidate of candidates) {
    for (const memberPath of candidate.files || []) {
      candidateByPath.set(normalizeFolderizationPath(memberPath), candidate);
    }
  }

  for (const normalizedPath of normalizedPaths) {
    const candidate = candidateByPath.get(normalizedPath);
    if (candidate) {
      return candidate;
    }
  }

  return null;
}

function scoreCandidateGroup(group, importerIndex, options = {}) {
  const { minFileCount = 4 } = options;
  const members = group.members.slice().sort((a, b) => a.path.localeCompare(b.path));
  const groupSet = new Set(members.map((member) => member.path));

  const enrichedMembers = members.map((member) => {
    const internalImportCount = member.importTargets.filter((target) => groupSet.has(target)).length;
    const externalImportCount = member.importTargets.length - internalImportCount;
    const inboundImporters = importerIndex.get(member.path)?.size || 0;

    return {
      ...member,
      internalImportCount,
      externalImportCount,
      inboundImporters
    };
  });

  const barrelFile = buildBarrelCandidate(enrichedMembers, groupSet, importerIndex);
  const exportCount = enrichedMembers.reduce((sum, member) => sum + member.exportCount, 0);
  const internalImportEdges = enrichedMembers.reduce((sum, member) => sum + member.internalImportCount, 0);
  const externalImportEdges = enrichedMembers.reduce((sum, member) => sum + member.externalImportCount, 0);
  const exportingMembers = enrichedMembers.filter((member) => member.exportCount > 0).length;
  const barrelPresenceScore = barrelFile ? 20 : 0;
  const sizeScore = Math.min(35, enrichedMembers.length * 6);
  const internalDensity = enrichedMembers.length > 1
    ? internalImportEdges / (enrichedMembers.length * (enrichedMembers.length - 1))
    : 0;
  const densityScore = Math.round(internalDensity * 35);
  const exportScore = Math.round((exportingMembers / Math.max(enrichedMembers.length, 1)) * 15);
  const externalPenalty = Math.round(Math.min(15, externalImportEdges * 1.5));
  const confidence = Math.max(
    0,
    Math.min(100, sizeScore + densityScore + exportScore + barrelPresenceScore - externalPenalty)
  );
  const recommendedFolder = `${group.directory}/${group.familyRoot}`;

  return {
    directory: group.directory,
    familyRoot: group.familyRoot,
    recommendedFolder,
    fileCount: enrichedMembers.length,
    files: enrichedMembers.map((member) => member.path).sort(),
    members: enrichedMembers,
    barrelFile: barrelFile ? {
      path: barrelFile.path,
      exportsCount: barrelFile.exportCount,
      importsCount: barrelFile.importTargets.length,
      inboundImporters: barrelFile.inboundImporters,
      score: barrelFile.score
    } : null,
    internalImportEdges,
    externalImportEdges,
    exportCount,
    exportingMembers,
    confidence,
    shouldFolderize: enrichedMembers.length >= minFileCount && (Boolean(barrelFile) || internalImportEdges >= enrichedMembers.length),
    recommendation: getRecommendation({
      type: 'flat_family_sprawl',
      filePath: enrichedMembers[0]?.path || '',
      context: buildCandidateContext({
        ...group,
        fileCount: enrichedMembers.length,
        barrelFile,
        confidence
      })
    }).message
  };
}

export function findFolderizationCandidatesFromRows(rows = [], options = {}) {
  const { minFileCount = 4 } = options;
  const pathIndex = indexFolderizationRows(rows);
  const importerIndex = new Map();
  const groups = new Map();

  for (const row of rows) {
    const directory = row.directory || '';
    const familyRoot = deriveFlatFamilyRoot(row.path);
    if (!directory || !familyRoot || isAlreadyFolderized(directory, familyRoot)) {
      continue;
    }

    const key = buildFamilyKey(directory, familyRoot);
    if (!groups.has(key)) {
      groups.set(key, {
        directory,
        familyRoot,
        members: []
      });
    }

    groups.get(key).members.push(row);
  }

  for (const row of rows) {
    for (const importTarget of row.importTargets) {
      const normalizedTarget = normalizeFolderizationPath(importTarget);
      if (!normalizedTarget || !pathIndex.has(normalizedTarget)) {
        continue;
      }

      if (!importerIndex.has(normalizedTarget)) {
        importerIndex.set(normalizedTarget, new Set());
      }

      importerIndex.get(normalizedTarget).add(row.path);
    }
  }

  return Array.from(groups.values())
    .map((group) => scoreCandidateGroup(group, importerIndex, { minFileCount }))
    .filter((candidate) => candidate.shouldFolderize)
    .sort((a, b) => b.confidence - a.confidence || b.fileCount - a.fileCount || a.recommendedFolder.localeCompare(b.recommendedFolder));
}

export function findFolderizationCandidatesFromRepo(repo, options = {}) {
  if (!repo?.db?.prepare) {
    return [];
  }

  return findFolderizationCandidatesFromRows(loadFolderizationRows(repo), options);
}

export function findFolderizationCandidates(filePaths = [], { minFileCount = 4 } = {}) {
  const groups = new Map();

  for (const rawPath of filePaths) {
    const filePath = normalizeFolderizationPath(rawPath);
    const directory = filePath.slice(0, filePath.lastIndexOf('/'));
    const familyRoot = deriveFlatFamilyRoot(filePath);

    if (!familyRoot || !directory || isAlreadyFolderized(directory, familyRoot)) {
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

export function buildFolderizationCandidateReport(candidates = []) {
  return {
    candidateCount: candidates.length,
    topCandidates: candidates.slice(0, 10).map((candidate) => ({
      directory: candidate.directory,
      familyRoot: candidate.familyRoot,
      recommendedFolder: candidate.recommendedFolder || `${candidate.directory}/${candidate.familyRoot}`,
      fileCount: candidate.fileCount,
      confidence: candidate.confidence || 0,
      barrelFile: candidate.barrelFile?.path || null,
      members: candidate.files || candidate.members?.map((member) => member.path) || []
    }))
  };
}
