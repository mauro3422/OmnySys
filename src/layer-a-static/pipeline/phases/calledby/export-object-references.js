/**
 * @fileoverview export-object-references.js
 *
 * Detecta funciones usadas como valores en objetos exportados.
 *
 * PATRÓN: export const handlers = { myFunc, anotherFunc }
 * Donde myFunc y anotherFunc son referencias a funciones (no llamadas).
 *
 * Este patrón es común para:
 *   - MCP tool handlers: export const toolHandlers = { get_impact_map, trace_variable_impact }
 *   - Router configurations: export const routes = { getUser, postUser }
 *   - Event emitters: export const handlers = { onClick, onHover }
 *
 * @module pipeline/phases/calledby/export-object-references
 */

import path from 'path';

/**
 * Links calledBy for functions referenced as values in exported objects.
 *
 * @param {Array} allAtoms - All atoms in the system
 * @param {Array} parsedFiles - Parsed source files with AST
 * @param {string} absoluteRootPath - Project root path
 * @param {boolean} verbose - Enable verbose logging
 * @returns {Object} { updatedAtoms, referenceLinks }
 */
export async function linkExportObjectReferences(allAtoms, parsedFiles, absoluteRootPath, verbose) {
  const logger = verbose
    ? (await import('#utils/logger.js')).createLogger('OmnySys:indexer')
    : { info: () => {}, warn: () => {} };

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

  for (const parsedFile of parsedFiles) {
    const filePath = parsedFile.filePath || parsedFile.path;
    if (!filePath) continue;

    const exportObjectDeclarations = findExportObjectDeclarations(parsedFile.ast);
    if (exportObjectDeclarations.length === 0) continue;

    for (const objDecl of exportObjectDeclarations) {
      const objectName = objDecl.id?.name;
      if (!objectName) continue;

      const objectAtomId = `${filePath}::${objectName}`;

      for (const prop of objDecl.declaration?.properties || []) {
        let funcName = null;

        if (prop.type === 'ObjectProperty' || prop.type === 'Property') {
          if (prop.shorthand && prop.key?.name) {
            funcName = prop.key.name;
          } else if (prop.key?.name) {
            funcName = prop.key.name;
          } else if (prop.key?.value) {
            funcName = prop.key.value;
          }
        }

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

function findExportObjectDeclarations(ast) {
  if (!ast?.body) return [];

  const declarations = [];

  for (const node of ast.body) {
    if (node.type === 'ExportNamedDeclaration') {
      const decl = node.declaration;
      if (decl?.type === 'VariableDeclaration' && decl.kind === 'const') {
        for (const declarator of decl.declarations) {
          if (declarator.id?.type === 'Identifier' &&
              declarator.init?.type === 'ObjectExpression') {
            declarations.push({
              id: declarator.id,
              declaration: declarator.init
            });
          }
        }
      }
    }

    if (node.type === 'VariableDeclaration' && node.kind === 'const') {
      for (const declarator of node.declarations) {
        if (declarator.id?.type === 'Identifier' &&
            declarator.init?.type === 'ObjectExpression') {
          declarations.push({
            id: declarator.id,
            declaration: declarator.init
          });
        }
      }
    }
  }

  return declarations;
}

export default { linkExportObjectReferences };
