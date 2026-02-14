/**
 * @fileoverview DataFlow Extractor - Extracción de conexiones de flujo de datos
 * 
 * @module pipeline/enhancers/connections/dataflow
 */

import { createLogger } from '../../../../utils/logger.js';

const logger = createLogger('OmnySys:connections:dataflow');

/**
 * Extrae conexiones de data flow entre funciones
 * 
 * Conecta: output de función A → input de función B
 * 
 * @param {Array} atoms - Todos los átomos
 * @returns {Array} Conexiones de data flow
 */
export function extractDataFlowConnections(atoms) {
  const connections = [];
  
  // Indexar por tipo de retorno/shape
  const outputIndex = new Map();
  
  for (const atom of atoms) {
    if (!atom.dataFlow?.outputs) continue;
    
    for (const output of atom.dataFlow.outputs) {
      const key = generateTypeKey(output);
      if (!outputIndex.has(key)) {
        outputIndex.set(key, []);
      }
      outputIndex.get(key).push({
        atom,
        output,
        type: output.type
      });
    }
  }
  
  // Buscar inputs que coincidan con outputs
  for (const atom of atoms) {
    if (!atom.dataFlow?.inputs) continue;
    
    for (const input of atom.dataFlow.inputs) {
      const key = generateTypeKey(input);
      const potentialSources = outputIndex.get(key) || [];
      
      for (const source of potentialSources) {
        if (source.atom.id !== atom.id) {
          connections.push({
            type: 'data-flow-chain',
            from: source.atom.id,
            to: atom.id,
            dataType: key,
            relationship: 'produces-consumes',
            confidence: calculateDataFlowConfidence(source, input),
            evidence: {
              outputShape: source.output.shape,
              inputType: input.type,
              transformation: source.output.type === 'side_effect' ? 'persisted' : 'direct'
            }
          });
        }
      }
    }
  }
  
  logger.debug(`Extracted ${connections.length} data flow connections`);
  return connections;
}

/**
 * Genera una clave de tipo para matching
 * @param {Object} data - Datos de tipo
 * @returns {string} Clave generada
 */
export function generateTypeKey(data) {
  if (data.shape) {
    return JSON.stringify(data.shape).replace(/"/g, '');
  }
  if (data.type) {
    return data.type;
  }
  return 'unknown';
}

/**
 * Calcula confianza de match de data flow
 * @param {Object} source - Origen del dato
 * @param {Object} input - Input destino
 * @returns {number} Confianza 0-1
 */
export function calculateDataFlowConfidence(source, input) {
  let confidence = 0.5;
  
  // Mismo archivo = más probable
  if (source.atom.filePath === input.filePath) {
    confidence += 0.2;
  }
  
  // Source es exportada = más probable
  if (source.atom.isExported) {
    confidence += 0.15;
  }
  
  // Hay call graph entre ellas = mucho más probable
  const callsSource = source.atom.calls?.some(c => 
    c.includes(input.name) || c.includes(input.id)
  );
  if (callsSource) {
    confidence += 0.3;
  }
  
  return Math.min(confidence, 1.0);
}
