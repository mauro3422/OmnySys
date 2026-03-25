import { createLogger } from '../../../utils/logger.js';
import { detectCircularDependencies } from '../guards/circular-guard.js';

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

export async function saveAtom(server, atom, filePath) {
  const { saveAtom: saveAtomToStorage } = await import('#layer-c/storage/index.js');
  await saveAtomToStorage(server.rootPath, filePath, atom.name, atom);
  logger.info(`[ATOM SAVED] ${filePath}::${atom.name}`);
}

export async function getAtomsForFile(server, filePath) {
  const { loadAtoms } = await import('#layer-c/storage/index.js');
  try {
    return await loadAtoms(server.rootPath, filePath);
  } catch (error) {
    logger.debug(`[NO ATOMS] ${filePath}`);
    return [];
  }
}

export async function detectCircularDependencyForFile(server, filePath) {
  try {
    const { getRepository } = await import('#layer-c/storage/repository/index.js');
    const repo = getRepository(server.rootPath);
    return await detectCircularDependencies(server.rootPath, filePath, repo);
  } catch (err) {
    logger.debug(`[CIRCULAR GUARD SKIP] ${filePath}: ${err.message}`);
    return null;
  }
}
