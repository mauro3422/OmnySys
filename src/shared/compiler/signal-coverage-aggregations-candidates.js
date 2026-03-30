import {
  DERIVED_SCORE_SIGNALS,
  getNetworkFlaggedCandidates,
  getNetworkCandidates,
  getSharedStateCandidates,
  isProductionCandidate,
  getSignalValue
} from './helpers.js';

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
  const networkCandidates = getNetworkCandidates(candidates);
  const networkFlagged = getNetworkFlaggedCandidates(networkCandidates);
  const sharedStateCandidates = getSharedStateCandidates(candidates);

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
