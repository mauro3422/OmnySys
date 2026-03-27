import { createLogger } from '../../../utils/logger.js';
import { detectCircularDependencies } from '../guards/circular-guard.js';

const logger = createLogger('OmnySys:file-watcher:handlers:core');

export async function detectCircularDependencyForFileCore(server, filePath) {
  try {
    const { getRepository } = await import('#layer-c/storage/repository/index.js');
    const repo = getRepository(server.rootPath);
    return await detectCircularDependencies(server.rootPath, filePath, repo);
  } catch (err) {
    logger.debug(`[CIRCULAR GUARD SKIP] ${filePath}: ${err.message}`);
    return null;
  }
}
