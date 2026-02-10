/**
 * @fileoverview Connection Enricher - Post-procesamiento de conexiones
 * 
 * Enriquece las conexiones básicas con metadatos adicionales:
 * - Cables temporales (orden de ejecución)
 * - Cables de data flow cross-function
 * - Cables de error flow
 * - Ponderación basada en ancestry
 * 
 * SSOT: Único lugar donde se calculan conexiones enriquecidas.
 * 
 * @module pipeline/enhancers/connection-enricher
 */

import { createLogger } from '../../../utils/logger.js';
import { extractTemporalConnections, extractCrossFileTemporalConnections } from '../../extractors/metadata/temporal-connections.js';
import { extractTypeContractConnections } from '../../extractors/metadata/type-contracts.js';
import { extractErrorFlowConnections } from '../../extractors/metadata/error-flow.js';
import { extractPerformanceImpactConnections } from '../../extractors/metadata/performance-impact.js';

const logger = createLogger('OmnySys:pipeline:connection-enricher');

/**
 * Enriquece todas las conexiones del proyecto
 * 
 * @param {Array} atoms - Todos los átomos del proyecto
 * @param {Object} options
 * @returns {Object} Conexiones enriquecidas
 */
export async function enrichConnections(atoms, options = {}) {
  logger.info(`Enriching connections for ${atoms.length} atoms...`);
  
  const startTime = Date.now();
  
  // 1. Conexiones temporales
  logger.debug('Extracting temporal connections...');
  const temporalConnections = extractTemporalConnections(atoms);
  
  // 2. Conexiones temporales cross-file
  const crossFileTemporal = extractCrossFileTemporalConnections(atoms);
  
  // 3. Conexiones de data flow cross-function
  const dataFlowConnections = extractDataFlowConnections(atoms);
  
  // 4. Conexiones de type contracts (NUEVO)
  logger.debug('Extracting type contract connections...');
  const typeContractConnections = extractTypeContractConnections(atoms);
  
  // 5. Conexiones de error flow (NUEVO)
  logger.debug('Extracting error flow connections...');
  const errorFlowConnections = extractErrorFlowConnections(atoms);
  
  // 6. Conexiones de performance impact (NUEVO)
  logger.debug('Extracting performance impact connections...');
  const performanceConnections = extractPerformanceImpactConnections(atoms);
  
  // 7. Conexiones heredadas de ancestry (Shadow Registry)
  logger.debug('Extracting inherited connections...');
  const inheritedConnections = await extractInheritedConnections(atoms);
  
  // 5. Calcular pesos de conexión
  logger.debug('Calculating connection weights...');
  const weightedConnections = calculateAllWeights({
    temporal: temporalConnections,
    crossFileTemporal,
    dataFlow: dataFlowConnections,
    typeContracts: typeContractConnections,
    errorFlow: errorFlowConnections,
    performance: performanceConnections,
    inherited: inheritedConnections
  }, atoms);
  
  // 6. Detectar conflictos potenciales
  const conflicts = detectConnectionConflicts(weightedConnections);
  
  const duration = Date.now() - startTime;
  logger.info(`Connections enriched in ${duration}ms`);
  
  return {
    connections: weightedConnections,
    conflicts,
    stats: {
      temporal: temporalConnections.length,
      crossFileTemporal: crossFileTemporal.length,
      dataFlow: dataFlowConnections.length,
      inherited: inheritedConnections.length,
      conflicts: conflicts.length
    }
  };
}

/**
 * Extrae conexiones de data flow entre funciones
 * 
 * Conecta: output de función A → input de función B
 */
function extractDataFlowConnections(atoms) {
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
  
  return connections;
}

/**
 * Genera una clave de tipo para matching
 */
function generateTypeKey(data) {
  // Simplificado - en producción usaría type inference más sofisticado
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
 */
function calculateDataFlowConfidence(source, input) {
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

/**
 * Extrae conexiones heredadas de ancestry (Shadow Registry)
 * 
 * NOTA: Esta función usa datos ya presentes en los átomos (ancestry),
 * no consulta directamente al Shadow Registry para evitar dependencias
 * circulares entre layers.
 */
async function extractInheritedConnections(atoms) {
  const connections = [];
  
  try {
    
    for (const atom of atoms) {
      if (!atom.ancestry?.replaced) continue;
      
      // Conexiones fuertes que sobrevivieron (ya vienen en el átomo)
      for (const conn of atom.ancestry.strongConnections || []) {
        connections.push({
          type: 'inherited',
          from: atom.id,
          to: conn.target,
          weight: conn.weight,
          generation: atom.ancestry.generation,
          inheritedFrom: atom.ancestry.replaced,
          confidence: 0.7,
          evidence: {
            survivalGenerations: atom.ancestry.generation
          }
        });
      }
      
      // Advertencias de conexiones rotas
      for (const warning of atom.ancestry.warnings || []) {
        if (warning.type === 'ruptured_lineage') {
          for (const target of warning.connections || []) {
            connections.push({
              type: 'ruptured',
              from: atom.id,
              to: target,
              status: 'broken',
              warning: true,
              confidence: 0.9,
              reason: 'Connection existed in ancestor but not in current'
            });
          }
        }
      }
    }
  } catch (error) {
    logger.warn('Failed to extract inherited connections:', error.message);
  }
  
  return connections;
}

/**
 * Calcula pesos de todas las conexiones
 */
function calculateAllWeights(connections, atoms) {
  const allConnections = [];
  
  // Indexar átomos por ID para lookup rápido
  const atomIndex = new Map(atoms.map(a => [a.id, a]));
  
  // Procesar cada tipo de conexión
  for (const [type, conns] of Object.entries(connections)) {
    for (const conn of conns) {
      const weight = calculateConnectionWeight(conn, atomIndex);
      allConnections.push({
        ...conn,
        weight,
        connectionCategory: getConnectionCategory(weight)
      });
    }
  }
  
  // Ordenar por peso descendente
  return allConnections.sort((a, b) => b.weight - a.weight);
}

/**
 * Calcula peso de una conexión específica
 */
function calculateConnectionWeight(conn, atomIndex) {
  let weight = 0;
  
  // Base según tipo
  const typeWeights = {
    'import': 1.0,
    'export': 1.0,
    'data-flow-chain': 0.8,
    'temporal-dependency': 0.9,
    'cross-file-temporal': 0.85,
    'inherited': 0.6,
    'semantic': 0.7,
    'error-flow': 0.75
  };
  
  weight += typeWeights[conn.type] || 0.5;
  
  // Multiplicar por confianza
  weight *= (conn.confidence || 0.5);
  
  // Bonus por vibration del átomo origen
  const fromAtom = atomIndex.get(conn.from);
  if (fromAtom?.ancestry?.vibrationScore) {
    weight *= (1 + fromAtom.ancestry.vibrationScore * 0.3);
  }
  
  // Penalización por conexiones rotas
  if (conn.status === 'broken') {
    weight *= 0.3;
  }
  
  // Bonus por generación (ancestry más antiguo = más estable)
  if (conn.generation && conn.generation > 1) {
    weight *= (1 + conn.generation * 0.1);
  }
  
  return Math.min(weight, 2.0); // Cap en 2.0
}

/**
 * Categoriza conexión por peso
 */
function getConnectionCategory(weight) {
  if (weight >= 1.2) return 'critical';
  if (weight >= 0.9) return 'strong';
  if (weight >= 0.6) return 'medium';
  return 'weak';
}

/**
 * Detecta conflictos potenciales entre conexiones
 */
function detectConnectionConflicts(connections) {
  const conflicts = [];
  
  // Detectar ciclos temporales
  const temporalConns = connections.filter(c => 
    c.type.includes('temporal') && c.relationship === 'must-run-before'
  );
  
  // Grafo de dependencias temporales
  const graph = new Map();
  for (const conn of temporalConns) {
    if (!graph.has(conn.from)) graph.set(conn.from, []);
    graph.get(conn.from).push(conn.to);
  }
  
  // Detectar ciclos
  const visited = new Set();
  const recStack = new Set();
  
  function hasCycle(node, path = []) {
    visited.add(node);
    recStack.add(node);
    
    const neighbors = graph.get(node) || [];
    for (const neighbor of neighbors) {
      if (!visited.has(neighbor)) {
        if (hasCycle(neighbor, [...path, node])) return true;
      } else if (recStack.has(neighbor)) {
        // Ciclo detectado
        conflicts.push({
          type: 'temporal-cycle',
          severity: 'critical',
          cycle: [...path, node, neighbor],
          message: 'Circular temporal dependency detected',
          fix: 'Review initialization order'
        });
        return true;
      }
    }
    
    recStack.delete(node);
    return false;
  }
  
  for (const node of graph.keys()) {
    if (!visited.has(node)) {
      hasCycle(node);
    }
  }
  
  // Detectar race conditions potenciales
  const samePhaseConns = connections.filter(c => 
    c.relationship === 'same-execution-phase' && c.potentialRace
  );
  
  for (const conn of samePhaseConns) {
    conflicts.push({
      type: 'potential-race',
      severity: 'warning',
      between: [conn.from, conn.to],
      phase: conn.phase,
      message: `Functions ${conn.from} and ${conn.to} run in same phase - potential race`,
      fix: 'Consider explicit ordering or synchronization'
    });
  }
  
  return conflicts;
}
