import {
  findBestFolderizedFamilyForPaths
} from '../directory-structure-folderization-naming.js';
import { normalizeGuidancePath, getPathTailSegment } from './path-utils.js';
import { selectGuidanceFamily } from './family-selection.js';

function buildFolderizationCreationGuidance({
  rows,
  familyState,
  namingPatterns,
  naming,
  scopePath = null,
  focusPath = null
}) {
  const topFamilyPatterns = Array.isArray(namingPatterns?.topFamilyPatterns)
    ? namingPatterns.topFamilyPatterns.slice(0, 5)
    : [];
  const folderizedScopeSuggestion = (scopePath || focusPath)
    ? findBestFolderizedFamilyForPaths(rows || [], [focusPath, scopePath], { minFileCount: 1 })
    : null;
  const selectionAnchor = normalizeGuidancePath(focusPath || scopePath);
  const selectionAnchorTail = getPathTailSegment(selectionAnchor || '');
  const folderizedScopeMatchesAnchor = Boolean(folderizedScopeSuggestion)
    && Boolean(selectionAnchorTail)
    && (
      folderizedScopeSuggestion.familyRoot === selectionAnchorTail
      || getPathTailSegment(folderizedScopeSuggestion.directory) === selectionAnchorTail
    );
  const selection = folderizedScopeSuggestion
    && folderizedScopeMatchesAnchor
    ? {
        family: folderizedScopeSuggestion,
        matchedBy: focusPath ? 'focusPath' : 'scopePath',
        scopePath: normalizeGuidancePath(scopePath),
        focusPath: normalizeGuidancePath(focusPath),
        selectionReason: `DB-backed folderized family match: reuse ${folderizedScopeSuggestion.directory}`
      }
    : selectGuidanceFamily(familyState, scopePath, focusPath);
  const preferredFamily = selection.family || null;
  const preferredFolder = preferredFamily
    ? (folderizedScopeSuggestion ? preferredFamily.directory : `${preferredFamily.directory}/${preferredFamily.familyRoot}`)
    : null;
  const preferredRoleStems = Array.isArray(namingPatterns?.topRecommendedStems)
    ? namingPatterns.topRecommendedStems.slice(0, 5)
    : [];
  const scopeContext = {
    scopePath: selection.scopePath,
    focusPath: selection.focusPath,
    matchedBy: selection.matchedBy,
    familyDomain: preferredFamily?.directory || null,
    barrelPolicy: 'keep index.js as the barrel surface for folderized families',
    helperPolicy: 'prefer role-only helper basenames inside the selected family',
    collisionPolicy: 'append a family-specific suffix only when a role basename collides',
    selectionReason: selection.selectionReason
  };

  return {
    mode: preferredFamily?.migrationState === 'already_folderized'
      ? 'reuse_existing_family_folder'
      : preferredFamily
        ? 'create_folderized_family'
        : 'role_pattern_guided',
    ...scopeContext,
    preferredFolder,
    preferredFamilyRoot: preferredFamily?.familyRoot || null,
    preferredDirectory: preferredFamily?.directory || null,
    preferredRoleStems,
    familyExamples: topFamilyPatterns,
    guidance: preferredFolder
      ? `${selection.selectionReason}. Create the next file inside ${preferredFolder} using a short role basename such as ${preferredRoleStems[0]?.stem || (naming?.topFamilies?.[0]?.renameTargets?.[0]?.recommendedName || 'core.js')}.`
      : 'Use role-only basenames and create the next helper under the closest folderized family, keeping the barrel at index.js.'
  };
}

export { buildFolderizationCreationGuidance };
