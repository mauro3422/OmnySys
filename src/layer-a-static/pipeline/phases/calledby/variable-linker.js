/**
 * @fileoverview variable-linker.js
 *
 * Builds calledBy links for exported variables/constants
 * by scanning import specifiers and source references.
 *
 * @module pipeline/phases/calledby/variable-linker
 */

import path from 'path';
import { getSourceCode } from './calledby-linker-utils.js';

function buildExportedVariableIndex(allAtoms) {
  const exportedVarAtoms = new Map();

  for (const atom of allAtoms) {
    if (!atom.isExported || (atom.type !== 'variable' && atom.functionType !== 'variable')) {
      continue;
    }

    if (!exportedVarAtoms.has(atom.name)) {
      exportedVarAtoms.set(atom.name, []);
    }

    exportedVarAtoms.get(atom.name).push(atom);
  }

  return exportedVarAtoms;
}

function collectImportedVariableNames(imports, exportedVarAtoms) {
  const importedNames = new Set();

  for (const imp of imports) {
    for (const spec of (imp.specifiers || [])) {
      const importedName = spec.local || spec.imported || spec.name;
      if (importedName && exportedVarAtoms.has(importedName)) {
        importedNames.add(importedName);
      }
    }
  }

  return importedNames;
}

function findReferencedImportedNames(lines, importedNames, regexCache) {
  const referencedNames = [];

  for (const importedName of importedNames) {
    if (findReferenceInLines(lines, importedName, regexCache)) {
      referencedNames.push(importedName);
    }
  }

  return referencedNames;
}

function linkReferencedVariables(exportedVarAtoms, referencedNames, filePath) {
  let variableLinks = 0;

  for (const importedName of referencedNames) {
    const varAtoms = exportedVarAtoms.get(importedName);
    if (!varAtoms || varAtoms.length === 0) continue;

    const targetAtom = varAtoms.find((atom) => atom.filePath !== filePath);
    if (!targetAtom) continue;

    if (!targetAtom.calledBy) targetAtom.calledBy = [];
    if (!targetAtom.calledBy.includes(filePath)) {
      targetAtom.calledBy.push(filePath);
      variableLinks++;
    }
  }

  return variableLinks;
}

async function processParsedFileForVariableLinks(
  absPath,
  parsedFile,
  absoluteRootPath,
  exportedVarAtoms
) {
  const source = await getSourceCode(absPath, parsedFile);
  if (!source) return 0;

  const imports = parsedFile.imports || [];
  if (imports.length === 0) return 0;

  const filePath = path.relative(absoluteRootPath, absPath).replace(/\\/g, '/');
  const importedNames = collectImportedVariableNames(imports, exportedVarAtoms);
  if (importedNames.size === 0) return 0;

  const lines = source.split('\n');
  const regexCache = {};
  const referencedNames = findReferencedImportedNames(lines, importedNames, regexCache);
  if (referencedNames.length === 0) return 0;

  return linkReferencedVariables(exportedVarAtoms, referencedNames, filePath);
}

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

  const exportedVarAtoms = buildExportedVariableIndex(allAtoms);

  if (verbose) logger.info(`  📊 Found ${exportedVarAtoms.size} exported variable names`);

  let variableLinks = 0;

  for (const [absPath, parsedFile] of Object.entries(parsedFiles)) {
    try {
      variableLinks += await processParsedFileForVariableLinks(
        absPath,
        parsedFile,
        absoluteRootPath,
        exportedVarAtoms
      );
    } catch (error) {
      if (verbose) {
        logger.warn(`  [variable-linker] skipped ${absPath}: ${error.message}`);
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
 * @param {Object} regexCache - Cache for compiled regexes
 * @returns {boolean}
 */
function findReferenceInLines(lines, name, regexCache) {
  if (!regexCache[name]) {
    regexCache[name] = {
      ref: new RegExp(`\\b${name}\\b`),
      isCall: new RegExp(`${name}\\s*\\(`),
      isDecl: new RegExp(`(function|const|let|var|class)\\s+${name}\\b`)
    };
  }

  const { ref, isCall, isDecl } = regexCache[name];

  for (const line of lines) {
    if (line.includes('import ') || line.includes('export ') || line.includes('require(')) continue;
    if (ref.test(line) && !isCall.test(line) && !isDecl.test(line)) return true;
  }
  return false;
}
