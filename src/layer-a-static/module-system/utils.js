/**
 * @fileoverview Module System Utilities
 * 
 * Utilidades compartidas para detectores y analizadores del module-system
 * 
 * @module module-system/utils
 * @phase 3
 */

import path from 'path';

/**
 * Encuentra una molécula por su path de archivo
 * @param {string} filePath - Path del archivo
 * @param {Array} modules - Módulos del proyecto
 * @returns {Object|null} - Molécula encontrada o null
 */
export function findMolecule(filePath, modules) {
  for (const module of modules) {
    const mol = module.molecules?.find(m => m.filePath === filePath);
    if (mol) return mol;
  }
  return null;
}

/**
 * Obtiene todos los átomos de un módulo
 * @param {Object} module - Módulo
 * @param {Map} [moduleByName] - Mapa opcional de módulos por nombre
 * @returns {Array} - Array de átomos con filePath agregado
 */
export function getAllAtoms(module, moduleByName = null) {
  const atoms = [];
  const modules = moduleByName ? Array.from(moduleByName.values()) : [module];
  
  for (const file of module.files || []) {
    const mol = findMolecule(file.path, modules);
    if (mol?.atoms) {
      atoms.push(...mol.atoms.map(a => ({ ...a, filePath: file.path })));
    }
  }
  return atoms;
}

/**
 * Convierte camelCase a kebab-case
 * @param {string} str - String en camelCase
 * @returns {string} - String en kebab-case
 */
export function camelToKebab(str) {
  if (!str) return '';
  return str
    .replace(/([a-z0-9])([A-Z])/g, '$1-$2')
    .replace(/([A-Z])([A-Z][a-z])/g, '$1-$2')
    .toLowerCase()
    .replace(/^-/, '');
}

/**
 * Infiere nombre de módulo desde nombre de función
 * @param {string} functionName - Nombre de función
 * @returns {string|null} - Nombre de módulo inferido
 */
export function inferModuleFromCall(functionName) {
  const patterns = [
    { prefix: /^db\./, module: 'database' },
    { prefix: /^redis\./, module: 'redis' },
    { prefix: /^cache\./, module: 'cache' },
    { prefix: /^logger\./, module: 'logger' },
    { prefix: /^config\./, module: 'config' }
  ];
  
  for (const { prefix, module } of patterns) {
    if (prefix.test(functionName)) {
      return module;
    }
  }
  
  return null;
}

/**
 * Extrae nombre de archivo sin extensión
 * @param {string} filePath - Path completo
 * @returns {string} - Nombre base
 */
export function getFileName(filePath) {
  return path.basename(filePath);
}

/**
 * Clasifica side effects de un átomo
 * @param {Object} atom - Átomo
 * @returns {Array} - Array de tipos de side effects
 */
export function classifySideEffects(atom) {
  const effects = [];
  
  if (atom.hasNetworkCalls) effects.push('network');
  if (atom.hasDomManipulation) effects.push('dom');
  if (atom.hasStorageAccess) effects.push('storage');
  if (atom.hasLogging) effects.push('logging');
  
  return effects;
}

/**
 * Agrega side effects de todos los pasos
 * @param {Array} steps - Pasos
 * @returns {Array} - Side effects agregados
 */
export function aggregateSideEffects(steps) {
  const allEffects = steps.flatMap(s => s.sideEffects || []);
  const unique = [...new Set(allEffects)];
  
  return unique.map(effect => ({
    type: effect,
    steps: steps.filter(s => (s.sideEffects || []).includes(effect)).map(s => ({
      module: s.module,
      function: s.function
    }))
  }));
}
