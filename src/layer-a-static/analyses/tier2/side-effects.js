/**
 * Side Effects Detector
 *
 * Responsabilidad:
 * - Detectar funciones/archivos que podrían tener efectos secundarios
 *   (Basado en patrones de nombres y referencias)
 *
 * @param {object} systemMap - SystemMap generado por graph-builder
 * @returns {object} - Reporte de posibles side effects
 */
export function detectSideEffectMarkers(systemMap) {
  if (!systemMap || !systemMap.files) {
    return { total: 0, markers: [] };
  }
  
  const markers = [];
  const sideEffectPatterns = [
    'init',
    'setup',
    'start',
    'configure',
    'register',
    'listen',
    'watch',
    'subscribe',
    'connect',
    'open'
  ];

  for (const [filePath, fileNode] of Object.entries(systemMap.files)) {
    const fileFunctions = (systemMap.files[filePath] && systemMap.files[filePath].functions) || [];

    for (const func of fileFunctions) {
      const funcNameLower = func.name.toLowerCase();
      const hasSideEffectMarker = sideEffectPatterns.some(pattern =>
        funcNameLower.includes(pattern)
      );

      if (hasSideEffectMarker) {
        markers.push({
          file: filePath,
          function: func.name,
          suspectedSideEffect: true,
          marker: sideEffectPatterns.find(p => funcNameLower.includes(p)),
          recommendation: 'Verify this function has no hidden side effects'
        });
      }
    }
  }

  return {
    total: markers.length,
    functions: markers.slice(0, 20), // Top 20
    note: 'These are pattern-based guesses - verify manually'
  };
}
