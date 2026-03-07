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
    buildDuplicateWhereSql,
    getDuplicateKeySqlForMode,
    normalizeDuplicateCandidateAtom,
    DUPLICATE_MODES
} from '#layer-c/storage/repository/utils/index.js';
import { buildDuplicateRemediationPlan } from '../../../shared/compiler/index.js';
import {
    generateAlternativeNames,
    normalizeFilePath,
    loadPreviousFindings,
    buildDuplicateDebtHistory,
    buildDuplicateContext,
    coordinateDuplicateFindings
} from '../../../shared/compiler/duplicate-utils.js';

const logger = createLogger('OmnySys:file-watcher:guards:duplicate');
const DUPLICATE_MODE = DUPLICATE_MODES.STRUCTURAL;
const DUPLICATE_KEY_SQL = getDuplicateKeySqlForMode(DUPLICATE_MODE, 'a.dna_json');

function loadPersistedLocalAtoms(repo, filePath, minLinesOfCode, maxFindings) {
    return repo.db.prepare(`
        SELECT id, name, dna_json, lines_of_code,
               ${DUPLICATE_KEY_SQL} AS duplicate_key
        FROM atoms
        ${buildDuplicateWhereSql({
            alias: 'a',
            minLines: minLinesOfCode,
            requireValidDna: true
        })} AND a.file_path = ?
        LIMIT ?
    `.replaceAll('FROM atoms', 'FROM atoms a')).all(filePath, maxFindings * 4);
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

    // Normalizar filePath
    const normalizedFilePath = normalizeFilePath(filePath);

    try {
        const { getRepository } = await import('#layer-c/storage/repository/index.js');
        const repo = getRepository(rootPath);
        if (!repo?.db) return [];

        // Cargar findings previos para tracking de historial
        const previousFindings = loadPreviousFindings(repo.db, normalizedFilePath, 'code_duplicate');

        let localAtoms = [];

        if (providedAtoms && Array.isArray(providedAtoms)) {
            localAtoms = providedAtoms
                .map((atom) => normalizeDuplicateCandidateAtom(atom, {
                    mode: DUPLICATE_MODE,
                    minLines: minLinesOfCode,
                    requireDna: true
                }))
                .filter(Boolean);
        }

        if (localAtoms.length === 0) {
            localAtoms = loadPersistedLocalAtoms(repo, normalizedFilePath, minLinesOfCode, maxFindings);
        }

        if (localAtoms.length === 0) {
            await clearWatcherIssue(rootPath, normalizedFilePath, 'code_duplicate_high');
            await clearWatcherIssue(rootPath, normalizedFilePath, 'code_duplicate_medium');
            return [];
        }

        const candidateDnas = localAtoms
            .filter(a => a.name && !isLowSignalName(a.name))
            .map(a => a.duplicate_key)
            .filter(Boolean);

        if (candidateDnas.length === 0) {
            await clearWatcherIssue(rootPath, normalizedFilePath, 'code_duplicate_high');
            await clearWatcherIssue(rootPath, normalizedFilePath, 'code_duplicate_medium');
            return [];
        }

        const placeholders = candidateDnas.map(() => '?').join(',');
        const duplicateRows = repo.db.prepare(`
            SELECT a.name, a.file_path, a.dna_json, a.line_start,
                   ${DUPLICATE_KEY_SQL} AS duplicate_key
            FROM atoms a
            WHERE (${DUPLICATE_KEY_SQL}) IN (${placeholders})
                AND a.file_path != ?
                AND ${buildDuplicateWhereSql({
                    alias: 'a',
                    requireValidDna: false
                }).replace(/^WHERE /, '').replace(/\n/g, '\n                AND ')}
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
                dnaSimilarity: 'structural',
                suggestedAlternatives: generateAlternativeNames(symbolName)
            });

            if (findings.length >= maxFindings) break;
        }

        if (findings.length > 0) {
            const remediationPlan = buildDuplicateRemediationPlan(findings.map((finding) => ({
                groupSize: finding.totalInstances,
                urgencyScore: finding.totalInstances,
                instances: [{
                    name: finding.symbol,
                    file: normalizedFilePath,
                    importanceScore: 0,
                    callerCount: 0,
                    changeFrequency: 0
                }, ...finding.duplicateFiles.map((duplicateFile) => ({
                    name: finding.symbol,
                    file: duplicateFile,
                    importanceScore: 0,
                    callerCount: 0,
                    changeFrequency: 0
                }))]
            })));
            const preview = findings
                .map(f => `${f.symbol}(${f.totalInstances})`)
                .join(', ');

            const severity = findings.length >= 3 ? 'high' : 'medium';
            const issueType = createIssueType(IssueDomains.CODE, 'duplicate', severity);

            // Construir historial de deuda técnica
            const debtHistory = buildDuplicateDebtHistory(normalizedFilePath, findings, previousFindings);

            logger.warn(
                `[DUPLICATE GUARD] ${normalizedFilePath}: ${findings.length} duplicated symbol(s) -> ${preview} | Debt: ${debtHistory.debt.level} (${debtHistory.debt.score}/100, ${debtHistory.debt.trend})`
            );

            // Crear contexto estandarizado con historial de deuda
            const enrichedContext = buildDuplicateContext(findings, debtHistory);
            const context = createStandardContext({
                guardName: 'duplicate-risk-guard',
                severity,
                suggestedAction: findings.length >= 3
                    ? StandardSuggestions.DUPLICATE_REUSE + ' (multiple duplicates detected)'
                    : StandardSuggestions.DUPLICATE_REUSE,
                suggestedAlternatives: remediationPlan.items.flatMap((item) => item.recommendedActions).slice(0, 6),
                relatedFiles: findings.flatMap(f => f.duplicateFiles).filter((v, i, a) => a.indexOf(v) === i),
                extraData: {
                    duplicateCount: findings.length,
                    findings: findings.slice(0, maxFindings),
                    remediation: remediationPlan,
                    debtHistory: enrichedContext.debtHistory,
                    recommendations: enrichedContext.recommendations
                }
            });

            await persistWatcherIssue(
                rootPath,
                normalizedFilePath,
                issueType,
                severity,
                `${findings.length} duplicate symbol(s): ${preview}`,
                context
            );

            // Limpiar severidad opuesta
            if (severity === 'high') {
                await clearWatcherIssue(rootPath, normalizedFilePath, 'code_duplicate_medium');
            } else {
                await clearWatcherIssue(rootPath, normalizedFilePath, 'code_duplicate_high');
            }

            EventEmitterContext.emit('code:duplicate', {
                filePath: normalizedFilePath,
                severity,
                duplicateCount: findings.length,
                findings: findings.map(f => ({
                    symbol: f.symbol,
                    instances: f.totalInstances,
                    files: f.duplicateFiles.length
                }))
            });
        } else {
            await clearWatcherIssue(rootPath, normalizedFilePath, 'code_duplicate_high');
            await clearWatcherIssue(rootPath, normalizedFilePath, 'code_duplicate_medium');
        }

        return findings;

    } catch (error) {
        logger.debug(`[DUPLICATE GUARD SKIP] ${filePath}: ${error.message}`);
        return [];
    }
}

export default detectDuplicateRisk;
