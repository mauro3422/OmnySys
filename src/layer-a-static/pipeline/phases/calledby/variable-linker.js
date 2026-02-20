/**
 * @fileoverview variable-linker.js
 *
 * Builds calledBy links for exported variables/constants
 * by scanning import specifiers and source references.
 *
 * @module pipeline/phases/calledby/variable-linker
 */

import path from 'path';
import { saveAtom } from '#layer-c/storage/atoms/atom.js';

/**
 * Links calledBy for exported variable/constant atoms.
 * Mutates atoms in place and persists updates to disk.
 *
 * @param {Object[]} allAtoms
 * @param {Object} parsedFiles - { [absPath]: parsedFile }
 * @param {string} absoluteRootPath
 * @param {boolean} verbose
 * @returns {Promise<number>} Number of variable links added
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

  if (variableLinks > 0) {
    const toSave = allAtoms.filter(a => a.calledBy && a.calledBy.length > 0 && a.filePath && a.name);
    await Promise.allSettled(toSave.map(a => saveAtom(absoluteRootPath, a.filePath, a.name, a)));
  }

  if (verbose) logger.info(`  ✓ ${variableLinks} variable reference links added`);

  return variableLinks;
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
