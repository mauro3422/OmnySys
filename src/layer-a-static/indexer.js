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
import { AtomExtractionPhase } from './pipeline/phases/atom-extraction/index.js';
import { saveAtom } from '#layer-c/storage/atoms/atom.js';
import { getRepository } from '#layer-c/storage/repository/index.js';
import { enrichAtom } from './pipeline/phases/atom-extraction/metadata/purpose-enricher.js';
import { enrichWithCulture } from './analysis/file-culture-classifier.js';
import { resolveClassInstantiationCalledBy } from './pipeline/phases/calledby/class-instantiation-tracker.js';
import { enrichWithCallerPattern } from './pipeline/phases/atom-extraction/metadata/caller-pattern.js';
import { buildAtomIndex, linkFunctionCalledBy } from './pipeline/phases/calledby/function-linker.js';
import { linkVariableCalledBy } from './pipeline/phases/calledby/variable-linker.js';
import { linkMixinNamespaceCalledBy } from './pipeline/phases/calledby/mixin-namespace-linker.js';

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

    // Limpiar archivos borrados del cache
    const timerCleanup = startTimer('3. Cache cleanup');
    await cacheManager.cleanupDeletedFiles(relativeFiles);
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
 * Extrae y guarda átomos de todos los archivos parseados (paralelizado).
 * @returns {Promise<number>} Total de átomos extraídos
 */
async function extractAndSaveAtoms(parsedFiles, absoluteRootPath, verbose) {
  if (verbose) logger.info('\n⚛️  Extracting rich atomic metadata...');
  const atomPhase = new AtomExtractionPhase();
  let totalAtomsExtracted = 0;

  // Process all files in parallel (Promise.allSettled doesn't abort on individual failures)
  const entries = Object.entries(parsedFiles);
  const batchTimer = new BatchTimer('Atom extraction', entries.length);
  
  // Acumular todos los átomos para bulk insert al final
  const allExtractedAtoms = [];
  
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

      // 🆕 Enrich atoms with better purpose and archetype detection
      if (context.atoms && context.atoms.length > 0) {
        const enrichedAtoms = context.atoms.map(atom => enrichAtom(atom));
        parsedFile.atoms = enrichedAtoms;
        
        // Acumular para bulk insert en lugar de guardar uno por uno
        allExtractedAtoms.push(...enrichedAtoms.filter(atom => atom.name));
      }
      
      batchTimer.onItemProcessed(1);
    } catch (error) {
      logger.warn(`  ⚠️ Failed to extract atoms from ${relativeFilePath}: ${error.message}`);
      parsedFile.atoms = [];
      parsedFile.atomCount = 0;
    }
  }));
  
  // 🚀 BULK INSERT: Guardar todos los átomos de una vez
  if (allExtractedAtoms.length > 0) {
    const timerBulkSave = startTimer('Bulk save atoms');
    const repo = getRepository(absoluteRootPath);
    
    if (repo.saveManyBulk) {
      repo.saveManyBulk(allExtractedAtoms, 500);
      if (verbose) {
        logger.info(`  ✓ ${allExtractedAtoms.length} atoms saved via bulk insert`);
      }
    } else {
      // Fallback al método antiguo
      await Promise.allSettled(
        allExtractedAtoms.map(atom => saveAtom(absoluteRootPath, atom.filePath || '', atom.name, atom))
      );
    }
    
    timerBulkSave.end(verbose);
  }

  batchTimer.end(verbose);

  if (verbose) {
    logger.info(`  ✓ ${totalAtomsExtracted} rich atoms extracted and saved`);
    logger.info(`  ✓ Individual atoms saved to .omnysysdata/atoms/\n`);
  }

  return totalAtomsExtracted;
}

/**
 * Orquesta los 4 pasos de calledBy linkage delegando a módulos especializados.
 * TODOS los cambios se acumulan y se guardan en BULK al final.
 */
async function buildCalledByLinks(parsedFiles, absoluteRootPath, verbose) {
  const timerTotal = startTimer('6a. Build atom index');
  const allAtoms = [];
  for (const parsedFile of Object.values(parsedFiles)) {
    if (parsedFile.atoms) allAtoms.push(...parsedFile.atoms);
  }

  const index = buildAtomIndex(allAtoms);
  timerTotal.end(verbose);

  // Set para trackear átomos modificados (evita duplicados)
  const modifiedAtoms = new Set();

  // 3.6a: Function calledBy
  try {
    const timerFunc = startTimer('6b. Function calledBy links');
    if (verbose) logger.info('🔗 Building cross-file calledBy index...');
    const { updatedAtoms } = await linkFunctionCalledBy(allAtoms, absoluteRootPath, index, verbose);
    updatedAtoms.forEach(a => modifiedAtoms.add(a));
    timerFunc.end(verbose);
  } catch (err) {
    logger.warn(`  ⚠️ function-linker failed: ${err.message}`);
  }

  // 3.6b: Variable reference calledBy
  try {
    const timerVar = startTimer('6c. Variable calledBy links');
    if (verbose) logger.info('🔗 Building cross-file variable reference index...');
    const { updatedAtoms } = await linkVariableCalledBy(allAtoms, parsedFiles, absoluteRootPath, verbose);
    updatedAtoms.forEach(a => modifiedAtoms.add(a));
    timerVar.end(verbose);
  } catch (err) {
    logger.warn(`  ⚠️ variable-linker failed: ${err.message}`);
  }

  // 3.6c: Mixin + namespace import calledBy
  try {
    const timerMixin = startTimer('6d. Mixin/namespace links');
    if (verbose) logger.info('🔗 Resolving mixin/namespace import calledBy links...');
    const { namespaceLinks, mixinLinks, updatedAtoms } = await linkMixinNamespaceCalledBy(allAtoms, parsedFiles, absoluteRootPath, verbose);
    if (verbose) logger.info(`  ✓ ${namespaceLinks} namespace + ${mixinLinks} mixin this.* links\n`);
    updatedAtoms.forEach(a => modifiedAtoms.add(a));
    timerMixin.end(verbose);
  } catch (err) {
    logger.warn(`  ⚠️ mixin-linker failed: ${err.message}`);
  }

  // 3.7: Class instantiation calledBy
  try {
    const timerClass = startTimer('6e. Class instantiation links');
    if (verbose) logger.info('🏗️  Resolving class instantiation calledBy links...');
    const { resolved: classResolved, classesTracked } = resolveClassInstantiationCalledBy(allAtoms);
    if (verbose) logger.info(`  ✓ ${classResolved} class method calledBy links resolved (${classesTracked} classes tracked)\n`);
    if (classResolved > 0) {
      // Acumular átomos modificados (sin guardar individualmente)
      allAtoms
        .filter(a => a.calledBy?.length > 0 && a.filePath && a.name)
        .forEach(a => modifiedAtoms.add(a));
    }
    timerClass.end(verbose);
  } catch (err) {
    logger.warn(`  ⚠️ class-instantiation-tracker failed: ${err.message}`);
  }

  // 3.8: Caller Pattern Detection
  const timerPattern = startTimer('6f. Caller pattern detection');
  if (verbose) logger.info('🏷️  Detecting caller patterns...');
  enrichWithCallerPattern(allAtoms);

  // Todos los átomos tienen callerPattern ahora
  allAtoms.forEach(a => modifiedAtoms.add(a));

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
  timerPattern.end(verbose);

  // 🚀 BULK SAVE: Guardar TODOS los átomos modificados de una vez
  const timerBulkUpdate = startTimer('6f-bulk. Bulk update modified atoms');
  if (modifiedAtoms.size > 0) {
    const repo = getRepository(absoluteRootPath);
    if (repo.saveManyBulk) {
      const uniqueAtoms = Array.from(modifiedAtoms);
      repo.saveManyBulk(uniqueAtoms, 500);
      if (verbose) {
        logger.info(`  ✓ ${uniqueAtoms.length} modified atoms saved via bulk update`);
      }
    }
  }
  timerBulkUpdate.end(verbose);

  // 3.9: Guardar relaciones entre átomos en atom_relations
  const timerRelations = startTimer('6g. Save atom relations');
  if (verbose) logger.info('🔗 Saving atom relations to database...');
  await saveAtomRelations(allAtoms, absoluteRootPath, verbose);
  timerRelations.end(verbose);
}

/**
 * Guarda las relaciones calls de todos los átomos en la tabla atom_relations
 */
async function saveAtomRelations(allAtoms, absoluteRootPath, verbose) {
  const repo = getRepository(absoluteRootPath);
  if (!repo.saveCalls) {
    if (verbose) logger.warn('  ⚠️ Repository does not support saveCalls');
    return;
  }

  // 🚀 BULK INSERT: Preparar todas las relaciones y guardar en batch
  const relationsToSave = [];
  for (const atom of allAtoms) {
    if (atom.calls && atom.calls.length > 0) {
      for (const call of atom.calls) {
        relationsToSave.push({ atomId: atom.id, call });
      }
    }
  }

  const timerRelations = startTimer('Bulk save relations');
  
  if (relationsToSave.length > 0) {
    if (repo.saveRelationsBulk) {
      repo.saveRelationsBulk(relationsToSave, 500);
      if (verbose) {
        logger.info(`  ✓ Saved ${relationsToSave.length} atom relations via bulk insert`);
      }
    } else {
      // Fallback al método antiguo
      for (const atom of allAtoms) {
        if (atom.calls && atom.calls.length > 0) {
          try {
            repo.saveCalls(atom.id, atom.calls);
          } catch (err) {
            logger.warn(`  ⚠️ Failed to save relations for ${atom.id}: ${err.message}`);
          }
        }
      }
    }
  }
  
  timerRelations.end(verbose);

  if (verbose) {
    logger.info(`  ✓ Saved ${relationsToSave.length} atom relations\n`);
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
