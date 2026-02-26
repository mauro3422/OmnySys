import path from 'path';
import { gracefulWriteFile, gracefulMkdir, gracefulReadFile, gracefulReaddir } from './graceful-write.js';
import { getRepository } from '../repository/index.js';
import { createLogger } from '#utils/logger.js';

const logger = createLogger('OmnySys:Storage:Atom');

const DATA_DIR = '.omnysysdata';

// Feature flag: usar SQLite o JSON
// Default: SQLite (ahora compilado y funcionando)
const USE_SQLITE = process.env.OMNY_SQLITE !== 'false';

function sanitizeFileName(name) {
  return name
    .replace(/[<>:"/\\|?*]/g, '_')
    .replace(/\s+/g, '_')
    .replace(/_{2,}/g, '_')
    .substring(0, 200);
}

/**
 * Guarda un átomo
 * Usa SQLite si OMNY_SQLITE=true, sino JSON legacy
 * Mantiene API async para compatibilidad
 */
export async function saveAtom(rootPath, filePath, functionName, atomData) {
  if (USE_SQLITE) {
    try {
      const repo = getRepository(rootPath);
      repo.save(atomData); // Sync
      logger.debug(`[saveAtom] Saved to SQLite: ${atomData.id}`);
      return atomData.id;
    } catch (error) {
      logger.error(`[saveAtom] SQLite error: ${error.message}`);
      throw error;
    }
  }

  // Legacy JSON
  const dataPath = path.join(rootPath, DATA_DIR);
  const atomsDir = path.join(dataPath, 'atoms');
  const fileDir = path.dirname(filePath);
  const fileName = path.basename(filePath, path.extname(filePath));
  const targetDir = path.join(atomsDir, fileDir, fileName);
  const safeFunctionName = sanitizeFileName(functionName);
  const targetPath = path.join(targetDir, `${safeFunctionName}.json`);

  try {
    await gracefulMkdir(targetDir, { recursive: true });
    const jsonContent = JSON.stringify(atomData, null, 2);
    await gracefulWriteFile(targetPath, jsonContent, 'utf-8');
    return targetPath;
  } catch (error) {
    console.error(`❌ Error saving atom ${filePath}::${functionName}:`, error.message);
    throw error;
  }
}

/**
 * Carga átomos de un archivo
 * Usa SQLite si OMNY_SQLITE=true, sino JSON legacy
 * @param {string} rootPath - Ruta del proyecto
 * @param {string} filePath - Ruta del archivo
 * @param {Object} options - Opciones
 * @param {boolean} options.includeRemoved - Incluir átomos marcados como eliminados
 */
export async function loadAtoms(rootPath, filePath, options = {}) {
  const { includeRemoved = false } = options;
  
  if (USE_SQLITE) {
    try {
      const repo = getRepository(rootPath);
      const normalizedPath = normalizeFilePath(rootPath, filePath);
      let atoms = repo.getByFile(normalizedPath); // Sync
      
      if (!includeRemoved) {
        atoms = atoms.filter(a => a.lineage?.status !== 'removed');
      }
      
      return atoms;
    } catch (error) {
      logger.error(`[loadAtoms] SQLite error: ${error.message}`);
      return [];
    }
  }

  // Legacy JSON
  const dataPath = path.join(rootPath, DATA_DIR);
  const atomsDir = path.join(dataPath, 'atoms');

  let normalizedPath = filePath;
  const normalizedFilePath = filePath.replace(/\\/g, '/');
  const normalizedRootPath = rootPath.replace(/\\/g, '/');

  if (path.isAbsolute(filePath) && normalizedFilePath.startsWith(normalizedRootPath)) {
    normalizedPath = path.relative(rootPath, filePath);
  }

  const fileDir = path.dirname(normalizedPath);
  const fileName = path.basename(normalizedPath, path.extname(normalizedPath));
  const targetDir = path.join(atomsDir, fileDir, fileName);

  try {
    const files = await gracefulReaddir(targetDir);
    const atoms = [];

    for (const file of files) {
      if (file.endsWith('.json')) {
        const content = await gracefulReadFile(path.join(targetDir, file));
        atoms.push(JSON.parse(content));
      }
    }

    return atoms;
  } catch {
    return [];
  }
}

/**
 * Obtiene todos los átomos
 * Usa SQLite si OMNY_SQLITE=true, sino JSON legacy
 */
export async function getAllAtoms(rootPath, { includeRemoved = false } = {}) {
  if (USE_SQLITE) {
    try {
      const repo = getRepository(rootPath);
      const atoms = repo.getAll(); // Sync

      if (!includeRemoved) {
        return atoms.filter(a => a.lineage?.status !== 'removed');
      }

      return atoms;
    } catch (error) {
      logger.error(`[getAllAtoms] SQLite error: ${error.message}`);
      return [];
    }
  }

  // Legacy JSON (no se usa con SQLite por defecto)
  const atomsDir = path.join(rootPath, DATA_DIR, 'atoms');
  const atoms = [];

  async function scanDir(dir) {
    try {
      const entries = await gracefulReaddir(dir, { withFileTypes: true });
      for (const entry of entries) {
        const fullPath = path.join(dir, entry.name);
        if (entry.isDirectory()) {
          await scanDir(fullPath);
        } else if (entry.isFile() && entry.name.endsWith('.json')) {
          try {
            const content = await gracefulReadFile(fullPath);
            const atom = JSON.parse(content);
            if (includeRemoved || atom.lineage?.status !== 'removed') {
              atoms.push(atom);
            }
          } catch {
          }
        }
      }
    } catch {
    }
  }

  await scanDir(atomsDir);
  return atoms;
}

/**
 * Carga SOLO los átomos removidos
 */
export async function getRemovedAtoms(rootPath, filePath = null) {
  if (USE_SQLITE) {
    try {
      const repo = getRepository(rootPath);
      const atoms = repo.query({
        isDeadCode: true
      });

      if (filePath) {
        return atoms.filter(a => a.filePath?.includes(filePath));
      }

      return atoms;
    } catch (error) {
      logger.error(`[getRemovedAtoms] SQLite error: ${error.message}`);
      return [];
    }
  }

  // Legacy JSON (no se usa con SQLite por defecto)
  const atomsDir = path.join(rootPath, DATA_DIR, 'atoms');
  const atoms = [];

  async function scanDir(dir) {
    try {
      const entries = await gracefulReaddir(dir, { withFileTypes: true });
      for (const entry of entries) {
        const fullPath = path.join(dir, entry.name);
        if (entry.isDirectory()) {
          await scanDir(fullPath);
        } else if (entry.isFile() && entry.name.endsWith('.json')) {
          try {
            const content = await gracefulReadFile(fullPath);
            const atom = JSON.parse(content);
            if (atom.lineage?.status === 'removed') {
              if (!filePath || (atom.filePath || atom.file || '').includes(filePath)) {
                atoms.push(atom);
              }
            }
          } catch {
          }
        }
      }
    } catch {
    }
  }

  await scanDir(atomsDir);
  return atoms;
}

/**
 * Query flexible de átomos
 * Usa SQLite si OMNY_SQLITE=true, sino JSON legacy
 */
export async function queryAtoms(rootPath, filter = {}, limit = null) {
  if (USE_SQLITE) {
    try {
      const repo = getRepository(rootPath);
      return repo.query(filter, { limit }); // Sync
    } catch (error) {
      logger.error(`[queryAtoms] SQLite error: ${error.message}`);
      return [];
    }
  }

  // Legacy JSON (no se usa con SQLite por defecto)
  const atomsDir = path.join(rootPath, DATA_DIR, 'atoms');
  const results = [];
  const maxResults = limit === null ? Infinity : limit;

  async function scanAndFilter(dir) {
    if (results.length >= maxResults) return;

    try {
      const entries = await gracefulReaddir(dir, { withFileTypes: true });

      for (const entry of entries) {
        if (results.length >= maxResults) break;

        const fullPath = path.join(dir, entry.name);

        if (entry.isDirectory()) {
          await scanAndFilter(fullPath);
        } else if (entry.isFile() && entry.name.endsWith('.json')) {
          try {
            const content = await gracefulReadFile(fullPath);
            const atom = JSON.parse(content);

            // Aplicar filtros
            if (matchesFilter(atom, filter)) {
              results.push(atom);
            }
          } catch {
          }
        }
      }
    } catch {
    }
  }

  await scanAndFilter(atomsDir);
  return results;
}

/**
 * Elimina un átomo
 */
export async function deleteAtom(rootPath, filePath, functionName) {
  if (USE_SQLITE) {
    try {
      const repo = getRepository(rootPath);
      const id = `${filePath}::${functionName}`;
      return repo.delete(id); // Sync
    } catch (error) {
      logger.error(`[deleteAtom] SQLite error: ${error.message}`);
      return false;
    }
  }

  // Legacy JSON
  const dataPath = path.join(rootPath, DATA_DIR);
  const atomsDir = path.join(dataPath, 'atoms');
  const fileDir = path.dirname(filePath);
  const fileName = path.basename(filePath, path.extname(filePath));
  const targetDir = path.join(atomsDir, fileDir, fileName);
  const safeFunctionName = sanitizeFileName(functionName);
  const targetPath = path.join(targetDir, `${safeFunctionName}.json`);

  try {
    const fs = await import('fs/promises');
    await fs.unlink(targetPath);
    return true;
  } catch {
    return false;
  }
}

// Helper functions
function normalizeFilePath(rootPath, filePath) {
  let normalizedPath = filePath;
  const normalizedFilePath = filePath.replace(/\\/g, '/');
  const normalizedRootPath = rootPath.replace(/\\/g, '/');

  if (path.isAbsolute(filePath) && normalizedFilePath.startsWith(normalizedRootPath)) {
    normalizedPath = path.relative(rootPath, filePath);
  }
  
  return normalizedPath;
}

function matchesFilter(atom, filter) {
  if (filter.atomType && atom.type !== filter.atomType) return false;
  if (filter.archetype && atom.archetype?.type !== filter.archetype) return false;
  if (filter.purpose && atom.purpose !== filter.purpose) return false;
  if (filter.isExported !== undefined && atom.isExported !== filter.isExported) return false;
  if (filter.isAsync !== undefined && atom.isAsync !== filter.isAsync) return false;
  if (filter.minComplexity && atom.complexity < filter.minComplexity) return false;
  if (filter.maxComplexity && atom.complexity > filter.maxComplexity) return false;
  if (filter.filePath && !(atom.file || atom.filePath)?.includes(filter.filePath)) return false;
  
  return true;
}

// Funciones adicionales exportadas por index.js

/**
 * Obtiene átomos async
 * @param {string} rootPath - Ruta del proyecto
 * @returns {Promise<Array>} Átomos async
 */
export async function getAsyncAtoms(rootPath) {
  return await queryAtoms(rootPath, { isAsync: true });
}

// DEAD CODE REMOVED: getExportedAtoms, getAtomsByArchetype, getAtomsByPurpose, getComplexAtoms

/**
 * Obtiene átomos en un archivo
 * Alias de loadAtoms para consistencia
 * @param {string} rootPath - Ruta del proyecto
 * @param {string} filePath - Ruta del archivo
 * @returns {Promise<Array>} Átomos en el archivo
 */
export async function getAtomsInFile(rootPath, filePath) {
  return await loadAtoms(rootPath, filePath);
}

/**
 * Busca átomos por nombre
 * @param {string} rootPath - Ruta del proyecto
 * @param {string} name - Nombre a buscar
 * @returns {Promise<Array>} Átomos encontrados
 */
export async function getAtomsByName(rootPath, name) {
  const repo = getRepository(rootPath);
  if (USE_SQLITE) {
    return repo.findByName(name);
  }
  // Legacy JSON
  const allAtoms = await getAllAtoms(rootPath);
  return allAtoms.filter(a => a.name?.toLowerCase().includes(name.toLowerCase()));
}