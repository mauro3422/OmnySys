/**
 * @fileoverview file-query.js
 * 
 * Consultas a nivel de archivo
 *
 * ARCHITECTURE: Layer C (Data Access Layer)
 * Abstracts storage details and provides unified interface to atomic/molecular data
 *
 * ═══════════════════════════════════════════════════════════════════════════════
 * 📋 EXTENSION GUIDE - Adding New Query Functions
 * ═══════════════════════════════════════════════════════════════════════════════
 *
 * To add a new way to query project data:
 *
 * ═══════════════════════════════════════════════════════════════════════════════
 * OPTION A: New File-Level Query
 * ═══════════════════════════════════════════════════════════════════════════════
 *
 * Use when adding new ways to retrieve or filter file data.
 *
 * 1️⃣  ADD FUNCTION to this file (after existing functions, line ~190+)
 *
 *     /**
 *      * Finds all files that have a specific archetype
 *      * Used by: Risk assessment tools, refactoring suggestions
 *      * 
 *      * @param {string} rootPath - Project root path
 *      * @param {string} archetypeType - Archetype to search for (e.g., 'god-object')
 *      * @param {object} [cache] - Optional cache manager
 *      * @returns {Promise<Array>} - Files with that archetype
 *      * /
 *     export async function findFilesByArchetype(rootPath, archetypeType, cache = null) {
 *       // Get all analyzed files
 *       const { getAnalyzedFiles } = await import('./project-query.js');
 *       const allFiles = await getAnalyzedFiles(rootPath);
 *       
 *       // Filter by archetype
 *       const matchingFiles = [];
 *       
 *       for (const filePath of allFiles) {
 *         // Use cache if available
 *         let derived;
 *         if (cache) {
 *           const cached = cache.getDerivedMetadata(filePath);
 *           derived = cached?.derived;
 *         }
 *         
 *         // Fallback to computing derivation
 *         if (!derived) {
 *           const data = await getFileAnalysisWithAtoms(rootPath, filePath, cache);
 *           derived = data?.derived;
 *         }
 *         
 *         if (derived?.archetype?.type === archetypeType) {
 *           matchingFiles.push({
 *             filePath,
 *             archetype: derived.archetype,
 *             stats: derived  // include other useful data
 *           });
 *         }
 *       }
 *       
 *       return matchingFiles;
 *     }
 *
 * 2️⃣  EXPORT from index.js (src/layer-a-static/query/index.js):
 *
 *     export {
 *       // ... existing exports ...
 *       findFilesByArchetype,  // NEW
 *     } from './queries/file-query.js';
 *
 * 3️⃣  USE in tools or other consumers:
 *
 *     import { findFilesByArchetype } from '#layer-a/query/index.js';
 *     
 *     const godObjects = await findFilesByArchetype(projectPath, 'god-object', cache);
 *
 * ═══════════════════════════════════════════════════════════════════════════════
 * OPTION B: New Atom-Level Query
 * ═══════════════════════════════════════════════════════════════════════════════
 *
 * Use when you need to query across all functions in the project.
 *
 *     /**
 *      * Finds all atoms with a specific property across the project
 *      * Example: Find all async functions that make network calls
 *      * 
 *      * @param {string} rootPath - Project root
 *      * @param {Function} predicate - Filter function (atom) => boolean
 *      * @returns {Promise<Array>} - Matching atoms with file context
 *      * /
 *     export async function findAtomsWhere(rootPath, predicate) {
 *       const allFiles = await getAnalyzedFiles(rootPath);
 *       const matches = [];
 *       
 *       for (const filePath of allFiles) {
 *         const atoms = await loadAtoms(rootPath, filePath);
 *         
 *         for (const atom of atoms) {
 *           if (predicate(atom)) {
 *             matches.push({
 *               ...atom,
 *               filePath  // Add context
 *             });
 *           }
 *         }
 *       }
 *       
 *       return matches;
 *     }
 *
 *     // Usage:
 *     const riskyAsync = await findAtomsWhere(atom => 
 *       atom.isAsync && atom.hasNetworkCalls && !atom.hasErrorHandling
 *     );
 *
 * ═══════════════════════════════════════════════════════════════════════════════
 * OPTION C: Create New Query Module
 * ═══════════════════════════════════════════════════════════════════════════════
 *
 * For complex query domains (e.g., test-queries.js, security-queries.js):
 *
 * 1️⃣  CREATE FILE in: src/layer-a-static/query/queries/your-queries.js
 *
 * 2️⃣  EXPORT from index.js:
 *
 *     export * from './queries/your-queries.js';
 *
 * ═══════════════════════════════════════════════════════════════════════════════
 * ⚠️  PRINCIPLES TO MAINTAIN
 * ═══════════════════════════════════════════════════════════════════════════════
 *
 * ✓ SSOT: Use storage-manager.js for all file system operations
 *   BAD: fs.readFile(path.join(rootPath, '.omnysysdata', ...))
 *   GOOD: loadAtoms(rootPath, filePath)
 *
 * ✓ Cache-friendly: Accept optional cache parameter, use it when available
 *   Pattern: if (cache) { cached = cache.getX() } else { load from disk }
 *
 * ✓ Derivation on-demand: Use composeMolecularMetadata() when molecular data needed
 *   Don't duplicate derivation logic - that's in derivation-engine.js
 *
 * ✓ Graceful degradation: Return empty arrays/null instead of throwing
 *   Always handle "file not found" or "not analyzed yet" cases
 *
 * ✓ Layer C only: Only READ data, never WRITE or MODIFY
 *   Writing is done by: molecular-extractor.js, storage-manager.js
 *
 * 📊  PERFORMANCE NOTES:
 *     - Loading atoms from disk: ~1-5ms per file
 *     - Derivation: ~0.1-1ms per file (use cache!)
 *     - For bulk queries: Consider loading all atoms once, then filtering
 *
 * 🔗  QUERY LAYER ARCHITECTURE:
 *     readers/        - Low-level JSON reading
 *     queries/        - Domain-specific queries (this file)
 *     index.js        - Public API facade
 *
 * ═══════════════════════════════════════════════════════════════════════════════
 *
 * @module query/queries/file-query
 * @phase Layer C (Data Access)
 * @dependencies storage-manager.js, derivation-engine.js
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
  
  // 🆕 FIX: Normalizar filePath para que sea relativo
  let normalizedPath = filePath;
  // Normalizar separadores de path para comparación cross-platform
  const normalizedFilePath = filePath.replace(/\\/g, '/');
  const normalizedRootPath = rootPath.replace(/\\/g, '/');
  
  if (path.isAbsolute(filePath) && normalizedFilePath.startsWith(normalizedRootPath)) {
    normalizedPath = path.relative(rootPath, filePath);
  }
  
  // Storage-manager saves to: .omnysysdata/files/{dir}/{filename}.json
  const filePart = path.join(dataPath, 'files', normalizedPath + '.json');
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
