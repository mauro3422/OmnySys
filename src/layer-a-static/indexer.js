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
    // Obtener instancia singleton del cache (O(1) si ya fue inicializado)
    const cacheManager = await getCacheManager(absoluteRootPath);

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

    // 🆕 PASO 3.6: Cross-file calledBy linkage (MEJORADO v0.9.34)
    // buildCallGraph() only sees atoms within a single file.
    // Here we build the global reverse-index: for every call in every atom,
    // find the atom that defines that function (in any file) and add the caller to its calledBy.
    if (verbose) logger.info('🔗 Building cross-file calledBy index...');
    {
      // Collect ALL atoms across all files
      const allAtoms = [];
      for (const parsedFile of Object.values(parsedFiles)) {
        if (parsedFile.atoms) allAtoms.push(...parsedFile.atoms);
      }

      // Build MULTI-LEVEL lookup (v0.9.34 fix)
      const atomBySimpleName = new Map();      // "info" → [atom1, atom2, ...]
      const atomByQualifiedName = new Map();   // "Logger.info" → atom
      const atomByFilePath = new Map();        // full id → atom

      for (const atom of allAtoms) {
        // Por nombre simple (puede haber múltiples candidatos)
        if (!atomBySimpleName.has(atom.name)) {
          atomBySimpleName.set(atom.name, []);
        }
        atomBySimpleName.get(atom.name).push(atom);
        
        // Por nombre calificado (único) - para métodos de clase
        if (atom.className) {
          const qualifiedName = `${atom.className}.${atom.name}`;
          atomByQualifiedName.set(qualifiedName, atom);
        }
        
        // Por ID completo (único)
        atomByFilePath.set(atom.id, atom);
      }

      // Smart lookup function
      function findTargetAtom(callName, callerAtom) {
        // 1. Buscar por nombre calificado primero (más preciso)
        if (callName && callName.includes('.')) {
          return atomByQualifiedName.get(callName);
        }
        
        // 2. Buscar por nombre simple
        const candidates = atomBySimpleName.get(callName) || [];
        
        if (candidates.length === 0) return null;
        if (candidates.length === 1) return candidates[0];
        
        // 3. Si hay múltiples candidatos, preferir:
        //    - Exportado sobre no exportado
        //    - Archivo diferente al caller
        const exported = candidates.find(a => a.isExported);
        if (exported) return exported;
        
        const differentFile = candidates.find(a => a.filePath !== callerAtom.filePath);
        if (differentFile) return differentFile;
        
        return candidates[0];
      }

      // For each atom's ALL calls (not just external), find the target atom and add calledBy
      let crossFileLinks = 0;
      let intraFileLinks = 0;
      
      for (const callerAtom of allAtoms) {
        // Considerar TODAS las llamadas
        const allCalls = [
          ...(callerAtom.calls || []),
          ...(callerAtom.internalCalls || []),
          ...(callerAtom.externalCalls || [])
        ];
        
        for (const call of allCalls) {
          if (!call.name) continue;
          
          const targetAtom = findTargetAtom(call.name, callerAtom);
          if (targetAtom && targetAtom.id !== callerAtom.id) {
            if (!targetAtom.calledBy) targetAtom.calledBy = [];
            if (!targetAtom.calledBy.includes(callerAtom.id)) {
              targetAtom.calledBy.push(callerAtom.id);
              if (targetAtom.filePath !== callerAtom.filePath) {
                crossFileLinks++;
              } else {
                intraFileLinks++;
              }
            }
          }
        }
      }

      // Persist updated atoms back to disk (only those whose calledBy grew)
      const updatedAtoms = allAtoms.filter(a => a.calledBy && a.calledBy.length > 0);
      for (const atom of updatedAtoms) {
        const filePath = atom.filePath;
        if (filePath && atom.name) {
          await saveAtom(absoluteRootPath, filePath, atom.name, atom);
        }
      }

      if (verbose) logger.info(`  ✓ ${crossFileLinks} cross-file + ${intraFileLinks} intra-file calledBy links (${updatedAtoms.length} atoms updated)`);

      // 🆕 PASO 3.7: Class instantiation tracker
      // Resuelve calledBy para métodos llamados via `new Clase().metodo()`
      // El linker anterior solo resuelve imports directos, no instanciaciones.
      if (verbose) logger.info('🏗️  Resolving class instantiation calledBy links...');
      const { resolved: classResolved, classesTracked } = resolveClassInstantiationCalledBy(allAtoms);
      if (verbose) logger.info(`  ✓ ${classResolved} class method calledBy links resolved (${classesTracked} classes tracked)\n`);

      // Persistir átomos actualizados por el class tracker
      if (classResolved > 0) {
        const classUpdated = allAtoms.filter(a => a.calledBy && a.calledBy.length > 0);
        for (const atom of classUpdated) {
          if (atom.filePath && atom.name) {
            await saveAtom(absoluteRootPath, atom.filePath, atom.name, atom);
          }
        }
      }
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
    
    // 🆕 PASO 6.5: Clasificar culturas de archivos (ZERO LLM)
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
