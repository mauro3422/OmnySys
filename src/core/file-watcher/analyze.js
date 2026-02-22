import fs from 'fs/promises';
import path from 'path';
import crypto from 'crypto';

const DATA_DIR = '.omnysysdata';

import { parseFileFromDisk } from '../../layer-a-static/parser/index.js';
import { resolveImport, getResolutionConfig } from '../../layer-a-static/resolver.js';
import { saveFileAnalysis as persistFileAnalysis } from '#layer-c/storage/index.js';
import { detectAllSemanticConnections } from '../../layer-a-static/extractors/static/index.js';
import { detectAllAdvancedConnections } from '../../layer-a-static/extractors/communication/index.js';
import { extractAllMetadata } from '../../layer-a-static/extractors/metadata/index.js';
import { extractMolecularStructure } from '../../layer-a-static/pipeline/molecular-extractor.js';
import { saveAtom, saveMolecule, loadAtoms } from '#layer-c/storage/index.js';
import { saveAtomsIncremental } from '#layer-c/storage/atoms/incremental-atom-saver.js';
import { invalidateAtomCaches } from '#layer-c/cache/smart-cache-invalidator.js';

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

/**
 * 🧹 Limpia archivos JSON de átomos que ya no existen en el código fuente
 * 
 * @param {string} rootPath - Raíz del proyecto
 * @param {string} filePath - Ruta relativa del archivo
 * @param {Set} validAtomNames - Set con los nombres de átomos válidos (que existen en el código)
 */
async function cleanupOrphanedAtomFiles(rootPath, filePath, validAtomNames) {
  try {
    const atomsDir = path.join(rootPath, DATA_DIR, 'atoms');
    const fileDir = path.dirname(filePath);
    const fileName = path.basename(filePath, path.extname(filePath));
    const targetDir = path.join(atomsDir, fileDir, fileName);
    
    // Verificar si el directorio existe
    try {
      await fs.access(targetDir);
    } catch {
      return; // Directorio no existe, nada que limpiar
    }
    
    // Leer todos los archivos JSON en el directorio
    const files = await fs.readdir(targetDir);
    const jsonFiles = files.filter(f => f.endsWith('.json'));
    
    let cleanedCount = 0;
    
    for (const jsonFile of jsonFiles) {
      // Extraer el nombre del átomo del nombre del archivo (quitar .json)
      const atomName = jsonFile.slice(0, -5);
      
      // Si el átomo no está en la lista de válidos, eliminar el archivo
      if (!validAtomNames.has(atomName)) {
        const fileToDelete = path.join(targetDir, jsonFile);
        await fs.unlink(fileToDelete);
        cleanedCount++;
      }
    }
    
    if (cleanedCount > 0) {
      console.log(`🧹 Eliminados ${cleanedCount} átomos obsoletos de ${filePath}`);
    }
  } catch (error) {
    // No propagar errores de limpieza - no es crítico
    console.warn(`⚠️ Error limpiando átomos obsoletos de ${filePath}:`, error.message);
  }
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

  // 🆕 Sistema de guardado incremental
  // Guardar solo los campos que realmente cambiaron
  const saveResults = await saveAtomsIncremental(this.rootPath, filePath, moleculeAtoms);
  
  if (saveResults.updated > 0) {
    logger.info(`⚡ Incremental save: ${filePath} (${saveResults.updated} updated, ${saveResults.totalFieldsChanged} fields)`);
  }

  // 🧹 LIMPIEZA: Eliminar archivos JSON de átomos que ya no existen en el código
  await cleanupOrphanedAtomFiles(this.rootPath, filePath, newAtomNames);
  
  // 🆕 Invalidación selectiva de caché para átomos modificados
  for (const atom of moleculeAtoms) {
    const atomId = `${filePath}::${atom.name}`;
    // Detectar campos cambiados usando el version manager
    const { AtomVersionManager } = await import('#layer-c/storage/atoms/atom-version-manager.js');
    const vm = new AtomVersionManager(this.rootPath);
    const changes = await vm.detectChanges(atomId, atom);
    
    if (changes.hasChanges && !changes.isNew) {
      await invalidateAtomCaches(atomId, changes.fields);
    }
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
