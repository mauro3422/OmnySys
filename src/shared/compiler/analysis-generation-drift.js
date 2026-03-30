import { normalizeCount } from './generation-counts.js';

export function buildGenerationDrift(previousGeneration = null, currentGeneration = null) {
  if (!previousGeneration || !currentGeneration) {
    return {
      status: 'initial',
      changed: true,
      delta: {},
      recommendation: 'Publish the first canonical analysis generation before evaluating drift.'
    };
  }

  const previous = previousGeneration.counts || {};
  const current = currentGeneration.counts || {};
  const delta = {
    files: normalizeCount(current.files) - normalizeCount(previous.files),
    atoms: normalizeCount(current.atoms) - normalizeCount(previous.atoms),
    relations: normalizeCount(current.relations) - normalizeCount(previous.relations),
    derivedFeatures: normalizeCount(current.derivedFeatures) - normalizeCount(previous.derivedFeatures)
  };

  const fingerprintChanged = previousGeneration.fingerprint !== currentGeneration.fingerprint;
  const hasRegression = Object.values(delta).some((value) => value < 0);
  const hasChange = fingerprintChanged || Object.values(delta).some((value) => value !== 0);

  if (!hasChange) {
    return {
      status: 'stable',
      changed: false,
      delta,
      recommendation: 'Current generation matches the previously published canonical snapshot.'
    };
  }

  if (hasRegression) {
    return {
      status: 'regressed',
      changed: true,
      delta,
      recommendation: 'Reconcile the canonical snapshot before trusting downstream policy or graph surfaces.'
    };
  }

  return {
    status: 'updated',
    changed: true,
    delta,
    recommendation: 'A new canonical generation was published; downstream consumers should refresh from the DB snapshot.'
  };
}

export function compareAnalysisGenerations(previousGeneration, currentGeneration) {
  return buildGenerationDrift(previousGeneration, currentGeneration);
}
