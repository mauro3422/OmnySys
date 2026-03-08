/**
 * @fileoverview conceptual-duplicate-risk.js
 *
 * Detecta duplicados conceptuales - funciones con mismo propósito semántico
 * pero diferentes implementaciones. Usa semanticFingerprint (verb:domain:entity)
 * para detectar "mirror atoms".
 *
 * @module core/file-watcher/guards/conceptual-duplicate-risk
 * @version 1.0.0
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
    generateAlternativeNames,
    normalizeFilePath,
    shouldIgnoreConceptualDuplicateFinding,
    loadPreviousFindings,
    buildDuplicateDebtHistory,
    buildDuplicateContext
} from '../../../shared/compiler/index.js';

const logger = createLogger('OmnySys:file-watcher:guards:conceptual-duplicate');

/**
 * Detecta duplicados conceptuales por semanticFingerprint
 * @param {string} rootPath - Ruta raíz del proyecto
 * @param {string} filePath - Archivo analizado
 * @param {Object} EventEmitterContext - Contexto para emitir eventos
 * @param {Object} options - Opciones de configuración
 * @returns {Promise<Array<Object>>} Findings detectados
 */
import { appendFileSync } from 'fs';

function debugLog(msg) {
    try {
        appendFileSync('C:/Dev/OmnySystem/logs/conceptual-guard-debug.log', `${new Date().toISOString()} ${msg}\n`);
    } catch (e) {}
}

export async function detectConceptualDuplicateRisk(rootPath, filePath, EventEmitterContext, options = {}) {
    // Normalizar filePath a forward slashes (la DB almacena con forward slashes)
    const normalizedFilePath = normalizeFilePath(filePath);

    debugLog(`ENTRY: ${normalizedFilePath}`);

    const {
        maxFindings = 5,
        minLinesOfCode = 3,
        atoms: providedAtoms = null
    } = options;

    debugLog(`STARTING for ${normalizedFilePath}, atoms: ${providedAtoms?.length || 'null'}`);

    try {
        const { getRepository } = await import('#layer-c/storage/repository/index.js');
        const repo = getRepository(rootPath);
        logger.warn(`[CONCEPTUAL DUPLICATE GUARD] repo=${repo}, db=${repo?.db}, filePath=${normalizedFilePath}`);
        if (!repo?.db) {
            logger.warn(`[CONCEPTUAL DUPLICATE GUARD] No repo/db, returning empty`);
            return [];
        }

        // Cargar findings previos para tracking de historial
        const previousFindings = loadPreviousFindings(repo.db, normalizedFilePath, 'code_conceptual_duplicate');

        // Obtener átomos locales del archivo - siempre consultar DB para tener semanticFingerprint
        // (providedAtoms no incluye la propiedad dna completa)
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

        logger.warn(`[CONCEPTUAL DUPLICATE GUARD] Found ${localAtoms.length} local atoms with fingerprint`);
        localAtoms.forEach(a => {
            logger.warn(`[CONCEPTUAL DUPLICATE GUARD]   - ${a.name}: fp=${a.semanticFingerprint}`);
        });

        if (localAtoms.length === 0) {
            await clearWatcherIssue(rootPath, normalizedFilePath, 'code_conceptual_duplicate_high');
            await clearWatcherIssue(rootPath, normalizedFilePath, 'code_conceptual_duplicate_medium');
            return [];
        }

        // Buscar duplicados conceptuales
        const findings = [];

        for (const localAtom of localAtoms) {
            // Ignorar nombres de baja señal (callbacks genéricos)
            if (isLowSignalName(localAtom.name)) continue;

            // Excluir entidades genéricas
            const fp = localAtom.semanticFingerprint;
            if (fp.includes(':unknown') || fp.includes(':_callback') || fp.includes(':constructor')) {
                continue;
            }
            if (shouldIgnoreConceptualDuplicateFinding(normalizedFilePath, localAtom.name, fp)) {
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

            logger.warn(`[CONCEPTUAL DUPLICATE GUARD] ${localAtom.name}: found ${duplicates.length} duplicates for fp ${fp}`);

            if (duplicates.length === 0) continue;

            // Verificar que tengan estructura diferente (true conceptual dup)
            const localStructuralHash = repo.db.prepare(`
                SELECT json_extract(dna_json, '$.structuralHash') as sh
                FROM atoms WHERE id = ?
            `).get(localAtom.id)?.sh;

            logger.warn(`[CONCEPTUAL DUPLICATE GUARD] ${localAtom.name}: local SH=${localStructuralHash}, duplicates SH=${duplicates.map(d=>d.structuralHash).join(',')}`);

            const structuralVariants = duplicates.filter(d => d.structuralHash !== localStructuralHash);
            
            logger.warn(`[CONCEPTUAL DUPLICATE GUARD] ${localAtom.name}: ${structuralVariants.length} structural variants`);

            // Solo reportar si hay variaciones estructurales (mismo propósito, diferente implementación)
            if (structuralVariants.length === 0) continue;

            const uniqueFiles = [...new Set(structuralVariants.map(d => d.file_path))];
            
            logger.warn(`[CONCEPTUAL DUPLICATE GUARD] DETECTED: ${localAtom.name} duplicates ${structuralVariants[0]?.name} in ${uniqueFiles.length} files`);
            
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

        if (findings.length > 0) {
            const preview = findings
                .map(f => `${f.symbol}(${f.semanticFingerprint})`)
                .join(', ');

            // Severidad: high si es exportado y hay otros exportados (problema de API)
            const hasPublicApiIssue = findings.some(f => f.isExported && f.existingExports > 0);
            const severity = hasPublicApiIssue ? 'high' : 'medium';
            const issueType = createIssueType(IssueDomains.CODE, 'conceptual_duplicate', severity);

            // Construir historial de deuda técnica
            const debtHistory = buildDuplicateDebtHistory(normalizedFilePath, findings, previousFindings);

            logger.warn(
                `[CONCEPTUAL DUPLICATE GUARD] ${normalizedFilePath}: ${findings.length} conceptual duplicate(s) -> ${preview} | Debt: ${debtHistory.debt.level} (${debtHistory.debt.score}/100, ${debtHistory.debt.trend})`
            );

            // Crear contexto estandarizado con historial de deuda
            const enrichedContext = buildDuplicateContext(findings, debtHistory);
            const context = createStandardContext({
                guardName: 'conceptual-duplicate-risk-guard',
                severity,
                suggestedAction: hasPublicApiIssue
                    ? 'This function duplicates an existing public API. Consider reusing the canonical implementation.'
                    : StandardSuggestions.DUPLICATE_REUSE + ' (same semantic purpose, different implementation)',
                suggestedAlternatives: findings.flatMap(f => f.suggestedAlternatives).slice(0, 6),
                relatedFiles: findings.flatMap(f => f.duplicateFiles).filter((v, i, a) => a.indexOf(v) === i),
                extraData: {
                    conceptualDuplicateCount: findings.length,
                    findings: findings.slice(0, maxFindings),
                    fingerprintFormat: 'verb:domain:entity',
                    debtHistory: enrichedContext.debtHistory,
                    recommendations: enrichedContext.recommendations
                }
            });

            await persistWatcherIssue(
                rootPath,
                normalizedFilePath,
                issueType,
                severity,
                `${findings.length} conceptual duplicate(s): ${preview}`,
                context
            );

            // Limpiar severidad opuesta
            if (severity === 'high') {
                await clearWatcherIssue(rootPath, normalizedFilePath, 'code_conceptual_duplicate_medium');
            } else {
                await clearWatcherIssue(rootPath, normalizedFilePath, 'code_conceptual_duplicate_high');
            }

            EventEmitterContext.emit('code:conceptual_duplicate', {
                filePath: normalizedFilePath,
                severity,
                duplicateCount: findings.length,
                findings: findings.map(f => ({
                    symbol: f.symbol,
                    semanticFingerprint: f.semanticFingerprint,
                    instances: f.totalInstances,
                    files: f.duplicateFiles.length
                }))
            });
        } else {
            await clearWatcherIssue(rootPath, normalizedFilePath, 'code_conceptual_duplicate_high');
            await clearWatcherIssue(rootPath, normalizedFilePath, 'code_conceptual_duplicate_medium');
        }

        return findings;

    } catch (error) {
        logger.warn(`[CONCEPTUAL DUPLICATE GUARD ERROR] ${normalizedFilePath}: ${error.message}`);
        console.error('[CONCEPTUAL DUPLICATE GUARD ERROR]', error);
        return [];
    }
}

export default detectConceptualDuplicateRisk;
