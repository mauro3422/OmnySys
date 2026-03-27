import { createLogger } from '../../../utils/logger.js';

const logger = createLogger('OmnySys:file-watcher:handlers:core');

export async function saveAtomToStorage(server, atom, filePath) {
  const { saveAtom: saveAtomToStorage } = await import('#layer-c/storage/index.js');
  await saveAtomToStorage(server.rootPath, filePath, atom.name, atom);
  logger.info(`[ATOM SAVED] ${filePath}::${atom.name}`);
}

export async function loadAtomsForFile(server, filePath) {
  const { loadAtoms } = await import('#layer-c/storage/index.js');
  try {
    return await loadAtoms(server.rootPath, filePath);
  } catch (error) {
    logger.debug(`[NO ATOMS] ${filePath}`);
    return [];
  }
}
