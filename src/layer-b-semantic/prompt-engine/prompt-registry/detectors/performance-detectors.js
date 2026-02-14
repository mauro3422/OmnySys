/**
 * @fileoverview Performance Detectors
 * 
 * Detectores de arquetipos de rendimiento.
 * 
 * @module prompt-registry/detectors/performance-detectors
 * @version 1.0.0
 */

export const detectCriticalBottleneck = (metadata) => {
  const isHotspot = (metadata.gitHotspotScore || 0) > 3;
  const isComplex = ['O(n²)', 'O(n³)'].includes(metadata.estimatedComplexity);
  const totalDependents = (metadata.dependentCount || 0) + (metadata.semanticDependentCount || 0);
  const isWidelyUsed = totalDependents > 5;
  const hasManyCalls = (metadata.externalCallCount || 0) > 3;
  return isHotspot && isComplex && isWidelyUsed && hasManyCalls;
};

export default { detectCriticalBottleneck };
