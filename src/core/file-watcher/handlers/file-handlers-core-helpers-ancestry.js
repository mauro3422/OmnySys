import { createLogger } from '../../../utils/logger.js';
import { loadAtomsForFile, saveAtomToStorage } from './file-handlers-core-helpers-storage.js';

const logger = createLogger('OmnySys:file-watcher:handlers:core');

export async function enrichAtomsWithAncestryCore(server, filePath) {
  const { getShadowRegistry } = await import('../../../layer-c-memory/shadow-registry/index.js');
  const registry = getShadowRegistry(server.dataPath);
  await registry.initialize();

  const atoms = await loadAtomsForFile(server, filePath);

  for (const atom of atoms) {
    try {
      const enriched = await registry.enrichWithAncestry(atom);

      if (enriched.ancestry?.replaced) {
        logger.info(`[ANCESTRY] ${atom.id} enriched from ${enriched.ancestry.replaced}`);
        await saveAtomToStorage(server, enriched, filePath);
      }
    } catch (error) {
      logger.warn(`[ANCESTRY FAIL] ${atom.id}:`, error.message);
    }
  }
}
