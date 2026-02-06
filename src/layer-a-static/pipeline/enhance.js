import fs from 'fs/promises';
import path from 'path';

import { detectSharedState, generateSharedStateConnections } from '../analyses/tier3/shared-state-detector.js';
import { detectEventPatterns, generateEventConnections } from '../analyses/tier3/event-pattern-detector.js';
import { detectSideEffects } from '../analyses/tier3/side-effects-detector.js';
import { calculateAllRiskScores, generateRiskReport } from '../analyses/tier3/risk-scorer.js';
import { analyzeBrokenConnections } from '../analyses/tier3/broken-connections-detector.js';
import { detectGodObject, detectOrphanModule } from '../../layer-b-semantic/metadata-contract.js';

import { detectAllSemanticConnections } from '../extractors/static-extractors.js';
import { detectAllAdvancedConnections } from '../extractors/advanced-extractors.js';
import { extractAllMetadata } from '../extractors/metadata-extractors.js';
import { detectAllCSSInJSConnections } from '../extractors/css-in-js-extractor.js';
import { detectAllTypeScriptConnections } from '../extractors/typescript-extractor.js';
import { detectAllReduxContextConnections } from '../extractors/redux-context-extractor.js';

function dedupeConnections(connections) {
  const seen = new Set();
  const result = [];

  for (const conn of connections) {
    const keyParts = [
      conn.type,
      conn.sourceFile,
      conn.targetFile,
      conn.property,
      conn.globalProperty,
      conn.key,
      conn.event,
      conn.eventName,
      conn.connectionType,
      conn.via
    ].map(value => value ?? '');
    const key = keyParts.join('|');

    if (!seen.has(key)) {
      seen.add(key);
      result.push(conn);
    }
  }

  return result;
}

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
  verbose = true,
  skipLLM = false
) {
  if (verbose) console.log('\nðŸ” Performing semantic analysis (static)...');

  let enhancedFiles = {};
  const allSharedStateConnections = [];
  const allEventConnections = [];
  const allSideEffects = {};
  const fileSourceCode = {};

  // Paso 1: Analizar shared state y event patterns para cada archivo
  if (verbose) console.log('  ðŸ“Š Analyzing global state and event patterns...');

  for (const [filePath, fileInfo] of Object.entries(parsedFiles)) {
    const projectRelative = path.relative(absoluteRootPath, filePath).replace(/\\/g, '/');

    try {
      // Leer código fuente para los detectores
      const code = await fs.readFile(filePath, 'utf-8');
      fileSourceCode[projectRelative] = code;

      // Detectar shared state
      const sharedState = detectSharedState(code, filePath);

      // Detectar event patterns
      const eventPatterns = detectEventPatterns(code, filePath);

      // Detectar side effects
      const sideEffects = detectSideEffects(code, filePath);

      // Guardar análisis por archivo
      enhancedFiles[projectRelative] = {
        ...fileInfo,
        semanticAnalysis: {
          sharedState,
          eventPatterns,
          sideEffects: sideEffects.sideEffects,
          sideEffectDetails: sideEffects.details
        }
      };

      allSideEffects[projectRelative] = sideEffects;
    } catch (error) {
      console.warn(`  âš ï¸  Error analyzing ${projectRelative}:`, error.message);
      enhancedFiles[projectRelative] = fileInfo;
    }
  }

  if (verbose) console.log('  âœ“ Semantic analysis complete');

  // ============================================================
  // PASO EXTRA: Extraer metadatos adicionales de cada archivo
  // ============================================================
  if (verbose) console.log('  ðŸ” Extracting additional metadata (JSDoc, async, errors, build flags)...');

  for (const [filePath, fileInfo] of Object.entries(enhancedFiles)) {
    try {
      const code = fileSourceCode[filePath] || '';
      const metadata = extractAllMetadata(filePath, code);

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
    console.log(`  âœ“ Metadata extracted: ${totalJSDoc} JSDoc, ${totalAsync} async patterns`);
  }

  // Paso 2: Generar conexiones semánticas globales
  if (verbose) console.log('  ðŸ”— Generating semantic connections...');

  const sharedStateConnections = generateSharedStateConnections(
    Object.entries(enhancedFiles).reduce((acc, [file, analysis]) => {
      acc[file] = analysis.semanticAnalysis.sharedState;
      return acc;
    }, {})
  );

  const eventConnections = generateEventConnections(
    Object.entries(enhancedFiles).reduce((acc, [file, analysis]) => {
      acc[file] = {
        eventListeners: analysis.semanticAnalysis.eventPatterns.eventListeners,
        eventEmitters: analysis.semanticAnalysis.eventPatterns.eventEmitters
      };
      return acc;
    }, {})
  );

  // ============================================================
  // PASO EXTRA: Extracción estática de localStorage y eventos
  // ============================================================
  if (verbose) console.log('  ðŸ” Running static extraction for localStorage/events...');
  // fileSourceCode ya fue declarado arriba
  for (const filePath of Object.keys(enhancedFiles)) {
    try {
      const fullPath = path.join(absoluteRootPath, filePath);
      fileSourceCode[filePath] = await fs.readFile(fullPath, 'utf-8');
    } catch (error) {
      fileSourceCode[filePath] = '';
    }
  }
  const staticConnections = detectAllSemanticConnections(fileSourceCode);
  const advancedConnections = detectAllAdvancedConnections(fileSourceCode);

  // ============================================================
  // NUEVOS EXTRACTORES (CSS-in-JS, TypeScript, Redux/Context)
  // ============================================================
  if (verbose) console.log('  ðŸ” Running CSS-in-JS, TypeScript, Redux/Context extractors...');

  const cssInJSConnections = detectAllCSSInJSConnections(fileSourceCode);
  const tsConnections = detectAllTypeScriptConnections(fileSourceCode);
  const reduxConnections = detectAllReduxContextConnections(fileSourceCode);

  if (verbose) {
    console.log(`  âœ“ Additional connections found:`);
    console.log(`    - ${cssInJSConnections.connections.length} CSS-in-JS connections`);
    console.log(`    - ${tsConnections.connections.length} TypeScript connections`);
    console.log(`    - ${reduxConnections.connections.length} Redux/Context connections`);
  }

  // Adjuntar metadata de CSS-in-JS y TypeScript por archivo (para arquetipos)
  for (const [filePath, fileInfo] of Object.entries(enhancedFiles)) {
    if (!fileInfo.metadata) {
      fileInfo.metadata = {};
    }
    if (cssInJSConnections.fileResults?.[filePath]) {
      fileInfo.metadata.cssInJS = cssInJSConnections.fileResults[filePath];
    }
    if (tsConnections.fileResults?.[filePath]) {
      fileInfo.metadata.typescript = tsConnections.fileResults[filePath];
    }
  }

  if (verbose) {
    console.log(`  âœ“ Static extraction found:`);
    console.log(`    - ${staticConnections.localStorageConnections.length} localStorage connections`);
    console.log(`    - ${staticConnections.eventConnections.length} event connections`);
    console.log(`    - ${advancedConnections.connections.length} advanced connections (Workers, WebSocket, etc)`);
  }

  const allConnections = dedupeConnections([
    ...sharedStateConnections,
    ...eventConnections,
    ...staticConnections.localStorageConnections,
    ...staticConnections.eventConnections,
    ...staticConnections.globalConnections,
    ...advancedConnections.connections,
    ...cssInJSConnections.connections,
    ...tsConnections.connections,
    ...reduxConnections.connections
  ]);

  if (verbose) {
    console.log(`  âœ“ ${sharedStateConnections.length} shared state connections`);
    console.log(`  âœ“ ${eventConnections.length} event listener connections`);
  }

  // Paso 3: Agrupar conexiones por archivo
  const semanticConnectionsByFile = {};
  for (const conn of allConnections) {
    if (!semanticConnectionsByFile[conn.sourceFile]) {
      semanticConnectionsByFile[conn.sourceFile] = [];
    }
    semanticConnectionsByFile[conn.sourceFile].push(conn);
  }

  // Paso 4: Calcular risk scores
  if (verbose) console.log('  ðŸ“ˆ Calculating risk scores...');

  // Preparar métricas del grafo para cada archivo
  const graphMetrics = {};
  for (const [filePath, fileData] of Object.entries(systemMap.files || {})) {
    graphMetrics[filePath] = {
      inDegree: (fileData.usedBy || []).length,
      outDegree: (fileData.dependsOn || []).length,
      circularDependencies: systemMap.metadata.cyclesDetected.filter(
        cycle => cycle.includes(filePath)
      ).length,
      coupledFiles: (fileData.usedBy || []).filter(f =>
        (systemMap.files[f]?.dependsOn || []).includes(filePath)
      ).length
    };
  }

  const riskScores = calculateAllRiskScores(
    systemMap,
    semanticConnectionsByFile,
    allSideEffects,
    graphMetrics
  );

  if (verbose) console.log('  âœ“ Risk scores calculated');

  // Paso 4.6: Detectar conexiones rotas (Workers, URLs dinámicas, etc)
  if (verbose) console.log('  ðŸ” Detecting broken connections...');
  const brokenConnectionsAnalysis = analyzeBrokenConnections(systemMap, advancedConnections);

  if (verbose) {
    console.log(`  âœ“ Broken connections analysis:`);
    console.log(`    - ${brokenConnectionsAnalysis.brokenWorkers.total} broken workers`);
    console.log(`    - ${brokenConnectionsAnalysis.deadFunctions.total} dead functions`);
    console.log(`    - ${brokenConnectionsAnalysis.duplicateFunctions.total} duplicate functions`);
    console.log(`    - ${brokenConnectionsAnalysis.suspiciousUrls.total} suspicious URLs`);
    if (brokenConnectionsAnalysis.summary.critical > 0) {
      console.log(`    âš ï¸  ${brokenConnectionsAnalysis.summary.critical} CRITICAL issues found!`);
    }
  }

  // Paso 4.7: LLM Enrichment - MOVIDO AL ORCHESTRATOR
  // Layer A solo hace análisis estático. El LLM enrichment lo hace el Orchestrator
  // basado en los metadatos que Layer A genera.
  let llmEnrichmentStats = null;
  let semanticIssues = null;

  if (verbose) {
    console.log('  â„¹ï¸  LLM enrichment disabled in Layer A (moved to Orchestrator)');
    console.log('  ðŸ“Š Static analysis complete - metadata ready for Orchestrator');
  }

  // Paso 5: Construir enhanced system map
  if (verbose) console.log('  ðŸ—ï¸  Building enhanced system map...');

  const enhancedSystemMap = {
    metadata: {
      ...systemMap.metadata,
      enhanced: true,
      enhancedAt: new Date().toISOString(),
      analysisVersion: '3.5.0',
      includes: llmEnrichmentStats
        ? ['static', 'semantic-static', 'llm-enriched', 'risk-scoring', 'semantic-issues']
        : ['static', 'semantic-static', 'risk-scoring', 'semantic-issues'],
      llmEnrichment: llmEnrichmentStats || { enabled: false }
    },
    files: {},
    connections: {
      sharedState: sharedStateConnections,
      eventListeners: eventConnections,
      localStorage: staticConnections.localStorageConnections,
      advanced: advancedConnections.connections,
      cssInJS: cssInJSConnections.connections,
      typescript: tsConnections.connections,
      reduxContext: reduxConnections.connections,
      total: allConnections.length
    },
    structures: {
      storeStructure: reduxConnections.storeStructure || { slices: [] },
      typeDefinitions: tsConnections.fileResults || {},
      cssInJSFiles: cssInJSConnections.fileResults || {}
    },
    riskAssessment: {
      scores: riskScores,
      report: generateRiskReport(riskScores)
    },
    semanticIssues: semanticIssues || { stats: { totalIssues: 0 } },
    brokenConnections: brokenConnectionsAnalysis || { summary: { total: 0 } }
  };

  // Enriquecer cada archivo con sus análisis
  for (const [filePath, fileInfo] of Object.entries(enhancedFiles)) {
    const riskScore = riskScores[filePath];
    const connections = semanticConnectionsByFile[filePath] || [];

    // Merge: fileInfo (con LLM insights) tiene prioridad sobre systemMap.files
    // Usar Object.assign para merge profundo
    const baseFile = JSON.parse(JSON.stringify(systemMap.files[filePath] || {}));
    const enhancedFile = JSON.parse(JSON.stringify(fileInfo || {}));

    // Detectar arquetipos arquitectónicos
    const exportCount = (baseFile.exports || []).length;
    const dependentCount = (baseFile.usedBy || []).length;
    
    const archetype = {
      type: null,
      reason: null
    };
    
    if (detectGodObject(exportCount, dependentCount)) {
      archetype.type = 'GOD_OBJECT';
      archetype.reason = `High coupling: ${dependentCount} dependents, ${exportCount} exports`;
    } else if (detectOrphanModule(exportCount, dependentCount)) {
      archetype.type = 'ORPHAN_MODULE';
      archetype.reason = `No dependents but has ${exportCount} exports`;
    }

    enhancedSystemMap.files[filePath] = {
      ...baseFile,
      ...enhancedFile,
      semanticConnections: connections,
      riskScore: riskScore,
      sideEffects: allSideEffects[filePath]?.sideEffects || {},
      sideEffectDetails: allSideEffects[filePath]?.details || {},
      archetype: archetype.type ? archetype : undefined
    };
  }

  if (verbose) console.log('  âœ“ Enhanced system map built');

  return enhancedSystemMap;
}
