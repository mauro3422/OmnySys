import { asNumber } from './compiler-health-dashboard-utils.js';

export const DERIVED_SCORE_SIGNALS = [
  { name: 'fragility', fields: ['fragility', 'fragility_score', 'fragilityScore'] },
  { name: 'coupling', fields: ['coupling', 'coupling_score', 'couplingScore'] },
  { name: 'cohesion', fields: ['cohesion', 'cohesion_score', 'cohesionScore'] },
  { name: 'centrality', fields: ['centrality', 'centrality_score', 'centralityScore'] }
];

export const PIPELINE_FIELD_COVERAGE_SIGNALS = [
  { field: 'fragility_score', description: 'fragility score coverage' },
  { field: 'coupling_score', description: 'coupling score coverage' },
  { field: 'cohesion_score', description: 'cohesion score coverage' },
  { field: 'centrality_score', description: 'centrality score coverage' }
];

function isTestPath(filePath = '') {
  return /(?:^|\/)(?:test|tests|__tests__|specs?)(?:\/|$)/i.test(String(filePath || ''));
}

function readSignalValue(atom = {}, signal = {}) {
  for (const field of signal.fields || []) {
    const value = atom?.[field];
    if (value != null) {
      return asNumber(value, 0);
    }
  }

  return 0;
}

export function getSignalValue(atom = {}, signal = {}) {
  return readSignalValue(atom, signal);
}

export function isProductionCandidate(atom = {}, filePath = '') {
  const candidatePath = String(filePath || atom?.filePath || atom?.path || '');
  if (!candidatePath) {
    return false;
  }

  if (isTestPath(candidatePath)) {
    return false;
  }

  if (atom?.isTest === true || atom?.isGenerated === true || atom?.isRemoved === true) {
    return false;
  }

  return true;
}

export function getNetworkCandidates(atoms = []) {
  return atoms.filter((atom) => Boolean(atom?.hasNetworkCalls || atom?.networkCalls || atom?.networkScore > 0));
}

export function getNetworkFlaggedCandidates(atoms = []) {
  return atoms.filter((atom) => Boolean(atom?.hasNetworkCalls || atom?.networkFlagged || atom?.networkCalls > 0));
}

export function getSharedStateCandidates(atoms = []) {
  return atoms.filter((atom) => Boolean(atom?.sharedState || atom?.sharesState || atom?.hasSharedState));
}

export function summarizeFieldCoverageRow(row = {}, prefix = 'coverage', options = {}) {
  const total = asNumber(row.total, 0);
  const nonZero = asNumber(row[`${prefix}_nonzero`], asNumber(row.nonZeroCount, 0));
  const coveragePct = total > 0 ? Math.round((nonZero / total) * 100) : 0;
  const minWarningCoverage = asNumber(options.minWarningCoverage, 5);
  const description = options.description || `${prefix} coverage`;
  const descriptionSuffix = options.descriptionSuffix ? ` ${options.descriptionSuffix}` : '';

  return {
    total,
    nonZeroCount: nonZero,
    coveragePct,
    classification: classifyFieldCoverage({
      total,
      nonZeroCount: nonZero,
      minWarningCoverage,
      description,
      descriptionSuffix
    })
  };
}

export function classifyFieldCoverage({
  total = 0,
  nonZeroCount = 0,
  minWarningCoverage = 5,
  description = 'field coverage',
  descriptionSuffix = ''
} = {}) {
  const coveragePct = total > 0 ? Math.round((nonZeroCount / total) * 100) : 0;
  if (coveragePct === 100) {
    return { level: 'ok', coveragePct, issue: null };
  }

  if (coveragePct >= minWarningCoverage) {
    return {
      level: 'warning',
      coveragePct,
      issue: `Partial ${description}${descriptionSuffix ? ` ${descriptionSuffix}` : ''}`
    };
  }

  return {
    level: 'issue',
    coveragePct,
    issue: `Missing ${description}${descriptionSuffix ? ` ${descriptionSuffix}` : ''}`
  };
}
