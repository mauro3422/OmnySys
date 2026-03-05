/**
 * @fileoverview Refactored Orchestrator for Layer A
 */

import path from 'path';
import { createLogger } from '../utils/logger.js';
import { getCacheManager } from '#core/cache/singleton.js';
import { getRepository } from '#layer-c/storage/repository/index.js';

// Pipeline Phases
import { loadProjectInfo, scanProjectFiles } from './pipeline/scan.js';
import { parseFiles } from './pipeline/parse.js';
import { extractAndSaveAtoms } from './pipeline/extract.js';
import { buildCalledByLinks, buildAtomsIndex } from './pipeline/link.js';
import { resolveImports } from './pipeline/resolve.js';
import { normalizeParsedFiles, normalizeResolvedImports } from './pipeline/normalize.js';
import { buildSystemGraph } from './pipeline/graph.js';
import { enhanceSystemMap as generateEnhancedSystemMap } from './pipeline/enhancers/index.js';
import { analyzeSingleFile } from './pipeline/single-file.js';
import { ensureDataDir, saveEnhancedSystemMap, printSummary } from './pipeline/save.js';
import { enrichWithCulture } from './analysis/file-culture-classifier.js';
import { generateAnalysisReport } from './analyzer.js';
import { PipelineRunner } from './pipeline/runner.js';

const logger = createLogger('OmnySys:indexer');

/**
 * Indexa un proyecto completo utilizando el nuevo PipelineRunner
 */
export async function indexProject(rootPath, options = {}) {
  const {
    outputPath = 'system-map.json',
    verbose = true,
    singleFile = null,
    incremental = false,
    skipLLM = false
  } = options;

  const startTime = Date.now();
  const absoluteRootPath = path.isAbsolute(rootPath) ? rootPath : path.resolve(process.cwd(), rootPath);

  try {

  if (singleFile) {
    return await analyzeSingleFile(absoluteRootPath, singleFile, { verbose, incremental });
  }

  const runner = new PipelineRunner({ absoluteRootPath, verbose, options });

  runner
    .addPhase('1. Initialization', async (ctx) => {
      const [cacheManager] = await Promise.all([
        getCacheManager(ctx.absoluteRootPath),
        loadProjectInfo(ctx.absoluteRootPath, ctx.verbose)
      ]);
      return { cacheManager };
    })
    .addPhase('2. File Scan', async (ctx) => {
      return await scanProjectFiles(ctx.absoluteRootPath, ctx.verbose);
    })
    .addPhase('3. Cleanup', async (ctx) => {
      await ctx.cacheManager.cleanupDeletedFiles(ctx.relativeFiles);
      const repo = getRepository(ctx.absoluteRootPath);
      const dbFilesRaw = repo.db.prepare('SELECT DISTINCT file_path FROM atoms').all();
      const existingSet = new Set(ctx.relativeFiles);
      let orbitalPurged = 0;
      for (const f of dbFilesRaw) {
        if (!existingSet.has(f.file_path)) orbitalPurged += repo.deleteByFile(f.file_path);
      }
      if (ctx.verbose && orbitalPurged > 0) logger.info(`  🗑️ Purged ${orbitalPurged} orphaned atoms`);
    })
    .addPhase('4. Unified Analysis', async (ctx) => {
      const { totalAtomsExtracted, parsedFiles } = await import('./pipeline/unified-analysis.js')
        .then(m => m.analyzeProjectFilesUnified(ctx.files, ctx.absoluteRootPath, ctx.verbose));

      return { parsedFiles, totalAtomsExtracted };
    })
    .addPhase('6. Build Links', async (ctx) => {
      await buildCalledByLinks(ctx.parsedFiles, ctx.absoluteRootPath, ctx.verbose);
    })
    .addPhase('7. Resolve & Normalization', async (ctx) => {
      const [{ resolvedImports }, dataDir] = await Promise.all([
        resolveImports(ctx.parsedFiles, ctx.absoluteRootPath, ctx.verbose),
        ensureDataDir(ctx.absoluteRootPath)
      ]);

      const normalizedParsedFiles = normalizeParsedFiles(ctx.parsedFiles, ctx.absoluteRootPath);
      const normalizedResolvedImports = normalizeResolvedImports(resolvedImports, ctx.absoluteRootPath);

      return { resolvedImports, dataDir, normalizedParsedFiles, normalizedResolvedImports };
    })
    .addPhase('8. System Graph', async (ctx) => {
      const systemMap = buildSystemGraph(ctx.normalizedParsedFiles, ctx.normalizedResolvedImports, ctx.verbose);
      enrichWithCulture(systemMap);
      return { systemMap };
    })
    .addPhase('9. Quality Analysis', async (ctx) => {
      const atomsIndex = buildAtomsIndex(ctx.normalizedParsedFiles);
      const [analysisReport, enhancedSystemMap] = await Promise.all([
        generateAnalysisReport(ctx.systemMap, atomsIndex),
        generateEnhancedSystemMap(ctx.absoluteRootPath, ctx.parsedFiles, ctx.systemMap, ctx.verbose, skipLLM)
      ]);
      return { analysisReport, enhancedSystemMap };
    })
    .addPhase('10. Persist', async (ctx) => {
      await saveEnhancedSystemMap(ctx.enhancedSystemMap, ctx.verbose, ctx.absoluteRootPath);
      // Propagate totals from systemMap to enhancedSystemMap for summary
      if (ctx.systemMap?.metadata) {
        ctx.enhancedSystemMap.metadata.totalAtoms = ctx.systemMap.metadata.totalAtoms;
        ctx.enhancedSystemMap.metadata.totalFunctions = ctx.systemMap.metadata.totalFunctions;
        ctx.enhancedSystemMap.metadata.totalFunctionLinks = ctx.systemMap.metadata.totalFunctionLinks;
      }

      if (ctx.verbose) {
        printSummary({
          systemMap: ctx.systemMap,
          analysisReport: ctx.analysisReport,
          enhancedSystemMap: ctx.enhancedSystemMap
        });
      }
    });

    const finalContext = await runner.run(verbose);
    if (verbose) {
      logger.info(`✅ Indexing completed in ${Date.now() - startTime}ms`);
    }
    return finalContext.systemMap;
  } catch (error) {
    logger.error('❌ indexProject failed:', error);
    // Return minimal valid structure instead of crashing
    return { 
      metadata: { totalAtoms: 0, totalFunctions: 0, totalFunctionLinks: 0 },
      atoms: [],
      files: [],
      error: error.message 
    };
  }
}

/**
 * Re-calcula patrones y métricas de calidad sin re-indexar/re-parsear archivos.
 * Útil cuando cambian las reglas de los detectores.
 */
export async function refreshPatterns(rootPath, verbose = true) {
  const startTime = Date.now();
  const absoluteRootPath = path.isAbsolute(rootPath) ? rootPath : path.resolve(process.cwd(), rootPath);
  
  try {
    const repo = getRepository(absoluteRootPath);

    if (verbose) logger.info('\n🔄 Refreshing patterns from existing database atoms...');

  const runner = new PipelineRunner({ absoluteRootPath, verbose });

  runner
    .addPhase('1. Load State', async () => {
      const systemMap = await repo.loadSystemMap();
      const atoms = repo.getAll({ limit: 0 }); // Load all atoms

      // Re-indexar átomos por archivo para que el analyzer los encuentre
      const atomsByFile = {};
      for (const atom of atoms) {
        if (!atomsByFile[atom.file_path]) atomsByFile[atom.file_path] = { atoms: [], atomCount: 0 };
        atomsByFile[atom.file_path].atoms.push(atom);
        atomsByFile[atom.file_path].atomCount++;
      }

      return { systemMap, atomsByFile };
    })
    .addPhase('2. Re-run Quality Analysis', async (ctx) => {
      const { generateAnalysisReport } = await import('./analyzer.js');
      const { enhanceSystemMap } = await import('./pipeline/enhancers/index.js');

      // Pasar atomsIndex (atomsByFile) para evitar re-análisis molecular si no es necesario,
      // pero aquí forzamos la reconstrucción de los hallazgos.
      const [analysisReport, enhancedSystemMap] = await Promise.all([
        generateAnalysisReport(ctx.systemMap),
        enhanceSystemMap(ctx.absoluteRootPath, ctx.atomsByFile, ctx.systemMap, ctx.verbose)
      ]);

      return { analysisReport, enhancedSystemMap };
    })
    .addPhase('3. Persist Findings', async (ctx) => {
      await saveEnhancedSystemMap(ctx.enhancedSystemMap, ctx.verbose, ctx.absoluteRootPath);

      if (ctx.verbose) {
        printSummary({
          systemMap: ctx.systemMap,
          analysisReport: ctx.analysisReport,
          enhancedSystemMap: ctx.enhancedSystemMap
        });
      }
    });

    const finalContext = await runner.run(verbose);
    if (verbose) {
      logger.info(`✅ Pattern refresh completed in ${Date.now() - startTime}ms`);
    }
    return finalContext.enhancedSystemMap;
  } catch (error) {
    logger.error('❌ refreshPatterns failed:', error);
    // Return minimal valid structure instead of crashing
    return { 
      metadata: { totalAtoms: 0, totalFunctions: 0, totalFunctionLinks: 0 },
      atoms: [],
      files: [],
      error: error.message 
    };
  }
}

// CLI Support
const isMainModule = process.argv[1]?.includes('indexer.js') || false;
if (isMainModule) {
  const projectPath = process.argv[2] || process.cwd();
  indexProject(projectPath, { verbose: true }).catch(err => {
    logger.error('Indexer failed:', err);
    process.exit(1);
  });
}
