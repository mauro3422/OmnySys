/**
 * @fileoverview Module Grouper - Agrupa moléculas por módulo
 * 
 * Responsabilidad Única (SRP): Agrupar moléculas según su ubicación en carpetas.
 * 
 * @module module-system/groupers
 */

import path from 'path';

/**
 * Agrupa moléculas por módulo (carpeta)
 * 
 * @param {string} projectRoot - Raíz del proyecto
 * @param {Array} molecules - Moléculas a agrupar
 * @returns {Map<string, Array>} Mapa de modulePath -> molecules[]
 */
export function groupMoleculesByModule(projectRoot, molecules) {
  const groups = new Map();
  
  for (const mol of molecules) {
    // Encontrar módulo (carpeta padre)
    const relativePath = path.relative(projectRoot, mol.filePath);
    const parts = relativePath.split(path.sep);
    
    // Asumir que el primer nivel es el módulo
    // Ej: src/auth/login.js → módulo: src/auth
    let modulePath;
    if (parts.length >= 2) {
      modulePath = path.join(projectRoot, parts[0]);
      // Si hay sub-niveles, considerar src/nivel1/nivel2
      if (parts[0] === 'src' && parts.length >= 3) {
        modulePath = path.join(projectRoot, parts[0], parts[1]);
      }
    } else {
      modulePath = projectRoot;
    }
    
    if (!groups.has(modulePath)) {
      groups.set(modulePath, []);
    }
    groups.get(modulePath).push(mol);
  }
  
  return groups;
}

/**
 * Extrae el nombre del módulo desde el path
 * @param {string} modulePath - Path completo del módulo
 * @param {string} projectRoot - Raíz del proyecto
 * @returns {string} Nombre del módulo
 */
export function extractModuleName(modulePath, projectRoot) {
  const relativePath = path.relative(projectRoot, modulePath);
  return relativePath.replace(/\\/g, '/');
}

/**
 * Determina el path del módulo para un archivo
 * @param {string} filePath - Path del archivo
 * @param {string} projectRoot - Raíz del proyecto
 * @returns {string} Path del módulo
 */
export function getModulePathForFile(filePath, projectRoot) {
  const relativePath = path.relative(projectRoot, filePath);
  const parts = relativePath.split(path.sep);
  
  if (parts.length >= 2) {
    let modulePath = path.join(projectRoot, parts[0]);
    if (parts[0] === 'src' && parts.length >= 3) {
      modulePath = path.join(projectRoot, parts[0], parts[1]);
    }
    return modulePath;
  }
  
  return projectRoot;
}
