/**
 * @fileoverview index.js
 *
 * Pipeline de enriquecimiento del system map.
 * Toma el systemMap basico (archivos, imports, exports) y le agrega:
 * - Conexiones semanticas (localStorage, events, globals, env, routes, colocation)
 * - Risk assessment por archivo
 * - Metadata enriquecida (metricas, flags)
 *
 * @module pipeline/enhancers
 */

import fs from 'fs/promises';
import path from 'path';
import { detectAllSemanticConnections } from '../../extractors/static/index.js';
import { calculateAllRiskScores, generateRiskReport } from '../../analyses/tier3/risk-scorer.js';

/**
 * Pipeline de enriquecimiento completo.
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
    if (verbose) console.log(`  \u2714 ${Object.keys(sourceCodeMap).length} files loaded\n`);

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
      console.log(`  \u2714 localStorage: ${semanticResults.localStorageConnections.length} connections`);
      console.log(`  \u2714 events: ${semanticResults.eventConnections.length} connections`);
      console.log(`  \u2714 globals: ${semanticResults.globalConnections.length} connections`);
      console.log(`  \u2714 env vars: ${semanticResults.envConnections.length} connections`);
      console.log(`  \u2714 routes: ${semanticResults.routeConnections.length} connections`);
      console.log(`  \u2714 colocation: ${semanticResults.colocationConnections.length} connections`);
      console.log(`  \u2714 Total: ${allConnections.length} semantic connections\n`);
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
      console.log(`  \u2714 Risk scores calculated for ${Object.keys(riskScores).length} files`);
      console.log(`  \u2714 High risk: ${riskReport.summary.highCount + riskReport.summary.criticalCount} files\n`);
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
      console.log(`  \u2714 Semantic issues: ${semanticIssues.stats?.totalIssues || 0} detected\n`);
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
 * Builds a map of relativePath -> sourceCode by reading files from disk.
 * Uses parsedFiles (absolute paths) and maps them to relative paths matching systemMap.
 *
 * @param {string} absoluteRootPath - Project root
 * @param {object} parsedFiles - {absolutePath: FileInfo}
 * @param {object} systemMap - {files: {relativePath: ...}}
 * @returns {Promise<object>} - {relativePath: sourceCode}
 */
async function buildSourceCodeMap(absoluteRootPath, parsedFiles, systemMap) {
  const sourceCodeMap = {};
  const normalizedRoot = absoluteRootPath.replace(/\\/g, '/').replace(/\/$/, '');

  for (const absolutePath of Object.keys(parsedFiles)) {
    const normalizedAbsolute = absolutePath.replace(/\\/g, '/');
    const relativePath = normalizedAbsolute.startsWith(normalizedRoot)
      ? normalizedAbsolute.slice(normalizedRoot.length + 1)
      : path.relative(absoluteRootPath, absolutePath).replace(/\\/g, '/');

    // Only read files that are in the systemMap
    if (systemMap.files && systemMap.files[relativePath]) {
      try {
        const code = await fs.readFile(absolutePath, 'utf-8');
        sourceCodeMap[relativePath] = code;
      } catch {
        // Skip unreadable files
      }
    }
  }

  return sourceCodeMap;
}

/**
 * Collects semantic issues from the enhanced data.
 * Issues are notable patterns that may need attention.
 */
function collectSemanticIssues(enhanced, semanticResults) {
  const issues = [];

  // Files with many semantic connections (potential god objects)
  for (const [filePath, fileData] of Object.entries(enhanced.files || {})) {
    const connCount = fileData.semanticConnections?.length || 0;
    const riskScore = fileData.riskScore?.total || 0;

    if (connCount >= 8) {
      issues.push({
        file: filePath,
        type: 'high-semantic-coupling',
        severity: 'high',
        message: `File has ${connCount} semantic connections`,
        details: { connectionCount: connCount, riskScore }
      });
    } else if (connCount >= 4) {
      issues.push({
        file: filePath,
        type: 'medium-semantic-coupling',
        severity: 'medium',
        message: `File has ${connCount} semantic connections`,
        details: { connectionCount: connCount, riskScore }
      });
    }

    if (riskScore >= 8) {
      issues.push({
        file: filePath,
        type: 'critical-risk',
        severity: 'high',
        message: `Critical risk score: ${riskScore}/10`,
        details: { riskScore, breakdown: fileData.riskScore?.breakdown }
      });
    }
  }

  // Global state shared between many files
  const globalConnections = semanticResults.globalConnections || [];
  if (globalConnections.length >= 5) {
    issues.push({
      type: 'excessive-global-state',
      severity: 'medium',
      message: `${globalConnections.length} global state connections detected`,
      details: { count: globalConnections.length }
    });
  }

  const bySeverity = { high: 0, medium: 0, low: 0 };
  for (const issue of issues) {
    bySeverity[issue.severity] = (bySeverity[issue.severity] || 0) + 1;
  }

  return {
    issues,
    stats: {
      totalIssues: issues.length,
      bySeverity
    }
  };
}

export default { enhanceSystemMap };
