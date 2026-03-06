import path from 'path';
import { createLogger } from '../../utils/logger.js';

const logger = createLogger('OmnySys:analyze');
const DATA_DIR = '.omnysysdata';

import { parseFileFromDisk } from '../../layer-a-static/parser/index.js';
// Esta función queda como stub para compatibilidad
const persistFileAnalysis = async () => { };
import { analyzeFileCore, calculateShadowVolume } from '../../layer-a-static/pipeline/core-analyzer.js';
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
  try {
    const parsed = await parseFileFromDisk(fullPath);
    if (!parsed) throw new Error('Failed to parse file');

    // Unified Analysis Core
    const result_core = await analyzeFileCore(filePath, this.rootPath, {
      depth: 'deep', // Real-time is always deep for context, but skeleton is for initial project scan
      source: parsed.source
    });

    const moleculeAtoms = result_core.atoms;
    const metadata = result_core.metadata;

    // Shadow Volume Calculation
    const shadowStats = calculateShadowVolume(parsed.source, moleculeAtoms);
    metadata.shadowVolume = shadowStats.percentage;
    metadata.unindexedLines = shadowStats.unindexedLines;

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
        await invalidateAtomCaches(atomId, changes.fields, this.rootPath);
      }
    }

    await saveMolecule(this.rootPath, filePath, {
      filePath, type: 'molecule',
      atoms: moleculeAtoms.map(a => a.id),
      extractedAt: new Date().toISOString()
    });

    const contentHash = await _calculateContentHash(fullPath);
    const result = buildFileResult(filePath, parsed, result_core.parsed.imports || [], [], [], metadata, moleculeAtoms, contentHash);

    // Exponer los átomos para procesamiento posterior (como vinculación incremental)
    result.moleculeAtoms = moleculeAtoms;

    return result;
  } catch (error) {
    logger.error(`Error in analyzeFile for ${filePath}: ${error.message}`);
    throw error;
  }
}

/**
 * Registra y analiza un archivo en el sistema
 */
export async function analyzeAndIndex(filePath, fullPath, isUpdate = false) {
  // 1. Analizar archivo
  const analysis = await analyzeFile.call(this, filePath, fullPath);
  logger.info(`🧩 FileWatcher compile: ${filePath} -> ${analysis.moleculeAtoms?.length || 0} atoms, shadow=${analysis.metadata?.shadowVolume ?? 'n/a'}%${isUpdate ? ' [update]' : ' [create]'}`);

  // 2. Ejecutar Guardias Semánticos
  if (analysis.moleculeAtoms && analysis.moleculeAtoms.length > 0) {
    try {
      const { guardRegistry } = await import('./guards/registry.js');
      await guardRegistry.initializeDefaultGuards();

      await guardRegistry.runSemanticGuards(this.rootPath, filePath, this, analysis.moleculeAtoms, { verbose: true });
      logger.info(`🛡️  Semantic guards checked: ${filePath}`);
    } catch (guardError) {
      logger.debug(`Semantic guards failed or skipped for ${filePath}: ${guardError.message}`);
    }
  }

  return analysis;
}
