import { getRepository } from '../repository/index.js';
import { createDataDirectory } from '../setup/directory.js';

/**
 * Guarda metadata global del proyecto en SQLite
 *
 * @param {string} rootPath - Raíz del proyecto
 * @param {object} metadata - Metadata del análisis
 * @param {object} fileIndex - Índice de archivos analizados (no guardado - redundante con atoms table)
 * @returns {boolean} - true si se guardó correctamente
 */
export async function saveMetadata(rootPath, metadata, fileIndex) {
  const repo = getRepository(rootPath);
  
  if (!repo || !repo.db) {
    console.warn('[saveMetadata] SQLite not available, skipping metadata save');
    return false;
  }
  
  try {
    const now = new Date().toISOString();
    
    // Guardar metadata como JSON en system_metadata
    const metadataKeys = [
      'lastUpdated',
      'totalFiles', 
      'totalFunctions',
      'system_map_metadata',
      'analyzedAt',
      'storageVersion',
      'storageFormat'
    ];
    
    for (const key of metadataKeys) {
      if (metadata[key] !== undefined) {
        repo.db.prepare(`
          INSERT OR REPLACE INTO system_metadata (key, value, updated_at)
          VALUES (?, ?, ?)
        `).run(key, JSON.stringify(metadata[key]), now);
      }
    }
    
    // Guardar archivo timestamp
    repo.db.prepare(`
      INSERT OR REPLACE INTO system_metadata (key, value, updated_at)
      VALUES (?, ?, ?)
    `).run('metadata_saved_at', now, now);
    
    return true;
  } catch (error) {
    console.error('[saveMetadata] Error saving to SQLite:', error.message);
    return false;
  }
}
