import path from 'path';

import { generateAnalysisReport } from './analyzer.js';
import { getCacheManager } from '#core/cache/singleton.js';

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
import { enrichWithCulture } from './analysis/file-culture-classifier.js';
import { resolveClassInstantiationCalledBy } from './pipeline/phases/calledby/class-instantiation-tracker.js';
import { enrichWithCallerPattern } from './pipeline/phases/atom-extraction/metadata/caller-pattern.js';
import { buildAtomIndex, linkFunctionCalledBy } from './pipeline/phases/calledby/function-linker.js';
import { linkVariableCalledBy } from './pipeline/phases/calledby/variable-linker.js';

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
    // Paso 1+2: Inicializar cache y cargar info del proyecto EN PARALELO
    const [cacheManager] = await Promise.all([
      getCacheManager(absoluteRootPath),
      loadProjectInfo(absoluteRootPath, verbose)
    ]);

    // Paso 2: Escanear archivos
    const { relativeFiles, files } = await scanProjectFiles(absoluteRootPath, verbose);

    // Limpiar archivos borrados del cache
    await cacheManager.cleanupDeletedFiles(relativeFiles);

    // Paso 3: Parsear archivos
    const parsedFiles = await parseFiles(files, verbose);

    // Paso 3.5: Extraer átomos con metadata RICA (paralelizado por archivo)
    const totalAtomsExtracted = await extractAndSaveAtoms(
      parsedFiles, absoluteRootPath, verbose
    );

    // Paso 3.6: Cross-file calledBy linkage (función, cross-file, variable y class)
    await buildCalledByLinks(parsedFiles, absoluteRootPath, verbose);

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

    // Paso 4: Resolver imports
    const { resolvedImports } = await resolveImports(parsedFiles, absoluteRootPath, verbose);

    // Paso 5: Normalizar paths a proyecto-relativo
    if (verbose) logger.info('ðŸ"„ Normalizing paths...');
    const normalizedParsedFiles = normalizeParsedFiles(parsedFiles, absoluteRootPath);
    const normalizedResolvedImports = normalizeResolvedImports(resolvedImports, absoluteRootPath);
    if (verbose) logger.info('  âœ" Paths normalized\n');

    // Paso 6: Construir grafo
    const systemMap = buildSystemGraph(normalizedParsedFiles, normalizedResolvedImports, verbose);

    // Paso 6.5: Clasificar culturas de archivos (ZERO LLM)
    if (verbose) logger.info('🏷️  Classifying file cultures...');
    enrichWithCulture(systemMap);
    if (verbose) {
      const stats = systemMap.metadata?.cultureStats || {};
      logger.info(`  ✓ Citizens: ${stats.citizen || 0}, Auditors: ${stats.auditor || 0}`);
      logger.info(`  ✓ Gatekeepers: ${stats.gatekeeper || 0}, Laws: ${stats.laws || 0}`);
      logger.info(`  ✓ EntryPoints: ${stats.entrypoint || 0}, Scripts: ${stats.script || 0}`);
      logger.info(`  ✓ Unknown: ${stats.unknown || 0}\n`);
    }

    // Paso 7: Guardar grafo en .OmnySysData/
    const dataDir = await ensureDataDir(absoluteRootPath);
    await saveSystemMap(dataDir, outputPath, systemMap, verbose);

    // Paso 8+9: Análisis y enhanced map EN PARALELO
    if (verbose) logger.info('🔍 Analyzing code quality...');
    const atomsIndex = buildAtomsIndex(normalizedParsedFiles);

    const [analysisReport, enhancedSystemMap] = await Promise.all([
      generateAnalysisReport(systemMap, atomsIndex),
      generateEnhancedSystemMap(absoluteRootPath, parsedFiles, systemMap, verbose, skipLLM)
    ]);

    // Paso 9b: Guardar resultados EN PARALELO
    const [, enhancedOutputPath, partitionedPaths] = await Promise.all([
      saveAnalysisReport(dataDir, outputPath, analysisReport, verbose),
      saveEnhancedSystemMap(dataDir, outputPath, enhancedSystemMap, verbose),
      savePartitionedData(absoluteRootPath, enhancedSystemMap, verbose)
    ]);

    // Actualizar metadata con conteo de átomos extraídos
    enhancedSystemMap.metadata.totalAtoms = totalAtomsExtracted;

    // Resumen
    if (verbose) {
      printSummary({ systemMap, analysisReport, enhancedSystemMap, enhancedOutputPath, partitionedPaths });
    }

    return systemMap;
  } catch (error) {
    logger.error('âŒ Error during indexing:', error);
    throw error;
  }
}

/**
 * Extrae y guarda átomos de todos los archivos parseados (paralelizado).
 * @returns {Promise<number>} Total de átomos extraídos
 */
async function extractAndSaveAtoms(parsedFiles, absoluteRootPath, verbose) {
  if (verbose) logger.info('\n⚛️  Extracting rich atomic metadata...');
  const atomPhase = new AtomExtractionPhase();
  let totalAtomsExtracted = 0;

  // Process all files in parallel (Promise.allSettled doesn't abort on individual failures)
  const entries = Object.entries(parsedFiles);
  await Promise.allSettled(entries.map(async ([absoluteFilePath, parsedFile]) => {
    let relativeFilePath;
    try {
      relativeFilePath = path.relative(absoluteRootPath, absoluteFilePath).replace(/\\/g, '/');
      const context = {
        filePath: relativeFilePath,
        code: parsedFile.source || '',
        fileInfo: parsedFile,
        fileMetadata: parsedFile.metadata || {}
      };

      await atomPhase.execute(context);

      parsedFile.atoms = context.atoms || [];
      parsedFile.atomCount = context.atomCount || 0;
      totalAtomsExtracted += context.atomCount || 0;

      // Save atoms to disk in parallel
      if (context.atoms && context.atoms.length > 0) {
        await Promise.allSettled(
          context.atoms
            .filter(atom => atom.name)
            .map(atom => saveAtom(absoluteRootPath, relativeFilePath, atom.name, atom))
        );
      }
    } catch (error) {
      logger.warn(`  ⚠️ Failed to extract atoms from ${relativeFilePath}: ${error.message}`);
      parsedFile.atoms = [];
      parsedFile.atomCount = 0;
    }
  }));

  if (verbose) {
    logger.info(`  ✓ ${totalAtomsExtracted} rich atoms extracted and saved`);
    logger.info(`  ✓ Individual atoms saved to .omnysysdata/atoms/\n`);
  }

  return totalAtomsExtracted;
}

/**
 * Orquesta los 4 pasos de calledBy linkage delegando a módulos especializados.
 */
async function buildCalledByLinks(parsedFiles, absoluteRootPath, verbose) {
  const allAtoms = [];
  for (const parsedFile of Object.values(parsedFiles)) {
    if (parsedFile.atoms) allAtoms.push(...parsedFile.atoms);
  }

  // 3.6a: Function calledBy
  if (verbose) logger.info('🔗 Building cross-file calledBy index...');
  const index = buildAtomIndex(allAtoms);
  await linkFunctionCalledBy(allAtoms, absoluteRootPath, index, verbose);

  // 3.6b: Variable reference calledBy
  if (verbose) logger.info('🔗 Building cross-file variable reference index...');
  await linkVariableCalledBy(allAtoms, parsedFiles, absoluteRootPath, verbose);

  // 3.7: Class instantiation calledBy
  if (verbose) logger.info('🏗️  Resolving class instantiation calledBy links...');
  const { resolved: classResolved, classesTracked } = resolveClassInstantiationCalledBy(allAtoms);
  if (verbose) logger.info(`  ✓ ${classResolved} class method calledBy links resolved (${classesTracked} classes tracked)\n`);

  if (classResolved > 0) {
    await Promise.allSettled(
      allAtoms
        .filter(a => a.calledBy?.length > 0 && a.filePath && a.name)
        .map(a => saveAtom(absoluteRootPath, a.filePath, a.name, a))
    );
  }

  // 3.8: Caller Pattern Detection
  if (verbose) logger.info('🏷️  Detecting caller patterns...');
  enrichWithCallerPattern(allAtoms);

  await Promise.allSettled(
    allAtoms
      .filter(a => a.filePath && a.name && a.callerPattern)
      .map(a => saveAtom(absoluteRootPath, a.filePath, a.name, a))
  );

  if (verbose) {
    const patternStats = {};
    for (const atom of allAtoms) {
      const id = atom.callerPattern?.id || 'unknown';
      patternStats[id] = (patternStats[id] || 0) + 1;
    }
    const topPatterns = Object.entries(patternStats)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([id, count]) => `${id}: ${count}`);
    logger.info(`  ✓ Caller patterns: ${topPatterns.join(', ')}\n`);
  }
}

/**
 * Construye el índice de átomos para análisis molecular.
 */
function buildAtomsIndex(normalizedParsedFiles) {
  const atomsIndex = {};
  for (const [filePath, fileInfo] of Object.entries(normalizedParsedFiles)) {
    if (fileInfo.atoms && fileInfo.atoms.length > 0) {
      atomsIndex[filePath] = { atoms: fileInfo.atoms, atomCount: fileInfo.atomCount };
    }
  }
  return atomsIndex;
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
