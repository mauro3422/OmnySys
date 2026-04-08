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
import { analyzeCoupling } from '../../../shared/compiler/index.js';

const logger = createLogger('OmnySys:mcp:detect_folderization_opportunities');

// ─────────────────────────────────────────────────────────────────────────────
// DETECTORES
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Detecta archivos monolíticos (>= threshold líneas)
 * Excluye barrel/coordinator files que tienen una carpeta folderizada hermana
 * con el mismo nombre (son archivos delegadores, no implementaciones).
 */
function detectMonoliths(repo, threshold = 300) {
  if (!repo?.db) return [];
  try {
    // Primero obtenemos todos los candidatos
    const candidates = repo.db.prepare(`
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
      LIMIT 50
    `).all(threshold);

    // Filtramos los que son barrels de familias folderizadas
    const monoliths = [];
    for (const c of candidates) {
      // Un barrel folderizado tiene: una carpeta hermana con el mismo nombre base
      // Y tiene atom_count = 0 o muy bajo comparado con total_lines
      const basePath = c.path.replace(/\.js$/, '');
      const hasSiblingFolder = repo.db.prepare(
        "SELECT 1 FROM files WHERE path LIKE ? || '/%' AND (is_removed IS NULL OR is_removed = 0) LIMIT 1"
      ).get(basePath);

      // Si tiene carpeta hermana y (no tiene átomos propios O tiene muy pocas líneas de código real)
      // es un barrel delegador, no un monolito real
      if (hasSiblingFolder && (c.atom_count === 0 || c.atom_count <= 5)) {
        continue; // Skip: es barrel folderizado
      }

      const severity = c.total_lines >= 600 ? 'high' : c.total_lines >= 400 ? 'medium' : 'low';
      monoliths.push({
        type: 'monolith',
        severity,
        file: c.path,
        lines: c.total_lines,
        atoms: c.atom_count,
        complexity: c.total_complexity,
        message: `Monolítico ${severity}: ${c.path} (${c.total_lines}L, ${c.atom_count} átomos)`,
        suggestion: 'split_large_file o folderize_family'
      });
    }

    return monoliths.slice(0, 20);
  } catch (error) {
    logger.warn(`[Detect] Could not scan monoliths: ${error.message}`);
    return [];
  }
}

/**
 * Detecta duplicación por ADN semántico
 */
function detectDuplication(repo) {
  if (!repo?.db) return [];
  try {
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
  } catch (error) {
    logger.warn(`[Detect] Could not scan duplication: ${error.message}`);
    return [];
  }
}

/**
 * Helper: Extrae directorio de un path (sin REVERSE)
 */
function extractDirectory(path) {
  const lastSlash = path.lastIndexOf('/');
  return lastSlash > 0 ? path.substring(0, lastSlash) : path;
}

/**
 * Helper: Extrae filename de un path (sin REVERSE)
 */
function extractFilename(path) {
  const lastSlash = path.lastIndexOf('/');
  return lastSlash >= 0 ? path.substring(lastSlash + 1) : path;
}

/**
 * Detecta familias candidatas a folderización
 */
function detectFolderizationCandidates(repo) {
  if (!repo?.db) return [];
  try {
    const allFiles = repo.db.prepare(`
      SELECT path, total_lines
      FROM files
      WHERE path LIKE 'src/%'
        AND path LIKE '%.js'
        AND (is_removed IS NULL OR is_removed = 0)
        AND path NOT LIKE '%/index.js'
    `).all();

    // Agrupar por directorio en JavaScript (evita REVERSE de SQLite)
    const dirMap = new Map();
    for (const file of allFiles) {
      const dir = extractDirectory(file.path);
      if (!dirMap.has(dir)) dirMap.set(dir, { directory: dir, fileCount: 0, totalLines: 0 });
      const entry = dirMap.get(dir);
      entry.fileCount++;
      entry.totalLines += file.total_lines || 0;
    }

    // Filtrar y ordenar
    const candidates = Array.from(dirMap.values())
      .filter(c => c.fileCount >= 3 && c.totalLines > 200)
      .sort((a, b) => b.fileCount - a.fileCount || b.totalLines - a.totalLines)
      .slice(0, 15);

    return candidates.map(c => {
      const severity = c.fileCount >= 5 ? 'high' : c.fileCount >= 4 ? 'medium' : 'low';
      return {
        type: 'folderization_candidate',
        severity,
        directory: c.directory,
        fileCount: c.fileCount,
        totalLines: c.totalLines,
        message: `Candidato ${severity}: ${c.directory} (${c.fileCount} archivos, ${c.totalLines}L)`,
        suggestion: 'folderize_family'
      };
    });
  } catch (error) {
    logger.warn(`[Detect] Could not scan folderization candidates: ${error.message}`);
    return [];
  }
}

/**
 * Detecta deuda de naming (archivos con prefijos repetidos en mismo directorio)
 */
function detectNamingDebt(repo) {
  if (!repo?.db) return [];
  try {
    const allFiles = repo.db.prepare(`
      SELECT path, total_lines
      FROM files
      WHERE path LIKE 'src/%'
        AND path LIKE '%.js'
        AND (is_removed IS NULL OR is_removed = 0)
    `).all();

    // Filtrar archivos con sufijos largos en JavaScript (evita REVERSE de SQLite)
    const namingPatterns = ['-helpers.js', '-core.js', '-models.js', '-analysis.js', '-utils.js', '-validation.js'];
    const namingIssues = allFiles
      .filter(f => namingPatterns.some(p => f.path.endsWith(p)))
      .map(f => ({
        path: f.path,
        filename: extractFilename(f.path),
        directory: extractDirectory(f.path),
        total_lines: f.total_lines
      }))
      .sort((a, b) => (b.total_lines || 0) - (a.total_lines || 0))
      .slice(0, 20);

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
  } catch (error) {
    logger.warn(`[Detect] Could not scan naming debt: ${error.message}`);
    return [];
  }
}

/**
 * Detecta acoplamiento alto en archivos
 * 
 * Usa analyzeCoupling para calcular métricas de acoplamiento
 * y generar sugerencias de refactorización.
 */
function detectHighCoupling(repo) {
  // Obtener archivos monolíticos (>300 líneas) que son candidatos a split
  let files;
  try {
    files = repo.db.prepare(`
      SELECT path, total_lines, atom_count
      FROM files
      WHERE path LIKE 'src/%'
        AND path LIKE '%.js'
        AND total_lines >= 300
        AND (is_removed IS NULL OR is_removed = 0)
      ORDER BY total_lines DESC
      LIMIT 10
    `).all();
  } catch (dbError) {
    logger.error(`[Detect] DB error querying files: ${dbError.message}`);
    return [];
  }

  const couplingAlerts = [];

  for (const file of files) {
    try {
      // Obtener átomos del archivo
      let atoms;
      try {
        atoms = repo.db.prepare(`
          SELECT id, name, atom_type, line_start, line_end, is_exported
          FROM atoms
          WHERE file_path = ? AND (is_removed IS NULL OR is_removed = 0)
        `).all(file.path);
      } catch (atomError) {
        logger.warn(`[Detect] Could not read atoms for ${file.path}: ${atomError.message}`);
        continue;
      }

      if (atoms.length < 5) continue;

      // Obtener call_graph del archivo
      let callGraph;
      try {
        callGraph = repo.db.prepare(`
          SELECT caller_name, callee_name
          FROM call_graph
          WHERE caller_file = ? AND callee_file = ?
        `).all(file.path, file.path);
      } catch (callGraphError) {
        logger.warn(`[Detect] Could not read call_graph for ${file.path}: ${callGraphError.message}`);
        continue;
      }

      // Enriquecer átomos con calls
      const callsByCaller = new Map();
      for (const rel of callGraph) {
        if (!callsByCaller.has(rel.caller_name)) {
          callsByCaller.set(rel.caller_name, []);
        }
        callsByCaller.get(rel.caller_name).push(rel.callee_name);
      }

      for (const atom of atoms) {
        atom.calls = callsByCaller.get(atom.name) || [];
      }

      // Analizar acoplamiento
      let coupling;
      try {
        coupling = analyzeCoupling(atoms);
      } catch (couplingError) {
        logger.warn(`[Detect] Could not analyze coupling for ${file.path}: ${couplingError.message}`);
        continue;
      }

      // Solo reportar si hay problemas
      if (!coupling.canSplit || coupling.couplingPercentage > 70) {
        const severity = coupling.couplingPercentage > 85 ? 'high' : coupling.couplingPercentage > 70 ? 'medium' : 'low';

        couplingAlerts.push({
          type: 'high_coupling',
          severity,
          file: file.path,
          lines: file.total_lines,
          atoms: file.atom_count,
          couplingPercentage: coupling.couplingPercentage,
          connectedAtoms: coupling.connectedAtoms,
          totalAtoms: coupling.totalAtoms,
          leafNodes: coupling.leafNodes,
          centralNodes: coupling.centralNodes,
          message: `Acoplamiento ${severity}: ${file.path} (${coupling.couplingPercentage}%, ${coupling.connectedAtoms}/${coupling.totalAtoms} átomos conectados)`,
          suggestion: coupling.canSplit
            ? 'split_large_file con extracción bottom-up'
            : 'Primero extraer hojas, luego re-evaluar',
          details: {
            leafNodesCount: coupling.leafNodes.length,
            centralNodesCount: coupling.centralNodes.length,
            topCentralNodes: coupling.centralNodes.slice(0, 3)
          }
        });
      }
    } catch (error) {
      // Ignorar errores de archivos individuales
      logger.warn(`[Detect] Could not analyze coupling for ${file.path}: ${error.message}`);
    }
  }

  return couplingAlerts;
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
    includeCoupling = true,
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

    if (includeCoupling) {
      logger.info('[Detect] Scanning for high coupling...');
      alerts.push(...detectHighCoupling(repo));
    }

    const summary = {
      total: alerts.length,
      byType: {
        monolith: alerts.filter(a => a.type === 'monolith').length,
        duplication: alerts.filter(a => a.type === 'duplication').length,
        folderization_candidate: alerts.filter(a => a.type === 'folderization_candidate').length,
        naming_debt: alerts.filter(a => a.type === 'naming_debt').length,
        high_coupling: alerts.filter(a => a.type === 'high_coupling').length
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