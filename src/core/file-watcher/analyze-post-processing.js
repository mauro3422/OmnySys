import { createLogger } from '../../utils/logger.js';

const logger = createLogger('OmnySys:analyze:post');

export async function syncIncrementalSemanticSurface(rootPath, filePath, moleculeAtoms) {
  try {
    const [{ saveSharedStateRelationsIncrementally }, { persistGraphMetrics }] = await Promise.all([
      import('#layer-a/pipeline/link.js'),
      import('#layer-c/storage/enrichment/index.js')
    ]);

    await saveSharedStateRelationsIncrementally(moleculeAtoms, rootPath, false);
    await persistGraphMetrics(rootPath, moleculeAtoms.map((atom) => atom.id));
  } catch (relationError) {
    logger.warn(`⚠️ Incremental semantic sync failed for ${filePath}: ${relationError.message}`);
  }
}
