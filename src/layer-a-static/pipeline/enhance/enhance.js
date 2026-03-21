/**
 * @fileoverview Enhance Pipeline - Pipeline de enriquecimiento de system maps
 * 
 * @module pipeline/enhance
 * @version 0.9.4 - Modularizado
 */

import path from 'path';
import { createLogger } from '../../../utils/logger.js';
import { extractMetadataSurface } from '../metadata-gateway.js';

import {
  analyzeAllFiles
} from './analyzers/index.js';

import {
  extractAllConnections,
  dedupeConnections
} from './extractors/index.js';

import {
  calculateGraphMetrics,
  calculateRisks,
  analyzeBroken,
  generateReport
} from './analyzers/index.js';

import {
  buildEnhancedSystemMap
} from './builders/index.js';

const logger = createLogger('OmnySys:enhance');

/**
 * Genera enhanced system map con análisis semántico estático
 *
 * @param {string} absoluteRootPath - Raíz del proyecto
 * @param {object} parsedFiles - Mapa de filePath -> fileInfo
 * @param {object} systemMap - System map generado por buildGraph
 * @param {boolean} verbose - Mostrar output detallado
 * @returns {Promise<object>} - Enhanced system map
 */
export async function generateEnhancedSystemMap(
  absoluteRootPath,
  parsedFiles,
  systemMap,
  verbose = true
) {
  if (verbose) logger.info('\n🔍 Performing semantic analysis (static)...');

  const semanticAnalysis = await buildSemanticAnalysisContext(parsedFiles, absoluteRootPath, verbose);
  const connectionContext = buildConnectionContext(semanticAnalysis.enhancedFiles, semanticAnalysis.fileSourceCode, verbose);
  const riskContext = buildRiskContext(systemMap, connectionContext.semanticConnectionsByFile, semanticAnalysis.allSideEffects, connectionContext.connections, verbose);

  const enhancedSystemMap = buildEnhancedSystemMap({
    systemMap,
    enhancedFiles: semanticAnalysis.enhancedFiles,
    connections: connectionContext.connections,
    allSideEffects: semanticAnalysis.allSideEffects,
    riskScores: riskContext.riskScores,
    semanticConnectionsByFile: connectionContext.semanticConnectionsByFile,
    brokenConnectionsAnalysis: riskContext.brokenConnectionsAnalysis,
    riskReport: riskContext.riskReport,
    verbose
  });

  if (verbose) logger.info('  ✓ Enhanced system map built');

  return enhancedSystemMap;
}

async function buildSemanticAnalysisContext(parsedFiles, absoluteRootPath, verbose) {
  if (verbose) logger.info('  📊 Analyzing global state and event patterns...');

  const { enhancedFiles, allSideEffects, fileSourceCode } = await analyzeAllFiles(
    parsedFiles,
    absoluteRootPath
  );

  if (verbose) logger.info('  ✓ Semantic analysis complete');
  if (verbose) logger.info('  🔍 Extracting additional metadata...');

  await extractAdditionalMetadata(enhancedFiles, fileSourceCode, verbose);

  return { enhancedFiles, allSideEffects, fileSourceCode };
}

function buildConnectionContext(enhancedFiles, fileSourceCode, verbose) {
  if (verbose) logger.info('  🔗 Generating semantic connections...');

  const connections = extractAllConnections(enhancedFiles, fileSourceCode);

  if (verbose) {
    logConnectionStats(connections);
  }

  const allConnections = dedupeConnections([
    ...connections.sharedState,
    ...connections.events,
    ...connections.static?.localStorageConnections || [],
    ...connections.static?.eventConnections || [],
    ...connections.static?.globalConnections || [],
    ...connections.advanced?.connections || [],
    ...connections.cssInJS?.connections || [],
    ...connections.typescript?.connections || [],
    ...connections.reduxContext?.connections || []
  ]);

  return {
    connections,
    allConnections,
    semanticConnectionsByFile: groupConnectionsByFile(allConnections)
  };
}

function buildRiskContext(systemMap, semanticConnectionsByFile, allSideEffects, connections, verbose) {
  if (verbose) logger.info('  📈 Calculating risk scores...');

  const graphMetrics = calculateGraphMetrics(systemMap);
  const riskScores = calculateRisks(
    systemMap,
    semanticConnectionsByFile,
    allSideEffects,
    graphMetrics
  );

  if (verbose) logger.info('  ✓ Risk scores calculated');
  if (verbose) logger.info('  🔍 Detecting broken connections...');

  const brokenConnectionsAnalysis = analyzeBroken(systemMap, connections.advanced);

  if (verbose) logBrokenConnections(brokenConnectionsAnalysis);

  return {
    graphMetrics,
    riskScores,
    brokenConnectionsAnalysis,
    riskReport: generateReport(riskScores)
  };
}

/**
 * Extrae metadatos adicionales de cada archivo
 * @private
 */
async function extractAdditionalMetadata(enhancedFiles, fileSourceCode, verbose) {
  for (const [filePath, fileInfo] of Object.entries(enhancedFiles)) {
    try {
      const code = fileSourceCode[filePath] || '';
      const metadata = await extractMetadataSurface({
        mode: 'file',
        filePath,
        code
      });

      enhancedFiles[filePath].metadata = {
        jsdocContracts: metadata.jsdoc,
        runtimeContracts: metadata.runtime,
        asyncPatterns: metadata.async,
        errorHandling: metadata.errors,
        buildTimeDeps: metadata.build
      };
    } catch (error) {
      // Silently skip metadata extraction errors
    }
  }

  if (verbose) {
    const totalJSDoc = Object.values(enhancedFiles).reduce(
      (sum, f) => sum + (f.metadata?.jsdocContracts?.all?.length || 0),
      0
    );
    const totalAsync = Object.values(enhancedFiles).reduce(
      (sum, f) => sum + (f.metadata?.asyncPatterns?.all?.length || 0),
      0
    );
    logger.info(`  ✓ Metadata extracted: ${totalJSDoc} JSDoc, ${totalAsync} async patterns`);
  }
}

/**
 * Agrupa conexiones por archivo
 * @private
 */
function groupConnectionsByFile(connections) {
  const byFile = {};
  for (const conn of connections) {
    if (!byFile[conn.sourceFile]) {
      byFile[conn.sourceFile] = [];
    }
    byFile[conn.sourceFile].push(conn);
  }
  return byFile;
}

/**
 * Log de estadísticas de conexiones
 * @private
 */
function logConnectionStats(connections) {
  logger.info(`  ✓ Additional connections found:`);
  logger.info(`    - ${connections.cssInJS?.connections?.length || 0} CSS-in-JS connections`);
  logger.info(`    - ${connections.typescript?.connections?.length || 0} TypeScript connections`);
  logger.info(`    - ${connections.reduxContext?.connections?.length || 0} Redux/Context connections`);
  logger.info(`    - ${connections.static?.localStorageConnections?.length || 0} localStorage connections`);
  logger.info(`    - ${connections.static?.eventConnections?.length || 0} event connections`);
  logger.info(`    - ${connections.advanced?.connections?.length || 0} advanced connections`);
}

/**
 * Log de conexiones rotas
 * @private
 */
function logBrokenConnections(analysis) {
  logger.info(`  ✓ Broken connections analysis:`);
  logger.info(`    - ${analysis.brokenWorkers?.total || 0} broken workers`);
  logger.info(`    - ${analysis.deadFunctions?.total || 0} dead functions`);
  logger.info(`    - ${analysis.duplicateFunctions?.total || 0} duplicate functions`);
  logger.info(`    - ${analysis.suspiciousUrls?.total || 0} suspicious URLs`);
  if (analysis.summary?.critical > 0) {
    logger.info(`    ⚠️  ${analysis.summary.critical} CRITICAL issues found!`);
  }
}

export default generateEnhancedSystemMap;
