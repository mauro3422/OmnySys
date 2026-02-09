/**
 * @fileoverview Main Export Detector
 * 
 * Detecta exports principales de módulos
 * 
 * @module module-system/detectors/export-detector
 * @phase 3
 */

import path from 'path';

/**
 * Encuentra exports principales
 * @param {Array} modules - Módulos del proyecto
 * @returns {Array} - Exports encontrados
 */
export function findMainExports(modules) {
  const exports = [];
  
  // Buscar index.js o main.js
  for (const module of modules) {
    const mainFile = module.files.find(f =>
      f.path.endsWith('index.js') ||
      f.path.endsWith('main.js')
    );
    
    if (mainFile) {
      const mainExports = module.exports?.filter(e =>
        e.file === path.basename(mainFile.path)
      ) || [];
      
      for (const exp of mainExports) {
        exports.push({
          type: 'library',
          name: exp.name,
          module: module.moduleName,
          exportedFrom: exp.file
        });
      }
    }
  }
  
  return exports;
}
