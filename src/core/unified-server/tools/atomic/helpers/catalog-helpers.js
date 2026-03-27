export function lookupCatalogValue(key, catalog, fallbackKey = 'default') {
  if (!catalog || typeof catalog !== 'object') {
    return undefined;
  }

  return catalog[key] || catalog[fallbackKey];
}

export function buildMetricCategories(severity) {
  if (severity > 7) return 'critical';
  if (severity > 4) return 'high';
  if (severity > 2) return 'medium';
  return 'low';
}
