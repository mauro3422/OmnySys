import fs from 'fs/promises';
import path from 'path';

import { parseFileFromDisk } from '../parser/index.js';
import { extractAtoms } from './phases/atom-extraction/extraction/atom-extractor.js';
import { createLogger } from '../../utils/logger.js';
import { loadExistingMap, saveAtoms, saveFileResult } from './single-file-db.js';
import { resolveFileImports, detectConnections, buildFileAnalysis } from './single-file-utils.js';

const logger = createLogger('OmnySys:single:file');



import { PipelineRunner } from './runner.js';

/**
 * Análisis rápido de un solo archivo
 */
export async function analyzeSingleFile(absoluteRootPath, singleFile, options = {}) {
  const { verbose = true, incremental = false } = options;
  const targetFilePath = path.join(absoluteRootPath, singleFile);

  const runner = new PipelineRunner({
    absoluteRootPath,
    singleFile,
    targetFilePath,
    verbose
  });

  runner
    .addPhase('Initialize', async (ctx) => {
      ctx.existingMap = await loadExistingMap(ctx.absoluteRootPath, incremental, ctx.verbose);
    })
    .addPhase('Parse Source', async (ctx) => {
      ctx.parsedFile = await parseFileFromDisk(ctx.targetFilePath);
      if (!ctx.parsedFile) throw new Error(`Could not parse: ${ctx.singleFile}`);
    })
    .addPhase('Resolve Imports', async (ctx) => {
      ctx.resolvedImports = await resolveFileImports(ctx.parsedFile, ctx.targetFilePath, ctx.absoluteRootPath);
    })
    .addPhase('Semantic Connections', async (ctx) => {
      const { staticConnections, advancedConnections } = await detectConnections(
        ctx.parsedFile, ctx.targetFilePath, ctx.resolvedImports, ctx.absoluteRootPath
      );
      ctx.staticConnections = staticConnections;
      ctx.advancedConnections = advancedConnections;
    })
    .addPhase('Metadata Extraction', async (ctx) => {
      const { extractAllMetadata } = await import('../extractors/metadata/index.js');
      ctx.metadata = extractAllMetadata(ctx.targetFilePath, ctx.parsedFile.source || '');
    })
    .addPhase('Atom Extraction', async (ctx) => {
      ctx.atoms = await extractAtoms(ctx.parsedFile, ctx.parsedFile.source || '', ctx.metadata, ctx.singleFile);
    })
    .addPhase('Persistence', async (ctx) => {
      await saveAtoms(ctx.absoluteRootPath, ctx.singleFile, ctx.atoms);
      ctx.fileAnalysis = buildFileAnalysis(
        ctx.singleFile, ctx.parsedFile, ctx.resolvedImports,
        ctx.staticConnections, ctx.advancedConnections, ctx.metadata, ctx.atoms
      );
      await saveFileResult(ctx.absoluteRootPath, ctx.singleFile, ctx.fileAnalysis, ctx.existingMap, incremental, ctx.verbose);
    });

  try {
    const finalContext = await runner.run(verbose);
    if (verbose) printSummary(absoluteRootPath, singleFile, finalContext.fileAnalysis);
    return finalContext.fileAnalysis;
  } catch (error) {
    logger.error(`❌ Single-file analysis failed: ${error.message}`);
    throw error;
  }
}



function printSummary(absoluteRootPath, singleFile, fileAnalysis) {
  logger.info(`💾 Results saved to SQLite for: ${singleFile}`);
  logger.info(`\n📊 Summary:`);
  logger.info(`  - Imports: ${fileAnalysis.imports.length}`);
  logger.info(`  - Exports: ${fileAnalysis.exports.length}`);
  logger.info(`  - Semantic connections: ${fileAnalysis.semanticConnections.length}`);
  logger.info(`  - Functions: ${fileAnalysis.definitions.filter(d => d.type === 'function').length}\n`);
}
