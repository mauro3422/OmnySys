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
import { saveAtom, saveMolecule, loadAtoms } from '#layer-c/storage/index.js';

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

// ── Private helpers for analyzeFile ──────────────────────────────────────────

async function resolveAllImports(parsed, fullPath, rootPath) {
  const resolutionConfig = await getResolutionConfig(rootPath);
  const resolvedImports = [];
  for (const importStmt of parsed.imports || []) {
    const sources = Array.isArray(importStmt.source) ? importStmt.source : [importStmt.source];
    for (const source of sources) {
      const result = await resolveImport(source, fullPath, rootPath, resolutionConfig.aliases);
      resolvedImports.push({
        source,
        resolved: result.resolved,
        type: result.type,
        specifiers: importStmt.specifiers || [],
        reason: result.reason
      });
    }
  }
  return resolvedImports;
}

async function loadDependencySources(resolvedImports, filePath, parsedSource, rootPath) {
  const fileSourceCode = { [filePath]: parsedSource };
  for (const imp of resolvedImports) {
    if (imp.type === 'local' && imp.resolved) {
      try {
        fileSourceCode[imp.resolved] = await fs.readFile(path.join(rootPath, imp.resolved), 'utf-8');
      } catch {
        // Ignorar errores de dependencias
      }
    }
  }
  return fileSourceCode;
}

function buildFileResult(filePath, parsed, resolvedImports, staticConnections, advancedConnections, metadata, moleculeAtoms, contentHash) {
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
    functionRefs: (parsed.functions || []).map(f => ({ id: f.id, name: f.name, line: f.line, isExported: f.isExported })),
    atomIds: moleculeAtoms.map(a => a.id),
    atomCount: moleculeAtoms.length,
    calls: parsed.calls || [],
    semanticConnections: [
      ...staticConnections.all.map(conn => ({
        target: conn.targetFile, type: conn.via, key: conn.key || conn.event,
        confidence: conn.confidence, detectedBy: 'static-extractor'
      })),
      ...(advancedConnections.all || []).map(conn => ({
        target: conn.targetFile, type: conn.via, channelName: conn.channelName,
        confidence: conn.confidence, detectedBy: 'advanced-extractor'
      }))
    ],
    metadata: {
      jsdocContracts: metadata.jsdoc || { all: [] },
      asyncPatterns: metadata.async || { all: [] },
      errorHandling: metadata.errors || { all: [] },
      buildTimeDeps: metadata.build || { envVars: [] },
      sideEffects: metadata.sideEffects || { all: [] },
      callGraph: metadata.callGraph || { all: [] },
      dataFlow: metadata.dataFlow || { all: [] },
      typeInference: metadata.typeInference || { all: [] },
      temporal: metadata.temporal || { all: [] },
      depDepth: metadata.depDepth || {},
      performance: metadata.performance || { all: [] },
      historical: metadata.historical || {}
    },
    contentHash,
    analyzedAt: new Date().toISOString()
  };
}

/**
 * Analiza un archivo individual
 */
export async function analyzeFile(filePath, fullPath) {
  const parsed = await parseFileFromDisk(fullPath);
  if (!parsed) throw new Error('Failed to parse file');

  const resolvedImports = await resolveAllImports(parsed, fullPath, this.rootPath);
  const fileSourceCode = await loadDependencySources(resolvedImports, filePath, parsed.source || '', this.rootPath);

  const staticConnections = detectAllSemanticConnections(fileSourceCode);
  const advancedConnections = detectAllAdvancedConnections(fileSourceCode);

  const metadata = extractAllMetadata(filePath, parsed.source || '');
  const molecularStructure = extractMolecularStructure(filePath, parsed.source || '', parsed, metadata);
  const moleculeAtoms = molecularStructure?.atoms ?? [];

  // Detectar funciones removidas
  const previousAtoms = await loadAtoms(this.rootPath, filePath);
  const newAtomNames = new Set(moleculeAtoms.filter(a => a.name).map(a => a.name));
  for (const prev of previousAtoms) {
    if (prev.name && !newAtomNames.has(prev.name) && prev.lineage?.status !== 'removed') {
      await saveAtom(this.rootPath, filePath, prev.name, _markAtomAsRemoved(prev));
    }
  }

  for (const atom of moleculeAtoms) {
    await saveAtom(this.rootPath, filePath, atom.name, atom);
  }

  await saveMolecule(this.rootPath, filePath, {
    filePath, type: 'molecule',
    atoms: moleculeAtoms.map(a => a.id),
    extractedAt: new Date().toISOString()
  });

  const contentHash = await this._calculateContentHash(fullPath);
  return buildFileResult(filePath, parsed, resolvedImports, staticConnections, advancedConnections, metadata, moleculeAtoms, contentHash);
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
/**
 * Marca un atom como removido preservando su metadata como snapshot histórico.
 * Mismo comportamiento que single-file.js::markAtomAsRemoved (DRY candidate).
 */
function _markAtomAsRemoved(atom) {
  return {
    ...atom,
    purpose: 'REMOVED',
    isDeadCode: true,
    callerPattern: { id: 'removed', label: 'Eliminado', reason: 'Function no longer exists in source file' },
    lineage: {
      status: 'removed',
      removedAt: new Date().toISOString(),
      lastSeenAt: atom.extractedAt || atom.analyzedAt || null,
      lastSeenLine: atom.line || null,
      snapshotLOC: atom.linesOfCode ?? atom.lines ?? null,
      snapshotComplexity: atom.complexity ?? null,
      snapshotCallers: Array.isArray(atom.calledBy) ? atom.calledBy.length : 0,
      dnaHash: atom.dna?.structuralHash || atom.dna?.patternHash || null
    }
  };
}

export async function analyzeAndIndex(filePath, fullPath, isUpdate = false) {
  // 1. Analizar archivo
  const analysis = await analyzeFile.call(this, filePath, fullPath);
  
  // 2. Guardar análisis
  await saveFileAnalysis.call(this, filePath, analysis);
  
  // 3. Actualizar índice
  await updateFileIndex.call(this, filePath, analysis);
  
  return analysis;
}
