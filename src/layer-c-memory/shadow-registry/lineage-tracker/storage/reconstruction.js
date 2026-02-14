/**
 * @fileoverview Lineage Reconstruction
 * 
 * Reconstruye el árbol genealógico completo.
 * 
 * @module layer-c-memory/shadow-registry/lineage-tracker/storage/reconstruction
 */

/**
 * Reconstruye el árbol genealógico completo de un átomo
 * 
 * @param {string} shadowId - ID de la sombra más reciente
 * @param {Function} getShadow - Función para obtener sombra por ID
 * @returns {Object[]} Array de sombras desde el origen hasta la más reciente
 */
export async function reconstructLineage(shadowId, getShadow) {
  const lineage = [];
  let currentId = shadowId;
  
  while (currentId) {
    const shadow = await getShadow(currentId);
    if (!shadow) break;
    
    lineage.unshift(shadow); // Agregar al principio
    
    currentId = shadow.lineage?.parentShadowId;
    
    // Prevenir loops infinitos
    if (lineage.length > 100) {
      throw new Error('Lineage too deep (possible cycle)');
    }
  }
  
  return lineage;
}

/**
 * Calcula similitud de lineage entre dos átomos
 * 
 * @param {Object} atom1 
 * @param {Object} atom2
 * @returns {number} Similitud 0-1
 */
export function compareLineage(atom1, atom2) {
  const lineage1 = atom1.ancestry?.lineage || [];
  const lineage2 = atom2.ancestry?.lineage || [];
  
  if (lineage1.length === 0 && lineage2.length === 0) return 1;
  if (lineage1.length === 0 || lineage2.length === 0) return 0;
  
  // Contar ancestros comunes
  const common = lineage1.filter(id => lineage2.includes(id));
  const total = new Set([...lineage1, ...lineage2]).size;
  
  return common.length / total;
}
