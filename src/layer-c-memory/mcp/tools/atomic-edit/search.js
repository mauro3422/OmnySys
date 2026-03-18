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

export async function findCallersEfficient(functionName, projectPath, excludeFile = null) {
  const callers = [];

  try {
    const repo = getRepository(projectPath);

    // [USER-DIRECTED] Salvaguarda estricta: No podemos depender de falsos fallbacks si la DB está rota
    const testGraph = repo.db.prepare("SELECT count(1) as total FROM call_graph").get();
    if (!testGraph || testGraph.total === 0) {
      throw new Error("FALLBACK DESACTIVADO POR EL USUARIO: El sistema se niega a inferir dependencias en caliente porque la vista 'call_graph' SQL está vacía. Debes analizar e hidratar el proyecto correctamente (re-indexar) para evitar corrupción de datos.");
    }

    // Consulta estricta basada 100% en las relaciones analizadas
    const stmt = repo.db.prepare(`
      SELECT 
        caller_name, 
        caller_file, 
        line_number
      FROM call_graph
      WHERE callee_name = ?
        AND (? IS NULL OR caller_file != ?)
      LIMIT 1000
    `);

    const results = stmt.all(functionName, excludeFile, excludeFile);

    for (const call of results) {
      callers.push({
        name: call.caller_name,
        filePath: call.caller_file,
        line: call.line_number || 0,
        code: `/* Llamada descubierta via call_graph: ${functionName} */`,
        argumentCount: 0 // Evaluado estrictamente para propiciar advertencias de signature si aplica
      });
    }

  } catch (error) {
    logger.error(`[FindCallers] Error estricto buscando callers de ${functionName}: ${error.message}`);
    // Relanzamos el error hacia la superficie para no ocultarlo en fallbacks
    throw error;
  }

  return callers;
}
