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
import { AtomExtractionPhase } from './pipeline/phases/atom-extraction/index.js';
import { saveAtom } from '#layer-c/storage/atoms/atom.js';

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
    logger.info(`ðŸ“ Project root: ${absoluteRootPath}`);
    logger.info(`ðŸ“„ Target file: ${singleFile}\n`);

    return await analyzeSingleFile(absoluteRootPath, singleFile, { verbose, incremental });
  }

  logger.info(`\nðŸš€ Starting Layer A: Static Analysis\n`);
  logger.info(`ðŸ“ Project root: ${absoluteRootPath}\n`);

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
    
    // 🆕 PASO 3.5: Extraer átomos con metadata RICA usando AtomExtractionPhase
    if (verbose) logger.info('\n⚛️  Extracting rich atomic metadata...');
    const atomPhase = new AtomExtractionPhase();
    let totalAtomsExtracted = 0;
    
    for (const [absoluteFilePath, parsedFile] of Object.entries(parsedFiles)) {
      // Declare outside try so catch block can use it
      let relativeFilePath;
      try {
        // Normalizar path a relativo desde el inicio
        relativeFilePath = path.relative(absoluteRootPath, absoluteFilePath).replace(/\\/g, '/');
        
        // Crear contexto para el phase con path relativo
        const context = {
          filePath: relativeFilePath,
          code: parsedFile.source || '',
          fileInfo: parsedFile,
          fileMetadata: parsedFile.metadata || {}
        };
        
        // Ejecutar fase de extracción atómica
        await atomPhase.execute(context);
        
        // Guardar átomos en el parsedFile para que estén disponibles después
        parsedFile.atoms = context.atoms || [];
        parsedFile.atomCount = context.atomCount || 0;
        totalAtomsExtracted += context.atomCount || 0;
        
        // 🆕 Guardar átomos individualmente en disco
        if (context.atoms && context.atoms.length > 0) {
          for (const atom of context.atoms) {
            if (atom.name) {
              await saveAtom(absoluteRootPath, relativeFilePath, atom.name, atom);
            }
          }
        }
      } catch (error) {
        logger.warn(`  ⚠️ Failed to extract atoms from ${relativeFilePath}: ${error.message}`);
        parsedFile.atoms = [];
        parsedFile.atomCount = 0;
      }
    }
    
    if (verbose) {
      logger.info(`  ✓ ${totalAtomsExtracted} rich atoms extracted and saved`);
      logger.info(`  ✓ Individual atoms saved to .omnysysdata/atoms/\n`);
    }

    // 🧹 MEMORY OPTIMIZATION: Clear source code from parsed files to free memory
    // The source is no longer needed after atom extraction
    let freedMemory = 0;
    for (const parsedFile of Object.values(parsedFiles)) {
      if (parsedFile.source) {
        freedMemory += parsedFile.source.length;
        parsedFile.source = null; // Allow GC to reclaim memory
      }
    }
    if (verbose && freedMemory > 0) {
      logger.info(`  🧹 Freed ~${Math.round(freedMemory / 1024 / 1024)}MB of source code from memory`);
    }

    // Paso 4: Resolver imports
    const { resolvedImports } = await resolveImports(parsedFiles, absoluteRootPath, verbose);

    // Paso 5: Normalizar paths a proyecto-relativo
    if (verbose) logger.info('ðŸ”„ Normalizing paths...');
    const normalizedParsedFiles = normalizeParsedFiles(parsedFiles, absoluteRootPath);
    const normalizedResolvedImports = normalizeResolvedImports(resolvedImports, absoluteRootPath);
    if (verbose) logger.info('  âœ“ Paths normalized\n');

    // Paso 6: Construir grafo
    const systemMap = buildSystemGraph(normalizedParsedFiles, normalizedResolvedImports, verbose);

    // Paso 7: Guardar grafo en .OmnySysData/
    const dataDir = await ensureDataDir(absoluteRootPath);
    await saveSystemMap(dataDir, outputPath, systemMap, verbose);

    // Paso 8: Generar análisis automático
    if (verbose) logger.info('🔍 Analyzing code quality...');
    
    // Construir índice de átomos para clasificación molecular
    const atomsIndex = {};
    for (const [filePath, fileInfo] of Object.entries(normalizedParsedFiles)) {
      if (fileInfo.atoms && fileInfo.atoms.length > 0) {
        atomsIndex[filePath] = {
          atoms: fileInfo.atoms,
          atomCount: fileInfo.atomCount
        };
      }
    }
    
    const analysisReport = await generateAnalysisReport(systemMap, atomsIndex);
    await saveAnalysisReport(dataDir, outputPath, analysisReport, verbose);

    // Paso 9: Generar enhanced system map con análisis semántico estático
    if (verbose) logger.info('ðŸ§  Performing Phase 3.5: Semantic Detection (Static)...');
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
    
    // Actualizar metadata con conteo de átomos extraídos
    enhancedSystemMap.metadata.totalAtoms = totalAtomsExtracted;

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
    logger.error('âŒ Error during indexing:', error);
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
    process.exit(1);
  }
}
