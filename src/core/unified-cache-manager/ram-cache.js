/**
 * Obtiene un valor del caché RAM
 * @param {string} key - Clave del caché
 * @returns {any} - Valor cacheado o null
 */
export function get(key) {
  const item = this.ramCache?.get(key);

  if (!item) return null;

  // Verificar TTL
  if (Date.now() > item.expiry) {
    this.ramCache.delete(key);
    return null;
  }

  return item.data;
}

/**
 * Guarda un valor en el caché RAM
 * @param {string} key - Clave del caché
 * @param {any} data - Datos a guardar
 * @param {number} ttlMinutes - TTL en minutos (default: 5)
 */
export function set(key, data, ttlMinutes) {
  if (!this.ramCache) {
    this.ramCache = new Map();
  }

  const ttl = ttlMinutes ?? this.defaultTtlMinutes;

  // Si existe, actualizar mueve al final (LRU)
  if (this.ramCache.has(key)) {
    this.ramCache.delete(key);
  }

  // LRU eviction si alcanzamos el límite
  const maxEntries = this.maxRamEntries;
  if (this.ramCache.size >= maxEntries) {
    const oldestKey = this.ramCache.keys().next().value;
    this.ramCache.delete(oldestKey);
  }

  this.ramCache.set(key, {
    data,
    expiry: Date.now() + (ttl * 60 * 1000),
    createdAt: Date.now()
  });
}

/**
 * Invalida una entrada del caché RAM
 * @param {string} key - Clave a invalidar
 * @returns {boolean} - true si se eliminó
 */
export function invalidate(key) {
  if (!this.ramCache) return false;

  if (typeof key === 'string' && (key.includes('*') || key.includes('?'))) {
    // Patrón con wildcard
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
 * Limpia todo el caché RAM
 */
export function clear() {
  if (this.ramCache) {
    this.ramCache.clear();
  }
}

/**
 * Obtiene estadísticas del caché RAM
 */
export function getRamStats() {
  if (!this.ramCache) {
    return { size: 0, memoryUsage: '0 KB' };
  }

  let bytes = 0;
  for (const item of this.ramCache.values()) {
    bytes += JSON.stringify(item.data).length;
  }

  return {
    size: this.ramCache.size,
    maxEntries: this.maxRamEntries,
    memoryUsage: `${Math.round(bytes / 1024)} KB`
  };
}
