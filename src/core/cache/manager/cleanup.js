import { getRepository } from '#layer-c/storage/repository/index.js';
import { createLogger } from '../../utils/logger.js';

const logger = createLogger('OmnySys:cleanup');


/**
 * Limpia entradas de archivos que ya no existen
 */
export async function cleanupDeletedFiles(existingFiles) {
  const existingSet = new Set(existingFiles);
  let deletedCount = 0;

  const repo = getRepository(this.projectPath);

  for (const filePath of Object.keys(this.index.entries)) {
    if (!existingSet.has(filePath)) {
      // 1. Borrar del índice de caché
      delete this.index.entries[filePath];
      delete this.index.dependencyGraph[filePath];

      // 2. 🚀 CRITICAL: Borrar también los átomos de la base de datos persistente
      try {
        const changes = repo.deleteByFile(filePath);
        if (changes > 0) {
          logger.debug(`  🗑️  Purged ${changes} stale atoms for: ${filePath}`);
        }
      } catch (e) {
        logger.warn(`  ⚠️  Failed to purge stale atoms for ${filePath}: ${e.message}`);
      }

      deletedCount++;
    }
  }

  if (deletedCount > 0) {
    logger.info(`🗑️  UnifiedCache: Removed ${deletedCount} deleted files from cache and database`);
    await this.saveIndex();
  }

  return deletedCount;
}
