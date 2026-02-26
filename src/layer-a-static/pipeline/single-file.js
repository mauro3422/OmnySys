import fs from 'fs/promises';
import path from 'path';

import { parseFileFromDisk } from '../parser/index.js';
import { extractAtoms } from './phases/atom-extraction/extraction/atom-extractor.js';
import { createLogger } from '../../utils/logger.js';
import { loadExistingMap, saveAtoms, saveFileResult } from './single-file-db.js';
import { resolveFileImports, detectConnections, buildFileAnalysis } from './single-file-utils.js';

const logger = createLogger('OmnySys:single:file');



/**
 * Análisis rápido de un solo archivo
 * Usa el contexto del proyecto existente y solo re-analiza el archivo especificado
 */
export async function analyzeSingleFile(absoluteRootPath, singleFile, options = {}) {
  const { verbose = true, incremental = false } = options;

  try {
    const existingMap = await loadExistingMap(absoluteRootPath, incremental, verbose);

    const targetFilePath = path.join(absoluteRootPath, singleFile);
    if (verbose) logger.info(`🔍 Parsing ${singleFile}...`);
    const parsedFile = await parseFileFromDisk(targetFilePath);
    if (!parsedFile) throw new Error(`Could not parse file: ${singleFile}`);
    if (verbose) logger.info('  ✓ File parsed\n');

    if (verbose) logger.info('🔗 Resolving imports...');
    const resolvedImports = await resolveFileImports(parsedFile, targetFilePath, absoluteRootPath);
    if (verbose) logger.info(`  ✓ Resolved ${resolvedImports.length} imports\n`);

    if (verbose) logger.info('🔍 Detecting semantic connections...');
    const { staticConnections, advancedConnections } = await detectConnections(
      parsedFile, targetFilePath, resolvedImports, absoluteRootPath
    );
    if (verbose) logger.info(`  ✓ Found ${staticConnections.all.length + advancedConnections.all.length} connections\n`);

    if (verbose) logger.info('📊 Extracting metadata...');
    const { extractAllMetadata } = await import('../extractors/metadata/index.js');
    const metadata = extractAllMetadata(targetFilePath, parsedFile.source || '');
    if (verbose) logger.info(`  ✓ Metadata: ${metadata.jsdoc?.all?.length || 0} JSDoc, ${metadata.async?.all?.length || 0} async\n`);

    if (verbose) logger.info('🔬 Extracting atoms...');
    const atoms = await extractAtoms(parsedFile, parsedFile.source || '', metadata, singleFile);
    if (verbose) logger.info(`  ✓ Extracted ${atoms.length} atoms: ${atoms.map(a => a.type).join(', ')}\n`);

    if (verbose) logger.info('💾 Saving individual atoms...');
    await saveAtoms(absoluteRootPath, singleFile, atoms);
    if (verbose) logger.info(`  ✓ Saved ${atoms.length} individual atoms\n`);

    const fileAnalysis = buildFileAnalysis(
      singleFile, parsedFile, resolvedImports,
      staticConnections, advancedConnections, metadata, atoms
    );

    // Save atom states and file metadata
    await saveFileResult(absoluteRootPath, singleFile, fileAnalysis, existingMap, incremental, verbose);

    if (verbose) printSummary(absoluteRootPath, singleFile, fileAnalysis);

    return fileAnalysis;
  } catch (error) {
    logger.error(`\n❌ Single-file analysis failed: ${error.message}`);
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
