import { createLogger } from '../../../utils/logger.js';
import { getAtomsForFile, saveAtom } from './file-handlers-core-helpers-storage.js';

const logger = createLogger('OmnySys:file-watcher:handlers:core');

export async function enrichAtomsWithAncestry(server, filePath) {
  const { getShadowRegistry } = await import('../../../layer-c-memory/shadow-registry/index.js');
  const registry = getShadowRegistry(server.dataPath);
  await registry.initialize();

  const atoms = await getAtomsForFile(server, filePath);

  for (const atom of atoms) {
    try {
      const enriched = await registry.enrichWithAncestry(atom);

      if (enriched.ancestry?.replaced) {
        logger.info(`[ANCESTRY] ${atom.id} enriched from ${enriched.ancestry.replaced}`);
        await saveAtom(server, enriched, filePath);
      }
    } catch (error) {
      logger.warn(`[ANCESTRY FAIL] ${atom.id}:`, error.message);
    }
  }
}
