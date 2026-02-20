/**
 * @fileoverview API Pattern Detector
 * 
 * Detecta si un archivo es una API/endpoint basándose en patrones
 * sin necesidad de LLM.
 * 
 * @module inference-engine/detectors/api-detector
 */

/**
 * Detecta patrón de API
 * 
 * @param {Object} fileAnalysis - Análisis del archivo
 * @returns {Object} Resultado de detección
 */
export function detectAPIPattern(fileAnalysis) {
  const evidence = {
    hasNetworkCalls: false,
    hasRoutingPatterns: false,
    hasRequestHandlers: false,
    hasResponsePatterns: false,
    exportedEndpoints: []
  };

  const atoms = fileAnalysis.atoms || [];
  const filePath = fileAnalysis.filePath || '';

  // Verificar network calls en átomos
  evidence.hasNetworkCalls = atoms.some(a => a.hasNetworkCalls);

  // Verificar patrones de routing por nombre de archivo
  const routingPatterns = ['route', 'api', 'endpoint', 'controller', 'handler'];
  evidence.hasRoutingPatterns = routingPatterns.some(p => 
    filePath.toLowerCase().includes(p)
  );

  // Verificar handlers de request por análisis de átomos
  for (const atom of atoms) {
    const name = atom.name?.toLowerCase() || '';
    
    // Nombres típicos de handlers
    const handlerPatterns = ['handle', 'process', 'execute', 'get', 'post', 'put', 'delete'];
    if (handlerPatterns.some(p => name.includes(p))) {
      evidence.hasRequestHandlers = true;
    }

    // Parámetros típicos de handlers HTTP
    const params = atom.params?.map(p => p.name?.toLowerCase()) || [];
    if (params.some(p => ['req', 'res', 'request', 'response', 'ctx', 'context'].includes(p))) {
      evidence.hasResponsePatterns = true;
      evidence.exportedEndpoints.push(atom.name);
    }
  }

  // Determinar si es API
  const score = [
    evidence.hasNetworkCalls ? 0.3 : 0,
    evidence.hasRoutingPatterns ? 0.2 : 0,
    evidence.hasRequestHandlers ? 0.25 : 0,
    evidence.hasResponsePatterns ? 0.25 : 0
  ].reduce((a, b) => a + b, 0);

  return {
    detected: score >= 0.5,
    confidence: Math.min(1, score),
    evidence
  };
}

export default detectAPIPattern;