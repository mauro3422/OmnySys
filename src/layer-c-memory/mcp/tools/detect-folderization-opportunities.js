/**
 * @fileoverview MCP Tool: detect_folderization_opportunities
 *
 * Pipeline de detección continua que analiza el proyecto y genera alertas sobre:
 * - Archivos monolíticos (>300 líneas)
 * - Duplicación por ADN semántico
 * - Familias candidatas a folderización
 * - Deuda de naming (archivos con prefijos repetidos)
 *
 * DETECCIÓN ONLY - NO HACE CAMBIOS, solo detecta y avisa.
 * Ideal para pipeline continua de monitoreo.
 *
 * @module layer-c-memory/mcp/tools/detect-folderization-opportunities
 */

import { createLogger } from '../../../utils/logger.js';
import { getRepository } from '../../storage/repository/repository-factory.js';

const logger = createLogger('OmnySys:mcp:detect_folderization_opportunities');

// ─────────────────────────────────────────────────────────────────────────────
// DETECTORES
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Detecta archivos monolíticos (>= threshold líneas)
 */
function detectMonoliths(repo, threshold = 300) {
  const monoliths = repo.db.prepare(`
    SELECT
      f.path,
      f.total_lines,
      f.atom_count,
      f.total_complexity
    FROM files f
    WHERE f.path LIKE 'src/%'
      AND f.total_lines >= ?
      AND (f.is_removed IS NULL OR f.is_removed = 0)
    ORDER BY f.total_lines DESC
    LIMIT 20
  `).all(threshold);

  return monoliths.map(m => {
    const severity = m.total_lines >= 600 ? 'high' : m.total_lines >= 400 ? 'medium' : 'low';
    return {
      type: 'monolith',
      severity,
      file: m.path,
      lines: m.total_lines,
      atoms: m.atom_count,
      complexity: m.total_complexity,
      message: `Monolítico ${severity}: ${m.path} (${m.total_lines}L, ${m.atom_count} átomos)`,
      suggestion: 'split_large_file o folderize_family'
    };
  });
}

/**
 * Detecta duplicación por ADN semántico
 */
function detectDuplication(repo) {
  const duplicates = repo.db.prepare(`
    SELECT
      dna_json,
      COUNT(*) as instance_count,
      GROUP_CONCAT(DISTINCT file_path) as sample_files
    FROM atoms
    WHERE dna_json IS NOT NULL
      AND dna_json != ''
      AND (is_removed IS NULL OR is_removed = 0)
      AND file_path LIKE 'src/%'
    GROUP BY dna_json
    HAVING instance_count > 3
    ORDER BY instance_count DESC
    LIMIT 10
  `).all();

  return duplicates.map(d => {
    let fingerprint = 'unknown';
    try {
      const dna = JSON.parse(d.dna_json);
      fingerprint = dna.semanticFingerprint || dna.fingerprint || 'unknown';
    } catch { /* ignore */ }

    const files = (d.sample_files || '').split(',').slice(0, 5);
    const severity = d.instance_count > 20 ? 'high' : d.instance_count > 10 ? 'medium' : 'low';

    return {
      type: 'duplication',
      severity,
      fingerprint,
      instances: d.instance_count,
      sampleFiles: files,
      message: `Duplicación ${severity}: ${d.instance_count} instancias de "${fingerprint}"`,
      suggestion: 'consolidate_conceptual_cluster'
    };
  });
}

/**
 * Detecta familias candidatas a folderización
 */
function detectFolderizationCandidates(repo) {
  const candidates = repo.db.prepare(`
    SELECT
      SUBSTR(path, 1, LENGTH(path) - LENGTH(SUBSTR(path, INSTR(REVERSE(path), '/')))) as directory,
      COUNT(*) as file_count,
      SUM(total_lines) as total_lines
    FROM files
    WHERE path LIKE 'src/%'
      AND path LIKE '%.js'
      AND (is_removed IS NULL OR is_removed = 0)
      AND path NOT LIKE '%/index.js'
    GROUP BY directory
    HAVING file_count >= 3 AND total_lines > 200
    ORDER BY file_count DESC, total_lines DESC
    LIMIT 15
  `).all();

  return candidates.map(c => {
    const severity = c.file_count >= 5 ? 'high' : c.file_count >= 4 ? 'medium' : 'low';
    return {
      type: 'folderization_candidate',
      severity,
      directory: c.directory,
      fileCount: c.file_count,
      totalLines: c.total_lines,
      message: `Candidato ${severity}: ${c.directory} (${c.file_count} archivos, ${c.total_lines}L)`,
      suggestion: 'folderize_family'
    };
  });
}

/**
 * Detecta deuda de naming (archivos con prefijos repetidos en mismo directorio)
 */
function detectNamingDebt(repo) {
  const namingIssues = repo.db.prepare(`
    SELECT
      path,
      SUBSTR(path, INSTR(REVERSE(path), '/') * -1 + LENGTH(path)) as filename,
      SUBSTR(path, 1, LENGTH(path) - LENGTH(SUBSTR(path, INSTR(REVERSE(path), '/')))) as directory,
      total_lines
    FROM files
    WHERE path LIKE 'src/%'
      AND path LIKE '%.js'
      AND (is_removed IS NULL OR is_removed = 0)
      AND (
        filename LIKE '%-helpers.js'
        OR filename LIKE '%-core.js'
        OR filename LIKE '%-models.js'
        OR filename LIKE '%-analysis.js'
        OR filename LIKE '%-utils.js'
        OR filename LIKE '%-validation.js'
      )
    ORDER BY total_lines DESC
    LIMIT 20
  `).all();

  return namingIssues.map(n => {
    const basePrefix = n.filename.split('-')[0] || '';
    return {
      type: 'naming_debt',
      severity: 'low',
      file: n.path,
      filename: n.filename,
      directory: n.directory,
      prefix: basePrefix,
      lines: n.total_lines,
      message: `Nombre largo: ${n.filename} (${n.total_lines}L)`,
      suggestion: `rename_folderized_family para acortar basename`
    };
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// HANDLER PRINCIPAL
// ─────────────────────────────────────────────────────────────────────────────

export async function detect_folderization_opportunities(args, context) {
  const {
    monolithThreshold = 300,
    includeDuplicates = true,
    includeMonoliths = true,
    includeFolderization = true,
    includeNaming = true,
    limit = 20
  } = args;

  const projectPath = context?.projectPath || process.cwd();

  try {
    const repo = getRepository(projectPath);
    if (!repo?.db) {
      return { success: false, error: 'Repository not available' };
    }

    const alerts = [];

    if (includeMonoliths) {
      logger.info('[Detect] Scanning for monoliths...');
      alerts.push(...detectMonoliths(repo, monolithThreshold));
    }

    if (includeDuplicates) {
      logger.info('[Detect] Scanning for duplication...');
      alerts.push(...detectDuplication(repo));
    }

    if (includeFolderization) {
      logger.info('[Detect] Scanning for folderization candidates...');
      alerts.push(...detectFolderizationCandidates(repo));
    }

    if (includeNaming) {
      logger.info('[Detect] Scanning for naming debt...');
      alerts.push(...detectNamingDebt(repo));
    }

    const summary = {
      total: alerts.length,
      byType: {
        monolith: alerts.filter(a => a.type === 'monolith').length,
        duplication: alerts.filter(a => a.type === 'duplication').length,
        folderization_candidate: alerts.filter(a => a.type === 'folderization_candidate').length,
        naming_debt: alerts.filter(a => a.type === 'naming_debt').length
      },
      bySeverity: {
        high: alerts.filter(a => a.severity === 'high').length,
        medium: alerts.filter(a => a.severity === 'medium').length,
        low: alerts.filter(a => a.severity === 'low').length
      }
    };

    logger.info(`[Detect] Complete: ${summary.total} alerts (${JSON.stringify(summary.byType)})`);

    return {
      success: true,
      mode: 'detection_only',
      summary,
      alerts: alerts.slice(0, limit),
      timestamp: new Date().toISOString()
    };

  } catch (error) {
    logger.error(`[Detect] Failed: ${error.message}`);
    return { success: false, error: error.message };
  }
}

export default { detect_folderization_opportunities };