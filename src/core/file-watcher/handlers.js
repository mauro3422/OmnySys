/**
 * @fileoverview handlers.js
 * 
 * Handlers para eventos del file watcher.
 * 
 * ⚠️ CRITICAL: Cuando se borra un archivo físico, DEBEMOS borrar:
 * 1. Entrada del index.json
 * 2. Archivo .json en .omnysysdata/files/
 * 3. Átomos asociados en .omnysysdata/atoms/
 * 4. Referencias en molecules
 * 
 * Si no hacemos todo, quedan "fantasmas" que el Meta-Validator detectará.
 * 
 * @module file-watcher/handlers
 */

import fs from 'fs/promises';
import path from 'path';
import { execFile } from 'child_process';
import { promisify } from 'util';
import { createLogger } from '../../utils/logger.js';

const execFileAsync = promisify(execFile);

const logger = createLogger('OmnySys:file-watcher:handlers');

/**
 * Maneja creación de archivo
 */
export async function handleFileCreated(filePath, fullPath) {
  logger.info(`📄 ${filePath} - created`);
  
  // Analizar y agregar al índice
  await this.analyzeAndIndex(filePath, fullPath);
  
  // Enriquecer átomos con ancestry (buscar sombras similares)
  await this.enrichAtomsWithAncestry(filePath);
  
  this.emit('file:created', { filePath });
}

/**
 * Enriquece átomos de un archivo con ancestry (sombras similares)
 */
export async function enrichAtomsWithAncestry(filePath) {
  const { getShadowRegistry } = await import('../../layer-c-memory/shadow-registry/index.js');
  const registry = getShadowRegistry(this.dataPath);
  await registry.initialize();
  
  // Obtener átomos recién creados
  const atoms = await this.getAtomsForFile(filePath);
  
  for (const atom of atoms) {
    try {
      const enriched = await registry.enrichWithAncestry(atom);
      
      if (enriched.ancestry?.replaced) {
        logger.info(`🧬 ${atom.id} enriched with ancestry from ${enriched.ancestry.replaced}`);
        
        // Guardar átomo enriquecido
        await this.saveAtom(enriched, filePath);
      }
    } catch (error) {
      logger.warn(`⚠️ Failed to enrich ancestry for ${atom.id}:`, error.message);
    }
  }
}

/**
 * Guarda un átomo enriquecido
 */
export async function saveAtom(atom, filePath) {
  const safePath = filePath.replace(/[\/]/g, '_');
  const atomsDir = path.join(this.dataPath, 'atoms', safePath);
  
  const atomFile = path.join(atomsDir, `${atom.name}.json`);
  await fs.writeFile(atomFile, JSON.stringify(atom, null, 2));
}

/**
 * Maneja modificación de archivo
 */
export async function handleFileModified(filePath, fullPath) {
  logger.info(`📝 ${filePath} - modified`);
  
  // Re-analizar
  await this.analyzeAndIndex(filePath, fullPath, true);
  
  this.emit('file:modified', { filePath });
}

/**
 * Maneja borrado de archivo
 * 
 * ⚠️ CRITICAL: Debe limpiar TODO rastro del archivo en .omnysysdata/
 * y crear SOMBRAS para los átomos (preservar ADN evolutivo)
 */
export async function handleFileDeleted(filePath) {
  logger.info(`🗑️  ${filePath} - removing from system`);

  try {
    // 1. Crear SOMBRAS de los átomos antes de borrarlos
    await this.createShadowsForFile(filePath);

    // 2. Limpiar relaciones
    await this.cleanupRelationships(filePath);

    // 3. Remover de índice principal
    await this.removeFromIndex(filePath);

    // 4. Borrar archivo de metadata en .omnysysdata/files/
    await this.removeFileMetadata(filePath);

    // 5. Borrar átomos asociados
    await this.removeAtomMetadata(filePath);

    // 6. Limpiar hash
    this.fileHashes.delete(filePath);

    // 7. Notificar a dependientes
    await this.notifyDependents(filePath, 'file_deleted');

    this.emit('file:deleted', { filePath });

    logger.info(`✅ ${filePath} - fully removed from system (shadows preserved)`);
  } catch (error) {
    logger.error(`❌ Error removing ${filePath}:`, error);
    throw error;
  }
}

/**
 * Crea sombras (ADN preservado) de todos los átomos de un archivo
 */
export async function createShadowsForFile(filePath) {
  const { getShadowRegistry } = await import('../../layer-c-memory/shadow-registry/index.js');
  const registry = getShadowRegistry(this.dataPath);
  await registry.initialize();
  
  // Obtener átomos del archivo
  const atoms = await this.getAtomsForFile(filePath);
  
  for (const atom of atoms) {
    try {
      // Enriquecer con filePath
      atom.filePath = filePath;
      
      // Crear sombra
      const shadow = await registry.createShadow(atom, {
        reason: 'file_deleted',
        commits: await this.getRecentCommits()
      });
      
      logger.debug(`🪦 Shadow created for atom: ${atom.id} → ${shadow.shadowId}`);
    } catch (error) {
      logger.warn(`⚠️ Failed to create shadow for ${atom.id}:`, error.message);
      // Continuar con otros átomos
    }
  }
  
  return atoms.length;
}

/**
 * Obtiene átomos de un archivo desde .omnysysdata/
 */
export async function getAtomsForFile(filePath) {
  const safePath = filePath.replace(/[\/]/g, '_');
  const atomsDir = path.join(this.dataPath, 'atoms', safePath);
  
  const atoms = [];
  
  try {
    const files = await fs.readdir(atomsDir);
    
    for (const file of files) {
      if (file.endsWith('.json')) {
        const content = await fs.readFile(path.join(atomsDir, file), 'utf-8');
        atoms.push(JSON.parse(content));
      }
    }
  } catch (error) {
    // No hay átomos o directorio no existe
    logger.debug(`No atoms found for ${filePath}`);
  }
  
  return atoms;
}

/**
 * Obtiene commits recientes del repo git (para contexto de muerte de átomos).
 * Retorna [] si git no está disponible o el directorio no es un repo.
 * @returns {Promise<Array<{hash: string, message: string}>>}
 */
export async function getRecentCommits() {
  const cwd = this.dataPath ? path.dirname(this.dataPath) : process.cwd();
  try {
    const { stdout } = await execFileAsync(
      'git', ['log', '--oneline', '-n', '10'],
      { cwd, timeout: 3000 }
    );
    return stdout.trim().split('\n').filter(Boolean).map(line => {
      const spaceIdx = line.indexOf(' ');
      return {
        hash: line.slice(0, spaceIdx),
        message: line.slice(spaceIdx + 1)
      };
    });
  } catch {
    // git no disponible, no es un repo, o timeout — no es un error fatal
    return [];
  }
}

/**
 * Borra metadata del archivo en .omnysysdata/files/
 */
export async function removeFileMetadata(filePath) {
  // Path must match saveFileAnalysis: .omnysysdata/files/{dir}/{basename}.json
  const metadataPath = path.join(this.dataPath, 'files', filePath) + '.json';

  try {
    await fs.unlink(metadataPath);
    logger.debug(`🗑️  Deleted metadata: ${metadataPath}`);
  } catch (error) {
    if (error.code !== 'ENOENT') {
      logger.warn(`⚠️  Could not delete metadata for ${filePath}:`, error.message);
    }
    // ENOENT = no existía, eso está bien
  }
}

/**
 * Borra átomos asociados al archivo
 */
export async function removeAtomMetadata(filePath) {
  const atomsDir = path.join(this.dataPath, 'atoms');
  const safeDir = filePath.replace(/[\/]/g, '_');
  const atomDirPath = path.join(atomsDir, safeDir);

  try {
    // Verificar si existe el directorio de átomos
    await fs.access(atomDirPath);
    
    // Leer todos los átomos en ese directorio
    const atoms = await fs.readdir(atomDirPath);
    
    // Borrar cada átomo
    for (const atom of atoms) {
      await fs.unlink(path.join(atomDirPath, atom));
    }
    
    // Borrar el directorio vacío
    await fs.rmdir(atomDirPath);
    
    logger.debug(`🗑️  Deleted ${atoms.length} atoms for ${filePath}`);
  } catch (error) {
    if (error.code !== 'ENOENT') {
      logger.warn(`⚠️  Could not delete atoms for ${filePath}:`, error.message);
    }
    // ENOENT = no existía, eso está bien
  }
}

/**
 * Limpia relaciones del archivo con otros módulos.
 * Lee los imports del archivo antes de borrarlo y emite eventos
 * 'import:orphaned' para que otros subsistemas reaccionen.
 */
export async function cleanupRelationships(filePath) {
  logger.debug(`🧹 Cleaning up relationships for ${filePath}`);

  // La metadata aún existe porque cleanupRelationships se llama
  // antes de removeFileMetadata en handleFileDeleted.
  const fileName = path.basename(filePath);
  const fileDir = path.dirname(filePath);
  const metadataPath = path.join(this.dataPath, 'files', fileDir, `${fileName}.json`);

  try {
    const content = await fs.readFile(metadataPath, 'utf-8');
    const metadata = JSON.parse(content);
    const imports = metadata.imports || [];

    if (imports.length > 0) {
      logger.debug(`  ${filePath} tenía ${imports.length} import(s) — emitiendo import:orphaned`);
      for (const imported of imports) {
        const importedPath = typeof imported === 'string' ? imported : (imported.path || imported.from || '');
        if (importedPath) {
          this.emit('import:orphaned', {
            importer: filePath,
            imported: importedPath,
            reason: 'importer_deleted'
          });
        }
      }
    }
  } catch {
    // No existe metadata o no es parseable — sin relaciones que limpiar
    logger.debug(`  Sin metadata para ${filePath}, skip relationship cleanup`);
  }
}

/**
 * Notifica a archivos dependientes que este archivo fue borrado
 */
export async function notifyDependents(filePath, reason) {
  // Obtener archivos que usaban este archivo
  const dependents = await this.getDependents(filePath);
  
  for (const dependent of dependents) {
    this.emit('dependency:broken', {
      from: dependent,
      to: filePath,
      reason
    });
  }
  
  if (dependents.length > 0) {
    logger.warn(`⚠️  ${filePath} was deleted but ${dependents.length} files still import it`);
  }
}

/**
 * Obtiene archivos que dependen de este (lo importan).
 * Lee el system-map persistido en .omnysysdata/system-map-enhanced.json.
 * @param {string} filePath - Path relativo del archivo
 * @returns {Promise<string[]>} - Paths de archivos que importan este archivo
 */
export async function getDependents(filePath) {
  const systemMapPath = path.join(this.dataPath, 'system-map-enhanced.json');

  try {
    const content = await fs.readFile(systemMapPath, 'utf-8');
    const systemMap = JSON.parse(content);

    // Normalizar el filePath para comparación: forward slashes, sin leading ./
    const normalized = filePath.replace(/\\/g, '/').replace(/^\.\//, '');

    // Buscar el nodo directamente
    const fileNode = systemMap.files?.[normalized] || systemMap.files?.[filePath];
    if (fileNode?.usedBy?.length > 0) {
      return fileNode.usedBy;
    }

    // Fallback: escanear todos los nodos buscando dependsOn que incluya este archivo
    const dependents = [];
    for (const [fp, node] of Object.entries(systemMap.files || {})) {
      if ((node.dependsOn || []).some(dep =>
        dep === normalized || dep === filePath || dep.endsWith(normalized)
      )) {
        dependents.push(fp);
      }
    }
    return dependents;
  } catch {
    // system-map no existe o no es legible — sin dependientes conocidos
    return [];
  }
}

// Nota: handleImportChanges y handleExportChanges se implementarán en analyze.js si son necesarias
// Por ahora, el sistema usa las funciones principales de este archivo
