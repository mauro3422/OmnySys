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

export function splitIdentifierTokens(value = '') {
  return String(value)
    .replace(/([a-z0-9])([A-Z])/g, '$1 $2')
    .replace(/[_/]+/g, ' ')
    .replace(/-/g, ' ')
    .toLowerCase()
    .split(/\s+/)
    .filter(Boolean);
}

export function normalizeStem(filePath = '') {
  const normalized = normalizeFolderizationPath(filePath);
  const fileName = normalized.split('/').pop() || '';
  return fileName.replace(/\.js$/i, '');
}

export function getFilePathDirectory(filePath = '') {
  const normalized = normalizeFolderizationPath(filePath);
  return normalized.includes('/') ? normalized.slice(0, normalized.lastIndexOf('/')) : '';
}

export function getFolderizedFamilyKey(directory = '', familyRoot = '') {
  return `${directory}::${familyRoot}`;
}

export function inferRoleTokenFromExports(row = {}) {
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

export function inferRecommendedStem(row, familyRoot, memberStem) {
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

export function buildFolderizedFamilyGroups(rows = []) {
  const groups = new Map();
  const barrelRowsByDirectory = new Map();

  for (const row of rows) {
    const directory = row.directory || getFilePathDirectory(row.path);
    const stem = normalizeStem(row.path);
    const directoryFamilyRoot = normalizeFolderizationPath(directory).split('/').pop() || '';
    const derivedRoot = deriveFlatFamilyRoot(row.path);

    if (!directory) {
      continue;
    }

    if (stem === 'index') {
      barrelRowsByDirectory.set(directory, row);
      continue;
    }

    const familyRoot = derivedRoot || directoryFamilyRoot;
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

    if (familyRoot === directoryFamilyRoot || derivedRoot === familyRoot) {
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

export function buildFolderizedFamilySuggestion(group) {
  const members = group.rows.slice().sort((a, b) => a.path.localeCompare(b.path));
  const siblingStems = new Set(members.map((member) => normalizeStem(member.path)));
  const reservedRecommendedStems = new Set();

  const suggestions = members.map((member) => {
    const currentStem = normalizeStem(member.path);
    const recommendation = inferRecommendedStem(member, group.familyRoot, currentStem);
    const collisionSuffix = group.familyRoot.split('-').pop() || 'member';
    let recommendedStem = recommendation.recommendedStem;
    const currentName = `${currentStem}.js`;
    const currentExports = (member.exports || []).map((entry) => entry?.name).filter(Boolean);
    const hasCollision = siblingStems.has(recommendedStem) && currentStem !== recommendedStem;
    const hasPlannedCollision = reservedRecommendedStems.has(recommendedStem);

    if ((hasCollision || hasPlannedCollision) && recommendation.kind !== 'barrel') {
      recommendedStem = `${recommendedStem}-${collisionSuffix}`;
    }

    if (reservedRecommendedStems.has(recommendedStem)) {
      let disambiguatedStem = recommendedStem;
      let attempt = 2;
      while (reservedRecommendedStems.has(disambiguatedStem)) {
        disambiguatedStem = `${recommendedStem}-${collisionSuffix}-${attempt}`;
        attempt += 1;
      }
      recommendedStem = disambiguatedStem;
    }

    reservedRecommendedStems.add(recommendedStem);

    const finalRecommendation = {
      recommendedStem,
      kind: recommendedStem === recommendation.recommendedStem ? recommendation.kind : 'collision_avoidance',
      reason: recommendedStem === recommendation.recommendedStem
        ? recommendation.reason
        : 'avoid a basename collision inside the folderized family',
      confidence: recommendedStem === recommendation.recommendedStem ? recommendation.confidence : 0.6
    };
    const recommendedName = `${finalRecommendation.recommendedStem}.js`;
    const recommendedPath = `${group.directory}/${recommendedName}`;

    return {
      filePath: member.path,
      currentName,
      recommendedName,
      currentStem,
      recommendedStem: finalRecommendation.recommendedStem,
      namingState: finalRecommendation.kind,
      reason: finalRecommendation.reason,
      confidence: finalRecommendation.confidence,
      exportNames: currentExports,
      isBarrel: currentStem === 'index',
      shouldRename: currentName !== recommendedName,
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
    files: members.map((member) => member.path),
    renameTargetCount,
    barrelFile: group.barrelRow?.path || barrelSuggestion?.currentPath || null,
    suggestions: suggestions
      .filter((suggestion) => suggestion.shouldRename)
      .sort((a, b) => b.confidence - a.confidence || a.currentName.localeCompare(b.currentName)),
    renameTargets: renameTargets.sort((a, b) => b.confidence - a.confidence || a.from.localeCompare(b.from))
  };
}

export function findBestFolderizedFamilyForPaths(rows = [], filePaths = [], options = {}) {
  const normalizedPaths = Array.isArray(filePaths)
    ? filePaths.map((filePath) => normalizeFolderizationPath(filePath)).filter(Boolean)
    : [];

  if (normalizedPaths.length === 0) {
    return null;
  }

  const candidateDirectories = Array.from(new Set(normalizedPaths.map(getFilePathDirectory).filter(Boolean)));
  // FIX: when candidatePath is a directory (no .js extension), also include it as a candidate directory
  const directoryCandidates = normalizedPaths
    .filter((p) => !p.endsWith('.js'))
    .map((p) => normalizeFolderizationPath(p));
  const allCandidateDirectories = Array.from(new Set([...candidateDirectories, ...directoryCandidates]));
  const normalizedPathSet = new Set(normalizedPaths);
  const hasBarrelCandidate = normalizedPaths.some((filePath) => normalizeStem(filePath) === 'index');

  if (hasBarrelCandidate) {
    const families = buildFolderizedFamilyGroups(rows)
      .filter((group) => allCandidateDirectories.includes(group.directory))
      .map((group) => {
        const suggestion = buildFolderizedFamilySuggestion(group);
        const score = (
          suggestion.renameTargetCount * 100 +
          suggestion.fileCount * 5 +
          (suggestion.barrelFile ? 10 : 0)
        );

        return {
          group,
          suggestion,
          score
        };
      })
      .sort((a, b) => b.score - a.score || b.suggestion.renameTargetCount - a.suggestion.renameTargetCount || b.suggestion.fileCount - a.suggestion.fileCount || a.group.familyRoot.localeCompare(b.group.familyRoot));

    return families[0]?.suggestion || null;
  }

  const fallbackFamily = buildFolderizedFamilyGroups(rows)
    .filter((group) => allCandidateDirectories.includes(group.directory))
    .map((group) => {
      const barrelMatchesCandidate = Boolean(group.barrelRow?.path) && normalizedPathSet.has(group.barrelRow.path);
      const memberMatchesCandidate = group.rows.some((member) => normalizedPathSet.has(member.path));
      const directoryRootMatchesFamily = group.familyRoot === (group.directory.split('/').pop() || '');
      const score = (
        (memberMatchesCandidate ? 100 : 0) +
        (directoryRootMatchesFamily ? 10 : 0) +
        (barrelMatchesCandidate ? 5 : 0) +
        group.rows.length
      );

      return {
        group,
        score
      };
    })
    .sort((a, b) => b.score - a.score || b.group.rows.length - a.group.rows.length || a.group.familyRoot.localeCompare(b.group.familyRoot))[0]?.group || null;

  if (!fallbackFamily) {
    return null;
  }

  return buildFolderizedFamilySuggestion(fallbackFamily);
}

export function loadFolderizationRowsForNaming(repo) {
  return loadFolderizationRows(repo);
}
