import path from 'path';
import { createLogger } from '../../utils/logger.js';

const logger = createLogger('OmnySys:analyze');
const DATA_DIR = '.omnysysdata';

import { parseFileFromDisk } from '../../layer-a-static/parser/index.js';
// saveFileAnalysis ya no se exporta de storage/index.js - los datos van directo a SQLite
// Esta función queda como stub para compatibilidad
const persistFileAnalysis = async () => { };
import { detectAllSemanticConnections } from '../../layer-a-static/extractors/static/index.js';
import { detectAllAdvancedConnections } from '../../layer-a-static/extractors/communication/index.js';
import { extractAllMetadata } from '../../layer-a-static/extractors/metadata/index.js';
import { extractMolecularStructure } from '../../layer-a-static/pipeline/molecular-extractor.js';
import { saveAtom, saveMolecule, loadAtoms } from '#layer-c/storage/index.js';
import { saveAtomsIncremental } from '#layer-c/storage/atoms/incremental-atom-saver.js';
import { invalidateAtomCaches } from '#layer-c/cache/smart-cache-invalidator.js';

import {
  _calculateContentHash,
  _detectChangeType,
  resolveAllImports,
  loadDependencySources,
  buildFileResult
} from './analyze-utils.js';

import {
  cleanupOrphanedAtomFiles,
  _markAtomAsRemoved
} from './cleanup.js';

export { _detectChangeType, _calculateContentHash };


import { handleRemovedAtoms, filterProtectedAtoms } from './analyze-logic.js';

/**
 * Analiza un archivo individual
 */
export async function analyzeFile(filePath, fullPath) {
  const parsed = await parseFileFromDisk(fullPath);
  if (!parsed) throw new Error('Failed to parse file');

  const resolvedImports = await resolveAllImports(parsed, fullPath, this.rootPath);
  const fileSourceCode = await loadDependencySources(resolvedImports, filePath, parsed.source || '', this.rootPath);

  const staticConnections = detectAllSemanticConnections(fileSourceCode);
  const advancedConnections = detectAllAdvancedConnections(fileSourceCode);

  const metadata = extractAllMetadata(filePath, parsed.source || '');
  const molecularStructure = extractMolecularStructure(filePath, parsed.source || '', parsed, metadata);
  const moleculeAtoms = molecularStructure?.atoms ?? [];

  // 1. Manejar átomos removidos
  const previousAtoms = await loadAtoms(this.rootPath, filePath, { includeRemoved: true });
  const newAtomNames = await handleRemovedAtoms(this.rootPath, filePath, moleculeAtoms, previousAtoms, _markAtomAsRemoved, saveAtom);

  // 2. Filtrar protegidos (Atomic Edit Protection)
  const { atomsToSave } = filterProtectedAtoms(moleculeAtoms, previousAtoms);

  // 3. Guardado incremental
  const saveResults = await saveAtomsIncremental(this.rootPath, filePath, atomsToSave, { source: 'file-watcher' });
  if (saveResults.updated > 0) {
    logger.info(`⚡ Incremental save: ${filePath} (${saveResults.updated} updated)`);
  }

  // 4. Limpieza de huérfanos e invalidación selectiva
  await cleanupOrphanedAtomFiles(this.rootPath, filePath, newAtomNames);

  const { AtomVersionManager } = await import('#layer-c/storage/atoms/atom-version-manager.js');
  const vm = new AtomVersionManager(this.rootPath);

  for (const atom of moleculeAtoms) {
    const atomId = `${filePath}::${atom.name}`;
    const changes = await vm.detectChanges(atomId, atom);
    if (changes.hasChanges && !changes.isNew) {
      await invalidateAtomCaches(atomId, changes.fields);
    }
  }

  await saveMolecule(this.rootPath, filePath, {
    filePath, type: 'molecule',
    atoms: moleculeAtoms.map(a => a.id),
    extractedAt: new Date().toISOString()
  });

  const contentHash = await _calculateContentHash(fullPath);
  return buildFileResult(filePath, parsed, resolvedImports, staticConnections, advancedConnections, metadata, moleculeAtoms, contentHash);
}

/**
 * Guarda análisis de archivo
 */
export async function saveFileAnalysis(filePath, analysis) {
  await persistFileAnalysis(this.rootPath, filePath, analysis);
}

/**
 * Actualiza índice en SQLite con información del archivo
 * Ya no escribe JSON
 */
export async function updateFileIndex(filePath, analysis) {
  // El índice ahora se maneja automáticamente vía SQLite
  // Los atoms se guardan directamente en la DB
  // No necesitamos mantener un index.json separado
}

/**
 * Remueve archivo del índice (no-op ya que SQLite maneja esto)
 */
export async function removeFromIndex(filePath) {
  // El índice ahora se maneja automáticamente vía SQLite
  // No necesitamos mantener un index.json separado
}

/**
 * Analiza archivo y actualiza índice (wrapper para handlers)
 * 
 * @param {string} filePath - Ruta relativa del archivo
 * @param {string} fullPath - Ruta completa del archivo
 * @param {boolean} isUpdate - Indica si es una actualización (no usado actualmente)
 * @returns {Promise<Object>} - Análisis del archivo
 */

export async function analyzeAndIndex(filePath, fullPath, isUpdate = false) {
  // 1. Analizar archivo
  const analysis = await analyzeFile.call(this, filePath, fullPath);

  // 2. Guardar análisis
  await saveFileAnalysis.call(this, filePath, analysis);

  // 3. Actualizar índice
  await updateFileIndex.call(this, filePath, analysis);

  return analysis;
}
