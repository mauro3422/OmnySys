import {
  queryDuplicates,
  queryIsomorphicDuplicates,
  queryDnaCoverage
} from './semantic-queries.js';
import { loadConceptualDuplicates } from './semantic-query-tool/conceptual-duplicates.js';

export function requireSemanticRepo(repo) {
  if (!repo) {
    throw new Error('Repository not initialized');
  }
  return repo;
}

export async function buildSemanticDuplicateResult({
  repo,
  duplicateHandler,
  options = {},
  mode = 'duplicates'
} = {}) {
  const requiredRepo = requireSemanticRepo(repo);
  const queryOptions = { ...options, includeRemoved: !!options.includeRemoved };
  const { buildDuplicateRemediationPlan } = await import('../../../../shared/compiler/duplicate-remediation.js');
  const { rows, stats } = mode === 'isomorphic'
    ? queryIsomorphicDuplicates(requiredRepo.db, queryOptions)
    : queryDuplicates(requiredRepo.db, queryOptions);
  const coverage = queryDnaCoverage(requiredRepo.db);
  const duplicates = duplicateHandler.handle(rows);
  const remediation = buildDuplicateRemediationPlan(duplicates);
  const hasUsableDnaCoverage = (coverage?.duplicateEligibleWithDna || 0) > 0;

  return {
    coverage,
    summary: duplicateHandler.buildSummary(
      stats,
      hasUsableDnaCoverage,
      mode === 'isomorphic' ? 'isomorphic duplicate' : 'logic duplicate',
      mode === 'isomorphic'
        ? 'DNA coverage unavailable - isomorphic duplicate detection limited'
        : 'DNA coverage unavailable - duplicate detection disabled'
    ),
    remediation,
    total: duplicates.length,
    duplicates
  };
}

export async function buildSemanticConceptualDuplicateResult(repo, options = {}) {
  return loadConceptualDuplicates(requireSemanticRepo(repo), options);
}

export async function buildSemanticSocietyResult({
  repo,
  societyHandler,
  options = {}
} = {}) {
  const requiredRepo = requireSemanticRepo(repo);
  const { getSemanticSurfaceGranularity } = await import('../../../../shared/compiler/semantic-surface-granularity.js');
  const semanticSurface = getSemanticSurfaceGranularity(requiredRepo.db);
  const queryResult = societyHandler.loadRows(semanticSurface, options);
  return societyHandler.buildResult(queryResult, semanticSurface, options);
}
