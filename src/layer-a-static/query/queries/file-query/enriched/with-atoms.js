/**
 * @fileoverview Enriched file analysis with atoms and caching
 * @module query/queries/file-query/enriched/with-atoms
 */

import { getFileAnalysis } from '../core/single-file.js';
import { loadAtoms, loadMolecule } from '#core/storage/index.js';
import { composeMolecularMetadata } from '#shared/derivation-engine.js';

/**
 * Loads atoms with cache integration
 * @param {string} rootPath - Project root
 * @param {string} filePath - File path
 * @param {object} analysis - File analysis data
 * @param {object} [cache] - Optional cache manager
 * @returns {Promise<Array>} - Loaded atoms
 */
async function loadAtomsWithCache(rootPath, filePath, analysis, cache) {
  if (!cache || !analysis.atomIds || typeof cache.getAtoms !== 'function') {
    return loadAtoms(rootPath, filePath);
  }

  const { found, missing } = cache.getAtoms(analysis.atomIds);
  const atoms = Array.from(found.values());

  if (missing.length > 0) {
    const diskAtoms = await loadAtoms(rootPath, filePath);
    for (const atom of diskAtoms) {
      if (missing.includes(atom.id)) {
        if (typeof cache.setAtom === 'function') {
          cache.setAtom(atom.id, atom);
        }
        atoms.push(atom);
      }
    }
  }

  return atoms;
}

/**
 * Calculates atom statistics
 * @param {Array} atoms - File atoms
 * @param {object} derivedMetadata - Derived molecular metadata
 * @returns {object} - Statistics object
 */
function calculateStats(atoms, derivedMetadata) {
  return {
    totalAtoms: atoms.length,
    exportedAtoms: atoms.filter(a => a.isExported).length,
    deadAtoms: atoms.filter(a => a.archetype?.type === 'dead-function').length,
    hotPathAtoms: atoms.filter(a => a.archetype?.type === 'hot-path').length,
    fragileNetworkAtoms: atoms.filter(a => a.archetype?.type === 'fragile-network').length,
    totalComplexity: derivedMetadata.totalComplexity,
    averageComplexity: Math.round(derivedMetadata.totalComplexity / atoms.length * 10) / 10
  };
}

/**
 * Obtiene análisis de archivo con átomos enriquecidos
 * @param {string} rootPath - Raíz del proyecto
 * @param {string} filePath - Ruta relativa del archivo
 * @param {object} [cache] - Caché opcional (UnifiedCacheManager)
 * @returns {Promise<object>} - Datos completos + átomos + metadata derivada
 */
export async function getFileAnalysisWithAtoms(rootPath, filePath, cache = null) {
  const analysis = await getFileAnalysis(rootPath, filePath);
  if (!analysis) return null;

  if (cache && typeof cache.getDerivedMetadata === 'function') {
    const cached = cache.getDerivedMetadata(filePath);
    if (cached) {
      return { ...analysis, ...cached };
    }
  }

  const atoms = await loadAtomsWithCache(rootPath, filePath, analysis, cache);
  const molecule = await loadMolecule(rootPath, filePath);

  if (atoms.length === 0) {
    return {
      ...analysis,
      atoms: [],
      molecule: null,
      derived: null
    };
  }

  const derivedMetadata = composeMolecularMetadata(filePath, atoms);
  const stats = calculateStats(atoms, derivedMetadata);

  const result = {
    ...analysis,
    atoms,
    molecule,
    derived: derivedMetadata,
    stats
  };

  if (cache && typeof cache.setDerivedMetadata === 'function') {
    cache.setDerivedMetadata(filePath, {
      atoms,
      molecule,
      derived: derivedMetadata,
      stats
    });
  }

  return result;
}
