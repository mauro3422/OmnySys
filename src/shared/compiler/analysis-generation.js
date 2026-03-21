/**
 * @fileoverview Analysis generation snapshots for canonical drift handling.
 *
 * A generation snapshot groups the canonical counts and derived feature state
 * that were published together so policies can distinguish fresh data from
 * stale or regressed data.
 *
 * @module shared/compiler/analysis-generation
 */

import { createHash } from 'node:crypto';
import { buildDerivedFeatureRegistry } from './derived-feature-registry.js';

function normalizeCount(value) {
  const count = Number(value || 0);
  return Number.isFinite(count) && count >= 0 ? count : 0;
}

function createGenerationFingerprint(payload) {
  return createHash('sha1')
    .update(JSON.stringify(payload))
    .digest('hex')
    .slice(0, 12);
}

function buildGenerationDrift(previousGeneration = null, currentGeneration = null) {
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

export function buildAnalysisGenerationSnapshot({
  projectPath = null,
  source = 'unknown',
  phase = 'unknown',
  publishedAt = new Date().toISOString(),
  totalFiles = 0,
  atomCount = 0,
  relationCount = 0,
  semanticConnectionCount = 0,
  previousGeneration = null,
  derivedFeatureRegistry = null
} = {}) {
  const registry = derivedFeatureRegistry || buildDerivedFeatureRegistry();
  const counts = {
    files: normalizeCount(totalFiles),
    atoms: normalizeCount(atomCount),
    relations: normalizeCount(relationCount),
    semanticConnections: normalizeCount(semanticConnectionCount),
    derivedFeatures: normalizeCount(registry.summary?.total)
  };

  const fingerprint = createGenerationFingerprint({
    projectPath,
    source,
    phase,
    counts,
    derivedFeatureKeys: registry.summary?.canonicalKeys || []
  });

  const snapshot = {
    generationId: `analysis:${phase}:${fingerprint}`,
    fingerprint,
    generationVersion: 1,
    projectPath,
    source,
    phase,
    publishedAt,
    counts,
    derivedFeatureSummary: registry.summary,
    drift: null
  };

  snapshot.drift = buildGenerationDrift(previousGeneration, snapshot);

  return snapshot;
}

export function compareAnalysisGenerations(previousGeneration, currentGeneration) {
  return buildGenerationDrift(previousGeneration, currentGeneration);
}

export function summarizeAnalysisGeneration(generation = null) {
  if (!generation) {
    return {
      status: 'missing',
      healthy: false,
      totalFiles: 0,
      totalAtoms: 0,
      totalRelations: 0,
      totalDerivedFeatures: 0
    };
  }

  const counts = generation.counts || {};

  return {
    status: generation.drift?.status || 'unknown',
    healthy: generation.drift?.status === 'stable' || generation.drift?.status === 'updated' || generation.drift?.status === 'initial',
    generationId: generation.generationId || null,
    fingerprint: generation.fingerprint || null,
    totalFiles: normalizeCount(counts.files),
    totalAtoms: normalizeCount(counts.atoms),
    totalRelations: normalizeCount(counts.relations),
    totalSemanticConnections: normalizeCount(counts.semanticConnections),
    totalDerivedFeatures: normalizeCount(counts.derivedFeatures),
    recommendation: generation.drift?.recommendation || 'No generation snapshot available.'
  };
}

export default {
  buildAnalysisGenerationSnapshot,
  compareAnalysisGenerations,
  summarizeAnalysisGeneration
};
