/**
 * @fileoverview System Map Enhancer (LEGACY) - Pipeline de enriquecimiento completo
 *
 * @deprecated Usar los nuevos orquestadores: runEnhancers y runProjectEnhancers
 *
 * Responsabilidad Única (SRP): Mantener compatibilidad con código existente que usa
 * enhanceSystemMap. Esta función completa está siendo descompuesta en partes más pequeñas.
 *
 * @module pipeline/enhancers/legacy
 */

import { detectAllSemanticConnections } from '../../../extractors/static/index.js';
import { calculateAllRiskScores, generateRiskReport } from '../../../analyses/tier3/index.js';
import { buildSourceCodeMap } from '../builders/source-code-builder.js';
import { collectSemanticIssues } from '../analyzers/semantic-issue-analyzer.js';
import { createLogger } from '../../../../utils/logger.js';

const logger = createLogger('OmnySys:pipeline:enhancers:legacy');

function attachSemanticDataToFiles(enhancedFiles, semanticResults, allConnections) {
  for (const [filePath, fileData] of Object.entries(enhancedFiles || {})) {
    const fileSemantics = semanticResults.fileResults[filePath];
    if (fileSemantics) {
      fileData.semanticAnalysis = {
        localStorage: fileSemantics.localStorage || [],
        events: fileSemantics.events || [],
        globals: fileSemantics.globals || [],
        routes: fileSemantics.routes || [],
        envVars: fileSemantics.envVars || []
      };
    }
    fileData.semanticConnections = allConnections.filter(
      c => c.sourceFile === filePath || c.targetFile === filePath
    );
  }
}

function buildGraphMetrics(enhancedFiles) {
  const graphMetrics = {};
  for (const [filePath, fileData] of Object.entries(enhancedFiles || {})) {
    graphMetrics[filePath] = {
      inDegree: fileData.usedBy?.length || fileData.dependents?.length || 0,
      outDegree: fileData.imports?.length || 0,
      circularDependencies: 0
    };
  }
  return graphMetrics;
}

function attachRiskScoresToFiles(enhancedFiles, riskScores) {
  for (const [filePath, fileData] of Object.entries(enhancedFiles || {})) {
    if (riskScores[filePath]) {
      fileData.riskScore = riskScores[filePath];
    }
  }
}

function constructEnhancedConnections(semanticResults, allConnections) {
  return {
    sharedState: [
      ...semanticResults.localStorageConnections,
      ...semanticResults.globalConnections
    ],
    eventListeners: semanticResults.eventConnections,
    envVars: semanticResults.envConnections,
    routes: semanticResults.routeConnections,
    colocation: semanticResults.colocationConnections,
    total: allConnections.length
  };
}

function getSemanticConnectionsByFile(enhancedFiles) {
  const byFile = {};
  for (const [filePath, fileData] of Object.entries(enhancedFiles || {})) {
    byFile[filePath] = fileData.semanticConnections || [];
  }
  return byFile;
}

function applyFallbackData(enhanced) {
  enhanced.connections = enhanced.connections || { sharedState: [], eventListeners: [], total: 0 };
  enhanced.riskAssessment = enhanced.riskAssessment || { scores: {}, report: { summary: {} } };
  enhanced.semanticIssues = enhanced.semanticIssues || { issues: [], stats: { totalIssues: 0 } };
}

function logSemanticResults(logger, semanticResults, allConnections, verbose) {
  if (!verbose) return;
  logger.info(`  ✔ localStorage: ${semanticResults.localStorageConnections.length} connections`);
  logger.info(`  ✔ events: ${semanticResults.eventConnections.length} connections`);
  logger.info(`  ✔ globals: ${semanticResults.globalConnections.length} connections`);
  logger.info(`  ✔ env vars: ${semanticResults.envConnections.length} connections`);
  logger.info(`  ✔ routes: ${semanticResults.routeConnections.length} connections`);
  logger.info(`  ✔ colocation: ${semanticResults.colocationConnections.length} connections`);
  logger.info(`  ✔ Total: ${allConnections.length} semantic connections`);
}

/**
 * Pipeline de enriquecimiento completo (LEGACY).
 *
 * @param {string} absoluteRootPath - Raiz absoluta del proyecto
 * @param {object} parsedFiles - Mapa de absolutePath -> FileInfo (del parser)
 * @param {object} systemMap - System map con files (relative paths), metadata
 * @param {boolean} verbose - Mostrar output detallado
 * @param {boolean} skipLLM - Flag de skip LLM (no usado aqui, se pasa por compatibilidad)
 * @returns {Promise<object>} - Enhanced system map con connections, riskAssessment, semanticIssues
 */
export async function enhanceSystemMap(absoluteRootPath, parsedFiles, systemMap, verbose = true, skipLLM = false) {
  const enhanced = JSON.parse(JSON.stringify(systemMap));
  enhanced.metadata = enhanced.metadata || {};
  enhanced.metadata.enhanced = true;
  enhanced.metadata.enhancedAt = new Date().toISOString();

  try {
    if (verbose) logger.info('  Reading source code for semantic analysis...');
    const sourceCodeMap = await buildSourceCodeMap(absoluteRootPath, parsedFiles, systemMap);
    if (verbose) logger.info(`  ✔ ${Object.keys(sourceCodeMap).length} files loaded`);

    if (verbose) logger.info('  Detecting semantic connections...');
    const semanticResults = detectAllSemanticConnections(sourceCodeMap);
    const allConnections = semanticResults.all;

    logSemanticResults(logger, semanticResults, allConnections, verbose);

    attachSemanticDataToFiles(enhanced.files, semanticResults, allConnections);

    if (verbose) logger.info('  Calculating risk scores...');
    const semanticConnectionsByFile = getSemanticConnectionsByFile(enhanced.files);
    const graphMetrics = buildGraphMetrics(enhanced.files);

    const riskScores = calculateAllRiskScores(enhanced, semanticConnectionsByFile, {}, graphMetrics);
    const riskReport = generateRiskReport(riskScores);

    attachRiskScoresToFiles(enhanced.files, riskScores);

    if (verbose) {
      logger.info(`  ✔ Risk scores calculated for ${Object.keys(riskScores).length} files`);
      logger.info(`  ✔ High risk: ${riskReport.summary.highCount + riskReport.summary.criticalCount} files`);
    }

    enhanced.connections = constructEnhancedConnections(semanticResults, allConnections);
    enhanced.riskAssessment = { scores: riskScores, report: riskReport };

    const semanticIssues = collectSemanticIssues(enhanced, semanticResults);
    enhanced.semanticIssues = semanticIssues;

    if (verbose) {
      logger.info(`  ✔ Semantic issues: ${semanticIssues.stats?.totalIssues || 0} detected`);
    }

  } catch (error) {
    logger.warn('Enhancement partially failed:', error.message);
    applyFallbackData(enhanced);
  }

  return enhanced;
}

/**
 * @deprecated Use enhanceSystemMap instead (compatibilidad temporal)
 */
export { enhanceSystemMap as enrichSystemMap };
