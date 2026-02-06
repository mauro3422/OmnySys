import path from 'path';

import { getProjectMetadata } from '../../layer-a-static/storage/query-service.js';

/**
 * Inicializa el file watcher
 */
export async function initialize() {
  if (this.options.verbose) {
    console.log('ðŸ” FileWatcher initializing...');
  }

  // Cargar estado actual del proyecto
  await this.loadCurrentState();

  // Iniciar procesamiento periódico
  this.isRunning = true;
  this.processingInterval = setInterval(() => this.processPendingChanges(), this.options.batchDelayMs);

  if (this.options.verbose) {
    console.log('âœ… FileWatcher ready');
    console.log(`   - Debounce: ${this.options.debounceMs}ms`);
    console.log(`   - Batch delay: ${this.options.batchDelayMs}ms`);
    console.log(`   - Max concurrent: ${this.options.maxConcurrent}\n`);
  }

  this.emit('ready');
}

/**
 * Carga el estado actual del proyecto
 */
export async function loadCurrentState() {
  try {
    const metadata = await getProjectMetadata(this.rootPath);

    // Cargar hashes de archivos existentes con yield cada 50 archivos
    const entries = Object.entries(metadata.fileIndex || {});
    let count = 0;
    
    for (const [filePath, fileInfo] of entries) {
      const fullPath = path.join(this.rootPath, filePath);
      const hash = await this._calculateContentHash(fullPath);
      if (hash) {
        this.fileHashes.set(filePath, hash);
      }
      
      // Yield al event loop cada 50 archivos para no bloquear
      if (++count % 50 === 0) {
        await new Promise(resolve => setImmediate(resolve));
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
export async function notifyChange(filePath, changeType = 'modified') {
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
    console.log(`ðŸ“¥ Queued: ${relativePath} (${changeType})`);
  }

  this.emit('change:queued', { filePath: relativePath, type: changeType });
}

/**
 * Procesa cambios pendientes
 */
export async function processPendingChanges() {
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
    console.log(`\nâš¡ Processing ${toProcess.length} changes (${this.pendingChanges.size} pending)`);
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
export async function processChange(change) {
  const { filePath, type, fullPath } = change;

  // Evitar procesar el mismo archivo concurrentemente
  if (this.processingFiles.has(filePath)) {
    if (this.options.verbose) {
      console.log(`  â¸ï¸  ${filePath} - already processing`);
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
        console.warn(`  âš ï¸  Unknown change type: ${type}`);
    }

    this.stats.processedChanges++;
    this.stats.lastProcessedAt = new Date().toISOString();
  } catch (error) {
    console.error(`  âŒ Error processing ${filePath}:`, error.message);
    this.stats.failedChanges++;
    this.emit('change:error', { filePath, error: error.message });
  } finally {
    this.processingFiles.delete(filePath);
  }
}

/**
 * Detiene el file watcher
 */
export async function stop() {
  this.isRunning = false;

  if (this.processingInterval) {
    clearInterval(this.processingInterval);
    this.processingInterval = null;
  }

  // Esperar a que terminen procesos pendientes
  if (this.processingFiles.size > 0) {
    if (this.options.verbose) {
      console.log(`â³ Waiting for ${this.processingFiles.size} analyses to complete...`);
    }

    const maxWait = 10000; // 10 segundos máximo
    const start = Date.now();

    while (this.processingFiles.size > 0 && Date.now() - start < maxWait) {
      await new Promise(resolve => setTimeout(resolve, 100));
    }
  }

  this.emit('stopped');

  if (this.options.verbose) {
    console.log('ðŸ‘‹ FileWatcher stopped');
  }
}
