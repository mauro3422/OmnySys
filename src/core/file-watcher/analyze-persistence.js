import { createLogger } from '../../utils/logger.js';
import { loadAtoms, saveAtom, saveMolecule } from '#layer-c/storage/index.js';
import { saveAtomsIncremental } from '#layer-c/storage/atoms/incremental-atom-saver.js';
import { invalidateAtomCaches } from '#layer-c/cache/smart-cache-invalidator.js';
import { cleanupOrphanedAtomFiles, _markAtomAsRemoved } from './cleanup.js';
import { handleRemovedAtoms, filterProtectedAtoms } from './analyze-logic.js';
import { syncIncrementalSemanticSurface } from './analyze-post-processing.js';

const logger = createLogger('OmnySys:analyze:persistence');

export async function persistAnalysisArtifacts(rootPath, filePath, moleculeAtoms) {
  try {
    const previousAtoms = await loadAtoms(rootPath, filePath, { includeRemoved: true });
    const newAtomNames = await handleRemovedAtoms(rootPath, filePath, moleculeAtoms, previousAtoms, _markAtomAsRemoved, saveAtom);

    const { atomsToSave } = filterProtectedAtoms(moleculeAtoms, previousAtoms);
    const saveResults = await saveAtomsIncremental(rootPath, filePath, atomsToSave, { source: 'file-watcher' });

    if (saveResults.updated > 0) {
      logger.info(`⚡ Incremental save: ${filePath} (${saveResults.updated} updated)`);
    }

    await cleanupOrphanedAtomFiles(rootPath, filePath, newAtomNames);

    const { AtomVersionManager } = await import('#layer-c/storage/atoms/atom-version-manager.js');
    const versionManager = new AtomVersionManager(rootPath);

    for (const atom of moleculeAtoms) {
      const atomId = `${filePath}::${atom.name}`;
      const changes = await versionManager.detectChanges(atomId, atom);
      if (changes.hasChanges && !changes.isNew) {
        await invalidateAtomCaches(atomId, changes.fields, rootPath);
      }
    }

    await saveMolecule(rootPath, filePath, {
      filePath,
      type: 'molecule',
      atoms: moleculeAtoms.map((atom) => atom.id),
      extractedAt: new Date().toISOString()
    });

    await syncIncrementalSemanticSurface(rootPath, filePath, moleculeAtoms);
  } catch (error) {
    logger.error(`Error persisting analysis artifacts for ${filePath}: ${error.message}`);
    throw error;
  }
}
