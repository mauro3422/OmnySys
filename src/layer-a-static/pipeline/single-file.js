import fs from 'fs/promises';
import path from 'path';

import { parseFileFromDisk } from '../parser/index.js';
import { resolveImport, getResolutionConfig } from '../resolver.js';
import { detectAllSemanticConnections } from '../extractors/static/index.js';
import { detectAllAdvancedConnections } from '../extractors/communication/index.js';
import { extractAllMetadata } from '../extractors/metadata/index.js';
import { extractAtoms } from '../extractors/atomic/index.js';
import { saveAtom, loadAtoms } from '#layer-c/storage/atoms/atom.js';
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
    const atoms = extractAtoms(parsedFile.source || '', singleFile);
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
  const systemMapPath = path.join(absoluteRootPath, '.omnysysdata', 'system-map-enhanced.json');
  try {
    const content = await fs.readFile(systemMapPath, 'utf-8');
    if (verbose) logger.info('  ✓ Loaded existing project context\n');
    return JSON.parse(content);
  } catch {
    if (verbose) logger.info('  ℹ️  No existing analysis found, starting fresh\n');
    return null;
  }
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
  // Cargar atoms previos para detectar funciones que desaparecieron
  const previousAtoms = await loadAtoms(absoluteRootPath, singleFile);
  const newAtomNames = new Set(atoms.filter(a => a.name).map(a => a.name));

  // Marcar como REMOVED los atoms que ya no existen en el archivo
  for (const prev of previousAtoms) {
    if (prev.name && !newAtomNames.has(prev.name) && prev.lineage?.status !== 'removed') {
      try {
        await saveAtom(absoluteRootPath, singleFile, prev.name, markAtomAsRemoved(prev));
        logger.debug(`🪦 Marked as removed: ${prev.name} (was in ${singleFile})`);
      } catch (err) {
        logger.warn(`  ⚠️ Failed to mark atom ${prev.name} as removed: ${err.message}`);
      }
    }
  }

  // Guardar atoms nuevos/actualizados normalmente
  for (const atom of atoms) {
    if (atom.name) {
      try {
        await saveAtom(absoluteRootPath, singleFile, atom.name, atom);
      } catch (err) {
        logger.warn(`  ⚠️ Failed to save atom ${atom.name}: ${err.message}`);
      }
    }
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
  const outputDir = path.join(absoluteRootPath, '.omnysysdata', 'files', path.dirname(singleFile));
  await fs.mkdir(outputDir, { recursive: true });

  const outputPath = path.join(outputDir, `${path.basename(singleFile)}.json`);
  await fs.writeFile(outputPath, JSON.stringify(fileAnalysis, null, 2), 'utf-8');

  if (existingMap && incremental) {
    const systemMapPath = path.join(absoluteRootPath, '.omnysysdata', 'system-map-enhanced.json');
    existingMap.files[singleFile] = fileAnalysis;
    existingMap.metadata.lastUpdated = new Date().toISOString();
    await fs.writeFile(systemMapPath, JSON.stringify(existingMap, null, 2), 'utf-8');
    if (verbose) logger.info('  ✓ Updated .omnysysdata/system-map-enhanced.json\n');
  }

  return outputPath;
}

function printSummary(absoluteRootPath, singleFile, fileAnalysis) {
  const outputPath = path.join(absoluteRootPath, '.omnysysdata', 'files',
    path.dirname(singleFile), `${path.basename(singleFile)}.json`);
  logger.info(`💾 Results saved to: ${path.relative(absoluteRootPath, outputPath)}`);
  logger.info(`\n📊 Summary:`);
  logger.info(`  - Imports: ${fileAnalysis.imports.length}`);
  logger.info(`  - Exports: ${fileAnalysis.exports.length}`);
  logger.info(`  - Semantic connections: ${fileAnalysis.semanticConnections.length}`);
  logger.info(`  - Functions: ${fileAnalysis.definitions.filter(d => d.type === 'function').length}\n`);
}
