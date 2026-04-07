/**
 * @fileoverview Batch Consolidation Tool
 *
 * API estandarizada para consolidación masiva de duplicados conceptuales.
 * Sigue el patrón Detect → Plan → Execute → Validate.
 *
 * @module layer-c-memory/mcp/tools/consolidate-batch
 */

import { getRepository } from '../../storage/repository/repository-factory.js';
import { createLogger } from '../../../utils/logger.js';
import { consolidate_conceptual_cluster } from './consolidate-conceptual-cluster.js';

const logger = createLogger('OmnySys:mcp:consolidate_batch');

/**
 * Extrae la firma de un átomo desde la DB
 */
function extractAtomSignature(repo, atomId) {
  const stmt = repo.db.prepare(`
    SELECT name, atom_type,
           json_extract(dna_json, '$.parameters') as params,
           json_extract(dna_json, '$.semanticFingerprint') as fingerprint,
           file_path
    FROM atoms WHERE id = ?
  `);
  const row = stmt.get(atomId);
  if (!row) return null;

  return {
    name: row.name,
    type: row.atom_type,
    fingerprint: row.fingerprint,
    filePath: row.file_path,
    paramCount: row.params ? JSON.parse(row.params).length : 0
  };
}

/**
 * Verifica si un cluster es seguro para consolidación automática
 */
function isClusterSafeForAutoConsolidate(repo, fingerprint, ssotPath) {
  const query = `
    SELECT id, name, atom_type, file_path,
           json_extract(dna_json, '$.parameters') as params
    FROM atoms
    WHERE json_extract(dna_json, '$.semanticFingerprint') = ?
      AND (is_removed IS NULL OR is_removed = 0)
      AND (is_dead_code IS NULL OR is_dead_code = 0)
  `;

  const atoms = repo.db.prepare(query).all(fingerprint);
  const ssotAtom = atoms.find(a => a.file_path.includes(ssotPath.replace(/\\/g, '/')));

  if (!ssotAtom) {
    return { safe: false, reason: 'SSOT not found in cluster' };
  }

  const ssotParams = ssotAtom.params ? JSON.parse(ssotAtom.params) : null;

  for (const atom of atoms) {
    if (atom.id === ssotAtom.id) continue;

    // Skip methods - requieren refactor de clase
    if (atom.atom_type === 'method') {
      return { safe: false, reason: `Contains method '${atom.name}' in ${atom.file_path}`, blockingAtom: atom };
    }

    // Verificar misma cantidad de parámetros
    const atomParams = atom.params ? JSON.parse(atom.params) : null;
    if (ssotParams && atomParams && ssotParams.length !== atomParams.length) {
      return {
        safe: false,
        reason: `Signature mismatch: SSOT has ${ssotParams.length} params, '${atom.name}' has ${atomParams.length}`,
        blockingAtom: atom
      };
    }
  }

  return { safe: true, atomCount: atoms.length, strategy: 'auto' };
}

/**
 * Batch consolidate - consolida múltiples clusters de duplicados conceptuales
 *
 * @param {Object} args
 * @param {Array} args.clusters - [{fingerprint, ssotPath}]
 * @param {boolean} args.dryRun - Preview only (default: true)
 * @param {boolean} args.autoDetect - Auto-detect clusters consolidables
 * @param {number} args.maxClusters - Máx clusters a procesar (default: 10)
 * @param {Object} context - MCP context
 */
export async function consolidate_batch(args, context) {
  const {
    clusters = [],
    dryRun = true,
    autoDetect = false,
    maxClusters = 10
  } = args;
  const { projectPath } = context;

  logger.info(`[Batch] Starting consolidation: ${clusters.length} clusters, dryRun=${dryRun}`);

  const repo = getRepository(projectPath);
  const results = {
    success: true,
    dryRun,
    totalClusters: 0,
    consolidated: [],
    skipped: [],
    failed: [],
    summary: {
      totalAtomsProcessed: 0,
      totalFilesModified: 0,
      strategies: { 're-export': 0, 'wrapper-delegation': 0, 'blocked': 0 }
    }
  };

  let clustersToProcess = clusters;

  // Auto-detect clusters consolidables
  if (autoDetect) {
    const duplicatesQuery = `
      SELECT json_extract(dna_json, '$.semanticFingerprint') as fp,
             COUNT(DISTINCT file_path) as fileCount,
             COUNT(*) as atomCount
      FROM atoms
      WHERE json_extract(dna_json, '$.semanticFingerprint') IS NOT NULL
        AND (is_removed IS NULL OR is_removed = 0)
        AND (is_dead_code IS NULL OR is_dead_code = 0)
      GROUP BY fp
      HAVING COUNT(DISTINCT file_path) >= 2
      ORDER BY COUNT(DISTINCT file_path) DESC
      LIMIT ?
    `;

    const candidateClusters = repo.db.prepare(duplicatesQuery).all(maxClusters * 2);

    for (const candidate of candidateClusters) {
      if (clustersToProcess.length >= maxClusters) break;

      const safety = isClusterSafeForAutoConsolidate(repo, candidate.fp, 'src/shared');
      if (safety.safe) {
        // Usar el archivo con menos líneas como SSOT (barrel files primero)
        const atomsQuery = `
          SELECT file_path FROM atoms
          WHERE json_extract(dna_json, '$.semanticFingerprint') = ?
          LIMIT 1
        `;
        const firstAtom = repo.db.prepare(atomsQuery).get(candidate.fp);
        clustersToProcess.push({
          fingerprint: candidate.fp,
          ssotPath: firstAtom.file_path
        });
      }
    }
  }

  results.totalClusters = clustersToProcess.length;

  for (const cluster of clustersToProcess) {
    const clusterResult = {
      fingerprint: cluster.fingerprint,
      ssotPath: cluster.ssotPath
    };

    try {
      // Phase 1: Safety check
      const safety = isClusterSafeForAutoConsolidate(repo, cluster.fingerprint, cluster.ssotPath);

      if (!safety.safe) {
        clusterResult.status = 'skipped';
        clusterResult.reason = safety.reason;
        results.skipped.push(clusterResult);
        results.summary.strategies.blocked++;
        continue;
      }

      // Phase 2: Plan
      const plan = await consolidate_conceptual_cluster({
        semanticFingerprint: cluster.fingerprint,
        ssotFilePath: cluster.ssotPath,
        execute: false
      }, context);

      clusterResult.plan = plan;

      if (dryRun) {
        clusterResult.status = 'planned';
        clusterResult.actionCount = plan.actions?.length || 0;
        results.consolidated.push(clusterResult);
        continue;
      }

      // Phase 3: Execute
      if (plan.actions && plan.actions.length > 0) {
        const execution = await consolidate_conceptual_cluster({
          semanticFingerprint: cluster.fingerprint,
          ssotFilePath: cluster.ssotPath,
          execute: true
        }, context);

        clusterResult.execution = execution;
        clusterResult.status = 'executed';

        const consolidated = execution.actions?.filter(a => a.status === 'consolidated') || [];
        const failed = execution.actions?.filter(a => a.status === 'failed' || a.status === 'error') || [];

        results.summary.totalAtomsProcessed += execution.totalFound || 0;
        results.summary.totalFilesModified += consolidated.length;
        results.summary.strategies['re-export'] += consolidated.filter(a => a.strategy === 're-export').length;
        results.summary.strategies['wrapper-delegation'] += consolidated.filter(a => a.strategy === 'wrapper-delegation').length;

        if (failed.length > 0) {
          clusterResult.failedActions = failed;
          clusterResult.status = 'partial';
        }

        results.consolidated.push(clusterResult);
      }
    } catch (err) {
      logger.error(`[Batch] Error processing cluster ${cluster.fingerprint}: ${err.message}`);
      clusterResult.status = 'error';
      clusterResult.error = err.message;
      results.failed.push(clusterResult);
    }
  }

  return results;
}

export default { consolidate_batch };
