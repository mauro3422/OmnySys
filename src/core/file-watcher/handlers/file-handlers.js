/**
 * @fileoverview file-handlers.js
 * 
 * Handlers principales para eventos del file watcher.
 * Maneja creacion, modificacion y borrado de archivos.
 * 
 * @module file-watcher/handlers/file-handlers
 */

import { createLogger } from '../../../utils/logger.js';

const logger = createLogger('OmnySys:file-watcher:handlers');
const LOW_SIGNAL_NAME_REGEX = /^(anonymous(_\d+)?|.*_callback|describe_arg\d+|it_arg\d+|on_arg\d+|then_callback|catch_callback|map_callback|filter_callback|some_callback|get_arg\d+)$/i;

// Nombres de funciones muy comunes en cualquier proyecto JS.
// Si solo hay coincidencia de nombre (sin DNA similar), no se reporta como duplicado real.
const COMMON_NAME_WHITELIST = new Set([
  'processChange', 'handleChange', 'handleError', 'handleEvent',
  'initialize', 'init', 'setup', 'teardown', 'cleanup', 'destroy',
  'execute', 'run', 'start', 'stop', 'restart',
  'validate', 'parse', 'serialize', 'deserialize',
  'create', 'build', 'get', 'set', 'update', 'delete', 'remove',
  'load', 'save', 'read', 'write', 'fetch', 'send',
  'connect', 'disconnect', 'subscribe', 'unsubscribe',
  'emit', 'broadcast', 'notify', 'dispatch',
  'format', 'transform', 'map', 'filter', 'reduce',
  'log', 'warn', 'error', 'debug', 'info',
  'getStats', 'getStatus', 'getConfig', 'getOptions',
  'reset', 'clear', 'flush', 'drain',
  'onError', 'onChange', 'onComplete', 'onSuccess', 'onFailure'
]);

function isLowSignalAtomName(name) {
  return LOW_SIGNAL_NAME_REGEX.test(name);
}

function isCommonName(name) {
  return COMMON_NAME_WHITELIST.has(name);
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

async function persistWatcherIssue(projectPath, filePath, issueType, severity, message, context = {}) {
  try {
    const { getRepository } = await import('#layer-c/storage/repository/index.js');
    const repo = getRepository(projectPath);
    if (!repo?.db) return false;

    const detectedAt = new Date().toISOString();
    const dbMessage = `[watcher] ${message}`;
    const contextJson = JSON.stringify({
      source: 'file_watcher',
      ...context
    });

    repo.db.prepare(`
      DELETE FROM semantic_issues
      WHERE file_path = ? AND issue_type = ? AND message LIKE '[watcher]%'
    `).run(filePath, issueType);

    repo.db.prepare(`
      INSERT INTO semantic_issues (file_path, issue_type, severity, message, line_number, context_json, detected_at)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `).run(filePath, issueType, severity, dbMessage, null, contextJson, detectedAt);

    return true;
  } catch (error) {
    logger.debug(`[WATCHER ISSUE PERSIST SKIP] ${filePath}:${issueType} -> ${error.message}`);
    return false;
  }
}

async function clearWatcherIssue(projectPath, filePath, issueType) {
  try {
    const { getRepository } = await import('#layer-c/storage/repository/index.js');
    const repo = getRepository(projectPath);
    if (!repo?.db) return false;

    repo.db.prepare(`
      DELETE FROM semantic_issues
      WHERE file_path = ? AND issue_type = ? AND message LIKE '[watcher]%'
    `).run(filePath, issueType);

    return true;
  } catch (error) {
    logger.debug(`[WATCHER ISSUE CLEAR SKIP] ${filePath}:${issueType} -> ${error.message}`);
    return false;
  }
}

/**
 * Maneja creacion de archivo
 */
export async function handleFileCreated(filePath, fullPath) {
  logger.debug(`[CREATED] ${filePath}`);

  // Analizar y agregar al indice
  await this.analyzeAndIndex(filePath, fullPath);
  await this.detectImpactWaveForFile(filePath, [], { fullPath });
  await this.detectDuplicateRiskForFile(filePath);

  // Enriquecer atomos con ancestry
  await this.enrichAtomsWithAncestry(filePath);

  this.emit('file:created', { filePath });
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

  logger.debug(`[MODIFIED] ${filePath}`);
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

  await this.analyzeAndIndex(filePath, fullPath, true);
  await this.detectImpactWaveForFile(filePath, previousAtoms, { fullPath });
  await this.detectDuplicateRiskForFile(filePath);
  this.emit('file:modified', { filePath });
}

/**
 * Simula una "ola de impacto" local tras cambios de archivo.
 * Señala riesgo sin bloquear, para aparecer en _recentErrors en la siguiente tool call.
 */
export async function detectImpactWaveForFile(filePath, previousAtoms = [], options = {}) {
  const {
    fullPath = null,
    maxAtoms = 30,
    maxRelatedFiles = 25,
    maxBrokenSamples = 5
  } = options;

  try {
    const currentAtoms = await this.getAtomsForFile(filePath);
    if (!currentAtoms || currentAtoms.length === 0) {
      await clearWatcherIssue(this.rootPath, filePath, 'watcher_impact_wave');
      return null;
    }

    const { validateImportsInEdit, validatePostEditOptimized } = await import('#layer-c/mcp/tools/atomic-edit/validators.js');
    const fs = await import('fs/promises');

    const previousByName = new Map(previousAtoms.map(a => [a.name, a]));
    const changedAtoms = [];

    for (const atom of currentAtoms) {
      const prev = previousByName.get(atom.name);
      if (!prev) {
        changedAtoms.push({ name: atom.name, type: 'added' });
        continue;
      }

      const prevRequired = getRequiredParamsCount(prev);
      const currRequired = getRequiredParamsCount(atom);
      if (prevRequired !== currRequired) {
        changedAtoms.push({ name: atom.name, type: 'signature' });
      }
    }

    for (const prev of previousAtoms) {
      const stillExists = currentAtoms.some(a => a.name === prev.name);
      if (!stillExists) {
        changedAtoms.push({ name: prev.name, type: 'removed' });
      }
    }

    const focusedAtoms = changedAtoms.slice(0, maxAtoms);
    const focusedAtomNames = new Set(focusedAtoms.map(a => a.name));

    const relatedFiles = new Set();
    for (const atom of currentAtoms) {
      if (!focusedAtomNames.has(atom.name)) continue;

      for (const rel of safeArray(atom.calledBy)) {
        const relFile = getFileFromRelationEntry(rel);
        if (relFile && relFile !== filePath) relatedFiles.add(relFile);
      }
      for (const rel of safeArray(atom.calls)) {
        const relFile = getFileFromRelationEntry(rel);
        if (relFile && relFile !== filePath) relatedFiles.add(relFile);
      }
    }

    let brokenImports = [];
    if (fullPath) {
      try {
        const code = await fs.readFile(fullPath, 'utf-8');
        brokenImports = await validateImportsInEdit(filePath, code, this.rootPath);
      } catch {
        brokenImports = [];
      }
    }

    const postValidation = await validatePostEditOptimized(filePath, this.rootPath, previousAtoms, currentAtoms);
    const brokenCallers = safeArray(postValidation?.brokenCallers);

    let score = 0;
    score += Math.min(focusedAtoms.length, 4);
    score += Math.min(relatedFiles.size, 8);
    if (brokenImports.length > 0) score += 8 + Math.min(brokenImports.length, 4);
    if (brokenCallers.length > 0) score += 10 + Math.min(brokenCallers.length * 2, 10);

    const level = impactLevelFromScore(score);
    if (level === 'none') {
      await clearWatcherIssue(this.rootPath, filePath, 'watcher_impact_wave');
      return null;
    }

    const summary = {
      changedAtoms: focusedAtoms.length,
      relatedFiles: Math.min(relatedFiles.size, maxRelatedFiles),
      brokenImports: brokenImports.length,
      brokenCallers: brokenCallers.length,
      score,
      level
    };

    logger.warn(
      `[IMPACT WAVE][${level.toUpperCase()}] ${filePath}: atoms=${summary.changedAtoms}, relatedFiles=${summary.relatedFiles}, brokenImports=${summary.brokenImports}, brokenCallers=${summary.brokenCallers}, score=${summary.score}`
    );

    if (brokenCallers.length > 0) {
      const sample = brokenCallers.slice(0, maxBrokenSamples).map(c => `${c.file}:${c.line}`).join(', ');
      logger.warn(`[IMPACT WAVE] Broken caller sample: ${sample}`);
    }

    if (brokenImports.length > 0) {
      const sample = brokenImports.slice(0, maxBrokenSamples).map(i => i.import).join(', ');
      logger.warn(`[IMPACT WAVE] Broken import sample: ${sample}`);
    }

    this.emit('impact:wave', {
      filePath,
      ...summary,
      sample: {
        atoms: focusedAtoms.slice(0, 8),
        relatedFiles: Array.from(relatedFiles).slice(0, maxRelatedFiles),
        brokenImports: brokenImports.slice(0, maxBrokenSamples),
        brokenCallers: brokenCallers.slice(0, maxBrokenSamples)
      }
    });

    await persistWatcherIssue(
      this.rootPath,
      filePath,
      'watcher_impact_wave',
      level,
      `Impact wave ${level} (score=${summary.score}, relatedFiles=${summary.relatedFiles})`,
      {
        score: summary.score,
        changedAtoms: summary.changedAtoms,
        relatedFiles: summary.relatedFiles,
        brokenImports: summary.brokenImports,
        brokenCallers: summary.brokenCallers,
        sample: {
          atoms: focusedAtoms.slice(0, 8),
          relatedFiles: Array.from(relatedFiles).slice(0, maxRelatedFiles),
          brokenImports: brokenImports.slice(0, maxBrokenSamples).map(i => i.import),
          brokenCallers: brokenCallers.slice(0, maxBrokenSamples).map(c => ({
            file: c.file,
            line: c.line,
            symbol: c.symbol || c.name || null
          }))
        }
      }
    );

    return summary;
  } catch (error) {
    logger.debug(`[IMPACT WAVE SKIP] ${filePath}: ${error.message}`);
    return null;
  }
}

/**
 * Detecta riesgo de simbolos duplicados tras una creacion/modificacion.
 * Usa dos niveles de análisis:
 * 1. Nombre: coincidencias en otros archivos
 * 2. DNA hash: si el nombre está en la whitelist de nombres comunes,
 *    solo se reporta si el dna_json es similar (duplicación lógica real).
 * El resultado aparece en _recentErrors en la siguiente tool call.
 *
 * Severidades:
 * - LOGIC_DUPLICATE (dna_json igual): high/medium
 * - SAME_NAME_DIFF_ROLE (nombre en whitelist + DNA diferente): ignorado
 * - NAME_DUPLICATE (nombre no-whitelist + matches en otros archivos): medium
 */
export async function detectDuplicateRiskForFile(filePath, options = {}) {
  const {
    maxFindings = 8,
    minLinesOfCode = 4
  } = options;

  try {
    const { getRepository } = await import('#layer-c/storage/repository/index.js');
    const repo = getRepository(this.rootPath);
    if (!repo?.db) return [];

    // 1. Obtener los dna_json del archivo que acaba de cambiar (desde SQLite)
    //    Solo átomos con suficiente código y nombre con señal
    const localAtoms = repo.db.prepare(`
      SELECT name, dna_json, lines_of_code
      FROM atoms
      WHERE file_path = ?
        AND dna_json IS NOT NULL AND dna_json != ''
        AND (lines_of_code IS NULL OR lines_of_code >= ?)
        AND (is_removed IS NULL OR is_removed = 0)
        AND (is_dead_code IS NULL OR is_dead_code = 0)
      LIMIT ?
    `).all(filePath, minLinesOfCode, maxFindings * 4);

    if (localAtoms.length === 0) {
      await clearWatcherIssue(this.rootPath, filePath, 'watcher_duplicate_risk');
      return [];
    }

    // Filtrar nombres de bajo señal
    const candidateDnas = localAtoms
      .filter(a => a.name && !isLowSignalAtomName(a.name))
      .map(a => a.dna_json);

    if (candidateDnas.length === 0) {
      await clearWatcherIssue(this.rootPath, filePath, 'watcher_duplicate_risk');
      return [];
    }

    // 2. Query SQL: misma lógica que queryDuplicates() en semantic-queries.js,
    //    pero solo para los dna_json del archivo actual.
    //    Busca otros átomos con el mismo DNA en archivos distintos (excluye tests).
    const placeholders = candidateDnas.map(() => '?').join(',');
    const duplicateRows = repo.db.prepare(`
      SELECT a.name, a.file_path, a.dna_json, a.line_start
      FROM atoms a
      WHERE a.dna_json IN (${placeholders})
        AND a.file_path != ?
        AND a.file_path NOT LIKE '%.test.js'
        AND a.file_path NOT LIKE '%.spec.js'
        AND a.file_path NOT LIKE '%/test/%'
        AND a.file_path NOT LIKE '%/tests/%'
        AND (a.is_removed IS NULL OR a.is_removed = 0)
        AND (a.is_dead_code IS NULL OR a.is_dead_code = 0)
      ORDER BY a.dna_json, a.file_path
    `).all(...candidateDnas, filePath);

    if (duplicateRows.length === 0) {
      await clearWatcherIssue(this.rootPath, filePath, 'watcher_duplicate_risk');
      return [];
    }

    // 3. Agrupar por dna_json para construir los findings
    const byDna = new Map();
    for (const row of duplicateRows) {
      if (!byDna.has(row.dna_json)) byDna.set(row.dna_json, []);
      byDna.get(row.dna_json).push(row);
    }

    // Mapear dna_json → nombre local (para el reporte)
    const localDnaToName = new Map(localAtoms.map(a => [a.dna_json, a.name]));

    const findings = [];
    for (const [dna, remoteAtoms] of byDna) {
      const symbolName = localDnaToName.get(dna) || remoteAtoms[0]?.name || '?';
      const uniqueFiles = [...new Set(remoteAtoms.map(a => a.file_path))];

      findings.push({
        symbol: symbolName,
        duplicateType: 'LOGIC_DUPLICATE',   // DNA exacto → siempre real
        totalInstances: remoteAtoms.length + 1,
        duplicateFiles: uniqueFiles,
        sample: uniqueFiles.slice(0, 3),
        dnaSimilarity: 'identical'
      });

      if (findings.length >= maxFindings) break;
    }

    if (findings.length > 0) {
      const preview = findings
        .map(f => `${f.symbol}(${f.totalInstances},LOGIC_DUPLICATE)`)
        .join(', ');

      logger.warn(
        `[DUPLICATE GUARD] ${filePath}: ${findings.length} duplicated symbol(s) detected -> ${preview}`
      );

      const severity = findings.length >= 3 ? 'high' : 'medium';

      await persistWatcherIssue(
        this.rootPath,
        filePath,
        'watcher_duplicate_risk',
        severity,
        `Duplicate risk (${findings.length} symbols): ${preview}`,
        {
          duplicateCount: findings.length,
          findings: findings.slice(0, maxFindings)
        }
      );

      this.emit('duplicate:risk', { filePath, findings });
    } else {
      await clearWatcherIssue(this.rootPath, filePath, 'watcher_duplicate_risk');
    }

    return findings;
  } catch (error) {
    logger.debug(`[DUPLICATE GUARD SKIP] ${filePath}: ${error.message}`);
    return [];
  }
}

/**
 * Maneja borrado de archivo
 */
export async function handleFileDeleted(filePath) {
  logger.debug(`[DELETING] ${filePath}`);

  const fs = await import('fs/promises');
  const fullPath = this.rootPath ?
    (filePath.startsWith('/') || filePath.match(/^[A-Z]:/)) ? filePath : `${this.rootPath}/${filePath}`.replace(/\\/g, '/') :
    filePath;

  const fileExists = await fs.access(fullPath).then(() => true).catch(() => false);

  if (!fileExists) {
    logger.debug(`[SKIP] File already deleted on disk: ${filePath}`);
    await this.removeFromIndex(filePath);
    await this.removeAtomMetadata(filePath);
    this.fileHashes.delete(filePath);
    this.emit('file:deleted', { filePath });
    return;
  }

  try {
    await this.createShadowsForFile(filePath);
    await this.cleanupRelationships(filePath);
    await this.removeFromIndex(filePath);
    await this.removeFileMetadata(filePath);
    await this.removeAtomMetadata(filePath);
    this.fileHashes.delete(filePath);
    await this.notifyDependents(filePath, 'file_deleted');

    this.emit('file:deleted', { filePath });
    logger.debug(`[DELETED] ${filePath} - shadows preserved`);
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

export default {
  handleFileCreated,
  enrichAtomsWithAncestry,
  saveAtom,
  handleFileModified,
  detectImpactWaveForFile,
  detectDuplicateRiskForFile,
  handleFileDeleted,
  createShadowsForFile,
  getAtomsForFile,
  getRecentCommits
};
