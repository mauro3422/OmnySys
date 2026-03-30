import { normalizeCount } from './generation-counts.js';

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
