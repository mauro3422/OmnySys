import { loadFolderizationRows, normalizeFolderizationPath } from './directory-structure-folderization-data.js';
import { deriveFlatFamilyRoot } from './directory-structure-folderization-analysis.js';

const ROLE_KEYWORDS = [
  ['orchestrator', ['orchestrator', 'coordinator']],
  ['processor', ['processor']],
  ['loader', ['loader']],
  ['manager', ['manager']],
  ['coverage', ['coverage']],
  ['reporting', ['reporting', 'report']],
  ['summary', ['summary']],
  ['assembly', ['assembly']],
  ['tables', ['tables', 'table']],
  ['fields', ['fields', 'field']],
  ['counts', ['counts', 'count']],
  ['helpers', ['helpers', 'helper']],
  ['evidence', ['evidence']],
  ['payload', ['payload']],
  ['event', ['event', 'events']],
  ['shape', ['shape']],
  ['analysis', ['analysis', 'analyzer']],
  ['validation', ['validation', 'validator']],
  ['detection', ['detection', 'detect']],
  ['execution', ['execution', 'execute']],
  ['persistence', ['persistence', 'persist']],
  ['state', ['state']],
  ['config', ['config']],
  ['rules', ['rules', 'rule']],
  ['policy', ['policy']],
  ['scan', ['scan']],
  ['builder', ['builder']],
  ['resolver', ['resolver']],
  ['bridge', ['bridge']]
];

function splitIdentifierTokens(value = '') {
  return String(value)
    .replace(/([a-z0-9])([A-Z])/g, '$1 $2')
    .replace(/[_/]+/g, ' ')
    .replace(/-/g, ' ')
    .toLowerCase()
    .split(/\s+/)
    .filter(Boolean);
}

function normalizeStem(filePath = '') {
  const normalized = normalizeFolderizationPath(filePath);
  const fileName = normalized.split('/').pop() || '';
  return fileName.replace(/\.js$/i, '');
}

function getFilePathDirectory(filePath = '') {
  const normalized = normalizeFolderizationPath(filePath);
  return normalized.includes('/') ? normalized.slice(0, normalized.lastIndexOf('/')) : '';
}

function getFolderizedFamilyKey(directory = '', familyRoot = '') {
  return `${directory}::${familyRoot}`;
}

function inferRoleTokenFromExports(row = {}) {
  const exportNames = (row.exports || [])
    .map((entry) => String(entry?.name || ''))
    .filter(Boolean);
  if (exportNames.length === 0) {
    return null;
  }

  const exportTokens = exportNames.flatMap(splitIdentifierTokens);

  for (const [token, aliases] of ROLE_KEYWORDS) {
    if (aliases.some((alias) => exportTokens.includes(alias))) {
      return token;
    }

    if (exportNames.some((name) => aliases.some((alias) => name.toLowerCase().includes(alias)))) {
      return token;
    }
  }

  return null;
}

function inferRecommendedStem(row, familyRoot, memberStem) {
  if (!memberStem) {
    return {
      recommendedStem: '',
      kind: 'unknown',
      reason: 'missing file stem',
      confidence: 0
    };
  }

  if (memberStem === 'index') {
    return {
      recommendedStem: 'index',
      kind: 'barrel',
      reason: 'barrel files should remain index.js',
      confidence: 1
    };
  }

  const familyPrefix = `${familyRoot}-`;
  if (memberStem.startsWith(familyPrefix)) {
    const strippedStem = memberStem.slice(familyPrefix.length);
    return {
      recommendedStem: strippedStem,
      kind: 'shortened',
      reason: 'remove the repeated family root from the basename',
      confidence: 0.98
    };
  }

  if (memberStem === familyRoot) {
    const inferredRole = inferRoleTokenFromExports(row) || familyRoot.split('-').pop() || memberStem;
    return {
      recommendedStem: inferredRole,
      kind: 'rooted',
      reason: 'replace the repeated family root with the file role',
      confidence: inferRoleTokenFromExports(row) ? 0.9 : 0.75
    };
  }

  return {
    recommendedStem: memberStem,
    kind: 'clean',
    reason: 'already short enough for the current folder context',
    confidence: 0.45
  };
}

function buildFolderizedFamilyGroups(rows = []) {
  const groups = new Map();
  const barrelRowsByDirectory = new Map();

  for (const row of rows) {
    const directory = row.directory || getFilePathDirectory(row.path);
    const stem = normalizeStem(row.path);

    if (!directory) {
      continue;
    }

    if (stem === 'index') {
      barrelRowsByDirectory.set(directory, row);
      continue;
    }

    const familyRoot = normalizeFolderizationPath(directory).split('/').pop() || '';
    if (!familyRoot) {
      continue;
    }

    const key = getFolderizedFamilyKey(directory, familyRoot);
    if (!groups.has(key)) {
      groups.set(key, {
        directory,
        familyRoot,
        rows: [],
        barrelRow: null,
        hasFolderSignal: false
      });
    }

    const group = groups.get(key);
    group.rows.push(row);

    const derivedRoot = deriveFlatFamilyRoot(row.path);
    if (derivedRoot === familyRoot) {
      group.hasFolderSignal = true;
    }
  }

  return Array.from(groups.values())
    .filter((group) => group.hasFolderSignal && group.rows.length > 0)
    .map((group) => ({
      ...group,
      barrelRow: barrelRowsByDirectory.get(group.directory) || group.barrelRow || null
    }));
}

function buildFolderizedFamilySuggestion(group) {
  const members = group.rows.slice().sort((a, b) => a.path.localeCompare(b.path));
  const siblingStems = new Set(members.map((member) => normalizeStem(member.path)));

  const suggestions = members.map((member) => {
    const currentStem = normalizeStem(member.path);
    const recommendation = inferRecommendedStem(member, group.familyRoot, currentStem);
    const recommendedName = `${recommendation.recommendedStem}.js`;
    const currentName = `${currentStem}.js`;
    const recommendedPath = `${group.directory}/${recommendedName}`;
    const currentExports = (member.exports || []).map((entry) => entry?.name).filter(Boolean);
    const isCollision = siblingStems.has(recommendation.recommendedStem) && currentStem !== recommendation.recommendedStem;
    const finalRecommendation = isCollision && recommendation.kind !== 'barrel'
      ? {
        recommendedStem: `${recommendation.recommendedStem}-${group.familyRoot.split('-').pop() || 'member'}`,
        kind: 'collision_avoidance',
        reason: 'avoid a basename collision inside the folderized family',
        confidence: 0.6
      }
      : recommendation;

    return {
      filePath: member.path,
      currentName,
      recommendedName: `${finalRecommendation.recommendedStem}.js`,
      currentStem,
      recommendedStem: finalRecommendation.recommendedStem,
      namingState: finalRecommendation.kind,
      reason: finalRecommendation.reason,
      confidence: finalRecommendation.confidence,
      exportNames: currentExports,
      isBarrel: currentStem === 'index',
      shouldRename: currentName !== `${finalRecommendation.recommendedStem}.js`,
      currentPath: member.path,
      recommendedPath
    };
  });

  const renameTargets = suggestions
    .filter((suggestion) => suggestion.shouldRename)
    .map((suggestion) => ({
      from: suggestion.currentPath,
      to: suggestion.recommendedPath,
      currentName: suggestion.currentName,
      recommendedName: suggestion.recommendedName,
      reason: suggestion.reason,
      confidence: suggestion.confidence,
      namingState: suggestion.namingState
    }));

  const renameTargetCount = renameTargets.length;
  const barrelSuggestion = suggestions.find((suggestion) => suggestion.isBarrel) || null;

  return {
    directory: group.directory,
    familyRoot: group.familyRoot,
    migrationState: 'already_folderized',
    fileCount: members.length,
    renameTargetCount,
    barrelFile: group.barrelRow?.path || barrelSuggestion?.currentPath || null,
    suggestions: suggestions
      .filter((suggestion) => suggestion.shouldRename)
      .sort((a, b) => b.confidence - a.confidence || a.currentName.localeCompare(b.currentName)),
    renameTargets: renameTargets.sort((a, b) => b.confidence - a.confidence || a.from.localeCompare(b.from))
  };
}

export function buildFolderizationNamingReportFromRows(rows = []) {
  const families = buildFolderizedFamilyGroups(rows)
    .map(buildFolderizedFamilySuggestion)
    .filter((family) => family.renameTargetCount > 0)
    .sort((a, b) => b.renameTargetCount - a.renameTargetCount || b.fileCount - a.fileCount || a.familyRoot.localeCompare(b.familyRoot));

  return {
    familyCount: families.length,
    renameTargetCount: families.reduce((sum, family) => sum + family.renameTargetCount, 0),
    topFamilies: families.slice(0, 10)
  };
}

export function buildFolderizationNamingReportFromRepo(repo) {
  if (!repo?.db?.prepare) {
    return {
      familyCount: 0,
      renameTargetCount: 0,
      topFamilies: []
    };
  }

  return buildFolderizationNamingReportFromRows(loadFolderizationRows(repo));
}
