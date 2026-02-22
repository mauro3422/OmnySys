import fs from 'fs/promises';
import path from 'path';

console.log('🔥 ATOM.JS MODULE LOADED - Version with logs');

const DATA_DIR = '.omnysysdata';

/**
 * Guarda el análisis atómico de una función
 *
 * @param {string} rootPath - Raíz del proyecto
 * @param {string} filePath - Ruta relativa del archivo
 * @param {string} functionName - Nombre de la función
 * @param {object} atomData - Metadata del átomo
 * @returns {string} - Ruta del archivo guardado
 */
/**
 * Sanitiza un nombre para usarlo como nombre de archivo seguro
 * @param {string} name - Nombre a sanitizar
 * @returns {string} Nombre seguro para archivo
 */
function sanitizeFileName(name) {
  // Reemplazar caracteres inválidos en Windows/Linux/Mac
  return name
    .replace(/[<>:"/\\|?*]/g, '_')  // Caracteres inválidos en Windows
    .replace(/\s+/g, '_')             // Espacios
    .replace(/_{2,}/g, '_')           // Múltiples underscores
    .substring(0, 200);               // Limitar longitud
}

export async function saveAtom(rootPath, filePath, functionName, atomData) {
  try {
    const dataPath = path.join(rootPath, DATA_DIR);

    // Crear directorio atoms/ si no existe
    const atomsDir = path.join(dataPath, 'atoms');
    await fs.mkdir(atomsDir, { recursive: true });

    // Crear estructura: atoms/{filePath}/{functionName}.json
    const fileDir = path.dirname(filePath);
    const fileName = path.basename(filePath, path.extname(filePath));
    const targetDir = path.join(atomsDir, fileDir, fileName);
    await fs.mkdir(targetDir, { recursive: true });

    // 🆕 Sanitizar nombre de función para nombre de archivo seguro
    const safeFunctionName = sanitizeFileName(functionName);
    const targetPath = path.join(targetDir, `${safeFunctionName}.json`);

    await fs.writeFile(targetPath, JSON.stringify(atomData, null, 2));
    
    console.log(`💾 Atom saved: ${targetPath}`);

    return targetPath;
  } catch (error) {
    console.error(`❌ Error saving atom ${filePath}::${functionName}:`, error.message);
    throw error;
  }
}

/**
 * Carga todos los átomos de un archivo
 *
 * @param {string} rootPath - Raíz del proyecto
 * @param {string} filePath - Ruta relativa del archivo
 * @returns {array} - Array de atoms
 */
export async function loadAtoms(rootPath, filePath) {
  const dataPath = path.join(rootPath, DATA_DIR);
  const atomsDir = path.join(dataPath, 'atoms');

  // 🆕 FIX: Normalizar filePath para que sea relativo al rootPath
  let normalizedPath = filePath;
  // Normalizar separadores de path para comparación cross-platform
  const normalizedFilePath = filePath.replace(/\\/g, '/');
  const normalizedRootPath = rootPath.replace(/\\/g, '/');

  if (path.isAbsolute(filePath) && normalizedFilePath.startsWith(normalizedRootPath)) {
    normalizedPath = path.relative(rootPath, filePath);
  }

  const fileDir = path.dirname(normalizedPath);
  const fileName = path.basename(normalizedPath, path.extname(normalizedPath));
  const targetDir = path.join(atomsDir, fileDir, fileName);

  try {
    const files = await fs.readdir(targetDir);
    const atoms = [];

    for (const file of files) {
      if (file.endsWith('.json')) {
        const content = await fs.readFile(path.join(targetDir, file), 'utf-8');
        atoms.push(JSON.parse(content));
      }
    }

    return atoms;
  } catch {
    return [];
  }
}

/**
 * Carga TODOS los átomos del proyecto
 * Por defecto excluye atoms con lineage.status='removed' (históricos).
 *
 * @param {string} rootPath - Raíz del proyecto
 * @param {object} options
 * @param {boolean} options.includeRemoved - Si true, incluye atoms removidos. Default: false
 * @returns {array} - Array de todos los atoms activos
 */
export async function getAllAtoms(rootPath, { includeRemoved = false } = {}) {
  const atomsDir = path.join(rootPath, DATA_DIR, 'atoms');
  const atoms = [];

  async function scanDir(dir) {
    try {
      const entries = await fs.readdir(dir, { withFileTypes: true });
      for (const entry of entries) {
        const fullPath = path.join(dir, entry.name);
        if (entry.isDirectory()) {
          await scanDir(fullPath);
        } else if (entry.isFile() && entry.name.endsWith('.json')) {
          try {
            const content = await fs.readFile(fullPath, 'utf-8');
            const atom = JSON.parse(content);
            if (includeRemoved || atom.lineage?.status !== 'removed') {
              atoms.push(atom);
            }
          } catch {
            // Skip malformed files
          }
        }
      }
    } catch {
      // Directory doesn't exist or can't be read
    }
  }

  await scanDir(atomsDir);
  return atoms;
}

/**
 * Carga SOLO los átomos removidos (historial de funciones eliminadas).
 * Útil para detectar código duplicado antes de escribir algo nuevo.
 *
 * @param {string} rootPath - Raíz del proyecto
 * @param {string} [filePath] - Filtrar por archivo específico (opcional)
 * @returns {array} - Array de atoms removidos
 */
export async function getRemovedAtoms(rootPath, filePath = null) {
  const atomsDir = path.join(rootPath, DATA_DIR, 'atoms');
  const atoms = [];

  async function scanDir(dir) {
    try {
      const entries = await fs.readdir(dir, { withFileTypes: true });
      for (const entry of entries) {
        const fullPath = path.join(dir, entry.name);
        if (entry.isDirectory()) {
          await scanDir(fullPath);
        } else if (entry.isFile() && entry.name.endsWith('.json')) {
          try {
            const content = await fs.readFile(fullPath, 'utf-8');
            const atom = JSON.parse(content);
            if (atom.lineage?.status === 'removed') {
              if (!filePath || (atom.filePath || atom.file || '').includes(filePath)) {
                atoms.push(atom);
              }
            }
          } catch {
            // Skip malformed files
          }
        }
      }
    } catch {
      // Directory doesn't exist or can't be read
    }
  }

  await scanDir(atomsDir);
  return atoms;
}

/**
 * Consulta ATÓMICA selectiva: filtra átomos SIN cargar todos en memoria.
 * Usa early-exit para escalar a proyectos grandes (1M+ átomos).
 * 
 * @param {string} rootPath - Raíz del proyecto
 * @param {Object} filter - Criterios de filtro (todos opcionales)
 * @param {boolean} filter.isAsync - Solo async
 * @param {boolean} filter.isExported - Solo exportados
 * @param {string} filter.archetype - Filtrar por archetype
 * @param {string} filter.purpose - Filtrar por purpose
 * @param {number} filter.minComplexity - Complejidad mínima
 * @param {string} filter.filePath - Contiene esta ruta
 * @param {string} filter.name - Nombre exacto del átomo
 * @param {number} limit - Máximo a retornar (default: 1000)
 * @returns {Promise<Array>} Átomos que pasan el filtro
 */
export async function queryAtoms(rootPath, filter = {}, limit = 1000) {
  const atomsDir = path.join(rootPath, DATA_DIR, 'atoms');
  const results = [];
  
  async function scanAndFilter(dir) {
    if (results.length >= limit) return;
    
    try {
      const entries = await fs.readdir(dir, { withFileTypes: true });
      
      for (const entry of entries) {
        if (results.length >= limit) break;
        
        const fullPath = path.join(dir, entry.name);
        
        if (entry.isDirectory()) {
          await scanAndFilter(fullPath);
        } else if (entry.isFile() && entry.name.endsWith('.json')) {
          try {
            const content = await fs.readFile(fullPath, 'utf-8');
            const atom = JSON.parse(content);
            
            if (filter.isAsync !== undefined && atom.isAsync !== filter.isAsync) continue;
            if (filter.isExported !== undefined && atom.isExported !== filter.isExported) continue;
            if (filter.archetype && atom.archetype?.type !== filter.archetype) continue;
            if (filter.purpose && atom.purpose !== filter.purpose) continue;
            if (filter.minComplexity !== undefined && (atom.complexity || 0) < filter.minComplexity) continue;
            if (filter.filePath && !atom.filePath?.includes(filter.filePath)) continue;
            if (filter.name && atom.name !== filter.name) continue;
            if (atom.lineage?.status === 'removed') continue;
            
            results.push(atom);
          } catch {
            // Skip malformed
          }
        }
      }
    } catch {
      // Directory error
    }
  }
  
  await scanAndFilter(atomsDir);
  return results;
}

/**
 * Atajos optimizados para queries frecuentes.
 * Usar estos en lugar de getAllAtoms() cuando sea posible.
 */

export async function getAsyncAtoms(rootPath, limit = 2000) {
  return queryAtoms(rootPath, { isAsync: true }, limit);
}

export async function getExportedAtoms(rootPath, limit = 3000) {
  return queryAtoms(rootPath, { isExported: true }, limit);
}

export async function getAtomsByArchetype(rootPath, archetype, limit = 500) {
  return queryAtoms(rootPath, { archetype }, limit);
}

export async function getAtomsByPurpose(rootPath, purpose, limit = 500) {
  return queryAtoms(rootPath, { purpose }, limit);
}

export async function getComplexAtoms(rootPath, minComplexity = 15, limit = 200) {
  return queryAtoms(rootPath, { minComplexity }, limit);
}

export async function getAtomsInFile(rootPath, filePath, limit = 100) {
  return queryAtoms(rootPath, { filePath }, limit);
}

export async function getAtomsByName(rootPath, name, limit = 50) {
  return queryAtoms(rootPath, { name }, limit);
}
