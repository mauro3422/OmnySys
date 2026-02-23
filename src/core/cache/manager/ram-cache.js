/**
 * @fileoverview ram-cache.js
 * 
 * Cache transitorio con backend SQLite
 * Resuelve race conditions usando SQLite como backend atómico
 * 
 * @module cache/manager/ram-cache
 */

import { getRepository } from '#layer-c/storage/repository/index.js';

/**
 * Obtiene la conexión a la base de datos
 * @returns {object|null}
 */
function getDb() {
  try {
    const repo = getRepository(this?.projectPath);
    return repo?.db || null;
  } catch {
    return null;
  }
}

/**
 * Obtiene un valor del caché
 * @param {string} key - Clave del caché
 * @returns {any} - Valor cacheado o null
 */
export function get(key) {
  const db = getDb.call(this);
  
  if (db) {
    // SQLite backend
    try {
      const now = Date.now();
      const row = db.prepare(
        'SELECT value FROM cache_entries WHERE key = ? AND (expiry IS NULL OR expiry > ?)'
      ).get(key, now);
      
      if (row) {
        return JSON.parse(row.value);
      }
    } catch (err) {
      console.warn('[ram-cache] SQLite get error:', err.message);
    }
    return null;
  }
  
  // Fallback: Memory Map (para casos donde SQLite no está disponible)
  const item = this.ramCache?.get(key);
  if (!item) return null;

  if (Date.now() > item.expiry) {
    this.ramCache.delete(key);
    return null;
  }

  return item.data;
}

/**
 * Guarda un valor en el caché
 * @param {string} key - Clave del caché
 * @param {any} data - Datos a guardar
 * @param {number} ttlMinutes - TTL en minutos (default: 5)
 */
export function set(key, data, ttlMinutes) {
  const db = getDb.call(this);
  const ttl = ttlMinutes ?? this.defaultTtlMinutes;
  const now = Date.now();
  const expiry = ttl > 0 ? now + (ttl * 60 * 1000) : null;

  if (db) {
    // SQLite backend - operaciones atómicas
    try {
      db.prepare(`
        INSERT OR REPLACE INTO cache_entries (key, value, expiry, created_at, updated_at)
        VALUES (?, ?, ?, datetime('now'), datetime('now'))
      `).run(key, JSON.stringify(data), expiry);
      return;
    } catch (err) {
      console.warn('[ram-cache] SQLite set error:', err.message);
    }
  }
  
  // Fallback: Memory Map
  if (!this.ramCache) {
    this.ramCache = new Map();
  }

  if (this.ramCache.has(key)) {
    this.ramCache.delete(key);
  }

  const maxEntries = this.maxRamEntries;
  if (this.ramCache.size >= maxEntries) {
    const oldestKey = this.ramCache.keys().next().value;
    this.ramCache.delete(oldestKey);
  }

  this.ramCache.set(key, {
    data,
    expiry,
    createdAt: now
  });
}

/**
 * Invalida una entrada del caché
 * @param {string} key - Clave a invalidar
 * @returns {boolean} - true si se eliminó
 */
export function invalidate(key) {
  const db = getDb.call(this);

  if (db) {
    try {
      if (key.includes('*') || key.includes('?')) {
        const pattern = key.replace(/\*/g, '%').replace(/\?/g, '_');
        const result = db.prepare('DELETE FROM cache_entries WHERE key LIKE ?').run(pattern);
        return result.changes > 0;
      }
      
      const result = db.prepare('DELETE FROM cache_entries WHERE key = ?').run(key);
      return result.changes > 0;
    } catch (err) {
      console.warn('[ram-cache] SQLite invalidate error:', err.message);
    }
  }

  if (!this.ramCache) return false;

  if (typeof key === 'string' && (key.includes('*') || key.includes('?'))) {
    const pattern = key.replace(/\*/g, '.*').replace(/\?/g, '.');
    const regex = new RegExp(pattern);
    let count = 0;

    for (const k of this.ramCache.keys()) {
      if (regex.test(k)) {
        this.ramCache.delete(k);
        count++;
      }
    }
    return count > 0;
  }

  return this.ramCache.delete(key);
}

/**
 * Limpia todo el caché
 */
export function clear() {
  const db = getDb.call(this);
  
  if (db) {
    try {
      db.prepare('DELETE FROM cache_entries').run();
    } catch (err) {
      console.warn('[ram-cache] SQLite clear error:', err.message);
    }
  }

  if (this.ramCache) {
    this.ramCache.clear();
  }
}

/**
 * Obtiene estadísticas del caché
 */
export function getRamStats() {
  const db = getDb.call(this);
  
  if (db) {
    try {
      const total = db.prepare('SELECT COUNT(*) as count FROM cache_entries').get();
      const expired = db.prepare('SELECT COUNT(*) as count FROM cache_entries WHERE expiry < ?').get(Date.now());
      const size = total?.count || 0;
      
      return {
        size,
        expired: expired?.count || 0,
        maxEntries: this.maxRamEntries,
        backend: 'sqlite',
        memoryUsage: 'N/A (SQLite)'
      };
    } catch (err) {
      console.warn('[ram-cache] SQLite stats error:', err.message);
    }
  }

  if (!this.ramCache) {
    return { size: 0, memoryUsage: '0 KB', backend: 'memory' };
  }

  let bytes = 0;
  for (const item of this.ramCache.values()) {
    bytes += JSON.stringify(item.data).length;
  }

  return {
    size: this.ramCache.size,
    maxEntries: this.maxRamEntries,
    memoryUsage: `${Math.round(bytes / 1024)} KB`,
    backend: 'memory'
  };
}

/**
 * Alias for get() - Compatibilidad
 */
export function ramCacheGet(key) {
  return this.get(key);
}

/**
 * Alias for set() - Compatibilidad
 */
export function ramCacheSet(key, data, ttlMinutes) {
  return this.set(key, data, ttlMinutes);
}

/**
 * Limpia entradas expiradas (mantenimiento)
 */
export function cleanupExpired() {
  const db = getDb.call(this);
  
  if (db) {
    try {
      const result = db.prepare('DELETE FROM cache_entries WHERE expiry IS NOT NULL AND expiry < ?').run(Date.now());
      if (result.changes > 0) {
        console.log(`[ram-cache] Cleaned ${result.changes} expired entries`);
      }
    } catch (err) {
      console.warn('[ram-cache] SQLite cleanup error:', err.message);
    }
  }

  // Cleanup memory cache
  if (this.ramCache) {
    const now = Date.now();
    for (const [key, item] of this.ramCache.entries()) {
      if (item.expiry && now > item.expiry) {
        this.ramCache.delete(key);
      }
    }
  }
}
