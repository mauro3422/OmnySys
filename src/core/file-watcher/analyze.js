import fs from 'fs/promises';
import path from 'path';
import crypto from 'crypto';

import { parseFileFromDisk } from '../../layer-a-static/parser/index.js';
import { resolveImport, getResolutionConfig } from '../../layer-a-static/resolver.js';
import { saveFileAnalysis as persistFileAnalysis } from '#layer-c/storage/index.js';
import { detectAllSemanticConnections } from '../../layer-a-static/extractors/static/index.js';
import { detectAllAdvancedConnections } from '../../layer-a-static/extractors/communication/index.js';
import { extractAllMetadata } from '../../layer-a-static/extractors/metadata/index.js';
import { extractMolecularStructure } from '../../layer-a-static/pipeline/molecular-extractor.js';
import { saveAtom, saveMolecule } from '#layer-c/storage/index.js';

/**
 * Calcula hash del contenido de un archivo
 */
export async function _calculateContentHash(filePath) {
  try {
    const content = await fs.readFile(filePath, 'utf-8');
    return crypto.createHash('md5').update(content).digest('hex');
  } catch {
    return null;
  }
}

/**
 * Detecta si hay cambios significativos entre dos análisis
 */
export function _detectChangeType(oldAnalysis, newAnalysis) {
  const changes = [];

  // Detectar cambios en imports
  const oldImports = new Set((oldAnalysis.imports || []).map(i => i.source));
  const newImports = new Set((newAnalysis.imports || []).map(i => i.source));

  const addedImports = [...newImports].filter(i => !oldImports.has(i));
  const removedImports = [...oldImports].filter(i => !newImports.has(i));

  if (addedImports.length > 0 || removedImports.length > 0) {
    changes.push({
      type: 'IMPORT_CHANGED',
      added: addedImports,
      removed: removedImports
    });
  }

  // Detectar cambios en exports
  const oldExports = new Set((oldAnalysis.exports || []).map(e => e.name));
  const newExports = new Set((newAnalysis.exports || []).map(e => e.name));

  const addedExports = [...newExports].filter(e => !oldExports.has(e));
  const removedExports = [...oldExports].filter(e => !newExports.has(e));

  if (addedExports.length > 0 || removedExports.length > 0) {
    changes.push({
      type: 'EXPORT_CHANGED',
      added: addedExports,
      removed: removedExports
    });
  }

  // Detectar cambios en funciones
  const oldFuncs = new Set((oldAnalysis.definitions || []).filter(d => d.type === 'function').map(d => d.name));
  const newFuncs = new Set((newAnalysis.definitions || []).filter(d => d.type === 'function').map(d => d.name));

  if ([...oldFuncs].sort().join(',') !== [...newFuncs].sort().join(',')) {
    changes.push({ type: 'FUNCTIONS_CHANGED' });
  }

  return changes;
}

/**
 * Analiza un archivo individual
 */
export async function analyzeFile(filePath, fullPath) {
  // Parsear archivo
  const parsed = await parseFileFromDisk(fullPath);
  if (!parsed) {
    throw new Error('Failed to parse file');
  }

  // Resolver imports
  const resolutionConfig = await getResolutionConfig(this.rootPath);
  const resolvedImports = [];

  for (const importStmt of parsed.imports || []) {
    const sources = Array.isArray(importStmt.source)
      ? importStmt.source
      : [importStmt.source];

    for (const source of sources) {
      const result = await resolveImport(source, fullPath, this.rootPath, resolutionConfig.aliases);
      resolvedImports.push({
        source,
        resolved: result.resolved,
        type: result.type,
        specifiers: importStmt.specifiers || [],
        reason: result.reason
      });
    }
  }

  // Detectar conexiones semánticas
  const fileSourceCode = { [filePath]: parsed.source || '' };

  // Parsear dependencias para conexiones
  for (const imp of resolvedImports) {
    if (imp.type === 'local' && imp.resolved) {
      try {
        const depPath = path.join(this.rootPath, imp.resolved);
        const depContent = await fs.readFile(depPath, 'utf-8');
        fileSourceCode[imp.resolved] = depContent;
      } catch (e) {
        // Ignorar errores de dependencias
      }
    }
  }

  const staticConnections = detectAllSemanticConnections(fileSourceCode);
  const advancedConnections = detectAllAdvancedConnections(fileSourceCode);

  // Extraer metadatos
  const metadata = extractAllMetadata(filePath, parsed.source || '');

  // Extraer estructura molecular (átomos + molécula)
  const molecularStructure = extractMolecularStructure(
    filePath,
    parsed.source || '',
    parsed,
    metadata
  );

  // Guardar átomos individualmente (SSOT)
  for (const atom of molecularStructure.atoms) {
    await saveAtom(this.rootPath, filePath, atom.name, atom);
  }

  // Guardar molécula
  await saveMolecule(this.rootPath, filePath, {
    filePath,
    type: 'molecule',
    atoms: molecularStructure.atoms.map(a => a.id),
    extractedAt: new Date().toISOString()
  });

  // Construir análisis completo (SSOT - Single Source of Truth)
  // Los átomos (funciones enriquecidas) se guardan individualmente en atoms/
  // Aquí solo guardamos referencias para evitar duplicación
  return {
    filePath,
    fileName: path.basename(filePath),
    ext: path.extname(filePath),
    imports: resolvedImports.map(imp => ({
      source: imp.source,
      resolvedPath: imp.resolved,
      type: imp.type,
      specifiers: imp.specifiers
    })),
    exports: parsed.exports || [],
    definitions: parsed.definitions || [],
    // NO guardar functions completos - están en atoms/ (SSOT)
    // Solo guardar referencias básicas para identificación rápida
    functionRefs: (parsed.functions || []).map(f => ({
      id: f.id,
      name: f.name,
      line: f.line,
      isExported: f.isExported
    })),
    atomIds: molecularStructure.atoms.map(a => a.id),
    atomCount: molecularStructure.atoms.length,
    calls: parsed.calls || [],
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
      buildTimeDeps: metadata.build || { envVars: [] },
      // New metadata fields
      sideEffects: metadata.sideEffects || { all: [] },
      callGraph: metadata.callGraph || { all: [] },
      dataFlow: metadata.dataFlow || { all: [] },
      typeInference: metadata.typeInference || { all: [] },
      temporal: metadata.temporal || { all: [] },
      depDepth: metadata.depDepth || {},
      performance: metadata.performance || { all: [] },
      historical: metadata.historical || {}
    },
    contentHash: await this._calculateContentHash(fullPath),
    analyzedAt: new Date().toISOString()
  };
}

/**
 * Guarda análisis de archivo
 */
export async function saveFileAnalysis(filePath, analysis) {
  await persistFileAnalysis(this.rootPath, filePath, analysis);
}

/**
 * Actualiza índice global con información del archivo
 */
export async function updateFileIndex(filePath, analysis) {
  const indexPath = path.join(this.dataPath, 'index.json');

  let indexData;
  try {
    const content = await fs.readFile(indexPath, 'utf-8');
    indexData = JSON.parse(content);
  } catch {
    indexData = { metadata: {}, fileIndex: {} };
  }

  const contentHash = analysis.contentHash || await this._calculateContentHash(path.join(this.rootPath, filePath));

  // Actualizar entrada del archivo
  indexData.fileIndex[filePath] = {
    hash: contentHash,
    exports: analysis.exports?.length || 0,
    imports: analysis.imports?.length || 0,
    semanticConnections: analysis.semanticConnections?.length || 0,
    lastAnalyzed: analysis.analyzedAt
  };

  // Actualizar metadata global
  indexData.metadata.lastUpdated = new Date().toISOString();
  indexData.metadata.totalFiles = Object.keys(indexData.fileIndex).length;

  await fs.writeFile(indexPath, JSON.stringify(indexData, null, 2));
}

/**
 * Remueve archivo del índice
 */
export async function removeFromIndex(filePath) {
  const indexPath = path.join(this.dataPath, 'index.json');

  try {
    const content = await fs.readFile(indexPath, 'utf-8');
    const indexData = JSON.parse(content);

    delete indexData.fileIndex[filePath];
    indexData.metadata.lastUpdated = new Date().toISOString();
    indexData.metadata.totalFiles = Object.keys(indexData.fileIndex).length;

    await fs.writeFile(indexPath, JSON.stringify(indexData, null, 2));
  } catch (error) {
    // Ignorar errores de índice no existente
  }
}

/**
 * Analiza archivo y actualiza índice (wrapper para handlers)
 * 
 * @param {string} filePath - Ruta relativa del archivo
 * @param {string} fullPath - Ruta completa del archivo
 * @param {boolean} isUpdate - Indica si es una actualización (no usado actualmente)
 * @returns {Promise<Object>} - Análisis del archivo
 */
export async function analyzeAndIndex(filePath, fullPath, isUpdate = false) {
  // 1. Analizar archivo
  const analysis = await analyzeFile.call(this, filePath, fullPath);
  
  // 2. Guardar análisis
  await saveFileAnalysis.call(this, filePath, analysis);
  
  // 3. Actualizar índice
  await updateFileIndex.call(this, filePath, analysis);
  
  return analysis;
}
