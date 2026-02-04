import fs from 'fs/promises';
import path from 'path';
import { scanProject, detectProjectInfo } from './scanner.js';
import { parseFileFromDisk } from './parser.js';
import { resolveImport, getResolutionConfig } from './resolver.js';
import { buildGraph } from './graph-builder.js';
import { generateAnalysisReport } from './analyzer.js';
import { detectSharedState, generateSharedStateConnections } from './analyses/tier3/shared-state-detector.js';
import { detectEventPatterns, generateEventConnections } from './analyses/tier3/event-pattern-detector.js';
import { detectSideEffects } from './analyses/tier3/side-effects-detector.js';
import { calculateAllRiskScores, generateRiskReport } from './analyses/tier3/risk-scorer.js';
import { analyzeBrokenConnections } from './analyses/tier3/broken-connections-detector.js';
import { savePartitionedSystemMap } from './storage/storage-manager.js';
import { enrichSemanticAnalysis, generateIssuesReport } from '../layer-b-semantic/semantic-enricher.js';
import { loadAIConfig } from '../ai/llm-client.js';
import { detectAllSemanticConnections } from '../layer-b-semantic/static-extractors.js';
import { detectAllAdvancedConnections } from '../layer-b-semantic/advanced-extractors.js';
import { extractAllMetadata } from '../layer-b-semantic/metadata-extractors.js';
import { detectAllCSSInJSConnections } from '../layer-b-semantic/css-in-js-extractor.js';
import { detectAllTypeScriptConnections } from '../layer-b-semantic/typescript-extractor.js';
import { detectAllReduxContextConnections } from '../layer-b-semantic/redux-context-extractor.js';

// NUEVO: Sistema de caché unificado
import { UnifiedCacheManager, ChangeType } from '../core/unified-cache-manager.js';
import { analyzeWithUnifiedCache, analyzeLLMWithUnifiedCache } from '../core/cache-integration.js';

/**
 * Indexer - Orquestador principal de Capa A
 *
 * Responsabilidad:
 * - Ejecutar todo el pipeline de análisis estático
 * - Coordinar scanner → parser → resolver → graph-builder
 * - Guardar resultados en JSON
 */

/**
 * Genera enhanced system map con análisis semántico estático
 *
 * @param {string} absoluteRootPath - Raíz del proyecto
 * @param {object} parsedFiles - Mapa de filePath -> fileInfo
 * @param {object} systemMap - System map generado por buildGraph
 * @param {boolean} verbose - Mostrar output detallado
 * @returns {Promise<object>} - Enhanced system map
 */
async function generateEnhancedSystemMap(absoluteRootPath, parsedFiles, systemMap, verbose = true, skipLLM = false) {
  if (verbose) console.log('\n🔍 Performing semantic analysis (static)...');

  let enhancedFiles = {};
  const allSharedStateConnections = [];
  const allEventConnections = [];
  const allSideEffects = {};
  const fileSourceCode = {};

  // Paso 1: Analizar shared state y event patterns para cada archivo
  if (verbose) console.log('  📊 Analyzing global state and event patterns...');

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
      console.warn(`  ⚠️  Error analyzing ${projectRelative}:`, error.message);
      enhancedFiles[projectRelative] = fileInfo;
    }
  }

  if (verbose) console.log('  ✓ Semantic analysis complete');

  // ============================================================
  // PASO EXTRA: Extraer metadatos adicionales de cada archivo
  // ============================================================
  if (verbose) console.log('  🔍 Extracting additional metadata (JSDoc, async, errors, build flags)...');
  
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
    const totalJSDoc = Object.values(enhancedFiles).reduce((sum, f) => 
      sum + (f.metadata?.jsdocContracts?.all?.length || 0), 0);
    const totalAsync = Object.values(enhancedFiles).reduce((sum, f) => 
      sum + (f.metadata?.asyncPatterns?.all?.length || 0), 0);
    console.log(`  ✓ Metadata extracted: ${totalJSDoc} JSDoc, ${totalAsync} async patterns`);
  }

  // Paso 2: Generar conexiones semánticas globales
  if (verbose) console.log('  🔗 Generating semantic connections...');

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
  if (verbose) console.log('  🔍 Running static extraction for localStorage/events...');
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
  if (verbose) console.log('  🔍 Running CSS-in-JS, TypeScript, Redux/Context extractors...');
  
  const cssInJSConnections = detectAllCSSInJSConnections(fileSourceCode);
  const tsConnections = detectAllTypeScriptConnections(fileSourceCode);
  const reduxConnections = detectAllReduxContextConnections(fileSourceCode);
  
  if (verbose) {
    console.log(`  ✓ Additional connections found:`);
    console.log(`    - ${cssInJSConnections.connections.length} CSS-in-JS connections`);
    console.log(`    - ${tsConnections.connections.length} TypeScript connections`);
    console.log(`    - ${reduxConnections.connections.length} Redux/Context connections`);
  }
  
  if (verbose) {
    console.log(`  ✓ Static extraction found:`);
    console.log(`    - ${staticConnections.localStorageConnections.length} localStorage connections`);
    console.log(`    - ${staticConnections.eventConnections.length} event connections`);
    console.log(`    - ${advancedConnections.connections.length} advanced connections (Workers, WebSocket, etc)`);
  }

  const allConnections = [
    ...sharedStateConnections, 
    ...eventConnections,
    ...staticConnections.localStorageConnections,
    ...staticConnections.eventConnections,
    ...staticConnections.globalConnections,
    ...advancedConnections.connections,
    ...cssInJSConnections.connections,
    ...tsConnections.connections,
    ...reduxConnections.connections
  ];

  if (verbose) {
    console.log(`  ✓ ${sharedStateConnections.length} shared state connections`);
    console.log(`  ✓ ${eventConnections.length} event listener connections`);
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
  if (verbose) console.log('  📈 Calculating risk scores...');

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

  if (verbose) console.log('  ✓ Risk scores calculated');

  // Paso 4.6: Detectar conexiones rotas (Workers, URLs dinámicas, etc)
  if (verbose) console.log('  🔍 Detecting broken connections...');
  const brokenConnectionsAnalysis = analyzeBrokenConnections(systemMap, advancedConnections);
  
  if (verbose) {
    console.log(`  ✓ Broken connections analysis:`);
    console.log(`    - ${brokenConnectionsAnalysis.brokenWorkers.total} broken workers`);
    console.log(`    - ${brokenConnectionsAnalysis.deadFunctions.total} dead functions`);
    console.log(`    - ${brokenConnectionsAnalysis.duplicateFunctions.total} duplicate functions`);
    console.log(`    - ${brokenConnectionsAnalysis.suspiciousUrls.total} suspicious URLs`);
    if (brokenConnectionsAnalysis.summary.critical > 0) {
      console.log(`    ⚠️  ${brokenConnectionsAnalysis.summary.critical} CRITICAL issues found!`);
    }
  }

  // Paso 4.7: LLM Enrichment (opcional)
  let llmEnrichmentStats = null;
  let semanticIssues = null;
  try {
    const aiConfig = await loadAIConfig();
    if (aiConfig.llm.enabled && !skipLLM) {
      if (verbose) console.log('  🤖 LLM enrichment phase...');
      const tempSystemMap = { files: enhancedFiles };
      const enrichmentResult = await enrichSemanticAnalysis(
        tempSystemMap,
        fileSourceCode,
        aiConfig
      );

      if (enrichmentResult.enhanced) {
        // Actualizar enhancedFiles con resultados LLM
        enhancedFiles = enrichmentResult.results.files;
        llmEnrichmentStats = {
          filesAnalyzed: enrichmentResult.totalAnalyzed,
          filesEnhanced: enrichmentResult.enhancedCount
        };

        // Capturar issues semánticos
        semanticIssues = enrichmentResult.issues;

        if (verbose) {
          console.log(`  ✓ LLM enhanced ${enrichmentResult.enhancedCount}/${enrichmentResult.totalAnalyzed} files`);
          if (semanticIssues && semanticIssues.stats.totalIssues > 0) {
            console.log(`  ⚠️  Found ${semanticIssues.stats.totalIssues} semantic issues (${semanticIssues.stats.bySeverity.high} high, ${semanticIssues.stats.bySeverity.medium} medium, ${semanticIssues.stats.bySeverity.low} low)`);
          }
        }
      } else if (verbose) {
        console.log(`  ℹ️  ${enrichmentResult.reason}`);
      }
    }
  } catch (error) {
    console.warn('  ⚠️  LLM enrichment failed:', error.message);
  }

  // Paso 5: Construir enhanced system map
  if (verbose) console.log('  🏗️  Building enhanced system map...');

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

    enhancedSystemMap.files[filePath] = {
      ...systemMap.files[filePath],
      ...fileInfo,  // ✅ Merge LLM insights from enhancedFiles
      semanticConnections: connections,
      riskScore: riskScore,
      sideEffects: allSideEffects[filePath]?.sideEffects || {},
      sideEffectDetails: allSideEffects[filePath]?.details || {}
    };
  }

  if (verbose) console.log('  ✓ Enhanced system map built');

  return enhancedSystemMap;
}

/**
 * Indexa un proyecto completo
 *
 * @param {string} rootPath - Raíz del proyecto
 * @param {object} options - Opciones
 *   - outputPath: string - Dónde guardar el grafo
 *   - verbose: boolean - Mostrar output detallado
 * @returns {Promise<object>} - SystemMap generado
 */
export async function indexProject(rootPath, options = {}) {
  const {
    outputPath = 'system-map.json',
    verbose = true,
    singleFile = null,  // Modo single-file: solo analizar este archivo y sus dependencias
    incremental = false,
    skipLLM = false     // Skip LLM enrichment (use static analysis only)
  } = options;

  // Convertir rootPath a absoluto
  const absoluteRootPath = path.isAbsolute(rootPath)
    ? rootPath
    : path.resolve(process.cwd(), rootPath);

  // Modo single-file: análisis rápido
  if (singleFile) {
    console.log(`\n🚀 Starting Single-File Analysis\n`);
    console.log(`📁 Project root: ${absoluteRootPath}`);
    console.log(`📄 Target file: ${singleFile}\n`);
    
    return await analyzeSingleFile(absoluteRootPath, singleFile, { verbose, incremental });
  }

  console.log(`\n🚀 Starting Layer A: Static Analysis\n`);
  console.log(`📁 Project root: ${absoluteRootPath}\n`);

  try {
    // NUEVO: Inicializar Unified Cache Manager
    const cacheManager = new UnifiedCacheManager(absoluteRootPath);
    await cacheManager.initialize();

    // Paso 1: Detectar info del proyecto
    if (verbose) console.log('📋 Detecting project info...');
    const projectInfo = await detectProjectInfo(absoluteRootPath);
    if (verbose) console.log(`  ✓ TypeScript: ${projectInfo.useTypeScript}\n`);

    // Paso 2: Escanear archivos
    if (verbose) console.log('🔍 Scanning files...');
    const relativeFiles = await scanProject(absoluteRootPath, { returnAbsolute: false });
    // Convertir a rutas absolutas para parseo
    const files = relativeFiles.map(f => path.join(absoluteRootPath, f));
    if (verbose) console.log(`  ✓ Found ${files.length} files\n`);
    
    // NUEVO: Limpiar archivos borrados del cache
    await cacheManager.cleanupDeletedFiles(relativeFiles);

    // Paso 3: Parsear archivos
    if (verbose) console.log('📝 Parsing files...');
    const parsedFiles = {};
    for (let i = 0; i < files.length; i++) {
      if (verbose && i % Math.max(1, Math.floor(files.length / 5)) === 0) {
        console.log(`  ${i}/${files.length} files parsed...`);
      }
      const parsed = await parseFileFromDisk(files[i]);
      parsedFiles[files[i]] = parsed;
    }
    if (verbose) console.log(`  ✓ All files parsed\n`);

    // Paso 4: Obtener configuración de resolución
    if (verbose) console.log('⚙️  Loading resolution config...');
    const resolutionConfig = await getResolutionConfig(absoluteRootPath);
    if (verbose) {
      const aliasCount = Object.keys(resolutionConfig.aliases).length;
      console.log(`  ✓ Found ${aliasCount} aliases\n`);
    }

    // Paso 5: Resolver imports
    if (verbose) console.log('🔗 Resolving imports...');
    const resolvedImports = {};
    let totalImports = 0;
    let resolvedCount = 0;

    for (const [filePath, fileInfo] of Object.entries(parsedFiles)) {
      const resolved = [];

      for (const importStmt of fileInfo.imports || []) {
        totalImports++;
        const importSources = Array.isArray(importStmt.source)
          ? importStmt.source
          : [importStmt.source];

        for (const source of importSources) {
          const result = await resolveImport(
            source,
            filePath,
            absoluteRootPath,
            resolutionConfig.aliases
          );

          if (result.type === 'local') {
            resolvedCount++;
          }

          resolved.push({
            source,
            resolved: result.resolved,
            type: result.type,
            symbols: importStmt.specifiers,
            reason: result.reason
          });
        }
      }

      resolvedImports[filePath] = resolved;
    }
    if (verbose) {
      console.log(`  ✓ Resolved ${resolvedCount}/${totalImports} imports\n`);
    }

    // Paso 6: Normalizar paths a proyecto-relativo
    if (verbose) console.log('🔄 Normalizing paths...');

    // Convertir parsedFiles a usar rutas proyecto-relativas
    const normalizedParsedFiles = {};
    for (const [filePath, fileInfo] of Object.entries(parsedFiles)) {
      const projectRelative = path.relative(absoluteRootPath, filePath).replace(/\\/g, '/');
      normalizedParsedFiles[projectRelative] = fileInfo;
    }

    // Convertir resolvedImports a usar rutas proyecto-relativas
    const normalizedResolvedImports = {};
    for (const [filePath, imports] of Object.entries(resolvedImports)) {
      const projectRelative = path.relative(absoluteRootPath, filePath).replace(/\\/g, '/');
      normalizedResolvedImports[projectRelative] = imports;
    }
    if (verbose) console.log(`  ✓ Paths normalized\n`);

    // Paso 7: Construir grafo
    if (verbose) console.log('🏗️  Building dependency graph...');
    const systemMap = buildGraph(normalizedParsedFiles, normalizedResolvedImports);
    if (verbose) {
      console.log(`  ✓ Graph with ${systemMap.metadata.totalFiles} files`);
      console.log(`  ✓ ${systemMap.metadata.totalDependencies} dependencies found`);
      if (systemMap.metadata.cyclesDetected.length > 0) {
        console.log(`  ⚠️  ${systemMap.metadata.cyclesDetected.length} cycles detected!`);
      }
      console.log('');
    }

    // Paso 8: Guardar grafo en .OmnySysData/
    if (verbose) console.log('💾 Saving graph...');
    const dataDir = path.join(absoluteRootPath, '.OmnySysData');
    await fs.mkdir(dataDir, { recursive: true });
    const outputFullPath = path.join(dataDir, outputPath);
    await fs.writeFile(outputFullPath, JSON.stringify(systemMap, null, 2));
    if (verbose) console.log(`  ✓ Saved to: .OmnySysData/${outputPath}\n`);

    // Paso 9: Generar análisis automático
    if (verbose) console.log('🔍 Analyzing code quality...');
    const analysisReport = generateAnalysisReport(systemMap);
    const analysisOutputPath = outputPath.replace('.json', '-analysis.json');
    const analysisFullPath = path.join(dataDir, analysisOutputPath);
    await fs.writeFile(analysisFullPath, JSON.stringify(analysisReport, null, 2));
    if (verbose) console.log(`  ✓ Analysis saved to: .OmnySysData/${analysisOutputPath}\n`);

    // Paso 10: NUEVO - Generar enhanced system map con análisis semántico estático
    if (verbose) console.log('🧠 Performing Phase 3.5: Semantic Detection (Static)...');
    const enhancedSystemMap = await generateEnhancedSystemMap(
      absoluteRootPath,
      parsedFiles,
      systemMap,
      verbose,
      skipLLM
    );
    const enhancedOutputPath = outputPath.replace('.json', '-enhanced.json');
    const enhancedFullPath = path.join(dataDir, enhancedOutputPath);
    await fs.writeFile(enhancedFullPath, JSON.stringify(enhancedSystemMap, null, 2));
    if (verbose) console.log(`  ✓ Enhanced map saved to: .OmnySysData/${enhancedOutputPath}\n`);

    // Paso 11: NUEVO - Guardar datos particionados en .OmnySysData/
    if (verbose) console.log('💾 Saving partitioned data to .OmnySysData/...');
    const partitionedPaths = await savePartitionedSystemMap(absoluteRootPath, enhancedSystemMap);
    if (verbose) {
      console.log(`  ✓ Metadata saved to: .OmnySysData/index.json`);
      console.log(`  ✓ ${partitionedPaths.files.length} files saved to: .OmnySysData/files/`);
      console.log(`  ✓ Connections saved to: .OmnySysData/connections/`);
      console.log(`  ✓ Risk assessment saved to: .OmnySysData/risks/\n`);
    }

    // Resumen
    if (verbose) {
      console.log('✅ Layer A Complete!');
      console.log(`
📊 STATIC ANALYSIS Summary:
  - Files analyzed: ${systemMap.metadata.totalFiles}
  - Functions analyzed: ${systemMap.metadata.totalFunctions}
  - Dependencies: ${systemMap.metadata.totalDependencies}
  - Function links: ${systemMap.metadata.totalFunctionLinks}
  - Average deps per file: ${(systemMap.metadata.totalDependencies / systemMap.metadata.totalFiles).toFixed(2)}

🔍 CODE QUALITY Analysis:
  - Quality Score: ${analysisReport.qualityMetrics.score}/100 (Grade: ${analysisReport.qualityMetrics.grade})
  - Total Issues: ${analysisReport.qualityMetrics.totalIssues}
  - Unused Exports: ${analysisReport.unusedExports.totalUnused}
  - Dead Code Files: ${analysisReport.orphanFiles.deadCodeCount}
  - Critical Hotspots: ${analysisReport.hotspots.criticalCount}
  - Circular Dependencies: ${analysisReport.circularFunctionDeps.total}
  - Recommendations: ${analysisReport.recommendations.total}

🧠 SEMANTIC ANALYSIS (Phase 3.5):
  - Shared state connections: ${enhancedSystemMap.connections.sharedState.length}
  - Event listener connections: ${enhancedSystemMap.connections.eventListeners.length}
  - Total semantic connections: ${enhancedSystemMap.connections.total}
  - High-risk files: ${enhancedSystemMap.riskAssessment.report.summary.highCount + enhancedSystemMap.riskAssessment.report.summary.criticalCount}
  - Average risk score: ${enhancedSystemMap.riskAssessment.report.summary.averageScore}

⚠️  SEMANTIC ISSUES DETECTED:
  - Total issues: ${enhancedSystemMap.semanticIssues.stats?.totalIssues || 0}
  - High severity: ${enhancedSystemMap.semanticIssues.stats?.bySeverity?.high || 0}
  - Medium severity: ${enhancedSystemMap.semanticIssues.stats?.bySeverity?.medium || 0}
  - Low severity: ${enhancedSystemMap.semanticIssues.stats?.bySeverity?.low || 0}

💾 STORAGE:
  - Monolithic JSON: .OmnySysData/${enhancedOutputPath} (${(JSON.stringify(enhancedSystemMap).length / 1024).toFixed(2)} KB)
  - Partitioned data: .OmnySysData/ directory (${partitionedPaths.files.length} files)
  - Query API available via query-service.js
      `);

      // Si hay issues, generar y guardar reporte detallado
      if (enhancedSystemMap.semanticIssues?.stats?.totalIssues > 0) {
        const issuesReportText = generateIssuesReport(enhancedSystemMap.semanticIssues);
        const issuesReportPath = path.join(absoluteRootPath, '.OmnySysData', 'semantic-issues-report.txt');
        await fs.writeFile(issuesReportPath, issuesReportText, 'utf-8');
        console.log(`\n📋 Detailed issues report saved to: .OmnySysData/semantic-issues-report.txt`);
        console.log('💡 Review this report to find potential bugs and improvements\n');
      }
    }

    return systemMap;

  } catch (error) {
    console.error('❌ Error during indexing:', error);
    throw error;
  }
}

/**
 * Análisis rápido de un solo archivo
 * Usa el contexto del proyecto existente y solo re-analiza el archivo especificado
 */
async function analyzeSingleFile(absoluteRootPath, singleFile, options = {}) {
  const { verbose = true, incremental = false } = options;
  
  try {
    // Cargar systemMap existente si hay análisis previo
    let existingMap = null;
    const systemMapPath = path.join(absoluteRootPath, '.OmnySysData', 'system-map-enhanced.json');
    
    try {
      const content = await fs.readFile(systemMapPath, 'utf-8');
      existingMap = JSON.parse(content);
      if (verbose) console.log('  ✓ Loaded existing project context\n');
    } catch {
      if (verbose) console.log('  ℹ️  No existing analysis found, starting fresh\n');
    }

    // Paso 1: Parsear solo el archivo objetivo
    const targetFilePath = path.join(absoluteRootPath, singleFile);
    if (verbose) console.log(`📝 Parsing ${singleFile}...`);
    
    const parsedFile = await parseFileFromDisk(targetFilePath);
    if (!parsedFile) {
      throw new Error(`Could not parse file: ${singleFile}`);
    }
    
    if (verbose) console.log('  ✓ File parsed\n');

    // Paso 2: Resolver imports del archivo (solo los necesarios)
    if (verbose) console.log('🔗 Resolving imports...');
    const resolutionConfig = await getResolutionConfig(absoluteRootPath);
    
    const resolvedImports = [];
    for (const importStmt of parsedFile.imports || []) {
      const sources = Array.isArray(importStmt.source) ? importStmt.source : [importStmt.source];
      for (const source of sources) {
        const result = await resolveImport(source, targetFilePath, absoluteRootPath, resolutionConfig.aliases);
        resolvedImports.push({
          source,
          resolved: result.resolved,
          type: result.type,
          specifiers: importStmt.specifiers,
          reason: result.reason
        });
      }
    }
    if (verbose) console.log(`  ✓ Resolved ${resolvedImports.length} imports\n`);

    // Paso 3: Detectar conexiones semánticas
    if (verbose) console.log('🔍 Detecting semantic connections...');
    const fileSourceCode = { [targetFilePath]: parsedFile.source || '' };
    
    // Parsear imports para detección de conexiones
    const allParsedFiles = { [targetFilePath]: parsedFile };
    for (const imp of resolvedImports) {
      if (imp.type === 'local' && imp.resolved) {
        try {
          const depPath = path.join(absoluteRootPath, imp.resolved);
          const depParsed = await parseFileFromDisk(depPath);
          if (depParsed) {
            allParsedFiles[depPath] = depParsed;
            fileSourceCode[depPath] = depParsed.source || '';
          }
        } catch (e) {
          // Ignorar errores de dependencias
        }
      }
    }
    
    const staticConnections = detectAllSemanticConnections(fileSourceCode);
    const advancedConnections = detectAllAdvancedConnections(fileSourceCode);
    if (verbose) console.log(`  ✓ Found ${staticConnections.all.length + advancedConnections.connections.length} connections\n`);

    // Paso 4: Extraer metadatos
    if (verbose) console.log('📊 Extracting metadata...');
    const metadata = extractAllMetadata(targetFilePath, parsedFile.source || '');
    if (verbose) console.log(`  ✓ Metadata: ${metadata.jsdoc?.all?.length || 0} JSDoc, ${metadata.async?.all?.length || 0} async\n`);

    // Paso 5: Construir análisis del archivo
    const fileAnalysis = {
      filePath: singleFile,
      fileName: path.basename(singleFile),
      ext: path.extname(singleFile),
      imports: resolvedImports.map(imp => ({
        source: imp.source,
        resolvedPath: imp.resolved,
        type: imp.type,
        specifiers: imp.specifiers || []
      })),
      exports: parsedFile.exports || [],
      definitions: parsedFile.definitions || [],
      semanticConnections: [
        ...staticConnections.all.map(conn => ({
          target: conn.targetFile,
          type: conn.via,
          key: conn.key || conn.event,
          confidence: conn.confidence,
          detectedBy: 'static-extractor'
        })),
        ...advancedConnections.connections.map(conn => ({
          target: conn.targetFile,
          type: conn.via,
          channelName: conn.channelName,
          confidence: conn.confidence,
          detectedBy: 'advanced-extractor'
        }))
      ],
      metadata: {
        jsdocContracts: metadata.jsdoc || { all: [] },
        asyncPatterns: metadata.async || { all: [] },
        errorHandling: metadata.errors || { all: [] },
        buildTimeDeps: metadata.build || { envVars: [] }
      },
      analyzedAt: new Date().toISOString()
    };

    // Paso 6: Guardar resultado
    const outputDir = path.join(absoluteRootPath, '.OmnySysData', 'files', path.dirname(singleFile));
    await fs.mkdir(outputDir, { recursive: true });
    
    const outputPath = path.join(outputDir, `${path.basename(singleFile)}.json`);
    await fs.writeFile(outputPath, JSON.stringify(fileAnalysis, null, 2), 'utf-8');
    
    if (verbose) {
      console.log(`💾 Results saved to: ${path.relative(absoluteRootPath, outputPath)}`);
      console.log(`\n📊 Summary:`);
      console.log(`  - Imports: ${fileAnalysis.imports.length}`);
      console.log(`  - Exports: ${fileAnalysis.exports.length}`);
      console.log(`  - Semantic connections: ${fileAnalysis.semanticConnections.length}`);
      console.log(`  - Functions: ${fileAnalysis.definitions.filter(d => d.type === 'function').length}\n`);
    }

    // Si hay systemMap existente, actualizarlo
    if (existingMap && incremental) {
      existingMap.files[singleFile] = fileAnalysis;
      existingMap.metadata.lastUpdated = new Date().toISOString();
      await fs.writeFile(systemMapPath, JSON.stringify(existingMap, null, 2), 'utf-8');
      if (verbose) console.log('  ✓ Updated .OmnySysData/system-map-enhanced.json\n');
    }

    return fileAnalysis;

  } catch (error) {
    console.error(`\n❌ Single-file analysis failed: ${error.message}`);
    throw error;
  }
}

/**
 * CLI: Ejecutar indexer desde línea de comandos
 *
 * Uso:
 *   node src/layer-a-static/indexer.js /path/to/project [output-file]
 */

const isMainModule = process.argv[1]?.includes('indexer.js') || false;
if (isMainModule) {
  const projectPath = process.argv[2] || process.cwd();
  const outputFile = process.argv[3] || 'system-map.json';

  try {
    await indexProject(projectPath, {
      outputPath: outputFile,
      verbose: true
    });
  } catch (error) {
    process.exit(1);
  }
}
