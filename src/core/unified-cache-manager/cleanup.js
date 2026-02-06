/**
 * Limpia entradas de archivos que ya no existen
 */
export async function cleanupDeletedFiles(existingFiles) {
  const existingSet = new Set(existingFiles);
  let deletedCount = 0;

  for (const filePath of Object.keys(this.index.entries)) {
    if (!existingSet.has(filePath)) {
      delete this.index.entries[filePath];
      delete this.index.dependencyGraph[filePath];
      deletedCount++;
    }
  }

  if (deletedCount > 0) {
    console.log(`ðŸ—‘ï¸  UnifiedCache: Removed ${deletedCount} deleted files`);
    await this.saveIndex();
  }

  return deletedCount;
}
