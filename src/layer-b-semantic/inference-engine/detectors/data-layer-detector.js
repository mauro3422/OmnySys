/**
 * @fileoverview Data Layer Detector
 * 
 * Detecta si un archivo es parte de la capa de datos
 * (storage, database, cache, models)
 * 
 * @module inference-engine/detectors/data-layer-detector
 */

/**
 * Detecta patrón de data layer
 * 
 * @param {Object} fileAnalysis - Análisis del archivo
 * @returns {Object} Resultado de detección
 */
export function detectDataLayer(fileAnalysis) {
  const evidence = {
    hasStorageAccess: false,
    hasDatabasePatterns: false,
    hasModelPatterns: false,
    hasCachePatterns: false,
    storageKeys: [],
    operations: []
  };

  const atoms = fileAnalysis.atoms || [];
  const filePath = fileAnalysis.filePath || '';
  const imports = fileAnalysis.imports || [];

  // Verificar imports de librerías de datos
  const dataImports = ['mongoose', 'sequelize', 'prisma', 'pg', 'mysql', 'redis', 'mongodb'];
  evidence.hasDatabasePatterns = imports.some(i => 
    dataImports.some(d => (i.source || i)?.includes(d))
  );

  // Verificar patrones de storage en side effects
  for (const atom of atoms) {
    // Storage access
    if (atom.sideEffects) {
      const storageEffects = atom.sideEffects.filter(s => 
        s.category === 'storage' || s.type === 'webStorage'
      );
      if (storageEffects.length > 0) {
        evidence.hasStorageAccess = true;
        evidence.storageKeys.push(...storageEffects.map(s => s.code));
      }
    }

    // Nombres de funciones típicas de data layer
    const name = atom.name?.toLowerCase() || '';
    const dataPatterns = ['save', 'find', 'query', 'insert', 'update', 'delete', 'get', 'set', 'cache'];
    if (dataPatterns.some(p => name.includes(p))) {
      evidence.operations.push(atom.name);
    }

    // Cache patterns
    if (atom.calls?.some(c => 
      ['cache', 'redis', 'memcached'].some(cache => 
        c.name?.toLowerCase().includes(cache)
      )
    )) {
      evidence.hasCachePatterns = true;
    }
  }

  // Verificar patrones de model por nombre de archivo
  const modelPatterns = ['model', 'schema', 'entity', 'repository', 'dao', 'store'];
  evidence.hasModelPatterns = modelPatterns.some(p => 
    filePath.toLowerCase().includes(p)
  );

  // Calcular score
  const score = [
    evidence.hasStorageAccess ? 0.25 : 0,
    evidence.hasDatabasePatterns ? 0.35 : 0,
    evidence.hasModelPatterns ? 0.2 : 0,
    evidence.hasCachePatterns ? 0.2 : 0
  ].reduce((a, b) => a + b, 0);

  return {
    detected: score >= 0.4,
    confidence: Math.min(1, score),
    evidence
  };
}

export default detectDataLayer;