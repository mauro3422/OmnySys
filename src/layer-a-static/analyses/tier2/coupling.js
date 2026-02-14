/**
 * Coupling Analyzer
 *
 * Responsabilidad:
 * - Analizar acoplamiento entre archivos (cuánto dependen uno del otro)
 *
 * @param {object} systemMap - SystemMap generado por graph-builder
 * @returns {object} - Reporte de acoplamiento
 */
export function analyzeCoupling(systemMap) {
  // Handle null/undefined input gracefully
  if (!systemMap) {
    return { couplings: [], total: 0 };
  }

  const couplings = [];

  for (const [filePath, fileNode] of Object.entries(systemMap.files || {})) {
    // Handle missing dependsOn gracefully
    if (!fileNode?.dependsOn?.length) continue;
    
    const bidirectionalDeps = fileNode.dependsOn.filter(dep =>
      systemMap.files[dep]?.usedBy?.includes(filePath)
    );

    if (bidirectionalDeps.length > 0) {
      couplings.push({
        file: filePath,
        coupledWith: bidirectionalDeps,
        couplingStrength: bidirectionalDeps.length,
        recommendation:
          bidirectionalDeps.length > 2
            ? 'High coupling detected - consider refactoring'
            : 'Moderate coupling'
      });
    }
  }

  return {
    total: couplings.length,
    coupledFiles: couplings.sort((a, b) => b.couplingStrength - a.couplingStrength),
    maxCoupling:
      couplings.length > 0 ? Math.max(...couplings.map(c => c.couplingStrength)) : 0,
    concern: couplings.length > 5 ? 'HIGH' : 'LOW'
  };
}
