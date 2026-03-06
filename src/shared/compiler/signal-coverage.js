/**
 * @fileoverview signal-coverage.js
 *
 * Helpers canonicos para evaluar cobertura de señales derivadas y semánticas.
 *
 * @module shared/compiler/signal-coverage
 */

const TEST_FILE_PATTERNS = /(^|\/)(tests?|__tests__|fixtures)\//i;
const EXCLUDED_PURPOSES = new Set(['TEST_HELPER', 'ANALYSIS_SCRIPT']);

export const DERIVED_SCORE_SIGNALS = [
  { name: 'fragility', camelKey: 'fragilityScore', snakeKey: 'fragility_score' },
  { name: 'coupling', camelKey: 'couplingScore', snakeKey: 'coupling_score' },
  { name: 'cohesion', camelKey: 'cohesionScore', snakeKey: 'cohesion_score' },
  { name: 'importance', camelKey: 'importanceScore', snakeKey: 'importance_score' },
  { name: 'centrality', camelKey: 'centralityScore', snakeKey: 'centrality_score' }
];

export const PIPELINE_FIELD_COVERAGE_SIGNALS = [
  { field: 'fragility_score', description: 'Fragility scores never populated', minWarningCoverage: 5 },
  { field: 'coupling_score', description: 'Coupling scores never populated', minWarningCoverage: 5 },
  { field: 'cohesion_score', description: 'Cohesion scores never populated', minWarningCoverage: 5 },
  { field: 'centrality_score', description: 'persistGraphMetrics() not connected', minWarningCoverage: 5 },
  { field: 'age_days', description: 'Git integration missing for age_days', minWarningCoverage: 5 },
  { field: 'change_frequency', description: 'Git integration missing for change_frequency', minWarningCoverage: 5 },
  { field: 'has_network_calls', description: 'Network call detector coverage appears low', minWarningCoverage: 1 }
];

const NETWORK_PATTERNS = [
  /fetch\s*\(/,
  /axios\./,
  /http\.(get|post|put|delete)/,
  /\.request\s*\(/,
  /new\s+XMLHttpRequest/,
  /WebSocket\s*\(/,
  /prisma\./,
  /mongoose\./,
  /sequelize\./
];

const SHARED_STATE_PATTERNS = [
  /process\.env/,
  /localStorage/,
  /sessionStorage/,
  /globalThis\./,
  /\bglobal\./,
  /\bwindow\./,
  /\bdocument\./
];

function toNumber(value) {
  return Number(value ?? 0) || 0;
}

function getAtomCode(atom = {}) {
  return atom.sourceCode || atom.code || '';
}

function getAtomPurpose(atom = {}) {
  return atom.purpose || atom.purpose_type || '';
}

function isAsyncAtom(atom = {}) {
  return atom.isAsync === true || atom.is_async === true;
}

function getSharedStateAccess(atom = {}) {
  return Array.isArray(atom.sharedStateAccess)
    ? atom.sharedStateAccess
    : Array.isArray(atom.shared_state_access)
      ? atom.shared_state_access
      : [];
}

function hasNetworkCalls(atom = {}) {
  return atom.hasNetworkCalls === true || atom.has_network_calls === true;
}

function matchesAny(patterns, code = '') {
  return patterns.some((pattern) => pattern.test(code));
}

function isProductionCandidate(atom = {}, filePath = '') {
  if (!atom || TEST_FILE_PATTERNS.test(filePath)) return false;
  const atomType = atom.atomType || atom.atom_type || '';
  if (!atomType || atomType === 'testCallback') return false;
  return !EXCLUDED_PURPOSES.has(getAtomPurpose(atom));
}

export function getSignalValue(atom, signal) {
  return toNumber(atom?.[signal?.camelKey] ?? atom?.[signal?.snakeKey]);
}

export function summarizeDerivedScoreCoverage(atoms = [], options = {}) {
  const { filePath = '' } = options;
  const candidates = atoms.filter((atom) => isProductionCandidate(atom, filePath));
  const primarySignals = DERIVED_SCORE_SIGNALS.filter((signal) =>
    signal.name === 'fragility' || signal.name === 'coupling' || signal.name === 'cohesion'
  );

  const missingAtoms = candidates.filter((atom) =>
    primarySignals.every((signal) => getSignalValue(atom, signal) === 0)
  );

  return {
    candidates,
    candidateCount: candidates.length,
    missingAtoms,
    missingCount: missingAtoms.length,
    missingRatio: candidates.length > 0 ? Number((missingAtoms.length / candidates.length).toFixed(3)) : 0,
    sampleAtoms: missingAtoms.slice(0, 5).map((atom) => atom.name).filter(Boolean)
  };
}

export function summarizeSemanticCoverage(atoms = [], options = {}) {
  const { filePath = '', sharesStateRelations = 0 } = options;
  const candidates = atoms.filter((atom) => isProductionCandidate(atom, filePath));

  const networkCandidates = candidates.filter((atom) => {
    const purpose = getAtomPurpose(atom);
    return isAsyncAtom(atom)
      || purpose === 'NETWORK_HANDLER'
      || purpose === 'SERVER_HANDLER'
      || matchesAny(NETWORK_PATTERNS, getAtomCode(atom));
  });

  const networkFlagged = networkCandidates.filter((atom) => hasNetworkCalls(atom));
  const sharedStateCandidates = candidates.filter((atom) =>
    getSharedStateAccess(atom).length > 0 || matchesAny(SHARED_STATE_PATTERNS, getAtomCode(atom))
  );

  const gaps = [];
  if (networkCandidates.length > 0 && networkFlagged.length === 0) {
    gaps.push({
      kind: 'network_coverage',
      message: `${networkCandidates.length} atom(s) look network-bound but none were flagged as hasNetworkCalls`
    });
  }
  if (sharedStateCandidates.length > 0 && sharesStateRelations === 0) {
    gaps.push({
      kind: 'shared_state_coverage',
      message: `${sharedStateCandidates.length} atom(s) touch shared-state patterns but no shares_state relations were persisted`
    });
  }

  return {
    candidates,
    networkCandidates,
    networkFlagged,
    sharedStateCandidates,
    sharesStateRelations,
    gaps,
    severity: gaps.length > 1 || networkCandidates.length >= 3 ? 'high' : 'medium'
  };
}

export function summarizePhysicsCoverageRow(row = {}) {
  const total = toNumber(row.total);
  const coverage = {};
  const missingSignals = [];

  for (const signal of DERIVED_SCORE_SIGNALS) {
    const nonZero = toNumber(row[`${signal.name}_nonzero`]);
    coverage[`${signal.name}Pct`] = total > 0 ? Math.round((nonZero / total) * 100) : 0;
    if (nonZero === 0 && ['fragility', 'coupling', 'cohesion'].includes(signal.name)) {
      missingSignals.push(signal.name);
    }
  }

  return { total, coverage, missingSignals };
}

export function summarizeFieldCoverageRow(row = {}, signalName, options = {}) {
  const signal = DERIVED_SCORE_SIGNALS.find((candidate) => candidate.name === signalName);
  if (!signal) {
    return null;
  }

  const {
    minWarningCoverage = 5,
    description = `${signalName} coverage is missing`,
    descriptionSuffix = ''
  } = options;

  const total = toNumber(row.total);
  const nonZeroCount = toNumber(row[`${signal.name}_nonzero`]);
  const classification = classifyFieldCoverage({
    total,
    nonZeroCount,
    minWarningCoverage,
    description,
    descriptionSuffix
  });

  return {
    signal: signal.name,
    total,
    nonZeroCount,
    coveragePct: total > 0 ? Math.round((nonZeroCount / total) * 100) : 0,
    classification
  };
}

export function summarizeCentralityCoverageRow(row = {}, options = {}) {
  return summarizeFieldCoverageRow(row, 'centrality', options);
}

export function classifyFieldCoverage({ total = 0, nonZeroCount = 0, minWarningCoverage = 5, description = '', descriptionSuffix = '' }) {
  const safeTotal = toNumber(total);
  if (safeTotal === 0) return null;

  const coveragePct = Math.round((toNumber(nonZeroCount) / safeTotal) * 100);
  if (coveragePct === 0) return { level: 'issue', coveragePct, issue: `${description}${descriptionSuffix}` };
  if (coveragePct < minWarningCoverage) {
    return { level: 'warning', coveragePct, issue: `Very low coverage — ${description}${descriptionSuffix}` };
  }
  return { level: 'ok', coveragePct, issue: null };
}
