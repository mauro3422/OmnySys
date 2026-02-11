/**
 * @fileoverview Pipeline Enhancers - Post-procesamiento de metadatos
 * 
 * Los enhancers corren DESPUÉS de la extracción básica y enriquecen
 * los metadatos con conexiones adicionales, validaciones, etc.
 * 
 * No modifican la estructura base de los átomos, solo agregan campos adicionales
 * que las herramientas MCP pueden consumir opcionalmente.
 * 
 * @module pipeline/enhancers
 */

import { createLogger } from '../../../utils/logger.js';
import { enrichConnections } from './connection-enricher.js';
import { enhanceMetadata } from './metadata-enhancer.js';

const logger = createLogger('OmnySys:pipeline:enhancers');

/**
 * Ejecuta todos los enhancers en secuencia
 * 
 * @param {Object} context - Contexto del pipeline
 * @param {Array} context.atoms - Átomos extraídos
 * @returns {Promise<Object>} Contexto enriquecido
 */
export async function runEnhancers(context) {
  const { atoms, filePath } = context;
  
  if (!atoms || atoms.length === 0) {
    return context;
  }
  
  logger.debug(`Running enhancers for ${atoms.length} atoms in ${filePath}`);
  
  try {
    // 1. Enhancer de metadata (validación, cálculos adicionales)
    context = await enhanceMetadata(context);
    
    // 2. Connection Enricher (cross-reference, conexiones enriquecidas)
    // NOTA: Este es un enhancer a nivel de proyecto, no por archivo
    // Se ejecuta en una fase posterior del pipeline
    
    logger.debug('Enhancers completed successfully');
  } catch (error) {
    logger.warn('Enhancers failed (non-critical):', error.message);
    // No fallamos el pipeline, solo logueamos
  }
  
  return context;
}

/**
 * Ejecuta enhancers a nivel de proyecto (cross-file)
 * 
 * Este método debe llamarse DESPUÉS de analizar todos los archivos,
 * cuando tenemos el contexto completo del proyecto.
 * 
 * @param {Array} allAtoms - Todos los átomos del proyecto
 * @param {Object} projectMetadata - Metadata del proyecto
 * @returns {Promise<Object>} Conexiones enriquecidas del proyecto
 */
export async function runProjectEnhancers(allAtoms, projectMetadata) {
  logger.info(`Running project-level enhancers for ${allAtoms.length} atoms`);
  
  const startTime = Date.now();
  
  try {
    // Connection Enricher - necesita todos los átomos
    const enrichedConnections = await enrichConnections(allAtoms);
    
    const duration = Date.now() - startTime;
    logger.info(`Project enhancers completed in ${duration}ms`);
    
    return {
      connections: enrichedConnections,
      metadata: {
        enhancedAt: new Date().toISOString(),
        duration,
        atomCount: allAtoms.length
      }
    };
  } catch (error) {
    logger.error('Project enhancers failed:', error);
    // Retornamos estructura vacía para no romper el pipeline
    return {
      connections: { connections: [], conflicts: [], stats: {} },
      metadata: { error: error.message }
    };
  }
}

// Exportar enhancers individuales para uso selectivo
export { enrichConnections } from './connection-enricher.js';
export { enhanceMetadata } from './metadata-enhancer.js';

// ==========================================
// LEGACY: enhanceSystemMap
// Esta función se mantiene por compatibilidad con indexer.js
// ==========================================

import fs from 'fs/promises';
import path from 'path';
import { detectAllSemanticConnections } from '../../extractors/static/index.js';
import { calculateAllRiskScores, generateRiskReport } from '../../analyses/tier3/risk-scorer.js';

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
 * Builds a map of relativePath -> sourceCode by reading files from disk.
 * Uses parsedFiles (absolute paths) and maps them to relative paths matching systemMap.
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
