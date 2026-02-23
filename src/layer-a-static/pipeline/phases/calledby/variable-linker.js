/**
 * @fileoverview variable-linker.js
 *
 * Builds calledBy links for exported variables/constants
 * by scanning import specifiers and source references.
 *
 * @module pipeline/phases/calledby/variable-linker
 */

import path from 'path';

/**
 * Links calledBy for exported variable/constant atoms.
 * Mutates atoms in place. Los cambios se persisten en bulk al final.
 *
 * @param {Object[]} allAtoms
 * @param {Object} parsedFiles - { [absPath]: parsedFile }
 * @param {string} absoluteRootPath
 * @param {boolean} verbose
 * @returns {Promise<{variableLinks: number, updatedAtoms: Array}>} Number of variable links added and updated atoms
 */
export async function linkVariableCalledBy(allAtoms, parsedFiles, absoluteRootPath, verbose) {
  const logger = verbose
    ? (await import('#utils/logger.js')).createLogger('OmnySys:indexer')
    : null;

  // Index exported variable atoms by name
  const exportedVarAtoms = new Map();
  for (const atom of allAtoms) {
    if (atom.isExported && (atom.type === 'variable' || atom.functionType === 'variable')) {
      if (!exportedVarAtoms.has(atom.name)) exportedVarAtoms.set(atom.name, []);
      exportedVarAtoms.get(atom.name).push(atom);
    }
  }

  if (verbose) logger.info(`  📊 Found ${exportedVarAtoms.size} exported variable names`);

  let variableLinks = 0;

  for (const [absPath, parsedFile] of Object.entries(parsedFiles)) {
    const source = parsedFile.source;
    if (!source) continue;

    const filePath = path.relative(absoluteRootPath, absPath).replace(/\\/g, '/');
    const imports = parsedFile.imports || [];
    if (imports.length === 0) continue;

    const lines = source.split('\n');

    for (const imp of imports) {
      for (const spec of (imp.specifiers || [])) {
        const importedName = spec.local || spec.imported || spec.name;
        if (!importedName) continue;

        const varAtoms = exportedVarAtoms.get(importedName);
        if (!varAtoms || varAtoms.length === 0) continue;

        const targetAtom = varAtoms.find(a => a.filePath !== filePath);
        if (!targetAtom) continue;

        const found = findReferenceInLines(lines, importedName);
        if (found) {
          if (!targetAtom.calledBy) targetAtom.calledBy = [];
          if (!targetAtom.calledBy.includes(filePath)) {
            targetAtom.calledBy.push(filePath);
            variableLinks++;
          }
        }
      }
    }
  }

  // Retornar átomos modificados para bulk save (sin guardar individualmente)
  const updatedAtoms = variableLinks > 0 
    ? allAtoms.filter(a => a.calledBy && a.calledBy.length > 0 && a.filePath && a.name)
    : [];

  if (verbose) logger.info(`  ✓ ${variableLinks} variable reference links added`);

  return { variableLinks, updatedAtoms };
}

/**
 * Returns true if `name` appears as a reference (not import/export/declaration) in lines.
 * @param {string[]} lines
 * @param {string} name
 * @returns {boolean}
 */
function findReferenceInLines(lines, name) {
  const ref = new RegExp(`\\b${name}\\b`);
  const isCall = new RegExp(`${name}\\s*\\(`);
  const isDecl = new RegExp(`(function|const|let|var|class)\\s+${name}\\b`);

  for (const line of lines) {
    if (line.includes('import ') || line.includes('export ') || line.includes('require(')) continue;
    if (ref.test(line) && !isCall.test(line) && !isDecl.test(line)) return true;
  }
  return false;
}
