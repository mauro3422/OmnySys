/**
 * @fileoverview Coupling Detector
 * 
 * Detecta el nivel de acoplamiento de un archivo
 * 
 * @module inference-engine/detectors/coupling-detector
 */

/**
 * Detecta nivel de acoplamiento
 * 
 * @param {Object} fileAnalysis - Análisis del archivo
 * @returns {Object} Resultado de detección
 */
export function detectCoupling(fileAnalysis) {
  const evidence = {
    incomingCount: 0,
    outgoingCount: 0,
    sharedImports: [],
    sharedExports: [],
    isHub: false,
    isLeaf: false
  };

  // Contar dependencias entrantes (quién depende de este archivo)
  evidence.incomingCount = fileAnalysis.usedBy?.length || 0;

  // Contar dependencias salientes (de quién depende este archivo)
  evidence.outgoingCount = fileAnalysis.imports?.length || 0;

  // Detectar si es un "hub" (muchos dependen de él)
  evidence.isHub = evidence.incomingCount > 10;

  // Detectar si es una "hoja" (no depende de nadie, nadie depende de él)
  evidence.isLeaf = evidence.incomingCount === 0 && evidence.outgoingCount === 0;

  // Calcular score de acoplamiento
  const totalConnections = evidence.incomingCount + evidence.outgoingCount;
  
  // Score normalizado
  const score = Math.min(1, totalConnections / 30);

  // Determinar nivel
  let level;
  if (totalConnections === 0) level = 'isolated';
  else if (totalConnections < 5) level = 'low';
  else if (totalConnections < 15) level = 'medium';
  else if (totalConnections < 30) level = 'high';
  else level = 'critical';

  return {
    detected: level === 'high' || level === 'critical',
    confidence: score,
    evidence,
    level,
    metrics: {
      totalConnections,
      incoming: evidence.incomingCount,
      outgoing: evidence.outgoingCount
    }
  };
}

export default detectCoupling;