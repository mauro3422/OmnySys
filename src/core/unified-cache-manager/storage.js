import fs from 'fs/promises';
import path from 'path';

import { ChangeType } from './constants.js';
import { createLogger } from '../../utils/logger.js';

const logger = createLogger('OmnySys:storage');



/**
 * Inicializa el caché
 * AHORA: Carga directamente desde Layer A (.OmnySysData/)
 */
export async function initialize() {
  try {
    await fs.mkdir(this.cacheDir, { recursive: true });

    // Intentar cargar desde Layer A primero
    const loadedFromLayerA = await this.loadFromLayerA();

    if (!loadedFromLayerA) {
      // Fallback a caché propio si Layer A no tiene datos
      await this.loadIndex();
    }

    this.loaded = true;
    const count = Object.keys(this.index.entries).length;
    logger.info(`ðŸ“¦ UnifiedCache: ${count} archivos indexados (from Layer A)`);
  } catch (error) {
    logger.warn('âš ï¸  Failed to initialize unified cache:', error.message);
  }
}

/**
 * Carga datos desde Layer A (.OmnySysData/)
 * Lee desde la carpeta files/ y el index.json
 * @returns {boolean} true si cargó correctamente
 */
export async function loadFromLayerA() {
  try {
    const layerAPath = path.join(this.projectPath, '.omnysysdata');
    const filesDir = path.join(layerAPath, 'files');

    // Verificar si existe la carpeta files
    try {
      await fs.access(filesDir);
    } catch {
      return false;
    }

    // Leer todos los archivos .json en la carpeta files (recursivo para subcarpetas como src/modules/)
    const fileEntries = await fs.readdir(filesDir, { recursive: true });
    const jsonFiles = fileEntries.filter(
      (f) => f.endsWith('.json') && !f.includes('connections') && !f.includes('risks')
    );

    if (jsonFiles.length === 0) {
      return false;
    }

    // Cargar cada archivo de análisis
    for (const jsonFile of jsonFiles) {
      try {
        const filePath = path.join(filesDir, jsonFile);
        const content = await fs.readFile(filePath, 'utf-8');
        const fileData = JSON.parse(content);

        // El filePath está en fileData.path o fileData.filePath
        const originalPath = fileData.path || fileData.filePath || jsonFile.replace('.json', '');

        this.index.entries[originalPath] = {
          hash: fileData.metadata?.hash || '',
          lastAnalyzed: fileData.metadata?.lastAnalyzed || Date.now(),
          staticVersion: fileData.metadata?.analysisVersion || '1.0.0',
          llmVersion: fileData.llmInsights ? '1.0.0' : null,
          changeType: ChangeType.NONE,
          dependencies: fileData.dependencies || [],
          metadata: fileData.metadata,
          llmInsights: fileData.llmInsights,
          // 🆕 NUEVO: Hashes para invalidación completa (BUG #47 FIX #2)
          contentHash: fileData.metadata?.hash || '',
          metadataHash: fileData.metadata?.metadataHash || null,
          combinedHash: fileData.metadata?.combinedHash || null,
          // 🆕 FIX #4: Marcar como analizado si tiene datos de Layer A
          staticAnalyzed: !!(fileData.definitions?.length || fileData.semanticAnalysis || fileData.exports?.length),
          llmAnalyzed: !!fileData.llmInsights
        };
      } catch (err) {
        logger.warn(`   âš ï¸  Failed to load ${jsonFile}: ${err.message}`);
      }
    }

    this.index.metadata.totalFiles = jsonFiles.length;
    await this.saveIndex();

    logger.info(`   ðŸ“¥ Loaded ${jsonFiles.length} files from Layer A`);
    return true;
  } catch (error) {
    logger.info(`   â„¹ï¸  Layer A data not available: ${error.message}`);
    return false;
  }
}

/**
 * Carga el índice desde disco
 */
export async function loadIndex() {
  try {
    const content = await fs.readFile(this.indexPath, 'utf-8');
    const loaded = JSON.parse(content);

    if (loaded.version === this.index.version) {
      this.index = loaded;
    }
  } catch {
    // No existe o está corrupto, empezar fresco
  }
}

/**
 * Guarda el índice en disco
 */
export async function saveIndex() {
  try {
    this.index.timestamp = Date.now();
    await fs.writeFile(this.indexPath, JSON.stringify(this.index, null, 2));
  } catch (error) {
    logger.warn('âš ï¸  Failed to save cache index:', error.message);
  }
}
