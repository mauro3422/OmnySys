/**
 * @fileoverview Neighborhood Analyzer - "Society of Atoms"
 * 
 * Analiza las "relaciones de vecindario" entre archivos.
 * 
 * Principio: "Si dos casas comparten una cerca, son vecinos"
 * - Si dos archivos importan lo mismo, están en el mismo "barrio" (feature)
 * - Si todos los vecinos tienen validación, este archivo probablemente debería tenerla
 * 
 * @module inference-engine/detectors/neighborhood
 */

/**
 * Analiza el vecindario de un archivo
 * 
 * @param {Object} fileAnalysis - Análisis del archivo
 * @param {Map} allFiles - Mapa de todos los archivos (filePath → fileAnalysis)
 * @returns {Object} Análisis de vecindario
 */
export function analyzeNeighborhood(fileAnalysis, allFiles = new Map()) {
  const myImports = (fileAnalysis.imports || []).map(i => i.source || i);
  const myExports = (fileAnalysis.exports || []).map(e => e.name || e);
  const filePath = fileAnalysis.filePath || '';

  const result = {
    // Vecinos directos (comparten imports)
    neighbors: [],
    
    // Barrio detectado (feature/module)
    neighborhood: null,
    
    // Cohesión con el vecindario (0-1)
    cohesion: 0,
    
    // Sugerencias basadas en vecinos
    suggestions: []
  };

  // Si no hay otros archivos, retornar análisis básico
  if (allFiles.size === 0) {
    return result;
  }

  // Encontrar vecinos: archivos que comparten imports
  const sharedImportsMap = new Map();

  for (const [otherPath, otherAnalysis] of allFiles) {
    if (otherPath === filePath) continue;

    const otherImports = (otherAnalysis.imports || []).map(i => i.source || i);
    const shared = myImports.filter(i => otherImports.includes(i));

    if (shared.length > 0) {
      result.neighbors.push({
        path: otherPath,
        sharedImports: shared,
        sharedCount: shared.length
      });

      // Track imports compartidos para detectar "barrio"
      for (const imp of shared) {
        if (!sharedImportsMap.has(imp)) {
          sharedImportsMap.set(imp, []);
        }
        sharedImportsMap.get(imp).push(otherPath);
      }
    }
  }

  // Detectar "barrio" (feature/module) por imports compartidos
  // El barrio es el import que más archivos comparten
  if (sharedImportsMap.size > 0) {
    let maxShared = 0;
    let neighborhoodImport = null;

    for (const [imp, files] of sharedImportsMap) {
      if (files.length > maxShared) {
        maxShared = files.length;
        neighborhoodImport = imp;
      }
    }

    if (neighborhoodImport) {
      // Extraer nombre del módulo del import
      const parts = neighborhoodImport.split('/');
      result.neighborhood = parts[parts.length - 1] || neighborhoodImport;
    }
  }

  // Calcular cohesión (qué tan conectado está con el vecindario)
  const totalNeighbors = result.neighbors.length;
  const avgShared = result.neighbors.reduce((sum, n) => sum + n.sharedCount, 0) / 
                     Math.max(1, totalNeighbors);
  
  result.cohesion = Math.min(1, (totalNeighbors * avgShared) / 20);

  // Generar sugerencias basadas en vecinos
  result.suggestions = _generateSuggestions(fileAnalysis, result.neighbors, allFiles);

  return result;
}

/**
 * @private - Genera sugerencias basadas en el vecindario
 */
function _generateSuggestions(fileAnalysis, neighbors, allFiles) {
  const suggestions = [];

  // Si los vecinos tienen validación y este archivo no
  const neighborsWithValidation = neighbors.filter(n => {
    const other = allFiles.get(n.path);
    if (!other || !other.atoms) return false;
    return other.atoms.some(a => a.hasValidation);
  });

  const hasValidation = (fileAnalysis.atoms || []).some(a => a.hasValidation);

  if (neighborsWithValidation.length > 2 && !hasValidation) {
    suggestions.push({
      type: 'validation',
      message: 'Archivos similares en el vecindario tienen validación',
      priority: 'medium',
      basedOn: neighborsWithValidation.map(n => n.path)
    });
  }

  // Si los vecinos tienen error handling y este archivo no
  const neighborsWithErrorHandling = neighbors.filter(n => {
    const other = allFiles.get(n.path);
    if (!other || !other.atoms) return false;
    return other.atoms.some(a => a.hasErrorHandling);
  });

  const hasErrorHandling = (fileAnalysis.atoms || []).some(a => a.hasErrorHandling);

  if (neighborsWithErrorHandling.length > 2 && !hasErrorHandling) {
    suggestions.push({
      type: 'error-handling',
      message: 'Archivos similares en el vecindario tienen manejo de errores',
      priority: 'high',
      basedOn: neighborsWithErrorHandling.map(n => n.path)
    });
  }

  // Si está muy aislado (sin vecinos)
  if (neighbors.length === 0 && (fileAnalysis.exports?.length || 0) > 0) {
    suggestions.push({
      type: 'isolation',
      message: 'Archivo aislado - verificar si debería estar conectado',
      priority: 'low',
      basedOn: []
    });
  }

  return suggestions;
}

export default analyzeNeighborhood;