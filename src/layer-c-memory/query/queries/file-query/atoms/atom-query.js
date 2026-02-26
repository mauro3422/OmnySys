/**
 * @fileoverview Atom-level queries
 * @module query/queries/file-query/atoms/atom-query
 */

import fs from 'fs/promises';
import path from 'path';
import { loadAtoms } from '#layer-c/storage/index.js';
import { getFileAnalysis } from '../core/single-file.js';

const DATA_DIR = '.omnysysdata';

/**
 * Builds atom ID from file path and function name
 * @param {string} filePath - File path
 * @param {string} functionName - Function name
 * @returns {string} - Atom ID
 */
function buildAtomId(filePath, functionName) {
  const fileId = filePath.replace(/\\/g, '_').replace(/\//g, '_').replace(/\.[^.]+$/, '');
  return `${fileId}::${functionName}`;
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
  const atomId = buildAtomId(filePath, functionName);

  if (cache) {
    const cached = cache.getAtom(atomId);
    if (cached) return cached;
  }

  const atoms = await loadAtoms(rootPath, filePath);
  const atom = atoms.find(a => a.name === functionName) || null;

  if (atom) {
    // BACKWARD COMPATIBILITY: Migración Tree-Sitter
    // Tree-Sitter extrae params como string[], pero varios test-generators antiguos
    // esperan que existan en atom.dataFlow.inputs como objetos con type.
    if (!atom.dataFlow) atom.dataFlow = {};
    if (!atom.dataFlow.inputs || atom.dataFlow.inputs.length === 0) {
      if (atom.params && atom.params.length > 0) {
        atom.dataFlow.inputs = atom.params.map(p => ({ name: p, type: 'unknown' }));
      }
    }

    // BACKWARD COMPATIBILITY: Attach file-level imports to the atom
    // This allows test generators to resolve vi.mock() accurately using atom.imports
    if (!atom.imports) {
      try {
        const fileData = await getFileAnalysis(rootPath, filePath);
        atom.imports = fileData?.imports || [];
      } catch (err) {
        atom.imports = [];
      }
    }
  }

  if (atom && cache) {
    cache.setAtom(atomId, atom);
  }

  return atom;
}

/**
 * Recursively collect all .json files under a directory.
 * @param {string} dir
 * @returns {Promise<string[]>}
 */
async function walkJsonFiles(dir) {
  const results = [];
  let entries;
  try {
    entries = await fs.readdir(dir, { withFileTypes: true });
  } catch {
    return results;
  }
  for (const entry of entries) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      results.push(...await walkJsonFiles(full));
    } else if (entry.isFile() && entry.name.endsWith('.json')) {
      results.push(full);
    }
  }
  return results;
}

/**
 * Busca átomos por arquetipo en todo el proyecto
 * @param {string} rootPath - Raíz del proyecto
 * @param {string} archetypeType - Tipo de arquetipo (e.g., 'dead-function', 'hot-path')
 * @returns {Promise<Array>} - Lista de átomos con ese arquetipo
 */
export async function findAtomsByArchetype(rootPath, archetypeType) {
  const atomsDir = path.join(rootPath, DATA_DIR, 'atoms');
  const jsonFiles = await walkJsonFiles(atomsDir);

  const matches = [];
  for (const filePath of jsonFiles) {
    try {
      const content = await fs.readFile(filePath, 'utf-8');
      const atom = JSON.parse(content);
      const atomArchetype = atom.archetype || atom.metadata?.archetype;
      if (atomArchetype?.type === archetypeType) {
        matches.push(atom);
      }
    } catch {
      // Archivo corrupto o no es un átomo válido — ignorar
    }
  }

  return matches;
}
