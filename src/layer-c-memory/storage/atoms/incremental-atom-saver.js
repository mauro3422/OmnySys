/**
 * @fileoverview incremental-atom-saver.js
 *
 * Sistema de guardado incremental de átomos con rate limiting.
 * Solo actualiza los campos que realmente cambiaron.
 * Usa WriteQueue para evitar EMFILE durante reindexados masivos.
 *
 * @module layer-c-memory/storage/atoms/incremental-atom-saver
 */

import {
  buildAtomChangeDetection,
  buildVersionPayload,
} from './atom-version-manager-helpers.js';
import { persistAtomVersionArchiveBatch } from '../../../shared/compiler/atom-history-archive.js';
import { createLogger } from '#utils/logger.js';
import {
  REPOSITORY_MUTATION_DURABILITY,
  runRepositoryMutation
} from '../repository/index.js';

const logger = createLogger('OmnySys:incremental-saver');

function buildIncrementalAtomMetadata(atom, rootPath, options) {
  return {
    ...atom,
    _meta: {
      ...(atom._meta || {}),
      rootPath,
      lastModified: Date.now(),
      version: (atom._meta?.version || 0) + 1,
      incrementalUpdate: true,
      source: options.source || 'unknown'
    }
  };
}

function buildVersionSaveEntry(atomId, atom) {
  return {
    atomId,
    atomData: atom,
    ...buildVersionPayload(atom)
  };
}

function loadExistingVersionRowsForFile(db, filePath) {
  const rows = db.prepare(`
    SELECT atom_id, hash, field_hashes_json, last_modified, file_path, atom_name
    FROM atom_versions
    WHERE file_path = ?
  `).all(filePath);

  const byAtomId = new Map();
  for (const row of rows) {
    byAtomId.set(row.atom_id, row);
  }

  return byAtomId;
}

function saveAtomVersionsBatch(db, versions) {
  if (!versions || versions.length === 0) {
    return { changes: 0 };
  }

  const stmt = db.prepare(`
    INSERT INTO atom_versions (atom_id, hash, field_hashes_json, last_modified, file_path, atom_name)
    VALUES (?, ?, ?, ?, ?, ?)
    ON CONFLICT(atom_id) DO UPDATE SET
      hash = excluded.hash,
      field_hashes_json = excluded.field_hashes_json,
      last_modified = excluded.last_modified
  `);

  return db.transaction(() => {
    let changes = 0;
    for (const version of versions) {
      const result = stmt.run(
        version.atomId,
        version.hash,
        JSON.stringify(version.fieldHashes),
        version.lastModified,
        version.filePath,
        version.atomName
      );
      changes += result.changes || 0;
    }
    return { changes };
  })();
}

/**
 * Guarda un átomo de forma incremental
 * Wrapper para saveAtomsIncremental por compatibilidad.
 */
export async function saveAtomIncremental(rootPath, filePath, functionName, atomData, options = {}) {
  // Aseguramos que el atomData tenga el nombre correcto
  const atomWithMetadata = { ...atomData, name: functionName };
  const results = await saveAtomsIncremental(rootPath, filePath, [atomWithMetadata], options);

  if (results.success) {
    return {
      success: true,
      action: results.created > 0 ? 'created' : (results.updated > 0 ? 'updated' : 'unchanged'),
      atomId: `${filePath}::${functionName}`,
      duration: results.duration,
      fieldsChanged: results.totalFieldsChanged
    };
  }

  return results;
}

export async function saveAtomsIncremental(rootPath, filePath, atoms, options = {}) {
  const normalizedPath = filePath.replace(/\\/g, '/');
  const startTime = Date.now();
  const results = {
    created: 0,
    updated: 0,
    unchanged: 0,
    errors: 0,
    totalFieldsChanged: 0
  };

  try {
    const mutation = await runRepositoryMutation(
      rootPath,
      {
        key: `incremental-atoms:${normalizedPath}`,
        label: `saveAtomsIncremental:${normalizedPath}`,
        durability: REPOSITORY_MUTATION_DURABILITY.DURABLE,
        metadata: { filePath: normalizedPath, atomCount: atoms.length },
        run: (repo) => saveAtomsIncrementalInternal(
          repo,
          rootPath,
          normalizedPath,
          atoms,
          options,
          startTime,
          results
        )
      },
      { durability: REPOSITORY_MUTATION_DURABILITY.DURABLE }
    );

    if (mutation.queued || mutation.skipped) {
      return {
        success: true,
        ...results,
        duration: Date.now() - startTime,
        atomsProcessed: atoms.length,
        skipped: mutation.skipped,
        queued: mutation.queued,
        reason: mutation.reason
      };
    }

    return mutation.result;

  } catch (error) {
    if (String(error?.message || '').includes('database connection is not open')) {
      return {
        success: true,
        ...results,
        duration: Date.now() - startTime,
        atomsProcessed: atoms.length,
        skipped: true,
        reason: error.message
      };
    }

    logger.error(`Failed incremental save for ${normalizedPath}:`, error);
    return { success: false, error: error.message };
  }
}

/**
 * Campos genealógicos que se archivan en atom-history.db.
 * Filtramos para no guardar bloat (_meta, imports, exports que son del archivo).
 * Esto reduce ~60% el espacio del archive sin perder información genealógica.
 */
const GENEALOGICAL_FIELDS = [
  // Identidad
  'id', 'name', 'atom_type', 'file_path', 'line', 'endLine', 'linesOfCode',
  // Conexiones (genealógicas — quién llamaba a quién en esta versión)
  'calls', 'calledBy',
  // Evolución del átomo (ADN, flujos, métricas)
  'dna', 'dnaJson', 'dataFlow', 'dataFlowJson', 'errorFlow', 'errorFlowJson',
  'performance', 'performanceJson', 'signature', 'signatureJson',
  // Métricas derivadas (cambian con el código)
  'complexity', 'fragilityScore', 'cohesionScore', 'couplingScore',
  'propagationScore', 'testabilityScore', 'centralityScore', 'centralityClassification',
  'importanceScore', 'stabilityScore', 'riskLevel', 'riskPrediction',
  // Clasificación
  'archetype', 'purpose', 'purposeConfidence', 'isDeadCode',
  // Semántica
  'sharedStateAccess', 'sharedStateJson', 'eventEmitters', 'eventEmittersJson',
  'eventListeners', 'eventListenersJson',
  // Git
  'changeFrequency', 'ageDays', 'generation',
  // Flags
  'isExported', 'isAsync', 'hasErrorHandling', 'hasNetworkCalls',
  'functionType', 'scopeType', 'isDeprecated', 'deprecatedReason'
];

/**
 * Extrae solo los campos genealógicos de un átomo para archivar.
 * NO archivamos: _meta, imports, exports, uses, side_effects (bloat o metadata del archivo).
 */
function extractGenealogicalPayload(atom) {
  const payload = {};

  for (const field of GENEALOGICAL_FIELDS) {
    if (atom[field] !== undefined && atom[field] !== null) {
      payload[field] = atom[field];
    }
  }

  return payload;
}

/**
 * Carga los átomos COMPLETOS existentes de un archivo desde la tabla `atoms`.
 * Esto es necesario para archivar la versión ANTERIOR antes de reemplazarla.
 */
function loadExistingAtomsForFile(repo, filePath) {
  const rows = repo.db.prepare(`
    SELECT * FROM atoms WHERE file_path = ? AND (is_removed IS NULL OR is_removed = 0)
  `).all(filePath);

  const byId = new Map();
  for (const row of rows) {
    const atomId = row.id || `${row.file_path}::${row.name}`;
    byId.set(atomId, row);
  }

  return byId;
}

async function saveAtomsIncrementalInternal(repo, rootPath, normalizedPath, atoms, options, startTime, results) {
  const existingVersions = loadExistingVersionRowsForFile(repo.db, normalizedPath);
  const existingAtoms = loadExistingAtomsForFile(repo, normalizedPath);

  const atomsToSave = [];
  const versionsToSave = [];
  const atomsWithChanges = [];

  for (const atom of atoms) {
    if (!atom.name) continue;

    const atomId = `${normalizedPath}::${atom.name}`;

    // Aseguramos que el objeto atom tenga los campos correctos para el repo
    atom.id = atomId;
    atom.file_path = normalizedPath;
    atom.filePath = normalizedPath;

    const existingRow = existingVersions.get(atomId);
    const changeDetection = buildAtomChangeDetection(existingRow, atomId, atom, logger);

    if (!changeDetection.hasChanges && !options.forceFull) {
      results.unchanged++;
      continue;
    }

    // ARCHIVAR versión ANTERIOR antes de reemplazar (preservar linaje)
    if (!changeDetection.isNew && existingAtoms.has(atomId)) {
      const existingAtom = existingAtoms.get(atomId);
      const { rowToAtom } = await import('../repository/adapters/helpers/converters.js');
      const oldAtom = rowToAtom(existingAtom);

      try {
        persistAtomVersionArchiveBatch(rootPath, [{
          atomId,
          atomData: extractGenealogicalPayload(oldAtom),
          version: {
            hash: existingRow?.hash || 'unknown',
            fieldHashes: existingRow?.field_hashes_json ? JSON.parse(existingRow.field_hashes_json) : {},
            lastModified: existingRow?.last_modified || Date.now(),
            filePath: normalizedPath,
            atomName: atom.name
          },
          source: 'file-watcher-pre-update'
        }], { source: 'file-watcher-pre-update' });
      } catch (error) {
        logger.warn(`Failed to archive pre-update atom ${atomId}: ${error.message}`);
      }
    }

    // Metadata update for record keeping
    const finalAtom = buildIncrementalAtomMetadata(atom, rootPath, options);

    atomsToSave.push(finalAtom);
    atomsWithChanges.push(finalAtom);

    if (changeDetection.isNew) results.created++;
    else {
      results.updated++;
      results.totalFieldsChanged += changeDetection.fields.length;
    }

    versionsToSave.push(buildVersionSaveEntry(atomId, finalAtom));
  }

  if (atomsToSave.length > 0) {
    await repo.saveMany(atomsToSave);
  }

  if (versionsToSave.length > 0) {
    saveAtomVersionsBatch(repo.db, versionsToSave);
    try {
      // Filtrar solo campos genealógicos para el archive (reduce ~60% espacio)
      const genealogicalVersions = versionsToSave.map(v => ({
        ...v,
        atomData: extractGenealogicalPayload(v.atomData)
      }));
      persistAtomVersionArchiveBatch(rootPath, genealogicalVersions, { source: 'incremental-atom-saver' });
    } catch (error) {
      logger.warn(`Atom version archive persistence failed for ${normalizedPath}: ${error.message}`);
    }
  }

  return {
    success: true,
    ...results,
    duration: Date.now() - startTime,
    atomsProcessed: atoms.length,
    archived: atomsWithChanges.length - results.created
  };
}

export function getSaverStats() {
  return {
    queue: getWriteQueue().status
  };
}
