/**
 * state-manager.js
 * Maneja el archivo de estado compartido entre procesos
 */

import fs from 'fs/promises';
import path from 'path';

export class StateManager {
  constructor(filePath) {
    this.filePath = filePath;
    this.lastWrite = 0;
    this.writeDebounceMs = 100; // Evitar escrituras muy frecuentes
  }
  
  /**
   * Escribe estado al archivo
   */
  async write(state) {
    const now = Date.now();
    
    // Debounce básico
    if (now - this.lastWrite < this.writeDebounceMs) {
      await new Promise(resolve => setTimeout(resolve, this.writeDebounceMs));
    }
    
    try {
      // Asegurar que el directorio existe
      const dir = path.dirname(this.filePath);
      await fs.mkdir(dir, { recursive: true });
      
      // Escribir archivo
      await fs.writeFile(
        this.filePath,
        JSON.stringify(state, null, 2),
        'utf-8'
      );
      
      this.lastWrite = Date.now();
    } catch (error) {
      console.error('Error writing state:', error);
    }
  }
  
  /**
   * Lee estado del archivo
   */
  async read() {
    try {
      const content = await fs.readFile(this.filePath, 'utf-8');
      return JSON.parse(content);
    } catch (error) {
      // Si no existe o está corrupto, retornar estado default
      return this.getDefaultState();
    }
  }
  
  /**
   * Estado por defecto
   */
  getDefaultState() {
    return {
      version: '1.0.0',
      timestamp: new Date().toISOString(),
      orchestrator: {
        status: 'stopped',
        pid: null,
        uptime: 0,
        port: 9999
      },
      currentJob: null,
      queue: {
        critical: [],
        high: [],
        medium: [],
        low: []
      },
      stats: {
        totalAnalyzed: 0,
        totalQueued: 0,
        avgTime: 0,
        cacheHitRate: 0
      },
      health: {
        status: 'unknown',
        llmConnection: 'unknown',
        memoryUsage: 0,
        lastError: null
      }
    };
  }
  
  /**
   * Watch cambios en el archivo (para otros procesos)
   */
  async watch(callback) {
    try {
      const watcher = fs.watch(this.filePath);
      
      for await (const event of watcher) {
        if (event.eventType === 'change') {
          const state = await this.read();
          callback(state);
        }
      }
    } catch (error) {
      console.error('Error watching state:', error);
    }
  }
}
