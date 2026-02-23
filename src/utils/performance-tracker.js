/**
 * @fileoverview Performance Tracker - Sistema de medicion de tiempos
 * 
 * Uso:
 *   const timer = startTimer('Fase X');
 *   // ... codigo ...
 *   timer.end(); // Loguea automaticamente
 * 
 *   // O manual:
 *   const elapsed = timer.elapsed(); // ms
 */

import { createLogger } from './logger.js';

const logger = createLogger('OmnySys:perf');

class PerformanceTracker {
  constructor(label) {
    this.label = label;
    this.startTime = process.hrtime.bigint();
    this.startMemory = process.memoryUsage();
  }

  /**
   * Obtiene tiempo transcurrido en ms
   */
  elapsed() {
    const endTime = process.hrtime.bigint();
    return Number(endTime - this.startTime) / 1_000_000; // Convertir ns a ms
  }

  /**
   * Obtiene uso de memoria actual
   */
  memoryDelta() {
    const current = process.memoryUsage();
    return {
      rss: Math.round((current.rss - this.startMemory.rss) / 1024 / 1024),
      heapUsed: Math.round((current.heapUsed - this.startMemory.heapUsed) / 1024 / 1024),
      external: Math.round((current.external - this.startMemory.external) / 1024 / 1024)
    };
  }

  /**
   * Finaliza y loguea resultados
   */
  end(verbose = true) {
    const elapsed = this.elapsed();
    const mem = this.memoryDelta();
    
    if (verbose) {
      const memStr = mem.heapUsed !== 0 ? ` [mem: ${mem.heapUsed > 0 ? '+' : ''}${mem.heapUsed}MB]` : '';
      logger.info(`  ⏱️  ${this.label}: ${elapsed.toFixed(2)}ms${memStr}`);
    }
    
    return { elapsed, memory: mem };
  }

  /**
   * Loguea checkpoint intermedio sin finalizar
   */
  checkpoint(name, verbose = true) {
    const elapsed = this.elapsed();
    if (verbose) {
      logger.info(`  ⏱️  ${this.label} > ${name}: ${elapsed.toFixed(2)}ms`);
    }
    return elapsed;
  }
}

/**
 * Inicia un timer para tracking de performance
 */
export function startTimer(label) {
  return new PerformanceTracker(label);
}

/**
 * Ejecuta una funcion y mide su tiempo
 */
export async function timedExecution(label, fn, verbose = true) {
  const timer = startTimer(label);
  try {
    const result = await fn();
    timer.end(verbose);
    return result;
  } catch (error) {
    const elapsed = timer.elapsed();
    logger.error(`  ❌ ${label} failed after ${elapsed.toFixed(2)}ms: ${error.message}`);
    throw error;
  }
}

/**
 * Ejecuta sincronica y mide tiempo
 */
export function timedExecutionSync(label, fn, verbose = true) {
  const timer = startTimer(label);
  try {
    const result = fn();
    timer.end(verbose);
    return result;
  } catch (error) {
    const elapsed = timer.elapsed();
    logger.error(`  ❌ ${label} failed after ${elapsed.toFixed(2)}ms: ${error.message}`);
    throw error;
  }
}

/**
 * Batch timer - para procesar muchos items
 */
export class BatchTimer {
  constructor(label, totalItems) {
    this.label = label;
    this.totalItems = totalItems;
    this.startTime = process.hrtime.bigint();
    this.itemsProcessed = 0;
    this.lastLogTime = this.startTime;
  }

  onItemProcessed(count = 1) {
    this.itemsProcessed += count;
    
    // Loguear progreso cada 100 items o cada 5 segundos
    const now = process.hrtime.bigint();
    const timeSinceLastLog = Number(now - this.lastLogTime) / 1_000_000;
    
    if (this.itemsProcessed % 100 === 0 || timeSinceLastLog > 5000) {
      const elapsed = Number(now - this.startTime) / 1_000_000;
      const rate = this.itemsProcessed / (elapsed / 1000);
      const percent = ((this.itemsProcessed / this.totalItems) * 100).toFixed(1);
      const eta = ((this.totalItems - this.itemsProcessed) / rate * 1000).toFixed(0);
      
      logger.info(`  ⏱️  ${this.label}: ${percent}% (${this.itemsProcessed}/${this.totalItems}) - ${rate.toFixed(1)} items/s - ETA: ${eta}ms`);
      this.lastLogTime = now;
    }
  }

  end(verbose = true) {
    const elapsed = Number(process.hrtime.bigint() - this.startTime) / 1_000_000;
    const rate = this.itemsProcessed / (elapsed / 1000);
    
    if (verbose) {
      logger.info(`  ⏱️  ${this.label} COMPLETE: ${elapsed.toFixed(2)}ms total - ${this.itemsProcessed} items @ ${rate.toFixed(1)}/s`);
    }
    
    return { elapsed, items: this.itemsProcessed, rate };
  }
}

export default { startTimer, timedExecution, timedExecutionSync, BatchTimer };
