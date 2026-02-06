import fs from 'fs/promises';

import { getFileAnalysis } from '../../layer-a-static/storage/query-service.js';

/**
 * Maneja creación de archivo nuevo
 */
export async function handleFileCreated(filePath, fullPath) {
  if (this.options.verbose) {
    console.log(`  ðŸ†• ${filePath} - analyzing new file`);
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
  const hash = await this._calculateContentHash(fullPath);
  this.fileHashes.set(filePath, hash);

  // Notificar dependientes que hay nuevo archivo
  await this.notifyDependents(filePath, 'new_file');

  this.emit('file:created', { filePath, analysis });

  if (this.options.verbose) {
    console.log(`  âœ… ${filePath} - created and analyzed`);
  }
}

/**
 * Maneja modificación de archivo existente
 */
export async function handleFileModified(filePath, fullPath) {
  if (this.options.verbose) {
    console.log(`  ðŸ“ ${filePath} - analyzing changes`);
  }

  // Calcular hash nuevo
  const newHash = await this._calculateContentHash(fullPath);
  const oldHash = this.fileHashes.get(filePath);

  // Si el hash no cambió, ignorar (posiblemente fue un touch)
  if (newHash === oldHash) {
    if (this.options.verbose) {
      console.log(`  â­ï¸  ${filePath} - no content change (hash match)`);
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
  const changes = this._detectChangeType(oldAnalysis, newAnalysis);

  if (changes.length === 0) {
    if (this.options.verbose) {
      console.log(`  â­ï¸  ${filePath} - no significant changes`);
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
    console.log(`  âœ… ${filePath} - updated (${changes.length} change types)`);
  }
}

/**
 * Maneja eliminación de archivo
 */
export async function handleFileDeleted(filePath) {
  if (this.options.verbose) {
    console.log(`  ðŸ—‘ï¸  ${filePath} - removing from index`);
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
    console.log(`  âœ… ${filePath} - removed from index`);
  }
}

/**
 * Maneja cambios en imports
 */
export async function handleImportChanges(filePath, change) {
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
export async function handleExportChanges(filePath, change) {
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
export async function cleanupRelationships(filePath) {
  // TODO: Remover referencias en otros archivos a este archivo
  // Actualizar usedBy de dependencias
}

/**
 * Notifica a dependientes de cambios
 */
export async function notifyDependents(filePath, changeType) {
  // TODO: Enviar notificación a VS Code/MCP de que hay cambios
  this.emit('dependents:notify', { filePath, changeType });
}

/**
 * Invalida cachés afectadas por cambios
 */
export function invalidateCaches(filePath) {
  // Emitir evento para que otros componentes (MCP Server, etc)
  // invaliden sus cachés
  this.emit('cache:invalidate', { filePath });
}
