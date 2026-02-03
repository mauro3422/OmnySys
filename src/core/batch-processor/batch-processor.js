/**
 * Batch Processor
 *
 * Maneja eficientemente cambios concurrentes en múltiples archivos.
 * Optimiza el orden de procesamiento y minimiza recálculos redundantes.
 *
 * Estrategias:
 * 1. Dependency-First: Procesa dependencias antes que dependientes
 * 2. Deduplication: Elimina cambios duplicados del mismo archivo
 * 3. Batching: Agrupa cambios relacionados para procesamiento conjunto
 * 4. Priority Queue: Archivos de alto impacto se procesan primero
 * 5. Incremental Updates: Solo recalcula lo necesario
 */

import { EventEmitter } from 'events';
import path from 'path';

/**
 * Tipos de prioridad para el procesamiento
 */
export const Priority = {
  CRITICAL: 4,  // Archivos con muchos dependientes
  HIGH: 3,      // Cambios en exports (breaking changes potenciales)
  MEDIUM: 2,    // Cambios en imports
  LOW: 1        // Cambios internos (funciones, no afectan API)
};

/**
 * Estados de un batch
 */
export const BatchState = {
  PENDING: 'pending',
  PROCESSING: 'processing',
  COMPLETED: 'completed',
  FAILED: 'failed',
  CANCELLED: 'cancelled'
};

/**
 * Representa un cambio individual de archivo
 */
class FileChange {
  constructor(filePath, changeType, options = {}) {
    this.filePath = filePath;
    this.changeType = changeType; // 'created', 'modified', 'deleted'
    this.priority = options.priority || Priority.LOW;
    this.timestamp = options.timestamp || Date.now();
    this.metadata = options.metadata || {};
    this.dependencies = new Set();    // Archivos que este archivo importa
    this.dependents = new Set();      // Archivos que importan este archivo
    this.retryCount = 0;
    this.maxRetries = options.maxRetries || 3;
  }

  /**
   * Incrementa contador de reintentos
   */
  incrementRetry() {
    this.retryCount++;
    return this.retryCount < this.maxRetries;
  }

  /**
   * Verifica si debe reintentarse
   */
  canRetry() {
    return this.retryCount < this.maxRetries;
  }
}

/**
 * Representa un batch de cambios relacionados
 */
class Batch {
  constructor(id, changes = []) {
    this.id = id;
    this.changes = new Map(); // filePath -> FileChange
    this.state = BatchState.PENDING;
    this.createdAt = Date.now();
    this.startedAt = null;
    this.completedAt = null;
    this.errors = [];

    // Agregar cambios
    for (const change of changes) {
      this.addChange(change);
    }
  }

  /**
   * Agrega cambio al batch
   */
  addChange(change) {
    // Si ya existe, mantener el de mayor prioridad/más reciente
    const existing = this.changes.get(change.filePath);
    if (existing) {
      if (change.priority > existing.priority ||
          (change.priority === existing.priority && change.timestamp > existing.timestamp)) {
        this.changes.set(change.filePath, change);
      }
    } else {
      this.changes.set(change.filePath, change);
    }
  }

  /**
   * Obtiene cambios ordenados por prioridad
   */
  getOrderedChanges() {
    return Array.from(this.changes.values())
      .sort((a, b) => {
        // Primero por prioridad (descendente)
        if (b.priority !== a.priority) {
          return b.priority - a.priority;
        }
        // Luego por timestamp (ascendente - más antiguo primero)
        return a.timestamp - b.timestamp;
      });
  }

  /**
   * Obtiene cambios en orden topológico (dependencias primero)
   */
  getTopologicalOrder() {
    const changes = this.getOrderedChanges();
    const visited = new Set();
    const result = [];

    const visit = (change) => {
      if (visited.has(change.filePath)) return;

      // Visitar dependencias primero
      for (const dep of change.dependencies) {
        const depChange = this.changes.get(dep);
        if (depChange) {
          visit(depChange);
        }
      }

      visited.add(change.filePath);
      result.push(change);
    };

    for (const change of changes) {
      visit(change);
    }

    return result;
  }

  /**
   * Marca batch como en proceso
   */
  start() {
    this.state = BatchState.PROCESSING;
    this.startedAt = Date.now();
  }

  /**
   * Marca batch como completado
   */
  complete() {
    this.state = BatchState.COMPLETED;
    this.completedAt = Date.now();
  }

  /**
   * Marca batch como fallido
   */
  fail(error) {
    this.state = BatchState.FAILED;
    this.completedAt = Date.now();
    this.errors.push({
      timestamp: Date.now(),
      error: error.message || error
    });
  }

  /**
   * Obtiene estadísticas del batch
   */
  getStats() {
    const changes = Array.from(this.changes.values());
    return {
      id: this.id,
      state: this.state,
      totalChanges: changes.length,
      byPriority: {
        critical: changes.filter(c => c.priority === Priority.CRITICAL).length,
        high: changes.filter(c => c.priority === Priority.HIGH).length,
        medium: changes.filter(c => c.priority === Priority.MEDIUM).length,
        low: changes.filter(c => c.priority === Priority.LOW).length
      },
      byType: {
        created: changes.filter(c => c.changeType === 'created').length,
        modified: changes.filter(c => c.changeType === 'modified').length,
        deleted: changes.filter(c => c.changeType === 'deleted').length
      },
      duration: this.completedAt ? this.completedAt - this.startedAt : null,
      errorCount: this.errors.length
    };
  }
}

/**
 * Batch Processor
 */
export class BatchProcessor extends EventEmitter {
  constructor(options = {}) {
    super();
    this.options = {
      maxBatchSize: options.maxBatchSize || 50,
      batchTimeoutMs: options.batchTimeoutMs || 1000,
      maxConcurrent: options.maxConcurrent || 5,
      dependencyGraph: options.dependencyGraph || null,
      ...options
    };

    this.pendingChanges = new Map();    // Cambios esperando ser agrupados
    this.processingBatches = new Map(); // Batches actualmente en proceso
    this.completedBatches = [];         // Historial de batches completados
    this.isRunning = false;
    this.batchTimer = null;
    this.processingQueue = [];          // Cola de batches pendientes
    this.activeProcesses = 0;           // Procesos concurrentes activos

    // Callbacks personalizados
    this.processChangeCallback = options.processChange || null;
    this.afterBatchCallback = options.afterBatch || null;
  }

  /**
   * Inicia el processor
   */
  start() {
    if (this.isRunning) return;
    this.isRunning = true;
    this.startBatchTimer();
    this.emit('started');
  }

  /**
   * Detiene el processor
   */
  stop() {
    this.isRunning = false;
    if (this.batchTimer) {
      clearTimeout(this.batchTimer);
      this.batchTimer = null;
    }
    this.emit('stopped');
  }

  /**
   * Agrega un cambio para procesamiento
   */
  addChange(filePath, changeType, options = {}) {
    const change = new FileChange(filePath, changeType, {
      ...options,
      priority: this.calculatePriority(filePath, changeType, options)
    });

    // Cargar información de dependencias si está disponible
    this.loadDependencies(change);

    this.pendingChanges.set(filePath, change);
    this.emit('change:added', change);

    // Si alcanzamos el tamaño máximo de batch, procesar inmediatamente
    if (this.pendingChanges.size >= this.options.maxBatchSize) {
      this.flushBatch();
    }

    return change;
  }

  /**
   * Calcula prioridad del cambio
   */
  calculatePriority(filePath, changeType, options) {
    // Prioridad explícita
    if (options.priority) {
      return options.priority;
    }

    // Cambios en exports son HIGH (potencial breaking change)
    if (options.exportChanges?.length > 0) {
      return Priority.HIGH;
    }

    // Archivos con muchos dependientes son CRITICAL
    if (options.dependentCount > 20) {
      return Priority.CRITICAL;
    }

    // Cambios en imports son MEDIUM
    if (options.importChanges?.length > 0) {
      return Priority.MEDIUM;
    }

    // Por tipo de cambio
    switch (changeType) {
      case 'deleted':
        return Priority.HIGH; // Borrar archivos puede romper imports
      case 'created':
        return Priority.LOW;
      case 'modified':
      default:
        return Priority.LOW;
    }
  }

  /**
   * Carga información de dependencias del cambio
   */
  loadDependencies(change) {
    if (!this.options.dependencyGraph) return;

    const graph = this.options.dependencyGraph;
    const fileInfo = graph[change.filePath];

    if (fileInfo) {
      // Dependencias: archivos que este archivo importa
      if (fileInfo.dependsOn) {
        for (const dep of fileInfo.dependsOn) {
          change.dependencies.add(dep);
        }
      }

      // Dependientes: archivos que importan este archivo
      if (fileInfo.usedBy) {
        for (const dependent of fileInfo.usedBy) {
          change.dependents.add(dependent);
        }
      }
    }
  }

  /**
   * Inicia el timer para crear batches periódicamente
   */
  startBatchTimer() {
    const tick = () => {
      if (!this.isRunning) return;

      if (this.pendingChanges.size > 0) {
        this.flushBatch();
      }

      this.batchTimer = setTimeout(tick, this.options.batchTimeoutMs);
    };

    this.batchTimer = setTimeout(tick, this.options.batchTimeoutMs);
  }

  /**
   * Crea un batch con los cambios pendientes y lo encola para procesamiento
   */
  flushBatch() {
    if (this.pendingChanges.size === 0) return;

    const batchId = `batch-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    const changes = Array.from(this.pendingChanges.values());

    const batch = new Batch(batchId, changes);
    this.processingQueue.push(batch);

    // Limpiar cambios pendientes
    this.pendingChanges.clear();

    this.emit('batch:created', batch);

    // Intentar procesar batches
    this.processNextBatches();

    return batch;
  }

  /**
   * Procesa el siguiente batch en la cola
   */
  async processNextBatches() {
    while (
      this.isRunning &&
      this.processingQueue.length > 0 &&
      this.activeProcesses < this.options.maxConcurrent
    ) {
      const batch = this.processingQueue.shift();
      if (batch) {
        this.processBatch(batch);
      }
    }
  }

  /**
   * Procesa un batch completo
   */
  async processBatch(batch) {
    this.activeProcesses++;
    this.processingBatches.set(batch.id, batch);
    batch.start();

    this.emit('batch:started', batch);

    try {
      // Obtener cambios en orden óptimo
      const changes = batch.getTopologicalOrder();

      // Procesar cambios
      for (const change of changes) {
        await this.processChange(change, batch);
      }

      batch.complete();
      this.completedBatches.push(batch);
      this.emit('batch:completed', batch);

      // Callback opcional
      if (this.afterBatchCallback) {
        await this.afterBatchCallback(batch);
      }

    } catch (error) {
      batch.fail(error);
      this.emit('batch:failed', batch, error);
    } finally {
      this.processingBatches.delete(batch.id);
      this.activeProcesses--;

      // Procesar siguiente batch
      this.processNextBatches();
    }
  }

  /**
   * Procesa un cambio individual
   */
  async processChange(change, batch) {
    this.emit('change:processing', change, batch);

    try {
      if (this.processChangeCallback) {
        await this.processChangeCallback(change, batch);
      } else {
        // Procesamiento por defecto
        await this.defaultProcessChange(change);
      }

      this.emit('change:completed', change, batch);

    } catch (error) {
      this.emit('change:error', change, error, batch);

      if (change.canRetry()) {
        change.incrementRetry();
        console.log(`🔄 Retrying ${change.filePath} (attempt ${change.retryCount})`);
        await this.processChange(change, batch);
      } else {
        throw error;
      }
    }
  }

  /**
   * Procesamiento por defecto (placeholder)
   */
  async defaultProcessChange(change) {
    // Override this or provide processChange callback
    console.log(`Processing ${change.filePath} (${change.changeType})`);
    await new Promise(resolve => setTimeout(resolve, 100)); // Simulación
  }

  /**
   * Cancela un batch pendiente
   */
  cancelBatch(batchId) {
    const index = this.processingQueue.findIndex(b => b.id === batchId);
    if (index !== -1) {
      const batch = this.processingQueue.splice(index, 1)[0];
      batch.state = BatchState.CANCELLED;
      this.emit('batch:cancelled', batch);
      return true;
    }
    return false;
  }

  /**
   * Obtiene estadísticas del processor
   */
  getStats() {
    return {
      isRunning: this.isRunning,
      pendingChanges: this.pendingChanges.size,
      processingQueue: this.processingQueue.length,
      activeBatches: this.processingBatches.size,
      activeProcesses: this.activeProcesses,
      completedBatches: this.completedBatches.length,
      maxConcurrent: this.options.maxConcurrent
    };
  }

  /**
   * Obtiene información de un batch específico
   */
  getBatchInfo(batchId) {
    // Buscar en cola
    const pending = this.processingQueue.find(b => b.id === batchId);
    if (pending) return pending.getStats();

    // Buscar en proceso
    const processing = this.processingBatches.get(batchId);
    if (processing) return processing.getStats();

    // Buscar en completados
    const completed = this.completedBatches.find(b => b.id === batchId);
    if (completed) return completed.getStats();

    return null;
  }

  /**
   * Limpia historial de batches antiguos
   */
  clearCompletedBatches(keepLast = 10) {
    if (this.completedBatches.length > keepLast) {
      this.completedBatches = this.completedBatches.slice(-keepLast);
    }
  }
}

export default BatchProcessor;
