/**
 * @fileoverview duplicate-risk.js
 *
 * Detecta riesgo de símbolos duplicados tras creación/modificación.
 * Usa comparación de DNA hash para encontrar duplicados lógicos.
 *
 * @module core/file-watcher/guards/duplicate-risk
 * @version 2.0.0 - Estandarizado
 */

import { persistWatcherIssue, clearWatcherIssue } from '../watcher-issue-persistence.js';
import { createLogger } from '../../../utils/logger.js';
import {
    IssueDomains,
    createIssueType,
    createStandardContext,
    StandardSuggestions,
    isLowSignalName
} from './guard-standards.js';
import {
    buildDuplicateKeyFromDna,
    getDuplicateKeySql,
    normalizeDnaValue
} from '#layer-c/storage/repository/utils/duplicate-dna.js';

const logger = createLogger('OmnySys:file-watcher:guards:duplicate');
const DUPLICATE_KEY_SQL = getDuplicateKeySql('a.dna_json');

function getAtomType(atom = {}) {
    return atom.type || atom.atom_type || null;
}

function getLinesOfCode(atom = {}) {
    return atom.lines_of_code || atom.linesOfCode || atom.loc || 0;
}

/**
 * Genera nombres alternativos para evitar colisiones
 */
function generateAlternativeNames(originalName) {
    const alternatives = [];
    const suffixes = ['New', 'V2', 'Ext', 'Impl', 'Async'];
    
    for (const suffix of suffixes) {
        alternatives.push(`${originalName}${suffix}`);
    }
    
    const prefixes = ['fetch', 'load', 'build', 'compute', 'process'];
    const lowerName = originalName.toLowerCase();
    
    for (const prefix of prefixes) {
        if (lowerName.startsWith(prefix)) {
            const rest = originalName.slice(prefix.length);
            const altPrefixes = prefixes.filter(p => p !== prefix);
            for (const altPrefix of altPrefixes.slice(0, 2)) {
                alternatives.push(`${altPrefix}${rest}`);
            }
            break;
        }
    }
    
    return alternatives.slice(0, 5);
}

/**
 * Detecta riesgo de duplicados por DNA hash
 * @param {string} rootPath - Ruta raíz del proyecto
 * @param {string} filePath - Archivo analizado
 * @param {Object} EventEmitterContext - Contexto para emitir eventos
 * @param {Object} options - Opciones de configuración
 * @returns {Promise<Array<Object>>} Findings detectados
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
            localAtoms = providedAtoms
                .map((atom) => ({
                    id: atom.id,
                    name: atom.name,
                    dna_json: normalizeDnaValue(atom),
                    duplicate_key: buildDuplicateKeyFromDna(atom.dna ?? atom.dnaJson ?? atom.dna_json),
                    atom_type: getAtomType(atom),
                    lines_of_code: getLinesOfCode(atom),
                    isRemoved: Boolean(atom.isRemoved || atom.is_removed),
                    isDeadCode: Boolean(atom.isDeadCode || atom.is_dead_code)
                }))
                .filter((atom) => atom.dna_json)
                .filter((atom) => atom.duplicate_key)
                .filter((atom) => ['function', 'method', 'arrow', 'class'].includes(atom.atom_type))
                .filter((atom) => !atom.isRemoved && !atom.isDeadCode)
                .filter((atom) => !minLinesOfCode || atom.lines_of_code >= minLinesOfCode);
        } else {
            localAtoms = repo.db.prepare(`
                SELECT id, name, dna_json, lines_of_code,
                       ${DUPLICATE_KEY_SQL} AS duplicate_key
                FROM atoms
                WHERE a.file_path = ?
                    AND dna_json IS NOT NULL AND dna_json != '' AND dna_json != 'null'
                    AND a.atom_type IN ('function', 'method', 'arrow', 'class')
                    AND (a.lines_of_code IS NULL OR a.lines_of_code >= ?)
                    AND (a.is_removed IS NULL OR a.is_removed = 0)
                    AND (a.is_dead_code IS NULL OR a.is_dead_code = 0)
                LIMIT ?
            `.replaceAll('FROM atoms', 'FROM atoms a')).all(filePath, minLinesOfCode, maxFindings * 4);
        }

        if (localAtoms.length === 0) {
            await clearWatcherIssue(rootPath, filePath, 'code_duplicate_high');
            await clearWatcherIssue(rootPath, filePath, 'code_duplicate_medium');
            return [];
        }

        const candidateDnas = localAtoms
            .filter(a => a.name && !isLowSignalName(a.name))
            .map(a => a.duplicate_key)
            .filter(Boolean);

        if (candidateDnas.length === 0) {
            await clearWatcherIssue(rootPath, filePath, 'code_duplicate_high');
            await clearWatcherIssue(rootPath, filePath, 'code_duplicate_medium');
            return [];
        }

        const placeholders = candidateDnas.map(() => '?').join(',');
        const duplicateRows = repo.db.prepare(`
            SELECT a.name, a.file_path, a.dna_json, a.line_start,
                   ${DUPLICATE_KEY_SQL} AS duplicate_key
            FROM atoms a
            WHERE (${DUPLICATE_KEY_SQL}) IN (${placeholders})
                AND a.file_path != ?
                AND a.atom_type IN ('function', 'method', 'arrow', 'class')
                AND a.file_path NOT LIKE '%.test.js'
                AND a.file_path NOT LIKE '%.spec.js'
                AND a.file_path NOT LIKE '%/test/%'
                AND a.file_path NOT LIKE '%/tests/%'
                AND (a.is_removed IS NULL OR a.is_removed = 0)
                AND (a.is_dead_code IS NULL OR a.is_dead_code = 0)
            ORDER BY a.dna_json, a.file_path
        `).all(...candidateDnas, filePath);

        if (duplicateRows.length === 0) {
            await clearWatcherIssue(rootPath, filePath, 'code_duplicate_high');
            await clearWatcherIssue(rootPath, filePath, 'code_duplicate_medium');
            return [];
        }

        const byDna = new Map();
        for (const row of duplicateRows) {
            if (!byDna.has(row.duplicate_key)) byDna.set(row.duplicate_key, []);
            byDna.get(row.duplicate_key).push(row);
        }

        const localDnaToName = new Map(localAtoms.map(a => [a.duplicate_key, a.name]));
        const localDnaToId = new Map(localAtoms.map(a => [a.duplicate_key, a.id]));

        const findings = [];
        for (const [dna, remoteAtoms] of byDna) {
            const symbolName = localDnaToName.get(dna) || remoteAtoms[0]?.name || '?';
            const localAtomId = localDnaToId.get(dna);
            const uniqueFiles = [...new Set(remoteAtoms.map(a => a.file_path))];
            const totalInstances = remoteAtoms.length + 1;
            
            findings.push({
                symbol: symbolName,
                atomId: localAtomId,
                duplicateType: 'LOGIC_DUPLICATE',
                totalInstances,
                duplicateFiles: uniqueFiles,
                sample: uniqueFiles.slice(0, 3),
                dnaSimilarity: 'identical',
                suggestedAlternatives: generateAlternativeNames(symbolName)
            });

            if (findings.length >= maxFindings) break;
        }

        if (findings.length > 0) {
            const preview = findings
                .map(f => `${f.symbol}(${f.totalInstances})`)
                .join(', ');

            const severity = findings.length >= 3 ? 'high' : 'medium';
            const issueType = createIssueType(IssueDomains.CODE, 'duplicate', severity);

            logger.warn(
                `[DUPLICATE GUARD] ${filePath}: ${findings.length} duplicated symbol(s) -> ${preview}`
            );

            // Crear contexto estandarizado
            const context = createStandardContext({
                guardName: 'duplicate-risk-guard',
                severity,
                suggestedAction: findings.length >= 3 
                    ? StandardSuggestions.DUPLICATE_REUSE + ' (multiple duplicates detected)'
                    : StandardSuggestions.DUPLICATE_REUSE,
                suggestedAlternatives: findings.map(f => 
                    `Consider reusing '${f.symbol}' or rename to: ${f.suggestedAlternatives.slice(0, 3).join(', ')}`
                ),
                relatedFiles: findings.flatMap(f => f.duplicateFiles).filter((v, i, a) => a.indexOf(v) === i),
                extraData: {
                    duplicateCount: findings.length,
                    findings: findings.slice(0, maxFindings)
                }
            });

            await persistWatcherIssue(
                rootPath,
                filePath,
                issueType,
                severity,
                `${findings.length} duplicate symbol(s): ${preview}`,
                context
            );

            // Limpiar severidad opuesta
            if (severity === 'high') {
                await clearWatcherIssue(rootPath, filePath, 'code_duplicate_medium');
            } else {
                await clearWatcherIssue(rootPath, filePath, 'code_duplicate_high');
            }

            EventEmitterContext.emit('code:duplicate', {
                filePath,
                severity,
                duplicateCount: findings.length,
                findings: findings.map(f => ({
                    symbol: f.symbol,
                    instances: f.totalInstances,
                    files: f.duplicateFiles.length
                }))
            });
        } else {
            await clearWatcherIssue(rootPath, filePath, 'code_duplicate_high');
            await clearWatcherIssue(rootPath, filePath, 'code_duplicate_medium');
        }

        return findings;

    } catch (error) {
        logger.debug(`[DUPLICATE GUARD SKIP] ${filePath}: ${error.message}`);
        return [];
    }
}

export default detectDuplicateRisk;
