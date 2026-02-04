/**
 * Query Cache - Cache en RAM para datos frecuentemente accedidos
 *
 * - Almacena datos en memoria
 * - Auto-expira después de TTL
 * - Fallback a disco si expira
 */

export class QueryCache {
  constructor(ttlMinutes = 5, maxEntries = 1000) {
    this.cache = new Map();
    this.ttlMs = ttlMinutes * 60 * 1000;
    this.maxEntries = maxEntries; // Límite máximo de entradas
    this.stats = {
      hits: 0,
      misses: 0,
      expirations: 0,
      evictions: 0 // Nuevo: contador de evicciones LRU
    };
  }

  /**
   * Obtiene un valor del caché
   */
  get(key) {
    const item = this.cache.get(key);

    if (!item) {
      this.stats.misses++;
      return null;
    }

    // Verificar si expiró
    if (Date.now() > item.expiry) {
      this.cache.delete(key);
      this.stats.expirations++;
      return null;
    }

    this.stats.hits++;
    return item.data;
  }

  /**
   * Guarda un valor en caché (con LRU eviction si se alcanza el límite)
   */
  set(key, data) {
    // Si la clave ya existe, la actualizamos (mueve al final en Map)
    if (this.cache.has(key)) {
      this.cache.delete(key);
    }
    
    // LRU Eviction: si estamos en el límite, eliminar la entrada más antigua
    if (this.cache.size >= this.maxEntries) {
      const oldestKey = this.cache.keys().next().value;
      this.cache.delete(oldestKey);
      this.stats.evictions++;
    }
    
    this.cache.set(key, {
      data,
      expiry: Date.now() + this.ttlMs,
      createdAt: new Date().toISOString()
    });
  }

  /**
   * Invalida caché por patrón
   */
  invalidate(pattern) {
    let count = 0;
    for (const key of this.cache.keys()) {
      if (key.includes(pattern)) {
        this.cache.delete(key);
        count++;
      }
    }
    return count;
  }

  /**
   * Limpia todo el caché
   */
  clear() {
    const size = this.cache.size;
    this.cache.clear();
    return size;
  }

  /**
   * Obtiene estadísticas del caché
   */
  getStats() {
    const totalRequests = this.stats.hits + this.stats.misses;
    const hitRate =
      totalRequests > 0
        ? ((this.stats.hits / totalRequests) * 100).toFixed(1)
        : 0;

    return {
      ...this.stats,
      totalRequests,
      hitRate: `${hitRate}%`,
      cacheSize: this.cache.size,
      maxEntries: this.maxEntries,
      memoryUsage: this._estimateMemory()
    };
  }

  /**
   * Estima el uso de memoria del caché
   */
  _estimateMemory() {
    let bytes = 0;
    for (const item of this.cache.values()) {
      bytes += JSON.stringify(item.data).length;
    }
    return `${Math.round(bytes / 1024)} KB`;
  }
}

/**
 * Instancia global del caché
 */
export const globalCache = new QueryCache(5); // 5 minutos TTL
