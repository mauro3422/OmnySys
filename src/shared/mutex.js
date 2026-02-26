/**
 * @fileoverview Mutex Utilities
 *
 * Proporciona primitivas de sincronización para operaciones atómicas
 * Evita race conditions en operaciones read-modify-write
 *
 * @module shared/mutex
 */

/**
 * Mutex simple para operaciones atómicas
 * Implementa un sistema de cola FIFO para garantizar exclusión mutua
 */
export class Mutex {
  constructor() {
    this._locked = false;
    this._queue = [];
  }

  /**
   * Adquiere el lock
   * @returns {Promise<void>}
   */
  async acquire() {
    return new Promise((resolve) => {
      if (!this._locked) {
        this._locked = true;
        resolve();
      } else {
        this._queue.push(resolve);
      }
    });
  }

  /**
   * Libera el lock
   */
  release() {
    const next = this._queue.shift();
    if (next) {
      next();
    } else {
      this._locked = false;
    }
  }

  /**
   * Ejecuta una función con exclusión mutua
   * @template T
   * @param {() => Promise<T>} fn - Función a ejecutar
   * @returns {Promise<T>}
   */
  async run(fn) {
    await this.acquire();
    try {
      return await fn();
    } finally {
      this.release();
    }
  }
}

/**
 * Semaphore para limitar concurrencia
 * Útil cuando quieres permitir N operaciones concurrentes
 */
export class Semaphore {
  constructor(permits) {
    this._permits = permits;
    this._queue = [];
  }

  async acquire() {
    return new Promise((resolve) => {
      if (this._permits > 0) {
        this._permits--;
        resolve();
      } else {
        this._queue.push(resolve);
      }
    });
  }

  release() {
    this._permits++;
    const next = this._queue.shift();
    if (next) {
      this._permits--;
      next();
    }
  }

  async run(fn) {
    await this.acquire();
    try {
      return await fn();
    } finally {
      this.release();
    }
  }
}

/**
 * Read-Write Lock para optimizar lecturas concurrentes
 * Múltiples lectores pueden leer simultáneamente
 * Escritores tienen acceso exclusivo
 */
export class ReadWriteLock {
  constructor() {
    this._readers = 0;
    this._writer = false;
    this._writeQueue = [];
    this._readQueue = [];
  }

  async acquireRead() {
    await new Promise((resolve) => {
      if (!this._writer && this._writeQueue.length === 0) {
        this._readers++;
        resolve();
      } else {
        this._readQueue.push(resolve);
      }
    });
  }

  releaseRead() {
    this._readers--;
    if (this._readers === 0 && this._writeQueue.length > 0) {
      const next = this._writeQueue.shift();
      next();
    }
  }

  async acquireWrite() {
    await new Promise((resolve) => {
      if (this._readers === 0 && !this._writer) {
        this._writer = true;
        resolve();
      } else {
        this._writeQueue.push(resolve);
      }
    });
  }

  releaseWrite() {
    this._writer = false;
    if (this._readQueue.length > 0) {
      // Prioritize readers
      while (this._readQueue.length > 0) {
        const next = this._readQueue.shift();
        this._readers++;
        next();
      }
    } else if (this._writeQueue.length > 0) {
      const next = this._writeQueue.shift();
      this._writer = true;
      next();
    }
  }

  async read(fn) {
    await this.acquireRead();
    try {
      return await fn();
    } finally {
      this.releaseRead();
    }
  }

  async write(fn) {
    await this.acquireWrite();
    try {
      return await fn();
    } finally {
      this.releaseWrite();
    }
  }
}

// Instancias compartidas para uso global
const _globalMutexes = new Map();

/**
 * Obtiene o crea un mutex global por nombre
 * @param {string} name - Nombre del mutex
 * @returns {Mutex}
 */
export function getGlobalMutex(name) {
  if (!_globalMutexes.has(name)) {
    _globalMutexes.set(name, new Mutex());
  }
  return _globalMutexes.get(name);
}

/**
 * Obtiene o crea un semaphore global por nombre
 * @param {string} name - Nombre del semaphore
 * @param {number} permits - Número de permisos
 * @returns {Semaphore}
 */
export function getGlobalSemaphore(name, permits = 1) {
  const key = `${name}:${permits}`;
  if (!_globalMutexes.has(key)) {
    _globalMutexes.set(key, new Semaphore(permits));
  }
  return _globalMutexes.get(key);
}
