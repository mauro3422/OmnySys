import path from 'path';
import { gracefulWriteFile, gracefulMkdir, gracefulReadFile, gracefulReaddir } from './graceful-write.js';

const DATA_DIR = '.omnysysdata';

function sanitizeFileName(name) {
  return name
    .replace(/[<>:"/\\|?*]/g, '_')
    .replace(/\s+/g, '_')
    .replace(/_{2,}/g, '_')
    .substring(0, 200);
}

export async function saveAtom(rootPath, filePath, functionName, atomData) {
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

export async function loadAtoms(rootPath, filePath) {
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

export async function getAllAtoms(rootPath, { includeRemoved = false } = {}) {
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

export async function queryAtoms(rootPath, filter = {}, limit = 1000) {
  const atomsDir = path.join(rootPath, DATA_DIR, 'atoms');
  const results = [];
  
  async function scanAndFilter(dir) {
    if (results.length >= limit) return;
    
    try {
      const entries = await gracefulReaddir(dir, { withFileTypes: true });
      
      for (const entry of entries) {
        if (results.length >= limit) break;
        
        const fullPath = path.join(dir, entry.name);
        
        if (entry.isDirectory()) {
          await scanAndFilter(fullPath);
        } else if (entry.isFile() && entry.name.endsWith('.json')) {
          try {
            const content = await gracefulReadFile(fullPath);
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
