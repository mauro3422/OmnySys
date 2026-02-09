/**
 * state-manager.js
 * Maneja el archivo de estado compartido entre procesos
 * 
 * FIX: Usa escritura atómica para prevenir corrupción de estado
 * cuando múltiples requests llegan simultáneamente.
 */

import fs from 'fs/promises';
import path from 'path';
import { createLogger } from '../utils/logger.js';

const logger = createLogger('OmnySys:state:manager');



export class StateManager {
  constructor(filePath) {
    this.filePath = filePath;
    this.lastWrite = 0;
    this.writeDebounceMs = 100; // Evitar escrituras muy frecuentes
    this.writeLock = Promise.resolve(); // Lock para escrituras secuenciales
  }
  
  /**
   * Escribe estado al archivo (ATÓMICO)
   * 
   * Estrategia:
   * 1. Escribir a archivo temporal
   * 2. Renombrar atómicamente al archivo destino
   * 3. Usar lock para secuencializar escrituras concurrentes
   */
  async write(state) {
    const now = Date.now();
    
    // Debounce básico
    if (now - this.lastWrite < this.writeDebounceMs) {
      await new Promise(resolve => setTimeout(resolve, this.writeDebounceMs));
    }
    
    // FIX: Usar lock para prevenir race conditions
    return this.writeLock = this.writeLock.then(async () => {
      try {
        // Asegurar que el directorio existe
        const dir = path.dirname(this.filePath);
        await fs.mkdir(dir, { recursive: true });
        
        // FIX: Escritura atómica
        const tempPath = `${this.filePath}.tmp.${Date.now()}.${process.pid}`;
        
        // 1. Escribir a archivo temporal
        await fs.writeFile(
          tempPath,
          JSON.stringify(state, null, 2),
          'utf-8'
        );
        
        // 2. Renombrar atómicamente (operación atómica en filesystem)
        await fs.rename(tempPath, this.filePath);
        
        this.lastWrite = Date.now();
      } catch (error) {
        logger.error('Error writing state:', error);
        // Limpiar archivo temporal si existe
        try {
          const tempFiles = await fs.readdir(path.dirname(this.filePath));
          for (const file of tempFiles) {
            if (file.startsWith(`${path.basename(this.filePath)}.tmp.`)) {
              await fs.unlink(path.join(path.dirname(this.filePath), file));
            }
          }
        } catch (cleanupError) {
          // Ignorar errores de limpieza
        }
      }
    });
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
      logger.error('Error watching state:', error);
    }
  }
}
