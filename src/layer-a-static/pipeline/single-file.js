import fs from 'fs/promises';
import path from 'path';

import { parseFileFromDisk } from '../parser/index.js';
import { resolveImport, getResolutionConfig } from '../resolver.js';
import { detectAllSemanticConnections } from '../extractors/static/index.js';
import { detectAllAdvancedConnections } from '../extractors/communication/index.js';
import { extractAllMetadata } from '../extractors/metadata/index.js';

/**
 * Análisis rápido de un solo archivo
 * Usa el contexto del proyecto existente y solo re-analiza el archivo especificado
 */
export async function analyzeSingleFile(absoluteRootPath, singleFile, options = {}) {
  const { verbose = true, incremental = false } = options;

  try {
    // Cargar systemMap existente si hay análisis previo
    let existingMap = null;
    const systemMapPath = path.join(absoluteRootPath, '.OmnySysData', 'system-map-enhanced.json');

    try {
      const content = await fs.readFile(systemMapPath, 'utf-8');
      existingMap = JSON.parse(content);
      if (verbose) console.log('  âœ“ Loaded existing project context\n');
    } catch {
      if (verbose) console.log('  â„¹ï¸  No existing analysis found, starting fresh\n');
    }

    // Paso 1: Parsear solo el archivo objetivo
    const targetFilePath = path.join(absoluteRootPath, singleFile);
    if (verbose) console.log(`ðŸ“ Parsing ${singleFile}...`);

    const parsedFile = await parseFileFromDisk(targetFilePath);
    if (!parsedFile) {
      throw new Error(`Could not parse file: ${singleFile}`);
    }

    if (verbose) console.log('  âœ“ File parsed\n');

    // Paso 2: Resolver imports del archivo (solo los necesarios)
    if (verbose) console.log('ðŸ”— Resolving imports...');
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
    if (verbose) console.log(`  âœ“ Resolved ${resolvedImports.length} imports\n`);

    // Paso 3: Detectar conexiones semánticas
    if (verbose) console.log('ðŸ” Detecting semantic connections...');
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
    const advancedConnections = detectAllAdvancedConnections(fileSourceCode);
    if (verbose) console.log(`  âœ“ Found ${staticConnections.all.length + advancedConnections.connections.length} connections\n`);

    // Paso 4: Extraer metadatos
    if (verbose) console.log('ðŸ“Š Extracting metadata...');
    const metadata = extractAllMetadata(targetFilePath, parsedFile.source || '');
    if (verbose) console.log(`  âœ“ Metadata: ${metadata.jsdoc?.all?.length || 0} JSDoc, ${metadata.async?.all?.length || 0} async\n`);

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
        ...advancedConnections.connections.map(conn => ({
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
      analyzedAt: new Date().toISOString()
    };

    // Paso 6: Guardar resultado
    const outputDir = path.join(absoluteRootPath, '.OmnySysData', 'files', path.dirname(singleFile));
    await fs.mkdir(outputDir, { recursive: true });

    const outputPath = path.join(outputDir, `${path.basename(singleFile)}.json`);
    await fs.writeFile(outputPath, JSON.stringify(fileAnalysis, null, 2), 'utf-8');

    if (verbose) {
      console.log(`ðŸ’¾ Results saved to: ${path.relative(absoluteRootPath, outputPath)}`);
      console.log(`\nðŸ“Š Summary:`);
      console.log(`  - Imports: ${fileAnalysis.imports.length}`);
      console.log(`  - Exports: ${fileAnalysis.exports.length}`);
      console.log(`  - Semantic connections: ${fileAnalysis.semanticConnections.length}`);
      console.log(`  - Functions: ${fileAnalysis.definitions.filter(d => d.type === 'function').length}\n`);
    }

    // Si hay systemMap existente, actualizarlo
    if (existingMap && incremental) {
      existingMap.files[singleFile] = fileAnalysis;
      existingMap.metadata.lastUpdated = new Date().toISOString();
      await fs.writeFile(systemMapPath, JSON.stringify(existingMap, null, 2), 'utf-8');
      if (verbose) console.log('  âœ“ Updated .OmnySysData/system-map-enhanced.json\n');
    }

    return fileAnalysis;
  } catch (error) {
    console.error(`\nâŒ Single-file analysis failed: ${error.message}`);
    throw error;
  }
}
