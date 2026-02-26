import path from 'path';

import { generateAnalysisReport } from './analyzer.js';
import { getCacheManager } from '#core/cache/singleton.js';
import { startTimer, BatchTimer } from '../utils/performance-tracker.js';

import { loadProjectInfo, scanProjectFiles } from './pipeline/scan.js';
import { parseFiles } from './pipeline/parse.js';
import { resolveImports } from './pipeline/resolve.js';
import { normalizeParsedFiles, normalizeResolvedImports } from './pipeline/normalize.js';
import { buildSystemGraph } from './pipeline/graph.js';
import { enhanceSystemMap as generateEnhancedSystemMap } from './pipeline/enhancers/index.js';
import { analyzeSingleFile } from './pipeline/single-file.js';
import {
  ensureDataDir,
  saveEnhancedSystemMap,
  printSummary
} from './pipeline/save.js';
import { extractAndSaveAtoms } from './pipeline/extract.js';
import { buildCalledByLinks, buildAtomsIndex } from './pipeline/link.js';
import { getRepository } from '#layer-c/storage/repository/index.js';
import { enrichWithCulture } from './analysis/file-culture-classifier.js';

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
    logger.info(`\nðŸš€ Starting Single-File Analysis\n`);
    logger.info(`ðŸ" Project root: ${absoluteRootPath}`);
    logger.info(`ðŸ"„ Target file: ${singleFile}\n`);

    return await analyzeSingleFile(absoluteRootPath, singleFile, { verbose, incremental });
  }

  logger.info(`\nðŸš€ Starting Layer A: Static Analysis\n`);
  logger.info(`ðŸ" Project root: ${absoluteRootPath}\n`);

  try {
    const totalTimer = startTimer('TOTAL Layer A');

    // Paso 1+2: Inicializar cache y cargar info del proyecto EN PARALELO
    const timerCache = startTimer('1. Cache init');
    const [cacheManager] = await Promise.all([
      getCacheManager(absoluteRootPath),
      loadProjectInfo(absoluteRootPath, verbose)
    ]);
    timerCache.end(verbose);

    // Paso 2: Escanear archivos
    const timerScan = startTimer('2. File scan');
    const { relativeFiles, files } = await scanProjectFiles(absoluteRootPath, verbose);
    timerScan.end(verbose);

    // Limpiar archivos borrados del cache Y de la base de datos
    const timerCleanup = startTimer('3. Cache & DB cleanup');
    await cacheManager.cleanupDeletedFiles(relativeFiles);

    // Sincronizar también la DB (purga de huérfanos que el caché podría no conocer)
    try {
      const repo = getRepository(absoluteRootPath);
      const dbFilesRaw = repo.db.prepare('SELECT DISTINCT file_path FROM atoms').all();
      const dbFiles = dbFilesRaw.map(f => f.file_path);
      const existingSet = new Set(relativeFiles);

      let orbitalPurged = 0;
      for (const dbFile of dbFiles) {
        if (!existingSet.has(dbFile)) {
          orbitalPurged += repo.deleteByFile(dbFile);
        }
      }

      if (verbose && orbitalPurged > 0) {
        logger.info(`  🗑️  Purged ${orbitalPurged} orphaned atoms from database (no longer on disk)`);
      }
    } catch (err) {
      logger.warn(`  ⚠️ Database cleanup failed: ${err.message}`);
    }

    timerCleanup.end(verbose);

    // Paso 3: Parsear archivos
    const timerParse = startTimer('4. Parse files');
    const parsedFiles = await parseFiles(files, verbose);
    timerParse.end(verbose);

    // Paso 3.5: Extraer átomos con metadata RICA (paralelizado por archivo)
    const timerExtract = startTimer('5. Extract atoms');
    const totalAtomsExtracted = await extractAndSaveAtoms(
      parsedFiles, absoluteRootPath, verbose
    );
    timerExtract.end(verbose);

    // Paso 3.6: Cross-file calledBy linkage (función, cross-file, variable y class)
    const timerLinks = startTimer('6. Build calledBy links');
    await buildCalledByLinks(parsedFiles, absoluteRootPath, verbose);
    timerLinks.end(verbose);

    // 🧹 MEMORY OPTIMIZATION: Clear source code from parsed files to free memory
    let freedMemory = 0;
    for (const parsedFile of Object.values(parsedFiles)) {
      if (parsedFile.source) {
        freedMemory += parsedFile.source.length;
        parsedFile.source = null;
      }
    }
    if (verbose && freedMemory > 0) {
      logger.info(`  🧹 Freed ~${Math.round(freedMemory / 1024 / 1024)}MB of source code from memory`);
    }

    // Paso 4+7a: Resolver imports y preparar dataDir EN PARALELO (independientes)
    const timerResolve = startTimer('7. Resolve imports + dataDir');
    const [{ resolvedImports }, dataDir] = await Promise.all([
      resolveImports(parsedFiles, absoluteRootPath, verbose),
      ensureDataDir(absoluteRootPath)
    ]);
    timerResolve.end(verbose);

    // Paso 5: Normalizar paths a proyecto-relativo
    const timerNormalize = startTimer('8. Normalize paths');
    if (verbose) logger.info('ðŸ"„ Normalizing paths...');
    const normalizedParsedFiles = normalizeParsedFiles(parsedFiles, absoluteRootPath);
    const normalizedResolvedImports = normalizeResolvedImports(resolvedImports, absoluteRootPath);
    if (verbose) logger.info('  âœ" Paths normalized\n');
    timerNormalize.end(verbose);

    // Paso 6: Construir grafo
    const timerGraph = startTimer('9. Build system graph');
    const systemMap = buildSystemGraph(normalizedParsedFiles, normalizedResolvedImports, verbose);
    timerGraph.end(verbose);

    // Paso 6.5: Clasificar culturas de archivos (ZERO LLM)
    const timerCulture = startTimer('10. Classify cultures');
    if (verbose) logger.info('ðŸ·ï¸  Classifying file cultures...');
    enrichWithCulture(systemMap);
    if (verbose) {
      const stats = systemMap.metadata?.cultureStats || {};
      logger.info(`  âœ“ Citizens: ${stats.citizen || 0}, Auditors: ${stats.auditor || 0}`);
      logger.info(`  âœ“ Gatekeepers: ${stats.gatekeeper || 0}, Laws: ${stats.laws || 0}`);
      logger.info(`  âœ“ EntryPoints: ${stats.entrypoint || 0}, Scripts: ${stats.script || 0}`);
      logger.info(`  âœ“ Unknown: ${stats.unknown || 0}\n`);
    }
    timerCulture.end(verbose);

    // Paso 7+8: AnÃ¡lisis en paralelo (sin guardar todavÃ­a)
    const timerAnalysis = startTimer('11. Code quality analysis');
    if (verbose) logger.info('ðŸ” Analyzing code quality...');
    const atomsIndex = buildAtomsIndex(normalizedParsedFiles);

    const [analysisReport, enhancedSystemMap] = await Promise.all([
      generateAnalysisReport(systemMap, atomsIndex),
      generateEnhancedSystemMap(absoluteRootPath, parsedFiles, systemMap, verbose, skipLLM)
    ]);
    timerAnalysis.end(verbose);

    // Paso 9: Guardar TODO en SQLite una sola vez (el enhanced incluye todo)
    const timerSave = startTimer('12. Save to SQLite');
    await saveEnhancedSystemMap(enhancedSystemMap, verbose, absoluteRootPath);
    timerSave.end(verbose);

    // Log total time
    const totalResult = totalTimer.end(verbose);
    if (verbose) {
      logger.info(`\nâš¡ TOTAL TIME: ${totalResult.elapsed.toFixed(2)}ms`);
    }

    // Actualizar metadata con conteo de átomos extraídos
    enhancedSystemMap.metadata.totalAtoms = totalAtomsExtracted;

    // Resumen
    if (verbose) {
      printSummary({ systemMap, analysisReport, enhancedSystemMap });
    }

    return systemMap;
  } catch (error) {
    logger.error('âŒ Error during indexing:', error);
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
import { createLogger } from '../utils/logger.js';

const logger = createLogger('OmnySys:indexer');


if (isMainModule) {
  const projectPath = process.argv[2] || process.cwd();
  const outputFile = process.argv[3] || 'system-map.json';

  try {
    await indexProject(projectPath, {
      outputPath: outputFile,
      verbose: true
    });
  } catch (error) {
    logger.error('Indexer failed with critical error:', error);
    process.exit(1);
  }
}
