import { toNumber } from './core-utils.js';
import {
  getAtomCode,
  getAtomPurpose,
  isAsyncAtom,
  getSharedStateAccess,
  hasNetworkCalls,
  matchesAny
} from './atom-utils.js';

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

export function isProductionCandidate(atom = {}, filePath = '') {
  if (!atom || TEST_FILE_PATTERNS.test(filePath)) return false;
  const atomType = atom.atomType || atom.atom_type || '';
  if (!atomType || atomType === 'testCallback') return false;
  return !EXCLUDED_PURPOSES.has(getAtomPurpose(atom));
}

export function getSignalValue(atom, signal) {
  return toNumber(atom?.[signal?.camelKey] ?? atom?.[signal?.snakeKey]);
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

export function getNetworkCandidates(candidates) {
  return candidates.filter((atom) => {
    const purpose = getAtomPurpose(atom);
    return isAsyncAtom(atom)
      || purpose === 'NETWORK_HANDLER'
      || purpose === 'SERVER_HANDLER'
      || matchesAny(NETWORK_PATTERNS, getAtomCode(atom));
  });
}

export function getSharedStateCandidates(candidates) {
  return candidates.filter((atom) =>
    getSharedStateAccess(atom).length > 0 || matchesAny(SHARED_STATE_PATTERNS, getAtomCode(atom))
  );
}

export function getNetworkFlaggedCandidates(candidates) {
  return candidates.filter((atom) => hasNetworkCalls(atom));
}
