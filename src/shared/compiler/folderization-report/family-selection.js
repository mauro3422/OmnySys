import { normalizeFolderizationPath } from '../directory-structure-folderization-data.js';
import { normalizeGuidancePath, countSharedPrefixSegments } from './path-utils.js';

function scoreGuidanceFamily(family, anchorPath = '') {
  if (!family?.directory) {
    return 0;
  }

  const normalizedAnchor = normalizeGuidancePath(anchorPath);
  if (!normalizedAnchor) {
    return 0;
  }

  const normalizedDirectory = normalizeFolderizationPath(family.directory);
  let score = 0;

  if (normalizedAnchor === normalizedDirectory) {
    score += 500;
  } else if (normalizedAnchor.startsWith(`${normalizedDirectory}/`)) {
    score += 400 + normalizedDirectory.length;
  } else if (normalizedDirectory.startsWith(`${normalizedAnchor}/`)) {
    score += 250 + normalizedAnchor.length;
  } else {
    score += countSharedPrefixSegments(normalizedAnchor, normalizedDirectory) * 50;
  }

  score += family.migrationState === 'already_folderized' ? 30 : 0;
  score += family.migrationState === 'mixed' ? 18 : 0;
  score += Math.min(20, Number(family.folderFileCount || 0) + Number(family.rootFileCount || 0));

  return score;
}

function selectGuidanceFamily(familyState = {}, scopePath = null, focusPath = null) {
  const families = Array.isArray(familyState?.topFamilies) ? familyState.topFamilies : [];
  const anchorPaths = [focusPath, scopePath]
    .map(normalizeGuidancePath)
    .filter(Boolean);
  const reusableFamilies = families.filter((family) => family.migrationState === 'already_folderized' || family.migrationState === 'mixed');
  const candidateFamilies = reusableFamilies.length > 0 ? reusableFamilies : families;

  if (candidateFamilies.length === 0) {
    return {
      family: null,
      matchedBy: 'global',
      scopePath: normalizeGuidancePath(scopePath),
      focusPath: normalizeGuidancePath(focusPath),
      selectionReason: 'No reusable family metadata is available'
    };
  }

  const scoredFamilies = candidateFamilies.map((family) => {
    const scores = anchorPaths.map((anchorPath) => scoreGuidanceFamily(family, anchorPath));
    const bestAnchorScore = scores.length > 0 ? Math.max(...scores) : 0;

    return {
      family,
      score: bestAnchorScore,
      hasScopedMatch: bestAnchorScore > 0,
      scopeHits: scores.filter((score) => score > 0).length
    };
  }).sort((a, b) => b.score - a.score || b.scopeHits - a.scopeHits || (b.family.folderFileCount + b.family.rootFileCount) - (a.family.folderFileCount + a.family.rootFileCount) || a.family.familyRoot.localeCompare(b.family.familyRoot));

  const selected = scoredFamilies[0] || null;
  const selectedFamily = selected?.family || null;
  const matchedBy = selected?.hasScopedMatch
    ? (focusPath ? 'focusPath' : 'scopePath')
    : 'global';
  const selectionReason = selected?.hasScopedMatch
    ? `Selected ${selectedFamily.directory}/${selectedFamily.familyRoot} from DB-backed family metadata`
    : `Selected ${selectedFamily.directory}/${selectedFamily.familyRoot} from the strongest reusable family in the DB`;

  return {
    family: selectedFamily,
    matchedBy,
    scopePath: normalizeGuidancePath(scopePath),
    focusPath: normalizeGuidancePath(focusPath),
    selectionReason
  };
}

export {
  scoreGuidanceFamily,
  selectGuidanceFamily
};
