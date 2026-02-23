/**
 * @fileoverview export-object-references.js
 *
 * Detecta funciones usadas como valores en objetos exportados.
 *
 * PATRÓN: export const handlers = { myFunc, anotherFunc }
 * Donde myFunc y anotherFunc son referencias a funciones (no llamadas).
 *
 * @module pipeline/phases/calledby/export-object-references
 */

import path from 'path';

/**
 * Links calledBy for functions referenced as values in exported objects.
 *
 * @param {Array} allAtoms - All atoms in the system
 * @param {Object} parsedFiles - Parsed source files indexed by path
 * @param {string} absoluteRootPath - Project root path
 * @param {boolean} verbose - Enable verbose logging
 * @returns {Object} { referenceLinks, updatedAtoms }
 */
export async function linkExportObjectReferences(allAtoms, parsedFiles, absoluteRootPath, verbose) {
  const logger = verbose
    ? (await import('#utils/logger.js')).createLogger('OmnySys:indexer')
    : { info: () => {}, warn: () => {} };

  // Index all exported function atoms by name
  const exportedFunctions = new Map();
  for (const atom of allAtoms) {
    if (!atom.isExported || !atom.name) continue;
    if (!exportedFunctions.has(atom.name)) {
      exportedFunctions.set(atom.name, []);
    }
    exportedFunctions.get(atom.name).push(atom);
  }

  if (verbose) {
    logger.info(`  📊 Found ${exportedFunctions.size} exported function names to match`);
  }

  let referenceLinks = 0;
  const updatedAtoms = new Set();

  // Use pre-parsed objectExports from the parser
  for (const [filePath, parsedFile] of Object.entries(parsedFiles)) {
    const objectExports = parsedFile.objectExports || [];
    
    for (const objExport of objectExports) {
      const objectName = objExport.name;
      if (!objectName) continue;
      
      const objectAtomId = `${filePath}::${objectName}`;
      const propertyDetails = objExport.propertyDetails || [];
      
      for (const prop of propertyDetails) {
        const funcName = prop.name;
        if (!funcName || !exportedFunctions.has(funcName)) continue;

        const funcAtoms = exportedFunctions.get(funcName);
        for (const funcAtom of funcAtoms) {
          if (funcAtom.filePath === filePath) continue;

          if (!funcAtom.calledBy) funcAtom.calledBy = [];
          const callerId = objectAtomId;
          if (!funcAtom.calledBy.includes(callerId)) {
            funcAtom.calledBy.push(callerId);
            referenceLinks++;
            updatedAtoms.add(funcAtom);
          }
        }
      }
    }
  }

  if (verbose) {
    logger.info(`  ✓ ${referenceLinks} export object reference links`);
  }

  return { referenceLinks, updatedAtoms: Array.from(updatedAtoms) };
}

export default { linkExportObjectReferences };
