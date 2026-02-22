import { createLogger } from '../../../utils/logger.js';

const logger = createLogger('file-watcher');

/**
 * Procesa cambios usando el SmartBatchProcessor
 */
export async function _processWithBatchProcessor() {
  // Agregar cambios pendientes al batch processor
  for (const [filePath, changeInfo] of this.pendingChanges) {
    this.batchProcessor.addChange(filePath, changeInfo);
    this.pendingChanges.delete(filePath);
  }
  
  // Verificar si hay cambios listos
  if (!this.batchProcessor.hasReadyChanges()) {
    return;
  }
  
  // Procesar batch
  const result = await this.batchProcessor.processBatch(
    async (change) => this.processChange(change)
  );
  
  // Actualizar estadísticas
  this.stats.batchesProcessed++;
  this.stats.avgBatchSize = this.batchProcessor.getStats().avgBatchSize;
  
  if (result.processed > 0 && this.options.verbose) {
    logger.info(`📦 Batch completado: ${result.processed} archivos procesados`);
  }
}

/**
 * Procesa un batch de cambios (usado por el SmartBatchProcessor)
 */
export async function _processBatchChanges(changes) {
  // Usar el analizador incremental si está disponible
  if (this.incrementalAnalyzer) {
    const result = await this.incrementalAnalyzer.processBatch(changes);
    
    // Emitir eventos por cada cambio procesado
    for (const changeResult of result.results) {
      if (changeResult.success) {
        this.emit(`file:${changeResult.changeType}`, { 
          filePath: changeResult.filePath,
          result: changeResult
        });
      }
    }
    
    return result;
  }
  
  // Fallback: procesar uno por uno
  for (const change of changes) {
    await this.processChange(change);
  }
}
