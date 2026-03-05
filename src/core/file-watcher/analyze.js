import path from 'path';
import { createLogger } from '../../utils/logger.js';

const logger = createLogger('OmnySys:analyze');
const DATA_DIR = '.omnysysdata';

import { parseFileFromDisk } from '../../layer-a-static/parser/index.js';
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
  try {
    const parsed = await parseFileFromDisk(fullPath);
    if (!parsed) throw new Error('Failed to parse file');

    const resolvedImports = await resolveAllImports(parsed, fullPath, this.rootPath);
    const fileSourceCode = await loadDependencySources(resolvedImports, filePath, parsed.source || '', this.rootPath);

    const staticConnections = detectAllSemanticConnections(fileSourceCode);
    const advancedConnections = detectAllAdvancedConnections(fileSourceCode);

    const metadata = extractAllMetadata(filePath, parsed.source || '');
    const molecularStructure = await extractMolecularStructure(filePath, parsed.source || '', parsed, metadata);
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
        await invalidateAtomCaches(atomId, changes.fields, this.rootPath);
      }
    }

    await saveMolecule(this.rootPath, filePath, {
      filePath, type: 'molecule',
      atoms: moleculeAtoms.map(a => a.id),
      extractedAt: new Date().toISOString()
    });

    const contentHash = await _calculateContentHash(fullPath);
    const result = buildFileResult(filePath, parsed, resolvedImports, staticConnections, advancedConnections, metadata, moleculeAtoms, contentHash);

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

  // 2. Ejecutar Guardias Semánticos
  if (analysis.moleculeAtoms && analysis.moleculeAtoms.length > 0) {
    try {
      // Detección de Contención de Estado Compartido
      const { detectSharedStateContention } = await import('./guards/shared-state-guard.js');
      await detectSharedStateContention(this.rootPath, filePath, this, analysis.moleculeAtoms, { verbose: true });

      // Validación de Integridad Atómica
      const { detectIntegrityViolations } = await import('./guards/integrity-guard.js');
      await detectIntegrityViolations(this.rootPath, filePath, this, analysis.moleculeAtoms, { verbose: true });

    } catch (guardError) {
      logger.debug(`Semantic guards skipped for ${filePath}: ${guardError.message}`);
    }
  }

  return analysis;
}
