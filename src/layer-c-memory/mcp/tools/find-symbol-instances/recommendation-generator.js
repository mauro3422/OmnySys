/**
 * Recommendation generation utilities
 * @module layer-c-memory/mcp/tools/find-symbol-instances/recommendation-generator
 */

/**
 * Genera recomendaciones basadas en el análisis
 * @param {Array} instances - Array of instances
 * @param {Object} primary - Primary instance
 * @param {Array} duplicates - Array of duplicate groups
 * @param {Map} usageMap - Map of filePath to usage info
 * @returns {Array} - Array of recommendations
 */
export function generateRecommendations(instances, primary, duplicates, usageMap) {
  const recommendations = [];
  
  if (instances.length === 0) {
    recommendations.push({
      type: 'error',
      message: `No se encontró ninguna instancia de "${instances[0]?.name || 'el símbolo'}"`
    });
    return recommendations;
  }
  
  if (instances.length === 1) {
    recommendations.push({
      type: 'info',
      message: 'Solo existe una instancia. Editar esta es seguro.'
    });
    return recommendations;
  }
  
  if (duplicates.length > 0) {
    recommendations.push({
      type: 'warning',
      message: `Se encontraron ${duplicates.length} grupos de duplicados exactos. Considera consolidar en un solo archivo.`,
      action: 'review_duplicates'
    });
  }
  
  const unused = instances.filter(i => {
    const usage = usageMap.get(i.filePath);
    return !usage || usage.totalUsage === 0;
  });
  
  if (unused.length > 0) {
    recommendations.push({
      type: 'warning',
      message: `${unused.length} instancia(s) no se usa(n) en el proyecto. Podrían eliminarse.`,
      files: unused.map(i => i.filePath),
      action: 'consider_removal'
    });
  }
  
  if (primary) {
    recommendations.push({
      type: 'success',
      message: `Instancia primaria identificada: ${primary.filePath}`,
      action: 'edit_this_file'
    });
  }
  
  return recommendations;
}
