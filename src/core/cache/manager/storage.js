import { SemanticChangeType as ChangeType } from '#config/change-types.js';
import { createLogger } from '../../utils/logger.js';
import { getRepository } from '#layer-c/storage/repository/index.js';

const logger = createLogger('OmnySys:storage');

/**
 * Inicializa el caché
 * USA SQLite como fuente de datos
 */
export async function initialize() {
  try {
    const repo = getRepository(this.projectPath);

    if (!repo || !repo.db) {
      logger.warn('SQLite not available, cache will be empty');
      this.loaded = true;
      return;
    }

    // Cargar índices desde SQLite
    const stats = repo.db.prepare(`
        SELECT 
            COUNT(*) as atomsCount, 
            COUNT(DISTINCT file_path) as filesCount 
        FROM atoms
    `).get();

    this.index.metadata.totalFiles = stats?.atomsCount || 0;
    this.index.metadata.totalDependencies = stats?.filesCount || 0;

    this.loaded = true;
    logger.info(`📦 UnifiedCache: ${this.index.metadata.totalFiles} átomos indexados (from SQLite)`);
  } catch (error) {
    logger.warn('⚠️ Failed to initialize unified cache:', error.message);
  }
}

/**
 * Carga el índice desde archivo legacy (deprecated)
 * Ya no se usa - mantenido solo para compatibilidad
 * @deprecated
 */
export async function loadIndex() {
  // Ya no carga desde JSON - SQLite es la fuente
  this.index.entries = {};
  return;
}

/**
 * Guarda el índice (deprecated - ya no se usa)
 * @deprecated
 */
export async function saveIndex() {
  // Ya no guarda a JSON - SQLite es la fuente
  return;
}
