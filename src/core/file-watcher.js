#!/usr/bin/env node

/**
 * CogniSystem File Watcher
 *
 * Detecta cambios en archivos y actualiza el análisis incrementalmente.
 *
 * Estrategia de Actualización:
 * 1. ANÁLISIS DEL CAMBIO: Detectar qué tipo de cambio ocurrió
 * 2. RE-ANÁLISIS SELECTIVO: Solo analizar archivos afectados
 * 3. ACTUALIZACIÓN DE RELACIONES: Recalcular usedBy/dependsOn
 * 4. INVALIDACIÓN DE CACHÉ: Limpiar cachés afectados
 * 5. NOTIFICACIÓN: Avisar a clientes (VS Code, MCP) del cambio
 *
 * Tipos de cambios detectados:
 * - FILE_CREATED: Nuevo archivo, analizar e integrar al grafo
 * - FILE_MODIFIED: Archivo existente, re-analizar y actualizar relaciones
 * - FILE_DELETED: Remover del grafo y limpiar relaciones
 * - IMPORT_CHANGED: Cambios en imports afectan dependencias
 * - EXPORT_CHANGED: Cambios en exports afectan usedBy
 *
 * Seguridad:
 * - De-duplicación: Ignorar múltiples cambios rápidos (debounce)
 * - Validación: Verificar que el archivo sea parseable antes de actualizar
 * - Rollback: Mantener backup del último estado válido
 * - Locking: Prevenir análisis concurrente del mismo archivo
 */

import fs from 'fs/promises';
import path from 'path';
import { EventEmitter } from 'events';
import crypto from 'crypto';
import { parseFileFromDisk } from '../layer-a-static/parser.js';
import { resolveImport, getResolutionConfig } from '../layer-a-static/resolver.js';
import { saveFileAnalysis, getDataDirectory } from '../layer-a-static/storage/storage-manager.js';
import { getProjectMetadata, getFileAnalysis } from '../layer-a-static/storage/query-service.js';
import { detectAllSemanticConnections } from '../layer-a-static/extractors/static-extractors.js';
import { detectAllAdvancedConnections } from '../layer-a-static/extractors/advanced-extractors.js';
import { extractAllMetadata } from '../layer-a-static/extractors/metadata-extractors.js';

/**
 * Calcula hash del contenido de un archivo
 */
async function calculateContentHash(filePath) {
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
function detectChangeType(oldAnalysis, newAnalysis) {
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
 * FileWatcher - Monitorea cambios y actualiza análisis incrementalmente
 */
export class FileWatcher extends EventEmitter {
  constructor(rootPath, options = {}) {
    super();
    this.rootPath = rootPath;
    this.dataPath = path.join(rootPath, '.OmnySysData');

    // Opciones
    this.options = {
      debounceMs: options.debounceMs || 500,      // Tiempo de espera para agrupar cambios
      batchDelayMs: options.batchDelayMs || 1000, // Tiempo entre batches
      maxConcurrent: options.maxConcurrent || 3,  // Máximo análisis concurrentes
      verbose: options.verbose || false,
      ...options
    };

    // Estado interno
    this.pendingChanges = new Map();   // Cambios pendientes: filePath -> { type, timestamp }
    this.processingFiles = new Set();  // Archivos actualmente en análisis
    this.fileHashes = new Map();       // Cache de hashes: filePath -> hash
    this.isRunning = false;
    this.processingInterval = null;

    // Estadísticas
    this.stats = {
      totalChanges: 0,
      processedChanges: 0,
      failedChanges: 0,
      lastProcessedAt: null
    };
  }

  /**
   * Inicializa el file watcher
   */
  async initialize() {
    if (this.options.verbose) {
      console.log('🔍 FileWatcher initializing...');
    }

    // Cargar estado actual del proyecto
    await this.loadCurrentState();

    // Iniciar procesamiento periódico
    this.isRunning = true;
    this.processingInterval = setInterval(() => this.processPendingChanges(), this.options.batchDelayMs);

    if (this.options.verbose) {
      console.log('✅ FileWatcher ready');
      console.log(`   - Debounce: ${this.options.debounceMs}ms`);
      console.log(`   - Batch delay: ${this.options.batchDelayMs}ms`);
      console.log(`   - Max concurrent: ${this.options.maxConcurrent}\n`);
    }

    this.emit('ready');
  }

  /**
   * Carga el estado actual del proyecto
   */
  async loadCurrentState() {
    try {
      const metadata = await getProjectMetadata(this.rootPath);

      // Cargar hashes de archivos existentes
      for (const [filePath, fileInfo] of Object.entries(metadata.fileIndex || {})) {
        const fullPath = path.join(this.rootPath, filePath);
        const hash = await calculateContentHash(fullPath);
        if (hash) {
          this.fileHashes.set(filePath, hash);
        }
      }

      if (this.options.verbose) {
        console.log(`   - Tracking ${this.fileHashes.size} files`);
      }
    } catch (error) {
      if (this.options.verbose) {
        console.log('   - No existing analysis found, starting fresh');
      }
    }
  }

  /**
   * Notifica un cambio en un archivo
   * Llama a esta función cuando detectes un cambio (fs.watch, etc.)
   */
  async notifyChange(filePath, changeType = 'modified') {
    const relativePath = path.relative(this.rootPath, filePath).replace(/\\/g, '/');

    // Ignorar archivos que no son JS/TS
    if (!this.isRelevantFile(relativePath)) {
      return;
    }

    // Ignorar cambios en node_modules, .git, etc.
    if (this.shouldIgnore(relativePath)) {
      return;
    }

    // Agregar a pendientes con timestamp
    const timestamp = Date.now();
    this.pendingChanges.set(relativePath, {
      type: changeType,
      timestamp,
      fullPath: filePath
    });

    this.stats.totalChanges++;

    if (this.options.verbose) {
      console.log(`📥 Queued: ${relativePath} (${changeType})`);
    }

    this.emit('change:queued', { filePath: relativePath, type: changeType });
  }

  /**
   * Procesa cambios pendientes
   */
  async processPendingChanges() {
    if (!this.isRunning || this.pendingChanges.size === 0) {
      return;
    }

    // Aplicar debounce: solo procesar cambios que pasaron el tiempo de debounce
    const now = Date.now();
    const readyToProcess = [];

    for (const [filePath, changeInfo] of this.pendingChanges) {
      if (now - changeInfo.timestamp >= this.options.debounceMs) {
        readyToProcess.push({ filePath, ...changeInfo });
      }
    }

    if (readyToProcess.length === 0) {
      return;
    }

    // Limitar concurrencia
    const toProcess = readyToProcess.slice(0, this.options.maxConcurrent);

    if (this.options.verbose) {
      console.log(`\n⚡ Processing ${toProcess.length} changes (${this.pendingChanges.size} pending)`);
    }

    // Procesar en paralelo
    await Promise.all(toProcess.map(change => this.processChange(change)));

    // Limpiar procesados de pendientes
    for (const change of toProcess) {
      this.pendingChanges.delete(change.filePath);
    }
  }

  /**
   * Procesa un cambio individual
   */
  async processChange(change) {
    const { filePath, type, fullPath } = change;

    // Evitar procesar el mismo archivo concurrentemente
    if (this.processingFiles.has(filePath)) {
      if (this.options.verbose) {
        console.log(`  ⏸️  ${filePath} - already processing`);
      }
      return;
    }

    this.processingFiles.add(filePath);

    try {
      switch (type) {
        case 'created':
          await this.handleFileCreated(filePath, fullPath);
          break;
        case 'modified':
          await this.handleFileModified(filePath, fullPath);
          break;
        case 'deleted':
          await this.handleFileDeleted(filePath);
          break;
        default:
          console.warn(`  ⚠️  Unknown change type: ${type}`);
      }

      this.stats.processedChanges++;
      this.stats.lastProcessedAt = new Date().toISOString();

    } catch (error) {
      console.error(`  ❌ Error processing ${filePath}:`, error.message);
      this.stats.failedChanges++;
      this.emit('change:error', { filePath, error: error.message });
    } finally {
      this.processingFiles.delete(filePath);
    }
  }

  /**
   * Maneja creación de archivo nuevo
   */
  async handleFileCreated(filePath, fullPath) {
    if (this.options.verbose) {
      console.log(`  🆕 ${filePath} - analyzing new file`);
    }

    // Verificar que el archivo exista y sea legible
    try {
      await fs.access(fullPath);
    } catch {
      throw new Error('File not accessible');
    }

    // Analizar archivo
    const analysis = await this.analyzeFile(filePath, fullPath);

    // Guardar análisis
    await this.saveFileAnalysis(filePath, analysis);

    // Actualizar índice global
    await this.updateFileIndex(filePath, analysis);

    // Calcular nuevo hash
    const hash = await calculateContentHash(fullPath);
    this.fileHashes.set(filePath, hash);

    // Notificar dependientes que hay nuevo archivo
    await this.notifyDependents(filePath, 'new_file');

    this.emit('file:created', { filePath, analysis });

    if (this.options.verbose) {
      console.log(`  ✅ ${filePath} - created and analyzed`);
    }
  }

  /**
   * Maneja modificación de archivo existente
   */
  async handleFileModified(filePath, fullPath) {
    if (this.options.verbose) {
      console.log(`  📝 ${filePath} - analyzing changes`);
    }

    // Calcular hash nuevo
    const newHash = await calculateContentHash(fullPath);
    const oldHash = this.fileHashes.get(filePath);

    // Si el hash no cambió, ignorar (posiblemente fue un touch)
    if (newHash === oldHash) {
      if (this.options.verbose) {
        console.log(`  ⏭️  ${filePath} - no content change (hash match)`);
      }
      return;
    }

    // Cargar análisis anterior
    let oldAnalysis = null;
    try {
      oldAnalysis = await getFileAnalysis(this.rootPath, filePath);
    } catch {
      // No hay análisis previo, tratar como nuevo
      return this.handleFileCreated(filePath, fullPath);
    }

    // Analizar archivo
    const newAnalysis = await this.analyzeFile(filePath, fullPath);

    // Detectar tipo de cambios
    const changes = detectChangeType(oldAnalysis, newAnalysis);

    if (changes.length === 0) {
      if (this.options.verbose) {
        console.log(`  ⏭️  ${filePath} - no significant changes`);
      }
      // Actualizar hash de todos modos
      this.fileHashes.set(filePath, newHash);
      return;
    }

    if (this.options.verbose) {
      for (const change of changes) {
        console.log(`     ${change.type}: ${change.added?.length || 0} added, ${change.removed?.length || 0} removed`);
      }
    }

    // Guardar nuevo análisis
    await this.saveFileAnalysis(filePath, newAnalysis);

    // Actualizar índice
    await this.updateFileIndex(filePath, newAnalysis);

    // Manejar cambios específicos
    for (const change of changes) {
      switch (change.type) {
        case 'IMPORT_CHANGED':
          await this.handleImportChanges(filePath, change);
          break;
        case 'EXPORT_CHANGED':
          await this.handleExportChanges(filePath, change);
          break;
      }
    }

    // Actualizar hash
    this.fileHashes.set(filePath, newHash);

    // Invalidar cachés afectadas
    this.invalidateCaches(filePath);

    this.emit('file:modified', { filePath, changes, analysis: newAnalysis });

    if (this.options.verbose) {
      console.log(`  ✅ ${filePath} - updated (${changes.length} change types)`);
    }
  }

  /**
   * Maneja eliminación de archivo
   */
  async handleFileDeleted(filePath) {
    if (this.options.verbose) {
      console.log(`  🗑️  ${filePath} - removing from index`);
    }

    // Limpiar relaciones
    await this.cleanupRelationships(filePath);

    // Remover de índice
    await this.removeFromIndex(filePath);

    // Limpiar hash
    this.fileHashes.delete(filePath);

    // Notificar a dependientes que el archivo desapareció
    await this.notifyDependents(filePath, 'file_deleted');

    this.emit('file:deleted', { filePath });

    if (this.options.verbose) {
      console.log(`  ✅ ${filePath} - removed from index`);
    }
  }

  /**
   * Analiza un archivo individual
   */
  async analyzeFile(filePath, fullPath) {
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

    // Construir análisis completo
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
      functions: parsed.functions || [],
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
        buildTimeDeps: metadata.build || { envVars: [] }
      },
      contentHash: await calculateContentHash(fullPath),
      analyzedAt: new Date().toISOString()
    };
  }

  /**
   * Guarda análisis de archivo
   */
  async saveFileAnalysis(filePath, analysis) {
    await saveFileAnalysis(this.rootPath, filePath, analysis);
  }

  /**
   * Actualiza índice global con información del archivo
   */
  async updateFileIndex(filePath, analysis) {
    const indexPath = path.join(this.dataPath, 'index.json');

    let indexData;
    try {
      const content = await fs.readFile(indexPath, 'utf-8');
      indexData = JSON.parse(content);
    } catch {
      indexData = { metadata: {}, fileIndex: {} };
    }

    // Actualizar entrada del archivo
    indexData.fileIndex[filePath] = {
      hash: analysis.contentHash || calculateFileHash(filePath),
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
  async removeFromIndex(filePath) {
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
   * Maneja cambios en imports
   */
  async handleImportChanges(filePath, change) {
    // Los imports afectan el grafo de dependencias
    // Necesitamos recalcular usedBy/dependsOn

    for (const addedImport of change.added || []) {
      this.emit('dependency:added', {
        from: filePath,
        to: addedImport
      });
    }

    for (const removedImport of change.removed || []) {
      this.emit('dependency:removed', {
        from: filePath,
        to: removedImport
      });
    }
  }

  /**
   * Maneja cambios en exports
   */
  async handleExportChanges(filePath, change) {
    // Los exports afectan quién puede usar este archivo
    // Si se removió un export, archivos que lo usaban están rotos

    const removed = change.removed || [];
    if (removed.length > 0) {
      // TODO: Detectar archivos que importaban estos exports
      // y marcarlos como potencialmente rotos
      this.emit('exports:removed', {
        file: filePath,
        exports: removed
      });
    }
  }

  /**
   * Limpia relaciones de un archivo eliminado
   */
  async cleanupRelationships(filePath) {
    // TODO: Remover referencias en otros archivos a este archivo
    // Actualizar usedBy de dependencias
  }

  /**
   * Notifica a dependientes de cambios
   */
  async notifyDependents(filePath, changeType) {
    // TODO: Enviar notificación a VS Code/MCP de que hay cambios
    this.emit('dependents:notify', { filePath, changeType });
  }

  /**
   * Invalida cachés afectadas por cambios
   */
  invalidateCaches(filePath) {
    // Emitir evento para que otros componentes (MCP Server, etc)
    // invaliden sus cachés
    this.emit('cache:invalidate', { filePath });
  }

  /**
   * Verifica si un archivo es relevante para análisis
   */
  isRelevantFile(filePath) {
    return /\.(js|ts|jsx|tsx|mjs|cjs)$/.test(filePath);
  }

  /**
   * Verifica si un archivo debe ser ignorado
   */
  shouldIgnore(filePath) {
    const ignorePatterns = [
      'node_modules/',
      '.git/',
      'dist/',
      'build/',
      '.OmnySysData/',
      'coverage/',
      '.vscode/'
    ];

    return ignorePatterns.some(pattern => filePath.includes(pattern));
  }

  /**
   * Obtiene estadísticas del watcher
   */
  getStats() {
    return {
      ...this.stats,
      pendingChanges: this.pendingChanges.size,
      processingFiles: this.processingFiles.size,
      trackedFiles: this.fileHashes.size,
      isRunning: this.isRunning
    };
  }

  /**
   * Detiene el file watcher
   */
  async stop() {
    this.isRunning = false;

    if (this.processingInterval) {
      clearInterval(this.processingInterval);
      this.processingInterval = null;
    }

    // Esperar a que terminen procesos pendientes
    if (this.processingFiles.size > 0) {
      if (this.options.verbose) {
        console.log(`⏳ Waiting for ${this.processingFiles.size} analyses to complete...`);
      }

      const maxWait = 10000; // 10 segundos máximo
      const start = Date.now();

      while (this.processingFiles.size > 0 && Date.now() - start < maxWait) {
        await new Promise(resolve => setTimeout(resolve, 100));
      }
    }

    this.emit('stopped');

    if (this.options.verbose) {
      console.log('👋 FileWatcher stopped');
    }
  }
}

export default FileWatcher;
