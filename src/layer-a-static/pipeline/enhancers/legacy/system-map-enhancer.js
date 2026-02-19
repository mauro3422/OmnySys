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
  // Clone systemMap to avoid mutations
  const enhanced = JSON.parse(JSON.stringify(systemMap));
  enhanced.metadata = enhanced.metadata || {};
  enhanced.metadata.enhanced = true;
  enhanced.metadata.enhancedAt = new Date().toISOString();

  try {
    // Step 1: Build source code map (relative paths -> code)
    if (verbose) logger.info('  Reading source code for semantic analysis...');
    const sourceCodeMap = await buildSourceCodeMap(absoluteRootPath, parsedFiles, systemMap);
    if (verbose) logger.info(`  ✔ ${Object.keys(sourceCodeMap).length} files loaded`);

    // Step 2: Detect all semantic connections
    if (verbose) logger.info('  Detecting semantic connections...');
    const semanticResults = detectAllSemanticConnections(sourceCodeMap);

    const sharedStateConnections = [
      ...semanticResults.localStorageConnections,
      ...semanticResults.globalConnections
    ];
    const eventConnections = semanticResults.eventConnections;
    const allConnections = semanticResults.all;

    if (verbose) {
      logger.info(`  ✔ localStorage: ${semanticResults.localStorageConnections.length} connections`);
      logger.info(`  ✔ events: ${semanticResults.eventConnections.length} connections`);
      logger.info(`  ✔ globals: ${semanticResults.globalConnections.length} connections`);
      logger.info(`  ✔ env vars: ${semanticResults.envConnections.length} connections`);
      logger.info(`  ✔ routes: ${semanticResults.routeConnections.length} connections`);
      logger.info(`  ✔ colocation: ${semanticResults.colocationConnections.length} connections`);
      logger.info(`  ✔ Total: ${allConnections.length} semantic connections`);
    }

    // Step 3: Attach semantic data to each file
    for (const [filePath, fileData] of Object.entries(enhanced.files || {})) {
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
      // Attach connections relevant to this file
      fileData.semanticConnections = allConnections.filter(
        c => c.sourceFile === filePath || c.targetFile === filePath
      );
    }

    // Step 4: Calculate risk scores
    if (verbose) logger.info('  Calculating risk scores...');
    const semanticConnectionsByFile = {};
    for (const [filePath, fileData] of Object.entries(enhanced.files || {})) {
      semanticConnectionsByFile[filePath] = fileData.semanticConnections || [];
    }

    // Build graph metrics from systemMap
    const graphMetrics = {};
    for (const [filePath, fileData] of Object.entries(enhanced.files || {})) {
      graphMetrics[filePath] = {
        inDegree: fileData.usedBy?.length || fileData.dependents?.length || 0,
        outDegree: fileData.imports?.length || 0,
        circularDependencies: 0
      };
    }

    const riskScores = calculateAllRiskScores(enhanced, semanticConnectionsByFile, {}, graphMetrics);
    const riskReport = generateRiskReport(riskScores);

    // Attach risk scores to files
    for (const [filePath, fileData] of Object.entries(enhanced.files || {})) {
      if (riskScores[filePath]) {
        fileData.riskScore = riskScores[filePath];
      }
    }

    if (verbose) {
      logger.info(`  ✔ Risk scores calculated for ${Object.keys(riskScores).length} files`);
      logger.info(`  ✔ High risk: ${riskReport.summary.highCount + riskReport.summary.criticalCount} files`);
    }

    // Step 5: Build connections summary
    enhanced.connections = {
      sharedState: sharedStateConnections,
      eventListeners: eventConnections,
      envVars: semanticResults.envConnections,
      routes: semanticResults.routeConnections,
      colocation: semanticResults.colocationConnections,
      total: allConnections.length
    };

    // Step 6: Attach risk assessment
    enhanced.riskAssessment = {
      scores: riskScores,
      report: riskReport
    };

    // Step 7: Collect semantic issues (files with notable patterns)
    const semanticIssues = collectSemanticIssues(enhanced, semanticResults);
    enhanced.semanticIssues = semanticIssues;

    if (verbose) {
      logger.info(`  ✔ Semantic issues: ${semanticIssues.stats?.totalIssues || 0} detected`);
    }

  } catch (error) {
    logger.warn('Enhancement partially failed:', error.message);
    // Ensure minimum structure exists
    enhanced.connections = enhanced.connections || { sharedState: [], eventListeners: [], total: 0 };
    enhanced.riskAssessment = enhanced.riskAssessment || { scores: {}, report: { summary: {} } };
    enhanced.semanticIssues = enhanced.semanticIssues || { issues: [], stats: { totalIssues: 0 } };
  }

  return enhanced;
}

/**
 * @deprecated Use enhanceSystemMap instead (compatibilidad temporal)
 */
export { enhanceSystemMap as enrichSystemMap };
