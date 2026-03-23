/**
 * @fileoverview Recommendation Generator - Genera recomendaciones basadas en análisis
 */

/**
 * Genera recomendaciones basadas en el análisis
 * @param {Array} coverageGaps - Gaps de cobertura detectados
 * @param {Array} obsoleteTests - Tests obsoletos detectados
 * @param {Array} duplicateTests - Tests duplicados detectados
 * @returns {Array} - Array de recomendaciones
 */
export function buildCoverageRecommendations(coverageGaps, obsoleteTests, duplicateTests) {
  const recommendations = [];
  
  if (coverageGaps.length > 0) {
    recommendations.push(`🔍 ${coverageGaps.length} entidades tienen gaps de cobertura`);
    
    coverageGaps.forEach(gap => {
      if (gap.missingTests.length > 0) {
        recommendations.push(
          `  - ${gap.entity}: Falta ${gap.missingTests.map(m => m.type).join(', ')}`
        );
      }
    });
  }
  
  if (obsoleteTests.length > 0) {
    recommendations.push(`⚠️ ${obsoleteTests.length} tests parecen estar obsoletos`);
  }
  
  if (duplicateTests.length > 0) {
    recommendations.push(`♊ ${duplicateTests.length} tests duplicados detectados`);
  }
  
  if (recommendations.length === 0) {
    recommendations.push('✅ No se detectaron problemas de cobertura');
  }
  
  return recommendations;
}
