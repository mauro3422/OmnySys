const statusResponseCache = new Map();

export function getStatusResponseCacheEntry(cacheKey) {
  return statusResponseCache.get(cacheKey) || null;
}

export function setStatusResponseCacheEntry(cacheKey, response) {
  statusResponseCache.set(cacheKey, {
    capturedAt: Date.now(),
    response
  });
}

export function clearStatusResponseCache() {
  statusResponseCache.clear();
}
