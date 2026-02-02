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
async function generateEnhancedSystemMap(absoluteRootPath, parsedFiles, systemMap, verbose = true) {
  if (verbose) console.log('\n🔍 Performing semantic analysis (static)...');

  const enhancedFiles = {};
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

  const allConnections = [...sharedStateConnections, ...eventConnections];

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

  // Paso 5: Construir enhanced system map
  if (verbose) console.log('  🏗️  Building enhanced system map...');

  const enhancedSystemMap = {
    metadata: {
      ...systemMap.metadata,
      enhanced: true,
      enhancedAt: new Date().toISOString(),
      analysisVersion: '3.5.0',
      includes: ['static', 'semantic-static', 'risk-scoring']
    },
    files: {},
    connections: {
      sharedState: sharedStateConnections,
      eventListeners: eventConnections,
      total: allConnections.length
    },
    riskAssessment: {
      scores: riskScores,
      report: generateRiskReport(riskScores)
    }
  };

  // Enriquecer cada archivo con sus análisis
  for (const [filePath, fileInfo] of Object.entries(enhancedFiles)) {
    const riskScore = riskScores[filePath];
    const connections = semanticConnectionsByFile[filePath] || [];

    enhancedSystemMap.files[filePath] = {
      ...systemMap.files[filePath],
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
    verbose = true
  } = options;

  // Convertir rootPath a absoluto
  const absoluteRootPath = path.isAbsolute(rootPath)
    ? rootPath
    : path.resolve(process.cwd(), rootPath);

  console.log(`\n🚀 Starting Layer A: Static Analysis\n`);
  console.log(`📁 Project root: ${absoluteRootPath}\n`);

  try {
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

    // Paso 8: Guardar grafo
    if (verbose) console.log('💾 Saving graph...');
    const outputFullPath = path.join(absoluteRootPath, outputPath);
    await fs.writeFile(outputFullPath, JSON.stringify(systemMap, null, 2));
    if (verbose) console.log(`  ✓ Saved to: ${outputPath}\n`);

    // Paso 9: Generar análisis automático
    if (verbose) console.log('🔍 Analyzing code quality...');
    const analysisReport = generateAnalysisReport(systemMap);
    const analysisOutputPath = outputPath.replace('.json', '-analysis.json');
    const analysisFullPath = path.join(absoluteRootPath, analysisOutputPath);
    await fs.writeFile(analysisFullPath, JSON.stringify(analysisReport, null, 2));
    if (verbose) console.log(`  ✓ Analysis saved to: ${analysisOutputPath}\n`);

    // Paso 10: NUEVO - Generar enhanced system map con análisis semántico estático
    if (verbose) console.log('🧠 Performing Phase 3.5: Semantic Detection (Static)...');
    const enhancedSystemMap = await generateEnhancedSystemMap(
      absoluteRootPath,
      parsedFiles,
      systemMap,
      verbose
    );
    const enhancedOutputPath = outputPath.replace('.json', '-enhanced.json');
    const enhancedFullPath = path.join(absoluteRootPath, enhancedOutputPath);
    await fs.writeFile(enhancedFullPath, JSON.stringify(enhancedSystemMap, null, 2));
    if (verbose) console.log(`  ✓ Enhanced map saved to: ${enhancedOutputPath}\n`);

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
      `);
    }

    return systemMap;

  } catch (error) {
    console.error('❌ Error during indexing:', error);
    throw error;
  }
}

/**
 * CLI: Ejecutar indexer desde línea de comandos
 *
 * Uso:
 *   node src/layer-a-static/indexer.js /path/to/project [output-file]
 */

const isMainModule = process.argv[1].includes('indexer.js');
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
