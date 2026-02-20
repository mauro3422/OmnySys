/**
 * @fileoverview circular.js
 * Detecta dependencias circulares entre archivos
 */

import { getFileAnalysis, getFileDependents } from '#layer-c/query/apis/file-api.js';

/**
 * Encuentra dependencias circulares para un archivo
 * @param {string} filePath - Archivo a verificar
 * @param {string} projectPath - Path del proyecto
 * @returns {Array} Dependencias circulares encontradas
 */
export async function findCircularImports(filePath, projectPath) {
  const circular = [];
  
  const dependents = await getFileDependents(projectPath, filePath);
  
  for (const dep of dependents) {
    const depData = await getFileAnalysis(projectPath, dep);
    if (depData?.imports?.some(i => {
      const src = i.source || i.module;
      return src && (src.includes(filePath) || filePath.includes(src));
    })) {
      circular.push({
        file: dep,
        type: 'import-cycle',
        severity: 'medium'
      });
    }
  }
  
  return circular;
}
