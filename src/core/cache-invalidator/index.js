/**
 * @fileoverview index.js
 * 
 * Cache Invalidator - Sistema de invalidación de caché síncrono y atómico
 * 
 * Responsabilidad Única (SRP): Invalidar caché de forma síncrona, atómica y con feedback
 * 
 * Siguiendo SOLID:
 * - SRP: Solo invalida caché, nada más
 * - OCP: Extensible para nuevos tipos de invalidación
 * - LSP: Interfaz consistente con cualquier storage
 * - ISP: Métodos específicos por tipo de operación
 * - DIP: Depende de abstracciones (StorageOperations, no implementaciones)
 * 
 * Siguiendo SSOT:
 * - Una fuente de verdad para el estado de invalidación
 * - Todas las operaciones son atómicas
 * 
 * @module cache-invalidator
 */

import { EventEmitter } from 'events';
import { createLogger } from '../../utils/logger.js';
import { 
  InvalidationStatus, 
  DEFAULT_CONFIG,
  InvalidationEvents,
  CACHE_KEY_PREFIXES 
} from './constants.js';
import { 
  RamStorageOperations, 
  DiskStorageOperations,
  IndexOperations 
} from './storage-operations.js';
import { 
  AtomicTransaction,
  OperationFactory 
} from './atomic-operation.js';

const logger = createLogger('OmnySys:cache:invalidator');

/**
 * Cache Invalidator - Componente principal
 * @extends EventEmitter
 */
export class CacheInvalidator extends EventEmitter {
  constructor(cacheManager, config = {}) {
    super();
    
    this.cache = cacheManager;
    this.config = { ...DEFAULT_CONFIG, ...config };
    
    // Inicializar operaciones de almacenamiento (DIP)
    this.ramOps = new RamStorageOperations(cacheManager);
    this.diskOps = new DiskStorageOperations(cacheManager.projectPath);
    this.indexOps = new IndexOperations(cacheManager);
    
    // Estado de operaciones en curso
    this.pendingOperations = new Map();
    
    logger.info('🛡️  Cache Invalidator initialized');
  }

  /**
   * Invalida caché de forma SÍNCRONA e INMEDIATA
   * 
   * @param {string} filePath - Ruta del archivo a invalidar
   * @returns {Promise<object>} - Resultado de la invalidación
   */
  async invalidateSync(filePath) {
    const normalizedPath = filePath.replace(/\\/g, '/');
    
    logger.info(`🗑️  Invalidating cache for: ${normalizedPath}`);
    
    // Emitir evento de inicio
    this.emit(InvalidationEvents.STARTED, { 
      filePath: normalizedPath, 
      timestamp: Date.now() 
    });

    // Crear transacción atómica
    const transaction = new AtomicTransaction(normalizedPath, this.config);

    // Agregar operaciones en orden
    transaction.addOperation(
      OperationFactory.createRamInvalidation(
        this.ramOps,
        `${CACHE_KEY_PREFIXES.ANALYSIS}${normalizedPath}`,
        () => this.ramOps.createSnapshot(`${CACHE_KEY_PREFIXES.ANALYSIS}${normalizedPath}`)
      )
    );

    transaction.addOperation(
      OperationFactory.createRamInvalidation(
        this.ramOps,
        `${CACHE_KEY_PREFIXES.ATOM}${normalizedPath}::*`,
        () => null // Los átomos no necesitan snapshot individual
      )
    );

    transaction.addOperation(
      OperationFactory.createDiskDeletion(this.diskOps, normalizedPath)
    );

    transaction.addOperation(
      OperationFactory.createIndexUpdate(this.indexOps, normalizedPath)
    );

    try {
      // Ejecutar transacción (todo o nada)
      const result = await transaction.execute();
      
      // Guardar índice actualizado
      await this.indexOps.saveIndex();
      
      // Emitir evento de éxito
      this.emit(InvalidationEvents.SUCCESS, {
        filePath: normalizedPath,
        duration: result.duration,
        timestamp: Date.now()
      });
      
      logger.info(`✅ Cache invalidated in ${result.duration}ms: ${normalizedPath}`);
      
      return {
        success: true,
        filePath: normalizedPath,
        duration: result.duration,
        operationsCompleted: result.operationsCompleted
      };
      
    } catch (error) {
      // Emitir evento de fallo
      this.emit(InvalidationEvents.FAILED, {
        filePath: normalizedPath,
        error: error.message,
        timestamp: Date.now()
      });
      
      logger.error(`❌ Cache invalidation failed: ${normalizedPath}`, error.message);
      
      return {
        success: false,
        filePath: normalizedPath,
        error: error.message,
        rolledBack: transaction.status === InvalidationStatus.ROLLED_BACK
      };
    }
  }

  /**
   * Invalida con retry automático
   * 
   * @param {string} filePath - Ruta del archivo
   * @param {number} maxRetries - Máximo de intentos
   * @returns {Promise<object>} - Resultado final
   */
  async invalidateWithRetry(filePath, maxRetries = null) {
    const retries = maxRetries || this.config.maxRetries;
    const normalizedPath = filePath.replace(/\\/g, '/');
    
    logger.info(`🔄 Invalidating with retry (${retries} max): ${normalizedPath}`);
    
    for (let attempt = 1; attempt <= retries; attempt++) {
      logger.debug(`  Attempt ${attempt}/${retries}...`);
      
      const result = await this.invalidateSync(filePath);
      
      if (result.success) {
        return { ...result, attempts: attempt };
      }
      
      if (attempt < retries) {
        logger.warn(`  ⚠️  Attempt ${attempt} failed, retrying in ${this.config.retryDelayMs}ms...`);
        
        this.emit(InvalidationEvents.RETRYING, {
          filePath: normalizedPath,
          attempt,
          maxRetries: retries,
          timestamp: Date.now()
        });
        
        await this.delay(this.config.retryDelayMs);
      }
    }
    
    logger.error(`❌ All ${retries} attempts failed for: ${normalizedPath}`);
    
    return {
      success: false,
      filePath: normalizedPath,
      attempts: retries,
      error: `Failed after ${retries} attempts`
    };
  }

  /**
   * Invalida múltiples archivos
   * 
   * @param {string[]} filePaths - Array de rutas
   * @returns {Promise<object>} - Resultados
   */
  async invalidateMultiple(filePaths) {
    logger.info(`🗑️  Invalidating ${filePaths.length} files...`);
    
    const results = [];
    let successCount = 0;
    let failCount = 0;
    
    for (const filePath of filePaths) {
      const result = await this.invalidateSync(filePath);
      results.push(result);
      
      if (result.success) {
        successCount++;
      } else {
        failCount++;
      }
    }
    
    logger.info(`✅ Completed: ${successCount} success, ${failCount} failed`);
    
    return {
      total: filePaths.length,
      success: successCount,
      failed: failCount,
      results
    };
  }

  /**
   * Obtiene estado de una invalidación
   */
  getStatus(filePath) {
    const normalizedPath = filePath.replace(/\\/g, '/');
    
    return {
      filePath: normalizedPath,
      inRam: this._isInRam(normalizedPath),
      onDisk: this._isOnDisk(normalizedPath),
      inIndex: this._isInIndex(normalizedPath)
    };
  }

  /**
   * Limpia backups antiguos
   */
  async cleanup() {
    await this.diskOps.cleanupBackups();
  }

  /**
   * Obtiene estadísticas
   */
  getStats() {
    return {
      pendingOperations: this.pendingOperations.size,
      config: this.config
    };
  }

  // Helper methods
  _isInRam(filePath) {
    if (!this.cache.ramCache) return false;
    return this.cache.ramCache.has(`${CACHE_KEY_PREFIXES.ANALYSIS}${filePath}`);
  }

  _isInIndex(filePath) {
    return !!(this.cache?.index?.entries && this.cache.index.entries[filePath]);
  }

  _isOnDisk(filePath) {
    // Async, return false for sync check
    return false;
  }

  delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

// Singleton
let invalidator = null;

export function getCacheInvalidator(cacheManager, config) {
  if (!invalidator) {
    invalidator = new CacheInvalidator(cacheManager, config);
  }
  return invalidator;
}

export function resetCacheInvalidator() {
  invalidator = null;
}

export default CacheInvalidator;
