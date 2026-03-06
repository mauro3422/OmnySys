/**
 * @fileoverview file-handlers.js
 * 
 * Handlers principales para eventos del file watcher.
 * Maneja creacion, modificacion y borrado de archivos.
 * 
 * @module file-watcher/handlers/file-handlers
 */

import { createLogger } from '../../../utils/logger.js';
import { guardRegistry } from '../guards/registry.js';
import { detectImpactWave as detectImpactWaveGuard } from '../guards/impact-wave.js';
import { detectDuplicateRisk as detectDuplicateRiskGuard } from '../guards/duplicate-risk.js';
import { detectCircularDependencies, detectCircularImportsForFile as detectCircularImportsForFileGuard } from '../guards/circular-guard.js';
import { analyzeAndIndex } from '../analyze.js';

const logger = createLogger('OmnySys:file-watcher:handlers');
const LOW_SIGNAL_NAME_REGEX = /^(anonymous(_\d+)?|.*_callback|describe_arg\d+|it_arg\d+|on_arg\d+|then_callback|catch_callback|map_callback|filter_callback|some_callback|get_arg\d+)$/i;

function isLowSignalAtomName(name) {
  return LOW_SIGNAL_NAME_REGEX.test(name);
}

function safeArray(value) {
  return Array.isArray(value) ? value : [];
}

function getRequiredParamsCount(atom) {
  return safeArray(atom?.signature?.params).filter(p => !p?.optional).length;
}

function getFileFromRelationEntry(entry) {
  if (!entry) return null;
  if (typeof entry === 'string') {
    if (entry.includes('::')) return entry.split('::')[0];
    return null;
  }

  const direct = entry.filePath || entry.file || entry.targetFile || entry.sourcePath || entry.targetPath;
  if (direct && typeof direct === 'string') return direct;

  const id = entry.id || entry.atomId || entry.targetId || entry.sourceId;
  if (id && typeof id === 'string' && id.includes('::')) return id.split('::')[0];

  return null;
}

function impactLevelFromScore(score) {
  if (score >= 18) return 'high';
  if (score >= 10) return 'medium';
  if (score >= 4) return 'low';
  return 'none';
}



/**
 * Maneja creacion de archivo
 */
export async function handleFileCreated(filePath, fullPath) {
  logger.info(`[FILE CREATED] ${filePath}`);

  const analysis = await analyzeAndIndex.call(this, filePath, fullPath, false);

  await guardRegistry.initializeDefaultGuards();
  await guardRegistry.runImpactGuards(this.rootPath, filePath, this, {
    fullPath,
    atoms: analysis.moleculeAtoms || analysis.atoms || [],
    analysis
  });

  logger.info(`[FILE COMPILED] ${filePath} -> ${analysis.moleculeAtoms?.length || analysis.atoms?.length || 0} atoms`);

  this.emit('file:created', { filePath, analysis });
}

/**
 * Enriquece atomos de un archivo con ancestry
 */
export async function enrichAtomsWithAncestry(filePath) {
  const { getShadowRegistry } = await import('../../../layer-c-memory/shadow-registry/index.js');
  const registry = getShadowRegistry(this.dataPath);
  await registry.initialize();

  const atoms = await this.getAtomsForFile(filePath);

  for (const atom of atoms) {
    try {
      const enriched = await registry.enrichWithAncestry(atom);

      if (enriched.ancestry?.replaced) {
        logger.info(`[ANCESTRY] ${atom.id} enriched from ${enriched.ancestry.replaced}`);
        await this.saveAtom(enriched, filePath);
      }
    } catch (error) {
      logger.warn(`[ANCESTRY FAIL] ${atom.id}:`, error.message);
    }
  }
}

/**
 * Guarda un atomo enriquecido
 */
export async function saveAtom(atom, filePath) {
  const { saveAtom: saveAtomToStorage } = await import('#layer-c/storage/index.js');
  await saveAtomToStorage(this.rootPath, filePath, atom.name, atom);
  logger.info(`[ATOM SAVED] ${filePath}::${atom.name}`);
}

/**
 * Maneja modificacion de archivo
 */
export async function handleFileModified(filePath, fullPath) {
  // Hash-dedup
  const newHash = await this._calculateContentHash(fullPath);
  const oldHash = this.fileHashes?.get(filePath);
  if (newHash && oldHash && newHash === oldHash) {
    logger.debug(`[SKIP] ${filePath} - content unchanged`);
    return;
  }
  if (newHash && this.fileHashes) {
    this.fileHashes.set(filePath, newHash);
  }

  logger.info(`[FILE MODIFIED] ${filePath}`);
  const previousAtoms = await this.getAtomsForFile(filePath);

  // Invalidar cache si existe cacheInvalidator
  if (this.cacheInvalidator) {
    try {
      const result = await this.cacheInvalidator.invalidateSync(filePath);
      if (result.success) {
        logger.debug(`✅ Cache invalidated (${result.duration}ms): ${filePath}`);
      } else {
        logger.warn(`⚠️ Cache invalidation failed: ${filePath}`, result.error);
      }
    } catch (error) {
      logger.error(`❌ Error during cache invalidation: ${filePath}`, error.message);
    }
  }

  const analysis = await analyzeAndIndex.call(this, filePath, fullPath, true);

  // Execute Impact Guards
  await guardRegistry.initializeDefaultGuards();
  await guardRegistry.runImpactGuards(this.rootPath, filePath, this, {
    fullPath,
    previousAtoms,
    atoms: analysis.moleculeAtoms || analysis.atoms || [],
    analysis
  });

  logger.info(
    `[FILE PROCESSED] ${filePath} -> atoms=${analysis.moleculeAtoms?.length || analysis.atoms?.length || 0}, previous=${previousAtoms.length}`
  );

  this.emit('file:modified', { filePath, analysis });
}

/**
 * Simula una "ola de impacto" local tras cambios de archivo.
 * Delegado a guards/impact-wave.js para mantenibilidad.
 */
export async function detectImpactWaveForFile(filePath, previousAtoms = [], options = {}) {
  return await detectImpactWaveGuard(this.rootPath, filePath, previousAtoms, this, async (fp) => await this.getAtomsForFile(fp), options);
}

/**
 * Detecta riesgo de simbolos duplicados tras una creacion/modificacion.
 * Delegado a guards/duplicate-risk.js para mantenibilidad.
 */
export async function detectDuplicateRiskForFile(filePath, options = {}) {
  return await detectDuplicateRiskGuard(this.rootPath, filePath, this, options);
}

/**
 * Detecta dependencias circulares introducidas por el archivo modificado/creado
 * Delegado a guards/circular-guard.js para mantenibilidad.
 */
export async function detectCircularImportsForFile(filePath, options = {}) {
  return await detectCircularImportsForFileGuard(this.rootPath, filePath, this, options);
}

/**
 * Maneja borrado de archivo
 */
export async function handleFileDeleted(filePath) {
  logger.info(`[FILE DELETING] ${filePath}`);

  const fs = await import('fs/promises');
  const fullPath = this.rootPath ?
    (filePath.startsWith('/') || filePath.match(/^[A-Z]:/)) ? filePath : `${this.rootPath}/${filePath}`.replace(/\\/g, '/') :
    filePath;

  const fileExists = await fs.access(fullPath).then(() => true).catch(() => false);

  if (!fileExists) {
    logger.debug(`[SKIP] File already deleted on disk: ${filePath}`);
    await this.removeFileMetadata(filePath);
    await this.removeAtomMetadata(filePath);
    if (this.fileHashes) this.fileHashes.delete(filePath);
    this.emit('file:deleted', { filePath });
    return;
  }

  try {
    await this.createShadowsForFile(filePath);
    await this.cleanupRelationships(filePath);
    await this.removeFileMetadata(filePath);
    await this.removeAtomMetadata(filePath);
    if (this.fileHashes) this.fileHashes.delete(filePath);
    await this.notifyDependents(filePath, 'file_deleted');

    this.emit('file:deleted', { filePath });
    logger.info(`[FILE DELETED] ${filePath} - shadows preserved`);
  } catch (error) {
    logger.error(`[DELETE ERROR] ${filePath}:`, error);
    throw error;
  }
}

/**
 * Crea sombras de todos los atomos de un archivo
 */
export async function createShadowsForFile(filePath) {
  const { getShadowRegistry } = await import('../../../layer-c-memory/shadow-registry/index.js');
  const registry = getShadowRegistry(this.dataPath);
  await registry.initialize();

  const atoms = await this.getAtomsForFile(filePath);

  if (!atoms || atoms.length === 0) {
    logger.debug(`[SHADOW] No atoms found for deleted file: ${filePath}`);
    return 0;
  }

  let created = 0;
  for (const atom of atoms) {
    try {
      atom.filePath = filePath;
      const shadow = await registry.createShadow(atom, {
        reason: 'file_deleted',
        commits: await this.getRecentCommits()
      });
      logger.debug(`[SHADOW] ${atom.id} -> ${shadow.shadowId}`);
      created++;
    } catch (error) {
      logger.debug(`[SHADOW SKIP] ${atom.id}: ${error.message}`);
    }
  }

  return created;
}

/**
 * Obtiene atomos de un archivo
 */
export async function getAtomsForFile(filePath) {
  const { loadAtoms } = await import('#layer-c/storage/index.js');
  try {
    return await loadAtoms(this.rootPath, filePath);
  } catch (error) {
    logger.debug(`[NO ATOMS] ${filePath}`);
    return [];
  }
}

/**
 * Obtiene commits recientes del repo git
 */
export async function getRecentCommits() {
  const { execFile } = await import('child_process');
  const { promisify } = await import('util');
  const path = await import('path');

  const execFileAsync = promisify(execFile);
  const cwd = this.dataPath ? path.dirname(this.dataPath) : process.cwd();

  try {
    const { stdout } = await execFileAsync(
      'git', ['log', '--oneline', '-n', '10'],
      { cwd, timeout: 3000, windowsHide: true }
    );
    return stdout.trim().split('\n').filter(Boolean).map(line => {
      const spaceIdx = line.indexOf(' ');
      return {
        hash: line.slice(0, spaceIdx),
        message: line.slice(spaceIdx + 1)
      };
    });
  } catch {
    return [];
  }
}

/**
 * Invoca el Guard dual de dependencias circulares y llamadas recursivas infinitas 
 * sobre el archivo modificado para alertar en tiempo real.
 */
export async function detectCircularDependencyForFile(filePath) {
  try {
    const { getRepository } = await import('#layer-c/storage/repository/index.js');
    const repo = getRepository(this.rootPath);
    return await detectCircularDependencies(this.rootPath, filePath, repo);
  } catch (err) {
    logger.debug(`[CIRCULAR GUARD SKIP] ${filePath}: ${err.message}`);
    return null;
  }
}

export default {
  handleFileCreated,
  enrichAtomsWithAncestry,
  saveAtom,
  handleFileModified,
  detectImpactWaveForFile,
  detectDuplicateRiskForFile,
  detectCircularImportsForFile,
  detectCircularDependencyForFile,
  handleFileDeleted,
  createShadowsForFile,
  getAtomsForFile,
  getRecentCommits
};
