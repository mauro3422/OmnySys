import fs from 'fs/promises';
import path from 'path';

import { getFileAnalysis, getFileDependents } from '../../layer-a-static/query/index.js';
import { detectPatterns } from '../../layer-b-semantic/metadata-contract/detectors/architectural-patterns.js';
import { TUNNEL_VISION } from '#config/limits.js';

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

  // Tunnel Vision Detection
  try {
    const dependents = await getFileDependents(this.rootPath, filePath);
    if (dependents.length >= TUNNEL_VISION.MIN_AFFECTED_FILES) {
      const event = {
        file: filePath,
        affectedFiles: dependents.slice(0, 10),
        totalAffected: dependents.length,
        changes,
        suggestion: 'Review these files before committing'
      };
      console.warn(`\n  ⚠️  TUNNEL VISION: ${filePath} affects ${dependents.length} files`);
      dependents.slice(0, 5).forEach(dep =>
        console.warn(`     - ${dep}`)
      );
      if (dependents.length > 5) {
        console.warn(`     ... and ${dependents.length - 5} more`);
      }
      this.emit('tunnel-vision:detected', event);
    }
  } catch {
    // No dependents data available
  }

  // Archetype Change Detection
  if (oldAnalysis) {
    const buildMeta = (analysis) => ({
      exportCount: analysis.exports?.length || 0,
      dependentCount: analysis.usedBy?.length || 0,
      importCount: analysis.imports?.length || 0,
      functionCount: analysis.definitions?.filter(d => d.type === 'function').length || 0,
      reExportCount: 0,
      filePath: filePath
    });

    const oldMeta = buildMeta(oldAnalysis);
    const newMeta = buildMeta(newAnalysis);

    const oldPatterns = detectPatterns(oldMeta);
    const newPatterns = detectPatterns(newMeta);

    const archetypeChanges = [];
    for (const key of Object.keys(oldPatterns)) {
      if (oldPatterns[key] !== newPatterns[key]) {
        archetypeChanges.push({ pattern: key, was: oldPatterns[key], now: newPatterns[key] });
      }
    }

    if (archetypeChanges.length > 0) {
      console.warn(`  🔄 Archetype change in ${filePath}:`);
      archetypeChanges.forEach(c =>
        console.warn(`     ${c.pattern}: ${c.was} → ${c.now}`)
      );
      this.emit('archetype:changed', { filePath, changes: archetypeChanges });
    }
  }

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
    this.emit('exports:removed', {
      file: filePath,
      exports: removed
    });

    // Detectar archivos que importaban estos exports
    try {
      const dependents = await getFileDependents(this.rootPath, filePath);
      for (const depFile of dependents) {
        try {
          const depAnalysis = await getFileAnalysis(this.rootPath, depFile);
          const depImports = depAnalysis?.imports || [];

          // Buscar imports que referencian al archivo modificado
          const affectedImport = depImports.find(imp =>
            imp.resolvedPath === filePath || imp.source?.includes(path.basename(filePath, '.js'))
          );

          if (affectedImport) {
            // Verificar si importa specifiers removidos
            const usesRemoved = (affectedImport.specifiers || []).some(s => removed.includes(s));
            if (usesRemoved || affectedImport.specifiers?.length === 0) {
              this.emit('dependency:broken', {
                affectedFile: depFile,
                brokenBy: filePath,
                removedExports: removed
              });
            }
          }
        } catch {
          // Skip files that can't be read
        }
      }
    } catch {
      // No dependents data available
    }
  }
}

/**
 * Limpia relaciones de un archivo eliminado
 */
export async function cleanupRelationships(filePath) {
  // Remover referencias en otros archivos a este archivo
  try {
    const dependents = await getFileDependents(this.rootPath, filePath);
    for (const depFile of dependents) {
      this.emit('dependency:broken', {
        affectedFile: depFile,
        brokenBy: filePath,
        reason: 'file_deleted'
      });
    }
  } catch {
    // No dependents data available
  }
}

/**
 * Notifica a dependientes de cambios
 */
export async function notifyDependents(filePath, changeType) {
  let dependents = [];
  try {
    dependents = await getFileDependents(this.rootPath, filePath);
  } catch {
    // No data available
  }

  this.emit('dependents:notify', {
    filePath,
    changeType,
    affectedFiles: dependents,
    affectedCount: dependents.length
  });

  // Re-encolar dependientes para re-analisis
  for (const dep of dependents) {
    this.emit('file:modified', { filePath: dep, triggeredBy: filePath });
  }
}

/**
 * Invalida cachés afectadas por cambios
 */
export function invalidateCaches(filePath) {
  // Emitir evento para que otros componentes (MCP Server, etc)
  // invaliden sus cachés
  this.emit('cache:invalidate', { filePath });
}
