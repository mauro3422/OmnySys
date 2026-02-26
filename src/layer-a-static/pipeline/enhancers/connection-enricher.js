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
 * 
 * @version 0.9.4 - Modularizado: separado en componentes especializados
 * @since 0.7.0
 */

import { createLogger } from '#utils/logger.js';
import { extractTypeContractConnections } from '#layer-a/extractors/metadata/type-contracts/index.js';
import { extractErrorFlowConnections } from '#layer-a/extractors/metadata/error-flow/index.js';
import { extractPerformanceImpactConnections } from '#layer-a/extractors/metadata/performance-impact/index.js';
import { extractDataFlowConnections } from './connections/dataflow/index.js';
import { extractInheritedConnections } from './connections/ancestry/index.js';
import { calculateAllWeights } from './connections/weights/index.js';
import { detectConnectionConflicts } from './connections/conflicts/index.js';

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

  // Extraer todos los tipos de conexiones
  const connections = await extractAllConnections(atoms);

  // Calcular pesos
  logger.debug('Calculating connection weights...');
  const weightedConnections = calculateAllWeights(connections, atoms);

  // Detectar conflictos
  const conflicts = detectConnectionConflicts(weightedConnections);

  const duration = Date.now() - startTime;
  logger.info(`Connections enriched in ${duration}ms`);

  return {
    connections: weightedConnections,
    conflicts,
    stats: {
      temporal: (connections.temporal || []).length,
      crossFileTemporal: (connections.crossFileTemporal || []).length,
      dataFlow: connections.dataFlow.length,
      inherited: connections.inherited.length,
      conflicts: conflicts.length
    }
  };
}

/**
 * Extrae todos los tipos de conexiones
 * @private
 */
async function extractAllConnections(atoms) {
  return {
    temporal: [], // Legacy removed - to be migrated to Tree-sitter
    crossFileTemporal: [], // Legacy removed - to be migrated to Tree-sitter
    dataFlow: extractDataFlowConnections(atoms),
    typeContracts: extractTypeContractConnections(atoms),
    errorFlow: extractErrorFlowConnections(atoms),
    performance: extractPerformanceImpactConnections(atoms),
    inherited: await extractInheritedConnections(atoms)
  };
}

export default enrichConnections;
