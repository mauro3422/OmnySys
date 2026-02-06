/**
 * @fileoverview batch.js
 * 
 * Modelo: Representa un batch de cambios relacionados
 * 
 * @module batch-processor/models/batch
 */

import { BatchState, Priority } from '../constants.js';

/**
 * Representa un batch de cambios relacionados
 */
export class Batch {
  /**
   * @param {string} id - Identificador único del batch
   * @param {FileChange[]} changes - Array de cambios
   */
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
   * @param {FileChange} change - Cambio a agregar
   */
  addChange(change) {
    const existing = this.changes.get(change.filePath);
    
    if (existing) {
      // Mantener el de mayor prioridad/más reciente
      const shouldReplace = 
        change.priority > existing.priority ||
        (change.priority === existing.priority && change.timestamp > existing.timestamp);
      
      if (shouldReplace) {
        this.changes.set(change.filePath, change);
      }
    } else {
      this.changes.set(change.filePath, change);
    }
  }

  /**
   * Obtiene cambios ordenados por prioridad
   * @returns {FileChange[]}
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
   * @returns {FileChange[]}
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
   * @param {Error} error - Error ocurrido
   */
  fail(error) {
    this.state = BatchState.FAILED;
    this.completedAt = Date.now();
    this.errors.push({
      timestamp: Date.now(),
      error: error?.message || error
    });
  }

  /**
   * Obtiene estadísticas del batch
   * @returns {Object}
   */
  getStats() {
    const changes = Array.from(this.changes.values());
    
    const countByPriority = (p) => changes.filter(c => c.priority === p).length;
    const countByType = (t) => changes.filter(c => c.changeType === t).length;

    return {
      id: this.id,
      state: this.state,
      totalChanges: changes.length,
      byPriority: {
        critical: countByPriority(Priority.CRITICAL),
        high: countByPriority(Priority.HIGH),
        medium: countByPriority(Priority.MEDIUM),
        low: countByPriority(Priority.LOW)
      },
      byType: {
        created: countByType('created'),
        modified: countByType('modified'),
        deleted: countByType('deleted')
      },
      duration: this.completedAt ? this.completedAt - this.startedAt : null,
      errorCount: this.errors.length
    };
  }
}
