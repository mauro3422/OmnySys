import { createLogger } from '../../../utils/logger.js';
import { analyzeAndIndex } from '../analyze.js';
import { detectCircularDependencies } from '../guards/circular-guard.js';
import { getRecentCommits } from './recent-commits.js';
import { validateAllExports } from '#layer-c/mcp/tools/validate-exports-chain.js';
import { isTestFactorySurface } from '#layer-c/mcp/tools/validate-exports-chain-helpers.js';
import {
  detectDuplicateRiskForFile as detectDuplicateRiskForFileAction,
  detectImpactWaveForFile as detectImpactWaveForFileAction
} from './file-handlers-actions.js';
import { handleFileCreatedForWatcher } from './file-handlers-create.js';

const logger = createLogger('OmnySys:file-watcher:handlers');

/**
 * Maneja creacion de archivo
 */
export async function handleFileCreated(filePath, fullPath, changeContext = {}) {
  return await handleFileCreatedForWatcher(this, filePath, fullPath, changeContext);
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
export async function handleFileModified(filePath, fullPath, changeContext = {}) {
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
  try {
    const fs = await import('fs/promises');
    const stats = await fs.stat(fullPath);
    if (this.fileStats) {
      this.fileStats.set(filePath, {
        mtimeMs: stats.mtimeMs,
        size: stats.size
      });
    }
  } catch {
    // Ignore races where the file disappears between detection and processing.
  }

  const originSuffix = changeContext.origin ? ` (origin=${changeContext.origin})` : '';
  logger.info(`[FILE MODIFIED] ${filePath}${originSuffix}`);
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

  try {
    if (isTestFactorySurface(filePath)) {
      logger.debug(`[EXPORT VALIDATION SKIP] ${filePath}: test factory surface`);
      return;
    }

    const exportValidation = await validateAllExports(this.rootPath, filePath);
    if (!exportValidation.valid) {
      logger.warn(
        `[EXPORT VALIDATION] ${filePath}: ${exportValidation.invalidCount || 0} broken export chain(s)`
      );
    }
  } catch (error) {
    logger.warn(`[EXPORT VALIDATION SKIP] Failed to validate exports for ${filePath}: ${error.message}`);
  }

  // Execute Impact Guards
  await guardRegistry.initializeDefaultGuards();
  await guardRegistry.runImpactGuards(this.rootPath, filePath, this, {
    fullPath,
    previousAtoms,
    atoms: analysis.moleculeAtoms || analysis.atoms || [],
    analysis
  });

  // Reconcile watcher issues - clean up resolved issues automatically
  try {
    const { reconcileWatcherIssues } = await import('../watcher-issue-persistence.js');
    const reconciliation = await reconcileWatcherIssues(this.rootPath, { maxDelete: 100 });
    if (reconciliation.deletedExpired || reconciliation.deletedSuperseded || reconciliation.deletedOutdated) {
      logger.info(
        `[ISSUE RECONCILE] Cleaned up ${reconciliation.deletedExpired + reconciliation.deletedSuperseded + reconciliation.deletedOutdated} resolved issue(s) after processing ${filePath}`
      );
    }
  } catch (error) {
    logger.warn(`[ISSUE RECONCILE SKIP] Failed to reconcile issues after ${filePath}: ${error.message}`);
  }

  logger.info(
    `[FILE PROCESSED] ${filePath} -> atoms=${analysis.moleculeAtoms?.length || analysis.atoms?.length || 0}, previous=${previousAtoms.length}`
  );

  this.emit('file:modified', {
    filePath,
    analysis,
    origin: changeContext.origin || 'unknown',
    source: changeContext.source || null
  });
}

export async function detectImpactWaveForFile(filePath, previousAtoms = [], options = {}) {
  return await detectImpactWaveForFileAction(this, filePath, previousAtoms, options);
}

export async function detectDuplicateRiskForFile(filePath, options = {}) {
  return await detectDuplicateRiskForFileAction(this, filePath, options);
}

/**
 * Maneja borrado de archivo
 */
export async function handleFileDeleted(filePath, changeContext = {}) {
  const originSuffix = changeContext.origin ? ` (origin=${changeContext.origin})` : '';
  logger.info(`[FILE DELETING] ${filePath}${originSuffix}`);

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
    if (this.fileStats) this.fileStats.delete(filePath);
    this.emit('file:deleted', {
      filePath,
      origin: changeContext.origin || 'unknown',
      source: changeContext.source || null
    });
    return;
  }

  try {
    await this.createShadowsForFile(filePath);
    await this.cleanupRelationships(filePath);
    await this.removeFileMetadata(filePath);
    await this.removeAtomMetadata(filePath);
    if (this.fileHashes) this.fileHashes.delete(filePath);
    if (this.fileStats) this.fileStats.delete(filePath);
    await this.notifyDependents(filePath, 'file_deleted');

    this.emit('file:deleted', {
      filePath,
      origin: changeContext.origin || 'unknown',
      source: changeContext.source || null
    });
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
        commits: await getRecentCommits(this.dataPath)
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
  detectCircularDependencyForFile,
  handleFileDeleted,
  createShadowsForFile,
  getAtomsForFile
};
