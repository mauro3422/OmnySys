import { getRecommendation } from './recommendations/RecommendationEngine.js';
import { loadFolderizationRows, normalizeFolderizationPath } from './directory-structure-folderization-data.js';
import { buildFamilyStateReport, buildFolderizationCandidateReport, summarizeFamilyEvolution } from './directory-structure-folderization-analysis-helpers.js';

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
  'history',
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
  'snapshot',
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

function getDependencyTargets(row = {}) {
  if (Array.isArray(row?.dependencyTargets)) {
    return row.dependencyTargets;
  }

  const combined = [
    ...(Array.isArray(row?.importTargets) ? row.importTargets : []),
    ...(Array.isArray(row?.exportTargets) ? row.exportTargets : [])
  ];

  return Array.from(new Set(combined.filter(Boolean)));
}

function toComparableStamp(value) {
  if (value == null || value === '') {
    return null;
  }

  if (typeof value === 'number' && Number.isFinite(value)) {
    return value;
  }

  const parsed = Date.parse(value);
  return Number.isNaN(parsed) ? null : parsed;
}

function buildFamilyStateIndex(rows = []) {
  const index = new Map();

  for (const row of rows) {
    const directory = row.directory || '';
    const familyRoot = deriveFlatFamilyRoot(row.path);
    if (!directory || !familyRoot) {
      continue;
    }

    const key = buildFamilyKey(directory, familyRoot);
    if (!index.has(key)) {
      index.set(key, {
        directory,
        familyRoot,
        rootRows: [],
        folderRows: [],
        versionCountTotal: 0,
        latestUpdatedAt: null,
        earliestUpdatedAt: null
      });
    }

    const state = index.get(key);
    const isFolderizedRow = isAlreadyFolderized(directory, familyRoot);

    state.versionCountTotal += Number(row.versionCount) || 0;
    if (isFolderizedRow) {
      state.folderRows.push(row);
    } else {
      state.rootRows.push(row);
    }

    const updatedStamp = toComparableStamp(row.updatedAt);
    if (updatedStamp != null) {
      if (state.latestUpdatedAt == null || updatedStamp > state.latestUpdatedAt.stamp) {
        state.latestUpdatedAt = { stamp: updatedStamp, value: row.updatedAt || null };
      }

      if (state.earliestUpdatedAt == null || updatedStamp < state.earliestUpdatedAt.stamp) {
        state.earliestUpdatedAt = { stamp: updatedStamp, value: row.updatedAt || null };
      }
    }
  }

  return index;
}

function buildFamilyStateByRoot(rows = []) {
  const stateByKey = buildFamilyStateIndex(rows);
  const rootIndex = new Map();

  for (const state of stateByKey.values()) {
    const evolution = summarizeFamilyEvolution(state);
    const existing = rootIndex.get(state.familyRoot);
    if (!existing || (evolution.folderFileCount + evolution.rootFileCount) > (existing.folderFileCount + existing.rootFileCount)) {
      rootIndex.set(state.familyRoot, {
        ...state,
        evolution
      });
    }
  }

  return rootIndex;
}

function buildBarrelCandidate(members, groupSet, importerIndex) {
  const scored = members.map((member) => {
    const dependencyTargets = getDependencyTargets(member);
    const internalImportCount = dependencyTargets.filter((target) => groupSet.has(target)).length;
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
      outboundImportCount: dependencyTargets.length - internalImportCount,
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
  const {
    minFileCount = 2, // FIX: reducido de 4 a 2 para detectar familias pequeñas (dead-code tiene 3 archivos)
    familyEvolution = null,
    migrationState = 'flat'
  } = options;
  const members = group.members.slice().sort((a, b) => a.path.localeCompare(b.path));
  const groupSet = new Set(members.map((member) => member.path));

  const enrichedMembers = members.map((member) => {
    const dependencyTargets = getDependencyTargets(member);
    const internalImportCount = dependencyTargets.filter((target) => groupSet.has(target)).length;
    const externalImportCount = dependencyTargets.length - internalImportCount;
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
  const namingPressure = Math.min(
    20,
    Math.max(0, Math.round(enrichedMembers.length * 3 + (familyEvolution?.folderFileCount || 0) * 2))
  );
  const confidence = Math.max(
    0,
    Math.min(100, sizeScore + densityScore + exportScore + barrelPresenceScore + namingPressure - externalPenalty)
  );
  // FIX: Strip directory context prefix from familyRoot to avoid redundant folder names.
  // E.g., directory="src/shared/compiler" + familyRoot="compiler-metrics-snapshot"
  // → folder="src/shared/compiler/metrics-snapshot" (not "compiler-metrics-snapshot")
  const directoryBasename = group.directory.split('/').pop() || '';
  const directoryPrefix = `${directoryBasename}-`;
  const normalizedFamilyRoot = group.familyRoot.startsWith(directoryPrefix)
    ? group.familyRoot.slice(directoryPrefix.length)
    : group.familyRoot;
  const recommendedFolder = `${group.directory}/${normalizedFamilyRoot}`;
  const hasStrongNameFamily = enrichedMembers.length >= minFileCount && confidence >= 30;

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
      importsCount: getDependencyTargets(barrelFile).length,
      inboundImporters: barrelFile.inboundImporters,
      score: barrelFile.score
    } : null,
    internalImportEdges,
    externalImportEdges,
    exportCount,
    exportingMembers,
    confidence,
    // FIX: Relajar condición - antes requería barrelFile O internalImportEdges >= members.length
    // Esto fallaba para familias cohesivas por nombre/patrón pero que no se importan entre sí
    shouldFolderize: migrationState === 'flat'
      && enrichedMembers.length >= minFileCount
      && (
        Boolean(barrelFile)
        || internalImportEdges >= 1
        || exportingMembers >= 2
        || hasStrongNameFamily
      ),
    migrationState,
    familyEvolution: familyEvolution ? {
      rootFileCount: familyEvolution.rootFileCount || 0,
      folderFileCount: familyEvolution.folderFileCount || 0,
      versionCountTotal: familyEvolution.versionCountTotal || 0,
      latestUpdatedAt: familyEvolution.latestUpdatedAt || null,
      earliestUpdatedAt: familyEvolution.earliestUpdatedAt || null,
      migrationState: familyEvolution.migrationState || migrationState
    } : {
      rootFileCount: 0,
      folderFileCount: 0,
      versionCountTotal: 0,
      latestUpdatedAt: null,
      earliestUpdatedAt: null,
      migrationState
    },
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
  const { minFileCount = 2 } = options; // FIX: de 4 a 2 para detectar familias pequeñas
  const pathIndex = indexFolderizationRows(rows);
  const importerIndex = new Map();
  const groups = new Map();
  const familyStateByRoot = buildFamilyStateByRoot(rows);

  for (const row of rows) {
    const directory = row.directory || '';
    const familyRoot = deriveFlatFamilyRoot(row.path);
    if (!directory || !familyRoot || isAlreadyFolderized(directory, familyRoot)) {
      continue;
    }

    const familyState = familyStateByRoot.get(familyRoot);
    if (familyState?.folderFileCount > 0 && !isAlreadyFolderized(directory, familyRoot)) {
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
    for (const importTarget of getDependencyTargets(row)) {
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
    .map((group) => scoreCandidateGroup(group, importerIndex, {
      minFileCount,
      familyEvolution: familyStateByRoot.get(group.familyRoot)?.evolution || null,
      migrationState: familyStateByRoot.get(group.familyRoot)?.evolution?.migrationState || 'flat'
    }))
    .filter((candidate) => candidate.shouldFolderize)
    .sort((a, b) => b.confidence - a.confidence || b.fileCount - a.fileCount || a.recommendedFolder.localeCompare(b.recommendedFolder));
}

export function findFolderizationCandidatesFromRepo(repo, options = {}) {
  if (!repo?.db?.prepare) {
    return [];
  }

  return findFolderizationCandidatesFromRows(loadFolderizationRows(repo), options);
}

function buildExistingFolderizedFamilyHint(state, importerIndex, minFileCount = 4) {
  if (!state?.folderRows?.length) {
    return null;
  }

  const group = {
    directory: state.directory,
    familyRoot: state.familyRoot,
    members: state.folderRows.slice()
  };

  const hint = scoreCandidateGroup(group, importerIndex, {
    minFileCount,
    familyEvolution: state.evolution || summarizeFamilyEvolution(state),
    migrationState: 'already_folderized'
  });

  return {
    ...hint,
    shouldFolderize: false,
    alreadyFolderized: true,
    migrationState: 'already_folderized'
  };
}

export function findExistingFolderizedFamilyForPathsFromRows(rows = [], filePaths = [], options = {}) {
  const normalizedPaths = filePaths
    .map((filePath) => normalizeFolderizationPath(filePath))
    .filter(Boolean);

  if (normalizedPaths.length === 0) {
    return null;
  }

  const familyStateByRoot = buildFamilyStateByRoot(rows);
  const pathIndex = indexFolderizationRows(rows);
  const importerIndex = new Map();

  for (const row of rows) {
    for (const importTarget of getDependencyTargets(row)) {
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

  for (const normalizedPath of normalizedPaths) {
    const familyRoot = deriveFlatFamilyRoot(normalizedPath);
    const familyState = familyStateByRoot.get(familyRoot);
    if (!familyState?.folderRows?.length) {
      continue;
    }

    const folderedHint = buildExistingFolderizedFamilyHint(familyState, importerIndex, options.minFileCount || 4);
    if (folderedHint) {
      return folderedHint;
    }
  }

  return null;
}

export function findExistingFolderizedFamilyForPathsFromRepo(repo, filePaths = [], options = {}) {
  if (!repo?.db?.prepare) {
    return null;
  }

  return findExistingFolderizedFamilyForPathsFromRows(loadFolderizationRows(repo), filePaths, options);
}

export function buildFolderizationFamilyStateReportFromRows(rows = []) {
  return buildFamilyStateReport(buildFamilyStateByRoot(rows));
}

export function buildFolderizationFamilyStateReportFromRepo(repo) {
  if (!repo?.db?.prepare) {
    return {
      totalFamilies: 0,
      stateCounts: {
        flat: 0,
        mixed: 0,
        already_folderized: 0
      },
      topFamilies: []
    };
  }

  return buildFolderizationFamilyStateReportFromRows(loadFolderizationRows(repo));
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

export { buildFolderizationCandidateReport };
