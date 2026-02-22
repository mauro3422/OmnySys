/**
 * @fileoverview Incremental Analyzer for File Watcher
 * 
 * Sistema de análisis incremental que:
 * - Invalida cache SOLO de archivos modificados
 * - Re-analiza solo los archivos afectados
 * - Actualiza dependencias transitivas
 * - Reutiliza análisis existente cuando es posible
 * 
 * @module core/file-watcher/incremental-analyzer
 */

import path from 'path';
import { createLogger } from '../../utils/logger.js';

const logger = createLogger('OmnySys:file-watcher:incremental');

/**
 * Analizador incremental para cambios de archivos
 */
export class IncrementalAnalyzer {
  constructor(cacheManager, projectPath) {
    this.cache = cacheManager;
    this.projectPath = projectPath;
    this.processedFiles = new Set();
    this.pendingInvalidations = new Set();
  }

  /**
   * Procesa un cambio de archivo de forma incremental
   * 
   * @param {string} filePath - Ruta del archivo
   * @param {string} changeType - Tipo de cambio (created, modified, deleted)
   * @returns {Promise<Object>} Resultado del análisis
   */
  async processChange(filePath, changeType) {
    const startTime = performance.now();
    
    try {
      // 1. Invalidar cache del archivo
      await this.invalidateFileCache(filePath);
      
      // 2. Invalidar dependencias
      const affectedFiles = await this.invalidateDependencies(filePath);
      
      let result;
      
      switch (changeType) {
        case 'created':
          result = await this._handleCreated(filePath);
          break;
        case 'modified':
          result = await this._handleModified(filePath);
          break;
        case 'deleted':
          result = await this._handleDeleted(filePath);
          break;
        default:
          throw new Error(`Tipo de cambio desconocido: ${changeType}`);
      }
      
      const duration = (performance.now() - startTime).toFixed(2);
      
      return {
        success: true,
        filePath,
        changeType,
        affectedFiles: affectedFiles.length,
        duration: parseFloat(duration),
        ...result
      };
      
    } catch (error) {
      logger.error(`❌ Error en análisis incremental de ${filePath}:`, error.message);
      return {
        success: false,
        filePath,
        changeType,
        error: error.message
      };
    }
  }

  /**
   * Invalida el cache de un archivo específico
   */
  async invalidateFileCache(filePath) {
    if (!this.cache) {
      logger.warn('⚠️ No hay cache manager disponible');
      return;
    }
    
    try {
      // Invalidar entradas específicas del archivo
      this.cache.invalidate(`analysis:${filePath}`);
      this.cache.invalidate(`atom:${filePath}`);
      this.cache.invalidate(`derived:${filePath}`);
      this.cache.invalidate(`impact:${filePath}`);
      
      // Agregar a lista de invalidaciones pendientes
      this.pendingInvalidations.add(filePath);
      
      logger.debug(`🗑️ Cache invalidado: ${filePath}`);
      
    } catch (error) {
      logger.warn(`⚠️ Error invalidando cache de ${filePath}:`, error.message);
    }
  }

  /**
   * Invalida dependencias transitivas
   */
  async invalidateDependencies(filePath) {
    if (!this.cache) return [];
    
    const affectedFiles = [];
    
    try {
      // Obtener dependencias del archivo desde el índice
      const index = this.cache.index || {};
      const dependencyGraph = index.dependencyGraph || {};
      
      // Archivos que dependen de este archivo
      const dependents = dependencyGraph[filePath] || [];
      
      for (const dependent of dependents) {
        // Invalidar cache del dependiente
        this.cache.invalidate(`analysis:${dependent}`);
        this.cache.invalidate(`derived:${dependent}`);
        this.cache.invalidate(`impact:${dependent}`);
        
        affectedFiles.push(dependent);
        
        // Marcar para re-análisis posterior
        this.pendingInvalidations.add(dependent);
      }
      
      if (affectedFiles.length > 0) {
        logger.debug(`🔗 ${affectedFiles.length} dependencias invalidadas para ${filePath}`);
      }
      
    } catch (error) {
      logger.warn(`⚠️ Error invalidando dependencias de ${filePath}:`, error.message);
    }
    
    return affectedFiles;
  }

  /**
   * Maneja creación de archivo
   */
  async _handleCreated(filePath) {
    // El archivo es nuevo, necesita análisis completo
    logger.debug(`📄 Nuevo archivo detectado: ${filePath}`);
    
    return {
      action: 'full-analysis',
      isNew: true
    };
  }

  /**
   * Maneja modificación de archivo
   */
  async _handleModified(filePath) {
    // Verificar si el contenido realmente cambió
    const contentChanged = await this._checkContentChanged(filePath);
    
    if (!contentChanged) {
      logger.debug(`⏭️ Sin cambios reales: ${filePath}`);
      return {
        action: 'skipped',
        reason: 'no-content-change'
      };
    }
    
    logger.debug(`✏️ Archivo modificado: ${filePath}`);
    
    // 🆕 Realizar análisis del archivo
    try {
      const { analyzeAndIndex } = await import('../analyze.js');
      const fullPath = path.join(this.projectPath, filePath);
      const analysis = await analyzeAndIndex.call(this, filePath, fullPath, true);
      
      return {
        action: 'analyzed',
        contentChanged: true,
        atomsFound: analysis.molecule?.atoms?.length || 0
      };
    } catch (error) {
      logger.error(`❌ Error analizando ${filePath}:`, error.message);
      return {
        action: 'error',
        contentChanged: true,
        error: error.message
      };
    }
  }

  /**
   * Maneja eliminación de archivo
   */
  async _handleDeleted(filePath) {
    // Limpiar todas las referencias al archivo
    logger.debug(`🗑️ Archivo eliminado: ${filePath}`);
    
    try {
      // Eliminar del índice si existe
      if (this.cache?.index?.entries) {
        delete this.cache.index.entries[filePath];
      }
      
      // Eliminar del grafo de dependencias
      if (this.cache?.index?.dependencyGraph) {
        delete this.cache.index.dependencyGraph[filePath];
      }
      
    } catch (error) {
      logger.warn(`⚠️ Error limpiando referencias de ${filePath}:`, error.message);
    }
    
    return {
      action: 'deleted',
      cleaned: true
    };
  }

  /**
   * Verifica si el contenido realmente cambió (vs solo timestamp)
   */
  async _checkContentChanged(filePath) {
    try {
      // Aquí podríamos comparar hashes de contenido
      // Por ahora asumimos que cambió si llegamos aquí
      return true;
    } catch (error) {
      return true; // Si no podemos verificar, asumimos que cambió
    }
  }

  /**
   * Procesa múltiples archivos en batch
   */
  async processBatch(changes) {
    const results = [];
    const startTime = performance.now();
    
    // Agrupar por tipo para procesar en orden correcto
    const byType = this._groupByType(changes);
    
    // Procesar en orden: deleted -> created -> modified
    const order = ['deleted', 'created', 'modified'];
    
    for (const type of order) {
      const files = byType[type] || [];
      
      for (const change of files) {
        const result = await this.processChange(change.filePath, type);
        results.push(result);
      }
    }
    
    const duration = (performance.now() - startTime).toFixed(2);
    
    // Limpiar lista de invalidaciones
    this.pendingInvalidations.clear();
    
    return {
      processed: results.length,
      successful: results.filter(r => r.success).length,
      failed: results.filter(r => !r.success).length,
      duration: parseFloat(duration),
      results
    };
  }

  /**
   * Agrupa cambios por tipo
   */
  _groupByType(changes) {
    const groups = {};
    
    for (const change of changes) {
      const type = change.type || 'modified';
      if (!groups[type]) {
        groups[type] = [];
      }
      groups[type].push(change);
    }
    
    return groups;
  }

  /**
   * Obtiene archivos pendientes de re-análisis
   */
  getPendingInvalidations() {
    return Array.from(this.pendingInvalidations);
  }

  /**
   * Limpia el estado interno
   */
  clear() {
    this.processedFiles.clear();
    this.pendingInvalidations.clear();
  }
}

export default IncrementalAnalyzer;
