import path from 'path';

import { generateAnalysisReport } from './analyzer.js';
import { UnifiedCacheManager } from '../core/unified-cache-manager.js';

import { loadProjectInfo, scanProjectFiles } from './pipeline/scan.js';
import { parseFiles } from './pipeline/parse.js';
import { resolveImports } from './pipeline/resolve.js';
import { normalizeParsedFiles, normalizeResolvedImports } from './pipeline/normalize.js';
import { buildSystemGraph } from './pipeline/graph.js';
import { enhanceSystemMap as generateEnhancedSystemMap } from './pipeline/enhancers/index.js';
import { analyzeSingleFile } from './pipeline/single-file.js';
import {
  ensureDataDir,
  saveSystemMap,
  saveAnalysisReport,
  saveEnhancedSystemMap,
  savePartitionedData,
  printSummary
} from './pipeline/save.js';

/**
 * Indexer - Orquestador principal de Capa A
 *
 * Responsabilidad:
 * - Ejecutar todo el pipeline de análisis estático
 * - Coordinar scanner → parser → resolver → graph-builder
 * - Guardar resultados en JSON
 */

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
    console.log(`\nðŸš€ Starting Single-File Analysis\n`);
    console.log(`ðŸ“ Project root: ${absoluteRootPath}`);
    console.log(`ðŸ“„ Target file: ${singleFile}\n`);

    return await analyzeSingleFile(absoluteRootPath, singleFile, { verbose, incremental });
  }

  console.log(`\nðŸš€ Starting Layer A: Static Analysis\n`);
  console.log(`ðŸ“ Project root: ${absoluteRootPath}\n`);

  try {
    // NUEVO: Inicializar Unified Cache Manager
    const cacheManager = new UnifiedCacheManager(absoluteRootPath);
    await cacheManager.initialize();

    // Paso 1: Detectar info del proyecto
    await loadProjectInfo(absoluteRootPath, verbose);

    // Paso 2: Escanear archivos
    const { relativeFiles, files } = await scanProjectFiles(absoluteRootPath, verbose);

    // NUEVO: Limpiar archivos borrados del cache
    await cacheManager.cleanupDeletedFiles(relativeFiles);

    // Paso 3: Parsear archivos
    const parsedFiles = await parseFiles(files, verbose);

    // Paso 4: Resolver imports
    const { resolvedImports } = await resolveImports(parsedFiles, absoluteRootPath, verbose);

    // Paso 5: Normalizar paths a proyecto-relativo
    if (verbose) console.log('ðŸ”„ Normalizing paths...');
    const normalizedParsedFiles = normalizeParsedFiles(parsedFiles, absoluteRootPath);
    const normalizedResolvedImports = normalizeResolvedImports(resolvedImports, absoluteRootPath);
    if (verbose) console.log('  âœ“ Paths normalized\n');

    // Paso 6: Construir grafo
    const systemMap = buildSystemGraph(normalizedParsedFiles, normalizedResolvedImports, verbose);

    // Paso 7: Guardar grafo en .OmnySysData/
    const dataDir = await ensureDataDir(absoluteRootPath);
    await saveSystemMap(dataDir, outputPath, systemMap, verbose);

    // Paso 8: Generar análisis automático
    if (verbose) console.log('ðŸ” Analyzing code quality...');
    const analysisReport = generateAnalysisReport(systemMap);
    await saveAnalysisReport(dataDir, outputPath, analysisReport, verbose);

    // Paso 9: Generar enhanced system map con análisis semántico estático
    if (verbose) console.log('ðŸ§  Performing Phase 3.5: Semantic Detection (Static)...');
    const enhancedSystemMap = await generateEnhancedSystemMap(
      absoluteRootPath,
      parsedFiles,
      systemMap,
      verbose,
      skipLLM
    );
    const enhancedOutputPath = await saveEnhancedSystemMap(
      dataDir,
      outputPath,
      enhancedSystemMap,
      verbose
    );

    // Paso 10: Guardar datos particionados en .OmnySysData/
    const partitionedPaths = await savePartitionedData(absoluteRootPath, enhancedSystemMap, verbose);

    // Resumen
    if (verbose) {
      printSummary({
        systemMap,
        analysisReport,
        enhancedSystemMap,
        enhancedOutputPath,
        partitionedPaths
      });
      // NOTE: Issues report generation moved to Orchestrator (Layer B)
      // Layer A only extracts metadata, Layer B processes it
    }

    return systemMap;
  } catch (error) {
    console.error('âŒ Error during indexing:', error);
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
