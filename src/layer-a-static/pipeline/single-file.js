import fs from 'fs/promises';
import path from 'path';

import { parseFileFromDisk } from '../parser/index.js';
import { resolveImport, getResolutionConfig } from '../resolver.js';
import { detectAllSemanticConnections } from '../extractors/static/index.js';
import { detectAllAdvancedConnections } from '../extractors/communication/index.js';
import { extractAllMetadata } from '../extractors/metadata/index.js';
import { extractAtoms } from './phases/atom-extraction/extraction/atom-extractor.js';
import { getRepository } from '#layer-c/storage/repository/repository-factory.js';
import { createLogger } from '../../utils/logger.js';

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

    await saveFileResult(absoluteRootPath, singleFile, fileAnalysis, existingMap, incremental, verbose);

    if (verbose) printSummary(absoluteRootPath, singleFile, fileAnalysis);

    return fileAnalysis;
  } catch (error) {
    logger.error(`\n❌ Single-file analysis failed: ${error.message}`);
    throw error;
  }
}

async function loadExistingMap(absoluteRootPath, incremental, verbose) {
  if (incremental) return null;

  try {
    const repo = getRepository(absoluteRootPath);
    const allAtoms = repo.query({ limit: 10000 });

    if (allAtoms && allAtoms.length > 0) {
      if (verbose) logger.info('  ✓ Loaded existing project context from SQLite\n');
      return {
        files: {},
        atoms: allAtoms,
        metadata: { lastUpdated: new Date().toISOString() }
      };
    }
  } catch {
    // SQLite no inicializado
  }

  if (verbose) logger.info('  ℹ️  No existing analysis found, starting fresh\n');
  return null;
}

async function resolveFileImports(parsedFile, targetFilePath, absoluteRootPath) {
  const resolutionConfig = await getResolutionConfig(absoluteRootPath);
  const resolvedImports = [];
  for (const importStmt of parsedFile.imports || []) {
    const sources = Array.isArray(importStmt.source) ? importStmt.source : [importStmt.source];
    for (const source of sources) {
      const result = await resolveImport(source, targetFilePath, absoluteRootPath, resolutionConfig.aliases);
      resolvedImports.push({
        source,
        resolved: result.resolved,
        type: result.type,
        specifiers: importStmt.specifiers,
        reason: result.reason
      });
    }
  }
  return resolvedImports;
}

async function detectConnections(parsedFile, targetFilePath, resolvedImports, absoluteRootPath) {
  const fileSourceCode = { [targetFilePath]: parsedFile.source || '' };
  const allParsedFiles = { [targetFilePath]: parsedFile };

  for (const imp of resolvedImports) {
    if (imp.type === 'local' && imp.resolved) {
      try {
        const depPath = path.join(absoluteRootPath, imp.resolved);
        const depParsed = await parseFileFromDisk(depPath);
        if (depParsed) {
          allParsedFiles[depPath] = depParsed;
          fileSourceCode[depPath] = depParsed.source || '';
        }
      } catch {
        // Ignore dependency errors
      }
    }
  }

  return {
    staticConnections: detectAllSemanticConnections(fileSourceCode),
    advancedConnections: detectAllAdvancedConnections(parsedFile.source || '')
  };
}

async function saveAtoms(absoluteRootPath, singleFile, atoms) {
  try {
    const repo = getRepository(absoluteRootPath);

    const atomsWithId = atoms.map(atom => ({
      ...atom,
      id: atom.id || `${singleFile}::${atom.name}`,
      file_path: singleFile
    }));

    repo.saveMany(atomsWithId);

    logger.info(`💾 Saved ${atoms.length} atoms to SQLite for ${singleFile}`);
  } catch (error) {
    logger.warn(`⚠️ Error saving atoms for ${singleFile}: ${error.message}`);
  }
}

/**
 * Marca un átomo como removido, preservando toda su metadata como snapshot histórico.
 * El átomo sigue en storage pero excluido de análisis activos por defecto.
 */
function markAtomAsRemoved(atom) {
  return {
    ...atom,
    purpose: 'REMOVED',
    isDeadCode: true,
    callerPattern: {
      id: 'removed',
      label: 'Eliminado',
      reason: 'Function no longer exists in source file'
    },
    lineage: {
      status: 'removed',
      removedAt: new Date().toISOString(),
      lastSeenAt: atom.extractedAt || atom.analyzedAt || null,
      lastSeenLine: atom.line || null,
      snapshotLOC: atom.linesOfCode ?? atom.lines ?? null,
      snapshotComplexity: atom.complexity ?? null,
      snapshotCallers: Array.isArray(atom.calledBy) ? atom.calledBy.length : 0,
      // Preservar DNA para detección de duplicados futuros
      dnaHash: atom.dna?.structuralHash || atom.dna?.patternHash || null
    }
  };
}

function buildFileAnalysis(singleFile, parsedFile, resolvedImports, staticConnections, advancedConnections, metadata, atoms) {
  return {
    filePath: singleFile,
    fileName: path.basename(singleFile),
    ext: path.extname(singleFile),
    imports: resolvedImports.map(imp => ({
      source: imp.source,
      resolvedPath: imp.resolved,
      type: imp.type,
      specifiers: imp.specifiers || []
    })),
    exports: parsedFile.exports || [],
    definitions: parsedFile.definitions || [],
    semanticConnections: [
      ...staticConnections.all.map(conn => ({
        target: conn.targetFile,
        type: conn.via,
        key: conn.key || conn.event,
        confidence: conn.confidence,
        detectedBy: 'static-extractor'
      })),
      ...advancedConnections.all.map(conn => ({
        target: conn.targetFile,
        type: conn.via,
        channelName: conn.channelName,
        confidence: conn.confidence,
        detectedBy: 'advanced-extractor'
      }))
    ],
    metadata: {
      jsdocContracts: metadata.jsdoc || { all: [] },
      asyncPatterns: metadata.async || { all: [] },
      errorHandling: metadata.errors || { all: [] },
      buildTimeDeps: metadata.build || { envVars: [] }
    },
    atoms,
    totalAtoms: atoms.length,
    atomsByType: atoms.reduce((acc, atom) => {
      acc[atom.type] = (acc[atom.type] || 0) + 1;
      return acc;
    }, {}),
    analyzedAt: new Date().toISOString()
  };
}

async function saveFileResult(absoluteRootPath, singleFile, fileAnalysis, existingMap, incremental, verbose) {
  try {
    const repo = getRepository(absoluteRootPath);

    if (repo.db) {
      const now = new Date().toISOString();

      repo.db.prepare(`
        INSERT OR REPLACE INTO files (path, imports_json, exports_json, module_name, atom_count, last_analyzed)
        VALUES (?, ?, ?, ?, ?, ?)
      `).run(
        singleFile,
        JSON.stringify(fileAnalysis.imports || []),
        JSON.stringify(fileAnalysis.exports || []),
        null,
        fileAnalysis.totalAtoms || 0,
        now
      );

      if (verbose) logger.info(`  ✓ Saved file metadata to SQLite\n`);
    }
  } catch (error) {
    logger.warn(`⚠️ Error saving file result to SQLite: ${error.message}`);
  }

  return singleFile;
}

function printSummary(absoluteRootPath, singleFile, fileAnalysis) {
  logger.info(`💾 Results saved to SQLite for: ${singleFile}`);
  logger.info(`\n📊 Summary:`);
  logger.info(`  - Imports: ${fileAnalysis.imports.length}`);
  logger.info(`  - Exports: ${fileAnalysis.exports.length}`);
  logger.info(`  - Semantic connections: ${fileAnalysis.semanticConnections.length}`);
  logger.info(`  - Functions: ${fileAnalysis.definitions.filter(d => d.type === 'function').length}\n`);
}
