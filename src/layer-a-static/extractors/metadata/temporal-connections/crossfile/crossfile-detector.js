/**
 * @fileoverview Cross-File Connection Detector
 * 
 * Detects temporal connections across files.
 * 
 * @module temporal-connections/crossfile
 */

import { isInitializerByName } from '../execution/order-detector.js';

/**
 * Extracts cross-file temporal connections
 * 
 * @param {Array} allAtoms - All atoms from the project
 * @returns {Array} Cross-file connections
 */
export function extractCrossFileConnections(allAtoms) {
  const connections = [];
  
  // Group atoms by file
  const atomsByFile = groupBy(allAtoms, a => a.filePath);
  
  // Identify init and consumer files
  const initFiles = [];
  const consumerFiles = [];
  
  for (const [filePath, atoms] of Object.entries(atomsByFile)) {
    const hasInitializer = atoms.some(a => 
      a.temporal?.executionOrder?.mustRunBefore?.length > 0 ||
      isInitializerByName(a.name)
    );
    const hasConsumer = atoms.some(a =>
      a.temporal?.executionOrder?.mustRunAfter?.length > 0
    );
    
    if (hasInitializer) initFiles.push({ filePath, atoms });
    if (hasConsumer) consumerFiles.push({ filePath, atoms });
  }

  // Connect files with import relationships
  for (const initFile of initFiles) {
    for (const consumerFile of consumerFiles) {
      const importsInit = checkImports(consumerFile.atoms, initFile.filePath);
      
      if (importsInit) {
        connections.push({
          type: 'cross-file-temporal',
          from: initFile.filePath,
          to: consumerFile.filePath,
          relationship: 'must-initialize-before',
          confidence: 0.8,
          evidence: {
            import: true,
            initializers: initFile.atoms
              .filter(a => a.temporal?.executionOrder?.mustRunBefore?.length > 0)
              .map(a => a.name)
          }
        });
      }
    }
  }

  return connections;
}

/**
 * Checks if atoms import from a specific file
 * @param {Array} atoms - Atoms to check
 * @param {string} filePath - File path to check for
 * @returns {boolean} True if imports exist
 */
function checkImports(atoms, filePath) {
  const normalizedPath = filePath.replace(/\.js$/, '');
  return atoms.some(atom => {
    const imports = atom.imports || [];
    return imports.some(imp => 
      imp.source?.includes(normalizedPath) ||
      normalizedPath.includes(imp.source?.replace(/\.js$/, ''))
    );
  });
}

/**
 * Groups array by key function
 * @param {Array} array - Array to group
 * @param {Function} keyFn - Key extraction function
 * @returns {Object} Grouped object
 */
function groupBy(array, keyFn) {
  const groups = {};
  for (const item of array) {
    const key = keyFn(item);
    if (!groups[key]) groups[key] = [];
    groups[key].push(item);
  }
  return groups;
}

/**
 * Find files that act as initialization providers
 * @param {Array} atoms - All atoms
 * @returns {Array} Provider file paths
 */
export function findProviderFiles(atoms) {
  const atomsByFile = groupBy(atoms, a => a.filePath);
  
  return Object.entries(atomsByFile)
    .filter(([_, fileAtoms]) => 
      fileAtoms.some(a => 
        a.temporal?.executionOrder?.mustRunBefore?.length > 0 ||
        isInitializerByName(a.name)
      )
    )
    .map(([filePath, _]) => filePath);
}

/**
 * Find files that act as initialization consumers
 * @param {Array} atoms - All atoms
 * @returns {Array} Consumer file paths
 */
export function findConsumerFiles(atoms) {
  const atomsByFile = groupBy(atoms, a => a.filePath);
  
  return Object.entries(atomsByFile)
    .filter(([_, fileAtoms]) => 
      fileAtoms.some(a => a.temporal?.executionOrder?.mustRunAfter?.length > 0)
    )
    .map(([filePath, _]) => filePath);
}
