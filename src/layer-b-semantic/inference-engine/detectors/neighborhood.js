/**
 * @fileoverview Neighborhood Analyzer - "Society of Atoms"
 *
 * Analiza las relaciones de vecindario entre archivos.
 *
 * @module inference-engine/detectors/neighborhood
 */

function collectImportSources(imports = []) {
  return imports.map(item => item.source || item);
}

function findSharedImports(myImportSet, otherImports) {
  const shared = [];

  for (const source of otherImports) {
    if (myImportSet.has(source)) {
      shared.push(source);
    }
  }

  return shared;
}

function detectNeighborhood(sharedImportsMap) {
  let maxShared = 0;
  let neighborhoodImport = null;

  for (const [imp, files] of sharedImportsMap) {
    if (files.length <= maxShared) continue;
    maxShared = files.length;
    neighborhoodImport = imp;
  }

  if (!neighborhoodImport) return null;

  const parts = neighborhoodImport.split('/');
  return parts[parts.length - 1] || neighborhoodImport;
}

/**
 * Analiza el vecindario de un archivo.
 *
 * @param {Object} fileAnalysis - Analisis del archivo
 * @param {Map} allFiles - Mapa de todos los archivos
 * @returns {Object} Analisis de vecindario
 */
export function analyzeNeighborhood(fileAnalysis, allFiles = new Map()) {
  const myImports = collectImportSources(fileAnalysis.imports || []);
  const myImportSet = new Set(myImports);
  const filePath = fileAnalysis.filePath || '';

  const result = {
    neighbors: [],
    neighborhood: null,
    cohesion: 0,
    suggestions: []
  };

  if (allFiles.size === 0) {
    return result;
  }

  const sharedImportsMap = new Map();

  for (const [otherPath, otherAnalysis] of allFiles) {
    if (otherPath === filePath) continue;

    const otherImports = collectImportSources(otherAnalysis.imports || []);
    const shared = findSharedImports(myImportSet, otherImports);

    if (shared.length === 0) continue;

    result.neighbors.push({
      path: otherPath,
      sharedImports: shared,
      sharedCount: shared.length
    });

    for (const imp of shared) {
      if (!sharedImportsMap.has(imp)) {
        sharedImportsMap.set(imp, []);
      }

      sharedImportsMap.get(imp).push(otherPath);
    }
  }

  result.neighborhood = detectNeighborhood(sharedImportsMap);

  const totalNeighbors = result.neighbors.length;
  const avgShared = result.neighbors.reduce((sum, neighbor) => sum + neighbor.sharedCount, 0) /
    Math.max(1, totalNeighbors);

  result.cohesion = Math.min(1, (totalNeighbors * avgShared) / 20);
  result.suggestions = generateSuggestions(fileAnalysis, result.neighbors, allFiles);

  return result;
}

function generateSuggestions(fileAnalysis, neighbors, allFiles) {
  const suggestions = [];

  const neighborsWithValidation = neighbors.filter(neighbor => {
    const other = allFiles.get(neighbor.path);
    if (!other?.atoms) return false;
    return other.atoms.some(atom => atom.hasValidation);
  });

  const hasValidation = (fileAnalysis.atoms || []).some(atom => atom.hasValidation);

  if (neighborsWithValidation.length > 2 && !hasValidation) {
    suggestions.push({
      type: 'validation',
      message: 'Archivos similares en el vecindario tienen validacion',
      priority: 'medium',
      basedOn: neighborsWithValidation.map(neighbor => neighbor.path)
    });
  }

  const neighborsWithErrorHandling = neighbors.filter(neighbor => {
    const other = allFiles.get(neighbor.path);
    if (!other?.atoms) return false;
    return other.atoms.some(atom => atom.hasErrorHandling);
  });

  const hasErrorHandling = (fileAnalysis.atoms || []).some(atom => atom.hasErrorHandling);

  if (neighborsWithErrorHandling.length > 2 && !hasErrorHandling) {
    suggestions.push({
      type: 'error-handling',
      message: 'Archivos similares en el vecindario tienen manejo de errores',
      priority: 'high',
      basedOn: neighborsWithErrorHandling.map(neighbor => neighbor.path)
    });
  }

  if (neighbors.length === 0 && (fileAnalysis.exports?.length || 0) > 0) {
    suggestions.push({
      type: 'isolation',
      message: 'Archivo aislado - verificar si deberia estar conectado',
      priority: 'low',
      basedOn: []
    });
  }

  return suggestions;
}

export default analyzeNeighborhood;
