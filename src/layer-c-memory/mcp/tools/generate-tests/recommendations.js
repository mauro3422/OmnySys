/**
 * @fileoverview Recommendations Generator for Test Generation
 * 
 * Genera recomendaciones y calcula risk score.
 * 
 * @module mcp/tools/generate-tests/recommendations
 */

/**
 * Calcula risk score para testing
 */
export function calculateRiskScore(atom) {
  let score = 0;
  
  score += (atom.complexity || 0) * 0.15;
  score += (atom.errorFlow?.throws?.length || 0) * 0.5;
  score += (atom.asyncAnalysis?.sequentialOperations?.[0]?.count || 0) * 0.3;
  
  if (atom.sideEffects?.hasNetworkCalls) score += 2;
  if (atom.isAsync) score += 1;
  if (!atom.errorFlow?.catches?.length && atom.complexity > 10) score += 1.5;
  if (atom.asyncAnalysis?.flowAnalysis?.overallRisk === 'high') score += 2;
  
  return Math.min(Math.round(score * 10) / 10, 10);
}

/**
 * Genera recomendaciones basadas en el analisis
 */
export function generateRecommendations(atom, tests) {
  const recommendations = [];
  
  // Complejidad
  if (atom.complexity > 15) {
    recommendations.push(`⚠️ High complexity (${atom.complexity}) - consider refactoring`);
  }
  
  // Throws
  const throwCount = atom.errorFlow?.throws?.length || 0;
  if (throwCount > 2) {
    recommendations.push(`🔴 ${throwCount} throw statements - test each condition`);
  }
  
  // Async waterfall
  if (atom.asyncAnalysis?.flowAnalysis?.overallRisk === 'high') {
    recommendations.push('⚡ Sequential awaits detected - consider Promise.all for independent ops');
  }
  
  // Orchestrator
  if (atom.archetype?.type === 'orchestrator') {
    const calls = atom.callGraph?.callsList?.filter(c => c.type !== 'native') || [];
    const callNames = calls.slice(0, 5).map(c => c.name).join(', ');
    if (callNames) {
      recommendations.push(`🔗 Orchestrator calls: ${callNames}`);
    }
  }
  
  // Side effects
  if (atom.hasSideEffects || atom.sideEffects?.hasStorageAccess) {
    recommendations.push('📁 Side effects detected - use withSandbox() for isolation');
  }
  
  // Sequential awaits
  const seqCount = atom.asyncAnalysis?.sequentialOperations?.[0]?.count || 0;
  if (seqCount > 3) {
    recommendations.push(`⏱️ ${seqCount} sequential awaits - check for waterfall pattern`);
  }
  
  // Test coverage suggestion
  if (tests.length > 8) {
    recommendations.push(`📊 ${tests.length} tests suggested - consider prioritizing by risk`);
  }
  
  return recommendations;
}

/**
 * Determina la prioridad de un test
 */
export function getTestPriority(test) {
  if (test.type === 'happy-path') return 'high';
  if (test.type === 'error-throw') return 'high';
  if (test.type === 'edge-case' && test.inputs && Object.values(test.inputs).includes('null')) return 'high';
  return 'medium';
}

export default {
  calculateRiskScore,
  generateRecommendations,
  getTestPriority
};
