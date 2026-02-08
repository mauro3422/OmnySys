/**
 * @fileoverview file-query.js
 * 
 * Consultas a nivel de archivo
 * 
 * @module query/queries/file-query
 */

import path from 'path';
import { getDataDirectory, loadAtoms, loadMolecule } from '../../storage/storage-manager.js';
import { readJSON } from '../readers/json-reader.js';
import { composeMolecularMetadata } from '../../../shared/derivation-engine.js';

/**
 * Obtiene el análisis completo de un archivo específico
 * @param {string} rootPath - Raíz del proyecto
 * @param {string} filePath - Ruta relativa del archivo
 * @returns {Promise<object>} - Datos completos del archivo
 */
export async function getFileAnalysis(rootPath, filePath) {
  const dataPath = getDataDirectory(rootPath);
  
  // Storage-manager saves to: .omnysysdata/files/{dir}/{filename}.json
  const filePart = path.join(dataPath, 'files', filePath + '.json');
  return await readJSON(filePart);
}

/**
 * Obtiene análisis de múltiples archivos
 * @param {string} rootPath - Raíz del proyecto
 * @param {string[]} filePaths - Rutas de archivos
 * @returns {Promise<object[]>}
 */
export async function getMultipleFileAnalysis(rootPath, filePaths) {
  return Promise.all(
    filePaths.map(fp => getFileAnalysis(rootPath, fp).catch(() => null))
  );
}

/**
 * Obtiene dependencias de un archivo
 * @param {string} rootPath - Raíz del proyecto
 * @param {string} filePath - Ruta del archivo
 * @returns {Promise<string[]>}
 */
export async function getFileDependencies(rootPath, filePath) {
  const analysis = await getFileAnalysis(rootPath, filePath);
  return analysis?.imports?.map(imp => imp.source) || [];
}

/**
 * Obtiene dependientes de un archivo
 * @param {string} rootPath - Raíz del proyecto
 * @param {string} filePath - Ruta del archivo
 * @returns {Promise<string[]>}
 */
export async function getFileDependents(rootPath, filePath) {
  const analysis = await getFileAnalysis(rootPath, filePath);
  return analysis?.usedBy || [];
}

/**
 * Obtiene análisis de archivo con átomos enriquecidos
 * @param {string} rootPath - Raíz del proyecto
 * @param {string} filePath - Ruta relativa del archivo
 * @param {object} [cache] - Caché opcional (UnifiedCacheManager)
 * @returns {Promise<object>} - Datos completos + átomos + metadata derivada
 */
export async function getFileAnalysisWithAtoms(rootPath, filePath, cache = null) {
  // Obtener análisis base
  const analysis = await getFileAnalysis(rootPath, filePath);
  if (!analysis) return null;

  // Verificar caché de metadata derivada
  if (cache) {
    const cached = cache.getDerivedMetadata(filePath);
    if (cached) {
      return {
        ...analysis,
        ...cached
      };
    }
  }

  // Cargar átomos si existen (con caché si está disponible)
  let atoms = [];
  if (cache && analysis.atomIds) {
    // Intentar cargar desde caché primero
    const { found, missing } = cache.getAtoms(analysis.atomIds);
    atoms = Array.from(found.values());
    
    // Cargar los faltantes del disco y guardar en caché
    if (missing.length > 0) {
      const diskAtoms = await loadAtoms(rootPath, filePath);
      for (const atom of diskAtoms) {
        if (missing.includes(atom.id)) {
          cache.setAtom(atom.id, atom);
          atoms.push(atom);
        }
      }
    }
  } else {
    // Sin caché, cargar todo del disco
    atoms = await loadAtoms(rootPath, filePath);
  }
  
  const molecule = await loadMolecule(rootPath, filePath);

  // Si no hay átomos, retornar análisis base
  if (atoms.length === 0) {
    return {
      ...analysis,
      atoms: [],
      molecule: null,
      derived: null
    };
  }

  // Derivar metadata molecular desde átomos
  const derivedMetadata = composeMolecularMetadata(filePath, atoms);
  
  const result = {
    ...analysis,
    atoms,
    molecule,
    derived: derivedMetadata,
    // Agregar estadísticas útiles
    stats: {
      totalAtoms: atoms.length,
      exportedAtoms: atoms.filter(a => a.isExported).length,
      deadAtoms: atoms.filter(a => a.archetype?.type === 'dead-function').length,
      hotPathAtoms: atoms.filter(a => a.archetype?.type === 'hot-path').length,
      fragileNetworkAtoms: atoms.filter(a => a.archetype?.type === 'fragile-network').length,
      totalComplexity: derivedMetadata.totalComplexity,
      averageComplexity: Math.round(derivedMetadata.totalComplexity / atoms.length * 10) / 10
    }
  };
  
  // Guardar en caché si está disponible
  if (cache) {
    cache.setDerivedMetadata(filePath, {
      atoms,
      molecule,
      derived: derivedMetadata,
      stats: result.stats
    });
  }

  return result;
}

/**
 * Obtiene detalles de un átomo específico (función)
 * @param {string} rootPath - Raíz del proyecto
 * @param {string} filePath - Ruta del archivo
 * @param {string} functionName - Nombre de la función
 * @param {object} [cache] - Caché opcional (UnifiedCacheManager)
 * @returns {Promise<object|null>} - Átomo o null
 */
export async function getAtomDetails(rootPath, filePath, functionName, cache = null) {
  // Construir atomId
  const fileId = filePath.replace(/\\/g, '_').replace(/\//g, '_').replace(/\.[^.]+$/, '');
  const atomId = `${fileId}::${functionName}`;
  
  // Intentar caché primero
  if (cache) {
    const cached = cache.getAtom(atomId);
    if (cached) return cached;
  }
  
  // Cargar del disco
  const atoms = await loadAtoms(rootPath, filePath);
  const atom = atoms.find(a => a.name === functionName) || null;
  
  // Guardar en caché si se encontró
  if (atom && cache) {
    cache.setAtom(atomId, atom);
  }
  
  return atom;
}

/**
 * Busca átomos por arquetipo en todo el proyecto
 * @param {string} rootPath - Raíz del proyecto
 * @param {string} archetypeType - Tipo de arquetipo (e.g., 'dead-function', 'hot-path')
 * @returns {Promise<Array>} - Lista de átomos con ese arquetipo
 */
export async function findAtomsByArchetype(rootPath, archetypeType) {
  // TODO: Esto requeriría escanear todos los archivos
  // Por ahora, retornar array vacío
  return [];
}
