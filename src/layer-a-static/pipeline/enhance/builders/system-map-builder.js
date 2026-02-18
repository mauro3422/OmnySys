/**
 * @fileoverview System Map Builder - Construcción del enhanced system map
 * 
 * @module pipeline/enhance/builders
 */

import { detectGodObject, detectOrphanModule } from '#shared/architecture-utils.js';

/**
 * Detecta arquetipos arquitectónicos
 * @param {number} exportCount - Número de exports
 * @param {number} dependentCount - Número de dependientes
 * @returns {Object|null} Arquetipo detectado
 */
export function detectArchetype(exportCount, dependentCount) {
  if (detectGodObject(exportCount, dependentCount)) {
    return {
      type: 'GOD_OBJECT',
      reason: `High coupling: ${dependentCount} dependents, ${exportCount} exports`
    };
  }

  if (detectOrphanModule(exportCount, dependentCount)) {
    return {
      type: 'ORPHAN_MODULE',
      reason: `No dependents but has ${exportCount} exports`
    };
  }

  return null;
}

/**
 * Enriquece un archivo individual
 * @param {string} filePath - Ruta del archivo
 * @param {Object} fileInfo - Información del archivo
 * @param {Object} baseFile - Archivo base del system map
 * @param {Object} connections - Conexiones del archivo
 * @param {Object} riskScore - Risk score
 * @param {Object} sideEffects - Side effects
 * @returns {Object} Archivo enriquecido
 */
export function enrichFile(filePath, fileInfo, baseFile, connections, riskScore, sideEffects) {
  const exportCount = (baseFile.exports || []).length;
  const dependentCount = (baseFile.usedBy || []).length;

  const archetype = detectArchetype(exportCount, dependentCount);

  return {
    ...JSON.parse(JSON.stringify(baseFile || {})),
    ...JSON.parse(JSON.stringify(fileInfo || {})),
    semanticConnections: connections || [],
    riskScore: riskScore,
    sideEffects: sideEffects?.sideEffects || {},
    sideEffectDetails: sideEffects?.details || {},
    archetype: archetype || undefined
  };
}

/**
 * Construye el enhanced system map
 * @param {Object} params - Parámetros de construcción
 * @returns {Object} Enhanced system map
 */
export function buildEnhancedSystemMap(params) {
  const {
    systemMap,
    enhancedFiles,
    connections,
    allSideEffects,
    riskScores,
    semanticConnectionsByFile,
    brokenConnectionsAnalysis,
    verbose
  } = params;

  const enhancedSystemMap = {
    metadata: {
      ...systemMap.metadata,
      enhanced: true,
      enhancedAt: new Date().toISOString(),
      analysisVersion: '3.5.0',
      includes: ['static', 'semantic-static', 'risk-scoring'],
      llmEnrichment: { enabled: false }
    },
    files: {},
    connections: {
      sharedState: connections.sharedState,
      eventListeners: connections.events,
      localStorage: connections.static?.localStorageConnections || [],
      advanced: connections.advanced?.connections || [],
      cssInJS: connections.cssInJS?.connections || [],
      typescript: connections.typescript?.connections || [],
      reduxContext: connections.reduxContext?.connections || [],
      total: 0
    },
    structures: {
      storeStructure: connections.reduxContext?.storeStructure || { slices: [] },
      typeDefinitions: connections.typescript?.fileResults || {},
      cssInJSFiles: connections.cssInJS?.fileResults || {}
    },
    riskAssessment: {
      scores: riskScores,
      report: params.riskReport
    },
    semanticIssues: { stats: { totalIssues: 0 } },
    brokenConnections: brokenConnectionsAnalysis || { summary: { total: 0 } }
  };

  // Calcular total de conexiones
  enhancedSystemMap.connections.total = [
    ...enhancedSystemMap.connections.sharedState,
    ...enhancedSystemMap.connections.eventListeners,
    ...enhancedSystemMap.connections.localStorage,
    ...enhancedSystemMap.connections.advanced,
    ...enhancedSystemMap.connections.cssInJS,
    ...enhancedSystemMap.connections.typescript,
    ...enhancedSystemMap.connections.reduxContext
  ].length;

  // Enriquecer cada archivo
  for (const [filePath, fileInfo] of Object.entries(enhancedFiles)) {
    const riskScore = riskScores[filePath];
    const connections = semanticConnectionsByFile[filePath] || [];
    const sideEffects = allSideEffects[filePath];

    enhancedSystemMap.files[filePath] = enrichFile(
      filePath,
      fileInfo,
      systemMap.files[filePath],
      connections,
      riskScore,
      sideEffects
    );
  }

  return enhancedSystemMap;
}
