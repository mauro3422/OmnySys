/**
 * @fileoverview atomic-storage-adapter.js
 * 
 * Adaptador que conecta los extractores atomicos con el nuevo
 * sistema de storage SQLite/JSON.
 * 
 * Mantiene compatibilidad con la API actual de atom.js
 * pero usa el repositorio abstracto internamente.
 * 
 * @module storage/atomic-storage-adapter
 */

import { getRepository } from './repository/index.js';
import { enrichAtom } from './enrichers/atom-enricher.js';
import { createLogger } from '#utils/logger.js';

const logger = createLogger('OmnySys:Storage:AtomicAdapter');

/**
 * Guarda un atomo usando el nuevo sistema de repositorio
 * @param {Object} atom - Atomo a guardar
 * @param {string} projectPath - Ruta del proyecto
 * @returns {Promise<Object>} Atomo guardado
 */
export async function saveAtom(atom, projectPath) {
  logger.debug(`[AtomicAdapter] Saving atom: ${atom.id}`);
  
  // Obtener repositorio
  const repo = await getRepository(projectPath);
  
  // Enriquecer atomo con vectores matematicos
  const enrichedAtom = enrichAtom(atom);
  
  // Guardar en repositorio
  const saved = await repo.save(enrichedAtom);
  
  logger.debug(`[AtomicAdapter] Saved: ${saved.id}`);
  
  return saved;
}

/**
 * Guarda multiples atomos
 * @param {Array} atoms - Atomos a guardar
 * @param {string} projectPath - Ruta del proyecto
 * @returns {Promise<Array>} Atomos guardados
 */
export async function saveAtoms(atoms, projectPath) {
  logger.info(`[AtomicAdapter] Saving ${atoms.length} atoms`);
  
  const repo = await getRepository(projectPath);
  
  // Enriquecer todos los atomos con contexto compartido
  // para calcular vectores que dependen de relaciones
  const callGraph = buildCallGraph(atoms);
  const enrichedAtoms = atoms.map(atom => 
    enrichAtom(atom, { callGraph })
  );
  
  // Guardar en batch
  const saved = await repo.saveMany(enrichedAtoms);
  
  logger.info(`[AtomicAdapter] Saved ${saved.length} atoms`);
  
  return saved;
}

/**
 * Obtiene un atomo por ID
 * @param {string} id - ID del atomo
 * @param {string} projectPath - Ruta del proyecto
 * @returns {Promise<Object|null>}
 */
export async function getAtom(id, projectPath) {
  const repo = await getRepository(projectPath);
  return await repo.getById(id);
}

/**
 * Obtiene atomos por archivo
 * @param {string} filePath - Ruta del archivo
 * @param {string} projectPath - Ruta del proyecto
 * @returns {Promise<Array>}
 */
export async function getAtomsByFile(filePath, projectPath) {
  const repo = await getRepository(projectPath);
  return await repo.getByFile(filePath);
}

/**
 * Obtiene todos los atomos
 * @param {string} projectPath - Ruta del proyecto
 * @param {Object} options - Opciones
 * @returns {Promise<Array>}
 */
export async function getAllAtoms(projectPath, options = {}) {
  const repo = await getRepository(projectPath);
  return await repo.getAll(options);
}

/**
 * Elimina un atomo
 * @param {string} id - ID del atomo
 * @param {string} projectPath - Ruta del proyecto
 * @returns {Promise<boolean>}
 */
export async function deleteAtom(id, projectPath) {
  const repo = await getRepository(projectPath);
  return await repo.delete(id);
}

/**
 * Elimina todos los atomos de un archivo
 * @param {string} filePath - Ruta del archivo
 * @param {string} projectPath - Ruta del proyecto
 * @returns {Promise<number>}
 */
export async function deleteAtomsByFile(filePath, projectPath) {
  const repo = await getRepository(projectPath);
  return await repo.deleteByFile(filePath);
}

/**
 * Query flexible
 * @param {Object} filter - Filtros
 * @param {Object} options - Opciones
 * @param {string} projectPath - Ruta del proyecto
 * @returns {Promise<Array>}
 */
export async function queryAtoms(filter, options, projectPath) {
  const repo = await getRepository(projectPath);
  return await repo.query(filter, options);
}

/**
 * Obtiene estadisticas del storage
 * @param {string} projectPath - Ruta del proyecto
 * @returns {Promise<Object>}
 */
export async function getStorageStats(projectPath) {
  const repo = await getRepository(projectPath);
  return await repo.getStats();
}

/**
 * Construye grafo de llamadas para contexto de enriquecimiento
 * @param {Array} atoms - Lista de atomos
 * @returns {Object} Grafo de llamadas
 */
function buildCallGraph(atoms) {
  const graph = {};
  
  // Inicializar nodos
  for (const atom of atoms) {
    graph[atom.id] = {
      callers: [],
      callees: []
    };
  }
  
  // Construir conexiones
  for (const atom of atoms) {
    if (atom.calls) {
      for (const call of atom.calls) {
        const calleeName = typeof call === 'string' ? call : call.callee;
        
        // Buscar atomo callee
        const callee = atoms.find(a => 
          a.name === calleeName && a.filePath === atom.filePath
        );
        
        if (callee) {
          graph[atom.id].callees.push(callee);
          graph[callee.id].callers.push(atom);
        }
      }
    }
  }
  
  return graph;
}

// Exportar compatibilidad con API legacy
export default {
  saveAtom,
  saveAtoms,
  getAtom,
  getAtomsByFile,
  getAllAtoms,
  deleteAtom,
  deleteAtomsByFile,
  queryAtoms,
  getStorageStats
};