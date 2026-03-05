import { persistWatcherIssue, clearWatcherIssue } from '../watcher-issue-persistence.js';
import { createLogger } from '../../../utils/logger.js';
const logger = createLogger('OmnySys:file-watcher:guards:duplicate');

const LOW_SIGNAL_NAME_REGEX = /^(anonymous(_\d+)?|.*_callback|describe_arg\d+|it_arg\d+|on_arg\d+|then_callback|catch_callback|map_callback|filter_callback|some_callback|get_arg\d+)$/i;

function isLowSignalAtomName(name) {
    return LOW_SIGNAL_NAME_REGEX.test(name);
}

/**
 * Detecta riesgo de simbolos duplicados tras una creacion/modificacion.
 * Usa dos niveles de análisis:
 * 1. Nombre: coincidencias en otros archivos
 * 2. DNA hash: si el nombre está en la whitelist de nombres comunes,
 *    solo se reporta si el dna_json es similar (duplicación lógica real).
 * El resultado aparece en _recentErrors en la siguiente tool call.
 */
export async function detectDuplicateRisk(rootPath, filePath, EventEmitterContext, options = {}) {
    const {
        maxFindings = 8,
        minLinesOfCode = 4,
        atoms: providedAtoms = null
    } = options;

    try {
        const { getRepository } = await import('#layer-c/storage/repository/index.js');
        const repo = getRepository(rootPath);
        if (!repo?.db) return [];

        let localAtoms;

        if (providedAtoms && Array.isArray(providedAtoms)) {
            // Use in-memory atoms (structural scan results)
            localAtoms = providedAtoms
                .filter(a => a.dna_json && a.dna_json !== 'null')
                .filter(a => ['function', 'method', 'arrow', 'class'].includes(a.type || a.atom_type))
                .filter(a => !minLinesOfCode || (a.lines_of_code || a.loc || 0) >= minLinesOfCode)
                .map(a => ({
                    name: a.name,
                    dna_json: a.dna_json,
                    lines_of_code: a.lines_of_code || a.loc || 0
                }));
        } else {
            // Fallback to database
            localAtoms = repo.db.prepare(`
              SELECT name, dna_json, lines_of_code
              FROM atoms
              WHERE file_path = ?
                AND dna_json IS NOT NULL AND dna_json != '' AND dna_json != 'null'
                AND atom_type IN ('function', 'method', 'arrow', 'class')
                AND (lines_of_code IS NULL OR lines_of_code >= ?)
                AND (is_removed IS NULL OR is_removed = 0)
                AND (is_dead_code IS NULL OR is_dead_code = 0)
              LIMIT ?
            `).all(filePath, minLinesOfCode, maxFindings * 4);
        }

        if (localAtoms.length === 0) {
            await clearWatcherIssue(rootPath, filePath, 'watcher_duplicate_risk');
            return [];
        }

        const candidateDnas = localAtoms
            .filter(a => a.name && !isLowSignalAtomName(a.name))
            .map(a => a.dna_json);

        if (candidateDnas.length === 0) {
            await clearWatcherIssue(rootPath, filePath, 'watcher_duplicate_risk');
            return [];
        }

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
            await clearWatcherIssue(rootPath, filePath, 'watcher_duplicate_risk');
            return [];
        }

        const byDna = new Map();
        for (const row of duplicateRows) {
            if (!byDna.has(row.dna_json)) byDna.set(row.dna_json, []);
            byDna.get(row.dna_json).push(row);
        }

        const localDnaToName = new Map(localAtoms.map(a => [a.dna_json, a.name]));

        const findings = [];
        for (const [dna, remoteAtoms] of byDna) {
            const symbolName = localDnaToName.get(dna) || remoteAtoms[0]?.name || '?';
            const uniqueFiles = [...new Set(remoteAtoms.map(a => a.file_path))];

            findings.push({
                symbol: symbolName,
                duplicateType: 'LOGIC_DUPLICATE',
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
                rootPath,
                filePath,
                'watcher_duplicate_risk',
                severity,
                `Duplicate risk (${findings.length} symbols): ${preview}`,
                {
                    duplicateCount: findings.length,
                    findings: findings.slice(0, maxFindings)
                }
            );

            EventEmitterContext.emit('duplicate:risk', { filePath, findings });
        } else {
            await clearWatcherIssue(rootPath, filePath, 'watcher_duplicate_risk');
        }

        return findings;
    } catch (error) {
        logger.debug(`[DUPLICATE GUARD SKIP] ${filePath}: ${error.message}`);
        return [];
    }
}
