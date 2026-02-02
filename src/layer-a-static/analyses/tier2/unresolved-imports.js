/**
 * Unresolved Imports Analyzer
 *
 * Responsabilidad:
 * - Encontrar imports que no se resolvieron (rotos)
 * - Filtrar módulos externos legítimos (Node.js, npm packages)
 *
 * @param {object} systemMap - SystemMap generado por graph-builder
 * @returns {object} - Reporte de imports sin resolver
 */
export function findUnresolvedImports(systemMap) {
  const unresolvedByFile = {};
  let realIssues = 0;

  // Filtrar solo los imports que son realmente problemáticos
  // Excluir módulos externos (Node.js, npm) que tienen severity LOW
  for (const [filePath, imports] of Object.entries(systemMap.unresolvedImports || {})) {
    const problematicImports = imports.filter(imp => {
      // Solo incluir si severity es HIGH (verdadero problema)
      // Excluir si es external (módulos de Node.js o npm)
      return imp.severity === 'HIGH' && imp.type !== 'external';
    });

    if (problematicImports.length > 0) {
      unresolvedByFile[filePath] = problematicImports;
      realIssues += problematicImports.length;
    }
  }

  return {
    total: realIssues,
    byFile: unresolvedByFile,
    recommendation: realIssues > 0 ? `Fix ${realIssues} unresolved import(s) - they may break at runtime` : 'All imports resolved'
  };
}
