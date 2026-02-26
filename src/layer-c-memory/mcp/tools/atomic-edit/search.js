/**
 * @fileoverview Búsquedas selectivas de átomos usando SQLite
 * Funciones optimizadas que consultan la base de datos directamente
 */

import path from 'path';
import { createLogger } from '../../../../utils/logger.js';
import { getRepository } from '#layer-c/storage/repository/repository-factory.js';

const logger = createLogger('OmnySys:atomic:search');

/**
 * Busca átomos por nombre de forma eficiente usando SQLite
 * @param {string} atomName - Nombre del átomo a buscar
 * @param {string} projectPath - Ruta del proyecto
 * @param {Object} options - Opciones de búsqueda
 * @returns {Promise<Array>} Array de átomos encontrados
 */
export async function findAtomsByName(atomName, projectPath, options = {}) {
  const atoms = [];

  try {
    const repo = getRepository(projectPath);

    const results = repo.findByName(atomName);

    for (const atom of results.slice(0, 20)) {
      atoms.push({
        id: atom.id,
        name: atom.name,
        filePath: atom.file_path,
        line: atom.line,
        type: atom.type,
        complexity: atom.complexity,
        archetype: atom.archetype,
        purpose: atom.purpose
      });
    }

  } catch (error) {
    logger.warn(`[FindAtomsByName] Error buscando ${atomName}: ${error.message}`);
  }

  return atoms;
}

/**
 * Busca callers de una función específica usando SQLite
 * @param {string} functionName - Nombre de la función
 * @param {string} projectPath - Ruta del proyecto
 * @param {string} excludeFile - Archivo a excluir (opcional)
 * @returns {Promise<Array>} Array de callers encontrados
 */
export async function findCallersEfficient(functionName, projectPath, excludeFile = null) {
  const callers = [];

  try {
    const repo = getRepository(projectPath);

    const atomIdPattern = `::${functionName}`;

    const allAtoms = repo.query({ limit: 1000 });

    for (const atom of allAtoms) {
      if (excludeFile && atom.file_path?.includes(excludeFile)) continue;

      const calls = atom.calls;
      if (!calls || !Array.isArray(calls)) continue;

      const matchingCall = calls.find(c =>
        c.callee === functionName ||
        c.callee?.endsWith(atomIdPattern) ||
        c.target === functionName ||
        c.name === functionName
      );

      if (matchingCall) {
        const argumentCount = matchingCall.argumentCount !== undefined ? matchingCall.argumentCount :
          (matchingCall.args ? matchingCall.args.length :
            (matchingCall.arguments ? matchingCall.arguments.length : 0));

        callers.push({
          name: atom.name,
          filePath: atom.filePath,
          line: atom.line,
          code: matchingCall.code || JSON.stringify(matchingCall),
          argumentCount: argumentCount
        });

        if (callers.length >= 20) break;
      }
    }

  } catch (error) {
    logger.warn(`[FindCallers] Error buscando callers de ${functionName}: ${error.message}`);
  }

  return callers.slice(0, 20);
}
