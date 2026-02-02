/**
 * Reachability Analyzer
 *
 * Responsabilidad:
 * - Analizar qué código es alcanzable desde puntos de entrada
 *
 * @param {object} systemMap - SystemMap generado por graph-builder
 * @returns {object} - Reporte de reachability
 */
export function analyzeReachability(systemMap) {
  // Estimar entry points (archivos con pocas dependencias entrantes)
  const likelyEntryPoints = Object.entries(systemMap.files)
    .filter(([path, node]) => {
      const usedByCount = node.usedBy?.length || 0;
      return usedByCount === 0;
    })
    .map(([path]) => path);

  // Contar archivos alcanzables
  const reachable = new Set();
  const unreachable = new Set();

  function traverse(filePath) {
    if (reachable.has(filePath)) return;
    reachable.add(filePath);

    const fileNode = systemMap.files[filePath];
    if (fileNode && fileNode.dependsOn) {
      fileNode.dependsOn.forEach(dep => traverse(dep));
    }
  }

  // Traverse desde entry points
  likelyEntryPoints.forEach(ep => traverse(ep));

  // El resto es "unreachable"
  Object.keys(systemMap.files).forEach(file => {
    if (!reachable.has(file)) {
      unreachable.add(file);
    }
  });

  const reachablePercent = (reachable.size / systemMap.metadata.totalFiles) * 100;

  return {
    totalFiles: systemMap.metadata.totalFiles,
    reachable: reachable.size,
    unreachable: unreachable.size,
    reachablePercent: reachablePercent.toFixed(1),
    likelyEntryPoints: likelyEntryPoints,
    deadCodeFiles: Array.from(unreachable).slice(0, 10),
    concern: reachablePercent < 70 ? 'HIGH' : reachablePercent < 85 ? 'MEDIUM' : 'LOW'
  };
}
