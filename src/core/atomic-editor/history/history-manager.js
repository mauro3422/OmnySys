/**
 * @fileoverview History Manager - Gestión de historial de operaciones
 * 
 * Responsabilidad Única (SRP): Gestionar el historial de operaciones para undo/redo.
 * 
 * @module atomic-editor/history
 */

import { createLogger } from '../../../utils/logger.js';

const logger = createLogger('OmnySys:atomic:editor:history');

/**
 * Gestiona el historial de operaciones para undo/redo
 */
export class HistoryManager {
  constructor(maxSize = 50) {
    this.history = [];
    this.historyIndex = -1;
    this.maxSize = maxSize;
  }

  /**
   * Agrega una operación al historial
   * @param {Object} operation - Operación ejecutada
   * @param {Object} undoData - Datos para deshacer
   */
  add(operation, undoData) {
    // Remove any redo entries
    this.history = this.history.slice(0, this.historyIndex + 1);
    
    // Add new entry
    this.history.push({
      operation,
      undoData,
      timestamp: Date.now()
    });
    
    this.historyIndex++;
    
    // Trim history if needed
    if (this.history.length > this.maxSize) {
      this.history.shift();
      this.historyIndex--;
    }
  }

  /**
   * Obtiene la operación actual para undo
   * @returns {Object|null} Entrada del historial o null
   */
  getCurrentForUndo() {
    if (this.historyIndex < 0) {
      return null;
    }
    return this.history[this.historyIndex];
  }

  /**
   * Obtiene la operación actual para redo
   * @returns {Object|null} Entrada del historial o null
   */
  getCurrentForRedo() {
    if (this.historyIndex >= this.history.length - 1) {
      return null;
    }
    return this.history[this.historyIndex + 1];
  }

  /**
   * Mueve el índice hacia atrás (despues de undo)
   */
  moveBackward() {
    if (this.historyIndex >= 0) {
      this.historyIndex--;
    }
  }

  /**
   * Mueve el índice hacia adelante (despues de redo)
   */
  moveForward() {
    if (this.historyIndex < this.history.length - 1) {
      this.historyIndex++;
    }
  }

  /**
   * Verifica si se puede hacer undo
   * @returns {boolean}
   */
  canUndo() {
    return this.historyIndex >= 0;
  }

  /**
   * Verifica si se puede hacer redo
   * @returns {boolean}
   */
  canRedo() {
    return this.historyIndex < this.history.length - 1;
  }

  /**
   * Obtiene información del historial
   * @returns {{canUndo: boolean, canRedo: boolean, count: number, currentIndex: number}}
   */
  getInfo() {
    return {
      canUndo: this.canUndo(),
      canRedo: this.canRedo(),
      count: this.history.length,
      currentIndex: this.historyIndex
    };
  }

  /**
   * Limpia todo el historial
   */
  clear() {
    this.history = [];
    this.historyIndex = -1;
  }

  /**
   * Obtiene todas las operaciones en el historial
   * @returns {Array}
   */
  getAll() {
    return [...this.history];
  }
}
