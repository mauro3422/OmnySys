import fs from 'fs/promises';
import path from 'path';

import { parseFileFromDisk } from '../parser/index.js';
import { resolveImport, getResolutionConfig } from '../resolver.js';
import { detectAllSemanticConnections } from '../extractors/static/index.js';
import { detectAllAdvancedConnections } from '../extractors/communication/index.js';
import { extractAllMetadata } from '../extractors/metadata/index.js';
import { extractAtoms } from '../extractors/atomic/index.js';
import { saveAtom } from '../storage/storage-manager.js';
import { createLogger } from '../../utils/logger.js';

const logger = createLogger('OmnySys:single:file');



/**
 * Análisis rápido de un solo archivo
 * Usa el contexto del proyecto existente y solo re-analiza el archivo especificado
 */
export async function analyzeSingleFile(absoluteRootPath, singleFile, options = {}) {
  const { verbose = true, incremental = false } = options;

  try {
    // Cargar systemMap existente si hay análisis previo
    let existingMap = null;
    const systemMapPath = path.join(absoluteRootPath, '.omnysysdata', 'system-map-enhanced.json');

    try {
      const content = await fs.readFile(systemMapPath, 'utf-8');
      existingMap = JSON.parse(content);
      if (verbose) logger.info('  âœ“ Loaded existing project context\n');
    } catch {
      if (verbose) logger.info('  â„¹ï¸  No existing analysis found, starting fresh\n');
    }

    // Paso 1: Parsear solo el archivo objetivo
    const targetFilePath = path.join(absoluteRootPath, singleFile);
    if (verbose) logger.info(`ðŸ“ Parsing ${singleFile}...`);

    const parsedFile = await parseFileFromDisk(targetFilePath);
    if (!parsedFile) {
      throw new Error(`Could not parse file: ${singleFile}`);
    }

    if (verbose) logger.info('  âœ“ File parsed\n');

    // Paso 2: Resolver imports del archivo (solo los necesarios)
    if (verbose) logger.info('ðŸ”— Resolving imports...');
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
    if (verbose) logger.info(`  âœ“ Resolved ${resolvedImports.length} imports\n`);

    // Paso 3: Detectar conexiones semánticas
    if (verbose) logger.info('ðŸ” Detecting semantic connections...');
    const fileSourceCode = { [targetFilePath]: parsedFile.source || '' };

    // Parsear imports para detección de conexiones
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
        } catch (e) {
          // Ignorar errores de dependencias
        }
      }
    }

    const staticConnections = detectAllSemanticConnections(fileSourceCode);
    const advancedConnections = detectAllAdvancedConnections(parsedFile.source || '');
    if (verbose) logger.info(`  ✓ Found ${staticConnections.all.length + advancedConnections.all.length} connections\n`);

    // Paso 4: Extraer metadatos
    if (verbose) logger.info('📊 Extracting metadata...');
    const metadata = extractAllMetadata(targetFilePath, parsedFile.source || '');
    if (verbose) logger.info(`  ✓ Metadata: ${metadata.jsdoc?.all?.length || 0} JSDoc, ${metadata.async?.all?.length || 0} async\n`);

    // PASO NUEVO: Extraer átomos con el sistema atómico
    if (verbose) logger.info('🔬 Extracting atoms...');
    const atoms = extractAtoms(parsedFile.source || '', singleFile);
    if (verbose) logger.info(`  ✓ Extracted ${atoms.length} atoms: ${atoms.map(a => a.type).join(', ')}
`);

    // 🆕 GUARDAR ÁTOMOS INDIVIDUALMENTE para tools atómicos
    if (verbose) logger.info('💾 Saving individual atoms...');
    for (const atom of atoms) {
      if (atom.name) {
        try {
          await saveAtom(absoluteRootPath, singleFile, atom.name, atom);
        } catch (err) {
          logger.warn(`  ⚠️ Failed to save atom ${atom.name}: ${err.message}`);
        }
      }
    }
    if (verbose) logger.info(`  ✓ Saved ${atoms.length} individual atoms
`);

    // Paso 5: Construir análisis del archivo
    const fileAnalysis = {
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
      atoms: atoms,
      totalAtoms: atoms.length,
      atomsByType: atoms.reduce((acc, atom) => {
        acc[atom.type] = (acc[atom.type] || 0) + 1;
        return acc;
      }, {}),
      analyzedAt: new Date().toISOString()
    };

    // Paso 6: Guardar resultado
    const outputDir = path.join(absoluteRootPath, '.omnysysdata', 'files', path.dirname(singleFile));
    await fs.mkdir(outputDir, { recursive: true });

    const outputPath = path.join(outputDir, `${path.basename(singleFile)}.json`);
    await fs.writeFile(outputPath, JSON.stringify(fileAnalysis, null, 2), 'utf-8');

    if (verbose) {
      logger.info(`ðŸ’¾ Results saved to: ${path.relative(absoluteRootPath, outputPath)}`);
      logger.info(`\nðŸ“Š Summary:`);
      logger.info(`  - Imports: ${fileAnalysis.imports.length}`);
      logger.info(`  - Exports: ${fileAnalysis.exports.length}`);
      logger.info(`  - Semantic connections: ${fileAnalysis.semanticConnections.length}`);
      logger.info(`  - Functions: ${fileAnalysis.definitions.filter(d => d.type === 'function').length}\n`);
    }

    // Si hay systemMap existente, actualizarlo
    if (existingMap && incremental) {
      existingMap.files[singleFile] = fileAnalysis;
      existingMap.metadata.lastUpdated = new Date().toISOString();
      await fs.writeFile(systemMapPath, JSON.stringify(existingMap, null, 2), 'utf-8');
      if (verbose) logger.info('  âœ“ Updated .omnysysdata/system-map-enhanced.json\n');
    }

    return fileAnalysis;
  } catch (error) {
    logger.error(`\nâŒ Single-file analysis failed: ${error.message}`);
    throw error;
  }
}
