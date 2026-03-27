import { createHash } from 'node:crypto';
import { buildDerivedFeatureRegistry } from './derived-feature-registry.js';
import { normalizeCount } from './analysis-generation-counts.js';
import { buildGenerationDrift } from './analysis-generation-drift.js';

export function createGenerationFingerprint(payload) {
  return createHash('sha1')
    .update(JSON.stringify(payload))
    .digest('hex')
    .slice(0, 12);
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
