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
import { calculateAllRiskScores, generateRiskReport } from '../../../analyses/tier3/risk-scorer.js';
import { buildSourceCodeMap } from '../builders/source-code-builder.js';
import { collectSemanticIssues } from '../analyzers/semantic-issue-analyzer.js';

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
    if (verbose) console.log('  Reading source code for semantic analysis...');
    const sourceCodeMap = await buildSourceCodeMap(absoluteRootPath, parsedFiles, systemMap);
    if (verbose) console.log(`  ✔ ${Object.keys(sourceCodeMap).length} files loaded\n`);

    // Step 2: Detect all semantic connections
    if (verbose) console.log('  Detecting semantic connections...');
    const semanticResults = detectAllSemanticConnections(sourceCodeMap);

    const sharedStateConnections = [
      ...semanticResults.localStorageConnections,
      ...semanticResults.globalConnections
    ];
    const eventConnections = semanticResults.eventConnections;
    const allConnections = semanticResults.all;

    if (verbose) {
      console.log(`  ✔ localStorage: ${semanticResults.localStorageConnections.length} connections`);
      console.log(`  ✔ events: ${semanticResults.eventConnections.length} connections`);
      console.log(`  ✔ globals: ${semanticResults.globalConnections.length} connections`);
      console.log(`  ✔ env vars: ${semanticResults.envConnections.length} connections`);
      console.log(`  ✔ routes: ${semanticResults.routeConnections.length} connections`);
      console.log(`  ✔ colocation: ${semanticResults.colocationConnections.length} connections`);
      console.log(`  ✔ Total: ${allConnections.length} semantic connections\n`);
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
    if (verbose) console.log('  Calculating risk scores...');
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
      console.log(`  ✔ Risk scores calculated for ${Object.keys(riskScores).length} files`);
      console.log(`  ✔ High risk: ${riskReport.summary.highCount + riskReport.summary.criticalCount} files\n`);
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
      console.log(`  ✔ Semantic issues: ${semanticIssues.stats?.totalIssues || 0} detected\n`);
    }

  } catch (error) {
    console.warn('Warning: Enhancement partially failed:', error.message);
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
