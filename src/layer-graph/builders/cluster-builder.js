/**
 * @fileoverview cluster-builder.js
 * 
 * Agrupa átomos relacionados en clusters para análisis de módulos cohesivos.
 * Un cluster es un grupo de átomos que trabajan juntos en el mismo archivo
 * o que tienen el mismo purpose/archetype.
 * 
 * @module layer-graph/builders/cluster-builder
 */

import { createClusterNode } from '../core/types.js';

/**
 * Construye clusters por archivo (módulos cohesivos)
 * @param {Map} atoms - Mapa de átomos
 * @returns {Array} - Array de clusters
 */
export function buildFileClusters(atoms) {
  const byFile = new Map();
  
  // Agrupar por archivo
  for (const [atomId, atom] of atoms) {
    const filePath = atom.filePath;
    if (!byFile.has(filePath)) {
      byFile.set(filePath, []);
    }
    byFile.get(filePath).push(atom);
  }
  
  const clusters = [];
  
  for (const [filePath, fileAtoms] of byFile) {
    // Solo crear cluster si hay suficientes átomos
    if (fileAtoms.length < 3) continue;
    
    // Calcular propósito dominante
    const purposes = {};
    for (const atom of fileAtoms) {
      const p = atom.purpose || 'UNKNOWN';
      purposes[p] = (purposes[p] || 0) + 1;
    }
    
    const dominantPurpose = Object.entries(purposes)
      .sort((a, b) => b[1] - a[1])[0][0];
    
    // Calcular cohesión (qué tan conectados están los átomos entre sí)
    const cohesion = calculateCohesion(fileAtoms);
    
    // Calcular exports
    const exports = fileAtoms.filter(a => a.isExported).map(a => a.name);
    
    // Calcular complejidad total
    const totalComplexity = fileAtoms.reduce((sum, a) => sum + (a.complexity || 1), 0);
    
    // Crear cluster
    const cluster = createClusterNode(
      filePath.replace(/\//g, '_').replace(/\.js$/, ''),
      {
        atoms: fileAtoms.map(a => a.id),
        file: filePath,
        purposes: Object.keys(purposes),
        cohesion,
        metadata: {
          atomCount: fileAtoms.length,
          exportCount: exports.length,
          dominantPurpose,
          totalComplexity,
          exports
        }
      }
    );
    
    clusters.push(cluster);
  }
  
  return clusters.sort((a, b) => b.atoms.length - a.atoms.length);
}

/**
 * Construye clusters por propósito + archetype
 * @param {Map} atoms - Mapa de átomos
 * @returns {Array} - Array de clusters
 */
export function buildPurposeClusters(atoms) {
  const byPurposeArchetype = new Map();
  
  // Agrupar por purpose:archetype
  for (const [atomId, atom] of atoms) {
    const key = `${atom.purpose}:${atom.archetype?.type || 'unknown'}`;
    if (!byPurposeArchetype.has(key)) {
      byPurposeArchetype.set(key, []);
    }
    byPurposeArchetype.get(key).push(atom);
  }
  
  const clusters = [];
  
  for (const [key, clusterAtoms] of byPurposeArchetype) {
    // Solo crear cluster si hay suficientes átomos
    if (clusterAtoms.length < 5) continue;
    
    const [purpose, archetype] = key.split(':');
    
    // Agrupar por archivo dentro del cluster
    const byFile = {};
    for (const atom of clusterAtoms) {
      if (!byFile[atom.filePath]) byFile[atom.filePath] = [];
      byFile[atom.filePath].push(atom);
    }
    
    // Calcular métricas
    const totalCallers = clusterAtoms.reduce((sum, a) => sum + (a.calledBy?.length || 0), 0);
    const avgComplexity = clusterAtoms.reduce((sum, a) => sum + (a.complexity || 1), 0) / clusterAtoms.length;
    
    const cluster = createClusterNode(
      key.replace(/:/g, '_'),
      {
        atoms: clusterAtoms.map(a => a.id),
        file: null, // Múltiples archivos
        purposes: [purpose],
        cohesion: totalCallers / clusterAtoms.length, // Proxy de cohesión
        metadata: {
          purpose,
          archetype,
          atomCount: clusterAtoms.length,
          fileCount: Object.keys(byFile).length,
          totalCallers,
          avgComplexity,
          files: Object.keys(byFile)
        }
      }
    );
    
    clusters.push(cluster);
  }
  
  return clusters.sort((a, b) => b.atoms.length - a.atoms.length);
}

/**
 * Calcula la cohesión de un grupo de átomos
 * @param {Array} atoms - Array de átomos
 * @returns {number} - Cohesión entre 0 y 1
 */
function calculateCohesion(atoms) {
  if (atoms.length <= 1) return 1;
  
  let internalCalls = 0;
  let totalCalls = 0;
  
  const atomNames = new Set(atoms.map(a => a.name));
  
  for (const atom of atoms) {
    for (const call of (atom.calls || [])) {
      if (call.name && atomNames.has(call.name)) {
        internalCalls++;
      }
      totalCalls++;
    }
  }
  
  if (totalCalls === 0) return 0;
  
  return internalCalls / totalCalls;
}

/**
 * Detecta boundary violations (crossing entre clusters)
 * @param {Array} clusters - Array de clusters
 * @param {Map} atoms - Mapa de átomos
 * @returns {Array} - Violaciones detectadas
 */
export function detectBoundaryViolations(clusters, atoms) {
  const violations = [];
  
  for (const cluster of clusters) {
    const clusterAtoms = new Set(cluster.atoms);
    const clusterFile = cluster.file;
    
    if (!clusterFile) continue;
    
    for (const atomId of cluster.atoms) {
      const atom = atoms.get(atomId);
      if (!atom) continue;
      
      for (const call of (atom.calls || [])) {
        // Buscar átomo llamado
        const targetAtom = Array.from(atoms.values()).find(a => a.name === call.name);
        
        if (targetAtom && !clusterAtoms.has(targetAtom.id)) {
          // Llamada a átomo fuera del cluster
          violations.push({
            from: { atom: atom.name, file: atom.filePath },
            to: { atom: targetAtom.name, file: targetAtom.filePath },
            type: 'cross-cluster-call',
            severity: targetAtom.purpose === 'API_EXPORT' ? 'low' : 'medium'
          });
        }
      }
    }
  }
  
  return violations;
}

/**
 * Obtiene estadísticas de clusters
 * @param {Array} clusters - Array de clusters
 * @returns {Object} - Estadísticas
 */
export function getClusterStats(clusters) {
  const stats = {
    totalClusters: clusters.length,
    totalAtoms: clusters.reduce((sum, c) => sum + c.atoms.length, 0),
    avgClusterSize: 0,
    avgCohesion: 0,
    byPurpose: {}
  };
  
  if (clusters.length > 0) {
    stats.avgClusterSize = stats.totalAtoms / clusters.length;
    stats.avgCohesion = clusters.reduce((sum, c) => sum + (c.cohesion || 0), 0) / clusters.length;
  }
  
  for (const cluster of clusters) {
    const purpose = cluster.purposes?.[0] || 'unknown';
    if (!stats.byPurpose[purpose]) {
      stats.byPurpose[purpose] = { count: 0, atoms: 0 };
    }
    stats.byPurpose[purpose].count++;
    stats.byPurpose[purpose].atoms += cluster.atoms.length;
  }
  
  return stats;
}

export default { 
  buildFileClusters, 
  buildPurposeClusters, 
  detectBoundaryViolations,
  getClusterStats 
};