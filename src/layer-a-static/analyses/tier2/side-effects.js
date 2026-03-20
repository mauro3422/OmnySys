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
const SIDE_EFFECT_PATTERNS = [
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

function findSideEffectMarker(functionName) {
  const funcNameLower = String(functionName || '').toLowerCase();

  for (const pattern of SIDE_EFFECT_PATTERNS) {
    if (funcNameLower.includes(pattern)) {
      return pattern;
    }
  }

  return null;
}

export function detectSideEffectMarkers(systemMap) {
  if (!systemMap || !systemMap.files) {
    return { total: 0, markers: [] };
  }

  const files = systemMap.files;
  const markers = [];

  for (const [filePath, fileNode] of Object.entries(files)) {
    const fileFunctions = fileNode.functions || [];

    for (const func of fileFunctions) {
      const marker = findSideEffectMarker(func.name);
      if (!marker) {
        continue;
      }

      markers.push({
        file: filePath,
        function: func.name,
        suspectedSideEffect: true,
        marker,
        recommendation: 'Verify this function has no hidden side effects'
      });
    }
  }

  return {
    total: markers.length,
    functions: markers.slice(0, 20),
    note: 'These are pattern-based guesses - verify manually'
  };
}
