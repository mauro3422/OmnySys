/**
 * @fileoverview unified-duplicate-guard.js
 *
 * Guard unificado que coordina detección de duplicados estructurales (DNA)
 * y conceptuales (semantic fingerprint) en una sola ejecución.
 *
 * Proporciona:
 * - Detección coordinada de ambos tipos de duplicados
 * - Priorización inteligente (structural primero)
 * - Tracking unificado de deuda técnica
 * - Remediation plan combinado
 *
 * @module core/file-watcher/guards/unified-duplicate-guard
 */

import { persistWatcherIssue, clearWatcherIssue } from '../watcher-issue-persistence.js';
import { createLogger } from '../../../utils/logger.js';
import {
    IssueDomains,
    createIssueType,
    createStandardContext,
    StandardSuggestions
} from './guard-standards.js';
import {
    generateAlternativeNames,
    normalizeFilePath,
    loadPreviousFindings,
    buildDuplicateDebtHistory,
    buildDuplicateContext,
    coordinateDuplicateFindings
} from '../../../shared/compiler/duplicate-utils.js';
import { buildDuplicateRemediationPlan } from '../../../shared/compiler/index.js';

const logger = createLogger('OmnySys:file-watcher:guards:unified-duplicate');

/**
 * Ejecuta ambos guards (structural + conceptual) y coordina resultados
 * @param {string} rootPath - Ruta raíz del proyecto
 * @param {string} filePath - Archivo analizado
 * @param {Object} EventEmitterContext - Contexto para emitir eventos
 * @param {Object} options - Opciones de configuración
 * @returns {Promise<Object>} Resultados coordinados de ambos guards
 */
export async function detectUnifiedDuplicateRisk(rootPath, filePath, EventEmitterContext, options = {}) {
    const {
        maxFindings = 10,
        minLinesOfCode = 3,
        atoms: providedAtoms = null,
        enableStructural = true,
        enableConceptual = true
    } = options;

    // Normalizar filePath
    const normalizedFilePath = normalizeFilePath(filePath);

    logger.warn(`[UNIFIED DUPLICATE GUARD] STARTING for ${normalizedFilePath}`);

    try {
        const { getRepository } = await import('#layer-c/storage/repository/index.js');
        const repo = getRepository(rootPath);

        if (!repo?.db) {
            logger.warn(`[UNIFIED DUPLICATE GUARD] No repo/db, returning empty`);
            return { structural: [], conceptual: [], coordinated: null };
        }

        // Cargar findings previos para tracking de historial
        const previousFindings = loadPreviousFindings(repo.db, normalizedFilePath, 'code_%duplicate');

        // Ejecutar guards en paralelo si ambos están habilitados
        const structuralPromise = enableStructural
            ? runStructuralDuplicateGuard(repo, normalizedFilePath, providedAtoms, { maxFindings, minLinesOfCode })
            : Promise.resolve([]);

        const conceptualPromise = enableConceptual
            ? runConceptualDuplicateGuard(repo, normalizedFilePath, { maxFindings, minLinesOfCode })
            : Promise.resolve([]);

        const [structuralFindings, conceptualFindings] = await Promise.all([
            structuralPromise,
            conceptualPromise
        ]);

        logger.warn(`[UNIFIED DUPLICATE GUARD] ${normalizedFilePath}: structural=${structuralFindings.length}, conceptual=${conceptualFindings.length}`);

        // Coordinar resultados
        const coordinated = coordinateDuplicateFindings(structuralFindings, conceptualFindings);

        // Calcular deuda técnica combinada
        const allFindings = [...structuralFindings, ...conceptualFindings];
        const debtHistory = buildDuplicateDebtHistory(normalizedFilePath, allFindings, previousFindings);

        // Persistir issue unificado si hay findings
        if (allFindings.length > 0) {
            await persistUnifiedFinding(
                rootPath,
                normalizedFilePath,
                coordinated,
                debtHistory,
                EventEmitterContext
            );
        } else {
            // Limpiar issues previos
            await clearWatcherIssue(rootPath, normalizedFilePath, 'code_duplicate_unified_high');
            await clearWatcherIssue(rootPath, normalizedFilePath, 'code_duplicate_unified_medium');
        }

        return {
            structural: structuralFindings,
            conceptual: conceptualFindings,
            coordinated,
            debtHistory,
            totalFindings: allFindings.length
        };

    } catch (error) {
        logger.error(`[UNIFIED DUPLICATE GUARD ERROR] ${normalizedFilePath}: ${error.message}`);
        console.error('[UNIFIED DUPLICATE GUARD ERROR]', error);
        return { structural: [], conceptual: [], coordinated: null, error: error.message };
    }
}

/**
 * Ejecuta guard de duplicados estructurales (DNA hash)
 */
async function runStructuralDuplicateGuard(repo, normalizedFilePath, providedAtoms, options) {
    const { maxFindings, minLinesOfCode } = options;

    try {
        const {
            buildDuplicateWhereSql,
            getDuplicateKeySqlForMode,
            normalizeDuplicateCandidateAtom,
            DUPLICATE_MODES
        } = await import('#layer-c/storage/repository/utils/index.js');

        const DUPLICATE_MODE = DUPLICATE_MODES.STRUCTURAL;
        const DUPLICATE_KEY_SQL = getDuplicateKeySqlForMode(DUPLICATE_MODE, 'a.dna_json');

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
            const rows = repo.db.prepare(`
                SELECT id, name, dna_json, lines_of_code,
                       ${DUPLICATE_KEY_SQL} AS duplicate_key
                FROM atoms a
                WHERE a.file_path = ?
                  AND a.atom_type IN ('function', 'method', 'arrow', 'class')
                  AND (a.is_removed IS NULL OR a.is_removed = 0)
                  AND (a.is_dead_code IS NULL OR a.is_dead_code = 0)
                  AND a.lines_of_code >= ?
                  AND a.dna_json IS NOT NULL
                LIMIT ?
            `).all(normalizedFilePath, minLinesOfCode, maxFindings * 4);

            localAtoms = rows;
        }

        if (localAtoms.length === 0) return [];

        const { isLowSignalName } = await import('./guard-standards.js');
        const candidateDnas = localAtoms
            .filter(a => a.name && !isLowSignalName(a.name))
            .map(a => a.duplicate_key)
            .filter(Boolean);

        if (candidateDnas.length === 0) return [];

        const placeholders = candidateDnas.map(() => '?').join(',');
        const duplicateRows = repo.db.prepare(`
            SELECT a.name, a.file_path, a.dna_json, a.line_start,
                   ${DUPLICATE_KEY_SQL} AS duplicate_key
            FROM atoms a
            WHERE (${DUPLICATE_KEY_SQL}) IN (${placeholders})
                AND a.file_path != ?
                AND a.atom_type IN ('function', 'method', 'arrow', 'class')
                AND (a.is_removed IS NULL OR a.is_removed = 0)
            ORDER BY a.dna_json, a.file_path
        `).all(...candidateDnas, normalizedFilePath);

        if (duplicateRows.length === 0) return [];

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

        return findings;
    } catch (error) {
        logger.debug(`[STRUCTURAL GUARD SKIP] ${normalizedFilePath}: ${error.message}`);
        return [];
    }
}

/**
 * Ejecuta guard de duplicados conceptuales (semantic fingerprint)
 */
async function runConceptualDuplicateGuard(repo, normalizedFilePath, options) {
    const { maxFindings, minLinesOfCode } = options;

    try {
        const { isLowSignalName } = await import('./guard-standards.js');

        // Obtener átomos locales con semanticFingerprint
        const rows = repo.db.prepare(`
            SELECT id, name, atom_type, lines_of_code, is_exported,
                   json_extract(dna_json, '$.semanticFingerprint') as semanticFingerprint
            FROM atoms
            WHERE file_path = ?
              AND atom_type IN ('function', 'method', 'arrow')
              AND (is_removed IS NULL OR is_removed = 0)
              AND lines_of_code >= ?
              AND json_extract(dna_json, '$.semanticFingerprint') IS NOT NULL
              AND json_extract(dna_json, '$.semanticFingerprint') != 'unknown:unknown:unknown'
        `).all(normalizedFilePath, minLinesOfCode);

        const localAtoms = rows.map(r => ({
            id: r.id,
            name: r.name,
            semanticFingerprint: r.semanticFingerprint,
            linesOfCode: r.lines_of_code,
            isExported: r.is_exported === 1
        }));

        if (localAtoms.length === 0) return [];

        const findings = [];

        for (const localAtom of localAtoms) {
            if (isLowSignalName(localAtom.name)) continue;

            const fp = localAtom.semanticFingerprint;
            if (fp.includes(':unknown') || fp.includes(':_callback') || fp.includes(':constructor')) {
                continue;
            }

            // Buscar otras funciones con mismo fingerprint
            const duplicates = repo.db.prepare(`
                SELECT a.name, a.file_path, a.lines_of_code, a.is_exported,
                       json_extract(a.dna_json, '$.structuralHash') as structuralHash
                FROM atoms a
                WHERE a.file_path != ?
                  AND json_extract(a.dna_json, '$.semanticFingerprint') = ?
                  AND a.atom_type IN ('function', 'method', 'arrow')
                  AND (a.is_removed IS NULL OR a.is_removed = 0)
                  AND (a.is_dead_code IS NULL OR a.is_dead_code = 0)
                ORDER BY a.file_path
                LIMIT 10
            `).all(normalizedFilePath, fp);

            if (duplicates.length === 0) continue;

            // Verificar variación estructural
            const localStructuralHash = repo.db.prepare(`
                SELECT json_extract(dna_json, '$.structuralHash') as sh
                FROM atoms WHERE id = ?
            `).get(localAtom.id)?.sh;

            const structuralVariants = duplicates.filter(d => d.structuralHash !== localStructuralHash);

            if (structuralVariants.length === 0) continue;

            const uniqueFiles = [...new Set(structuralVariants.map(d => d.file_path))];

            findings.push({
                symbol: localAtom.name,
                atomId: localAtom.id,
                semanticFingerprint: fp,
                duplicateType: 'CONCEPTUAL_DUPLICATE',
                totalInstances: structuralVariants.length + 1,
                duplicateFiles: uniqueFiles,
                duplicateNames: [...new Set(structuralVariants.map(d => d.name))],
                sample: uniqueFiles.slice(0, 3),
                isExported: localAtom.isExported,
                existingExports: structuralVariants.filter(d => d.is_exported).length,
                suggestedAlternatives: generateAlternativeNames(localAtom.name, structuralVariants[0]?.name)
            });

            if (findings.length >= maxFindings) break;
        }

        return findings;
    } catch (error) {
        logger.debug(`[CONCEPTUAL GUARD SKIP] ${normalizedFilePath}: ${error.message}`);
        return [];
    }
}

/**
 * Persiste finding unificado con coordenación y deuda técnica
 */
async function persistUnifiedFinding(rootPath, normalizedFilePath, coordinated, debtHistory, EventEmitterContext) {
    const allFindings = [...coordinated.structural, ...coordinated.conceptual];

    // Determinar severidad basada en coordinación
    let severity = 'medium';
    let issueTypeLabel = 'duplicate_unified';

    if (coordinated.hasOverlap) {
        severity = 'high';
        issueTypeLabel = 'duplicate_unified_critical';
    } else if (coordinated.structural.length >= 3 || allFindings.length >= 5) {
        severity = 'high';
    }

    const issueType = createIssueType(IssueDomains.CODE, issueTypeLabel, severity);

    // Generar remediation plan combinado
    const remediationPlan = buildDuplicateRemediationPlan(allFindings.map(f => ({
        groupSize: f.totalInstances,
        urgencyScore: f.totalInstances,
        instances: [{
            name: f.symbol,
            file: normalizedFilePath,
            importanceScore: 0,
            callerCount: 0,
            changeFrequency: 0
        }, ...f.duplicateFiles.map(dupFile => ({
            name: f.symbol,
            file: dupFile,
            importanceScore: 0,
            callerCount: 0,
            changeFrequency: 0
        }))]
    })));

    const preview = allFindings
        .map(f => `${f.symbol}(${f.duplicateType}:${f.totalInstances})`)
        .join(', ');

    logger.warn(
        `[UNIFIED DUPLICATE GUARD] ${normalizedFilePath}: ${allFindings.length} total -> ${preview} | Debt: ${debtHistory.debt.level} (${debtHistory.debt.score}/100, ${debtHistory.debt.trend})`
    );

    // Crear contexto enriquecido
    const enrichedContext = buildDuplicateContext(allFindings, debtHistory);
    const context = createStandardContext({
        guardName: 'unified-duplicate-risk-guard',
        severity,
        suggestedAction: coordinated.hasOverlap
            ? 'CRITICAL: Same symbols have both structural and conceptual duplicates. Immediate refactoring required.'
            : coordinated.structural.length > 0
                ? StandardSuggestions.DUPLICATE_REUSE + ' (structural duplicates detected)'
                : StandardSuggestions.DUPLICATE_REUSE + ' (conceptual duplicates detected)',
        suggestedAlternatives: remediationPlan.items.flatMap(item => item.recommendedActions).slice(0, 8),
        relatedFiles: allFindings.flatMap(f => f.duplicateFiles).filter((v, i, a) => a.indexOf(v) === i),
        extraData: {
            totalDuplicateCount: allFindings.length,
            structuralCount: coordinated.structural.length,
            conceptualCount: coordinated.conceptual.length,
            hasOverlap: coordinated.hasOverlap,
            overlapDetails: coordinated.overlapDetails,
            priority: coordinated.priority,
            combinedRemediation: coordinated.combinedRemediation,
            findings: allFindings.slice(0, 10),
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
        `${allFindings.length} duplicate(s): ${preview}`,
        context
    );

    // Limpiar severidad opuesta
    if (severity === 'high') {
        await clearWatcherIssue(rootPath, normalizedFilePath, 'code_duplicate_unified_medium');
    } else {
        await clearWatcherIssue(rootPath, normalizedFilePath, 'code_duplicate_unified_high');
    }

    // Emitir evento
    EventEmitterContext.emit('code:duplicate_unified', {
        filePath: normalizedFilePath,
        severity,
        totalDuplicateCount: allFindings.length,
        structuralCount: coordinated.structural.length,
        conceptualCount: coordinated.conceptual.length,
        hasOverlap: coordinated.hasOverlap,
        debtScore: debtHistory.debt.score,
        debtTrend: debtHistory.debt.trend,
        findings: allFindings.map(f => ({
            symbol: f.symbol,
            type: f.duplicateType,
            instances: f.totalInstances,
            files: f.duplicateFiles.length
        }))
    });
}

export default detectUnifiedDuplicateRisk;
