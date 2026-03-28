import path from 'path';
import { getRepository } from '../repository/index.js';
import { createLogger } from '#utils/logger.js';

const logger = createLogger('OmnySys:Storage:Atom');

function isRepositoryReady(repo) {
  return !!(repo?.initialized && repo?.db && repo.db.open !== false);
}

function isDatabaseClosedError(error) {
  return String(error?.message || '').includes('database connection is not open');
}

/**
 * Guarda un átomo en SQLite
 * @param {string} rootPath - Ruta del proyecto
 * @param {string} filePath - Ruta del archivo
 * @param {string} functionName - Nombre de la función
 * @param {Object} atomData - Datos del átomo
 */
export async function saveAtom(rootPath, filePath, functionName, atomData) {
  try {
    const repo = getRepository(rootPath);
    if (!isRepositoryReady(repo)) {
      return atomData.id;
    }
    repo.save(atomData);
    logger.debug(`[saveAtom] Saved to SQLite: ${atomData.id}`);
    return atomData.id;
  } catch (error) {
    if (isDatabaseClosedError(error)) {
      return atomData.id;
    }

    logger.error(`[saveAtom] SQLite error: ${error.message}`);
    throw error;
  }
}

/**
 * Carga átomos de un archivo desde SQLite
 * @param {string} rootPath - Ruta del proyecto
 * @param {string} filePath - Ruta del archivo
 * @param {Object} options - Opciones
 */
export async function loadAtoms(rootPath, filePath, options = {}) {
  const { includeRemoved = false } = options;

  try {
    const repo = getRepository(rootPath);
    if (!isRepositoryReady(repo)) {
      return [];
    }
    const normalizedPath = normalizeFilePath(rootPath, filePath);
    let atoms = repo.getByFile(normalizedPath);

    if (!includeRemoved) {
      atoms = atoms.filter(a => a && a.lineage?.status !== 'removed' && !a.is_dead_code);
    }

    return atoms;
  } catch (error) {
    if (isDatabaseClosedError(error)) {
      return [];
    }

    logger.error(`[loadAtoms] SQLite error: ${error.message}`);
    return [];
  }
}

/**
 * Obtiene todos los átomos desde SQLite
 * @param {string} rootPath - Ruta del proyecto
 * @param {Object} options - Opciones
 */
export async function getAllAtoms(rootPath, { includeRemoved = false } = {}) {
  try {
    const repo = getRepository(rootPath);
    if (!isRepositoryReady(repo)) {
      return [];
    }
    const atoms = repo.getAll();

    if (!includeRemoved) {
      // rowToAtom maps is_dead_code → isDeadCode (camelCase)
      return atoms.filter(a => a && a.lineage?.status !== 'removed' && !a.isDeadCode);
    }

    return atoms;
  } catch (error) {
    if (isDatabaseClosedError(error)) {
      return [];
    }

    logger.error(`[getAllAtoms] SQLite error: ${error.message}`);
    return [];
  }
}

/**
 * Carga SOLO los átomos removidos desde SQLite
 */
export async function getRemovedAtoms(rootPath, filePath = null) {
  try {
    const repo = getRepository(rootPath);
    if (!isRepositoryReady(repo)) {
      return [];
    }
    const atoms = repo.query({
      isDeadCode: true
    });

    if (filePath) {
      return atoms.filter(a => (a.filePath || a.file_path || '').includes(filePath));
    }

    return atoms;
  } catch (error) {
    if (isDatabaseClosedError(error)) {
      return [];
    }

    logger.error(`[getRemovedAtoms] SQLite error: ${error.message}`);
    return [];
  }
}

/**
 * Query flexible de átomos en SQLite
 * @param {string} rootPath - Ruta del proyecto
 * @param {Object} filter - Filtros
 * @param {number} limit - Límite de resultados
 */
export async function queryAtoms(rootPath, filter = {}, limit = null) {
  try {
    const repo = getRepository(rootPath);
    if (!isRepositoryReady(repo)) {
      return [];
    }
    return repo.query(filter, { limit });
  } catch (error) {
    if (isDatabaseClosedError(error)) {
      return [];
    }

    logger.error(`[queryAtoms] SQLite error: ${error.message}`);
    return [];
  }
}

/**
 * Elimina un átomo de SQLite
 */
export async function deleteAtom(rootPath, filePath, functionName) {
  try {
    const repo = getRepository(rootPath);
    if (!isRepositoryReady(repo)) {
      return false;
    }
    const id = `${filePath}::${functionName}`;
    return repo.delete(id);
  } catch (error) {
    if (isDatabaseClosedError(error)) {
      return false;
    }

    logger.error(`[deleteAtom] SQLite error: ${error.message}`);
    return false;
  }
}

// Helper functions
function normalizeFilePath(rootPath, filePath) {
  const normalizedFilePath = filePath.replace(/\\/g, '/');
  const normalizedRootPath = rootPath.replace(/\\/g, '/');

  if (path.isAbsolute(filePath) && normalizedFilePath.startsWith(normalizedRootPath)) {
    return path.relative(rootPath, filePath).replace(/\\/g, '/');
  }

  return normalizedFilePath;
}

/**
 * Obtiene átomos async desde SQLite
 */
export async function getAsyncAtoms(rootPath) {
  return await queryAtoms(rootPath, { isAsync: true });
}

// DEAD CODE REMOVED: getExportedAtoms, getAtomsByArchetype, getAtomsByPurpose, getComplexAtoms

/**
 * Obtiene átomos en un archivo
 */
export async function getAtomsInFile(rootPath, filePath) {
  return await loadAtoms(rootPath, filePath);
}

/**
 * Busca átomos por nombre en SQLite
 */
export async function getAtomsByName(rootPath, name) {
  const repo = getRepository(rootPath);
  if (!isRepositoryReady(repo)) {
    return [];
  }
  return repo.findByName(name);
}
