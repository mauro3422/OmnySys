/**
 * @fileoverview Canonical duplicate coordination utilities.
 *
 * Keeps duplicate coordination/persistence helpers separate from low-signal
 * policy classification so the compiler contract stays explicit.
 *
 * @module shared/compiler/duplicate-utils
 */

export {
    buildDuplicateDebtHistory,
    buildDuplicateContext
} from './duplicate-debt.js';

export { normalizeFilePath } from './path-normalization.js';

export {
    isCanonicalDuplicateSignalPolicyFile,
    isLowSignalGeneratedAtom,
    isLowSignalConceptualFingerprint,
    isRepositoryContractSurface,
    isGuardUtilityConceptualFingerprint,
    isCanonicalMcpToolRouter,
    isLowSignalGuardStructuralHelper,
    shouldIgnoreConceptualDuplicateFinding,
    shouldIgnoreStructuralDuplicateFinding
} from './duplicate-signal-policy.js';

import { normalizeFilePath } from './path-normalization.js';

/**
 * Genera nombres alternativos para evitar colisiones de duplicados.
 *
 * @param {string} originalName
 * @param {string|null} [existingName]
 * @returns {string[]}
 */
export function generateAlternativeNames(originalName, existingName = null) {
    const alternatives = [];

    if (existingName) {
        alternatives.push(`Reuse ${existingName}`);

        const reusePrefixes = ['create', 'build', 'compute', 'generate', 'make'];
        const lowerName = originalName.toLowerCase();

        for (const prefix of reusePrefixes) {
            if (lowerName.startsWith(prefix)) {
                alternatives.push(`${prefix}Specific${originalName.slice(prefix.length)}`);
                break;
            }
        }

        alternatives.push(`Merge with ${existingName}`);
    }

    const suffixes = ['New', 'V2', 'Ext', 'Impl', 'Async'];
    for (const suffix of suffixes) {
        alternatives.push(`${originalName}${suffix}`);
    }

    const renamePrefixes = ['fetch', 'load', 'build', 'compute', 'process'];
    const lowerName = originalName.toLowerCase();

    for (const prefix of renamePrefixes) {
        if (!lowerName.startsWith(prefix)) continue;

        const rest = originalName.slice(prefix.length);
        for (const altPrefix of renamePrefixes.filter((candidate) => candidate !== prefix).slice(0, 2)) {
            alternatives.push(`${altPrefix}${rest}`);
        }
        break;
    }

    return [...new Set(alternatives)].slice(0, 6);
}

/**
 * Construye detalles de overlap entre findings estructurales y conceptuales.
 *
 * @param {Array<Object>} structuralFindings
 * @param {Array<Object>} conceptualFindings
 * @returns {Array<Object>}
 */
function buildDuplicateOverlapDetails(structuralFindings, conceptualFindings) {
    const structuralSymbols = new Set(structuralFindings.map((finding) => finding.symbol));
    const conceptualSymbols = new Set(conceptualFindings.map((finding) => finding.symbol));
    const overlap = [...structuralSymbols].filter((symbol) => conceptualSymbols.has(symbol));

    return overlap.map((symbol) => {
        const structuralCount = structuralFindings.filter((finding) => finding.symbol === symbol).length;
        const conceptualCount = conceptualFindings.filter((finding) => finding.symbol === symbol).length;

        return {
            symbol,
            structuralCount,
            conceptualCount,
            totalInstances: structuralCount + conceptualCount,
            recommendation: 'CRITICAL: Same symbol has both structural (DNA) and conceptual (semantic) duplicates. Resolve structural first.',
            suggestedAction: `Consolidate all ${structuralCount + conceptualCount} variants into a single canonical implementation`
        };
    });
}

/**
 * Construye el plan de remediación combinado para findings coordinados.
 *
 * @param {Array<Object>} structuralFindings
 * @param {Array<Object>} conceptualFindings
 * @returns {Array<Object>}
 */
function buildDuplicateRemediationPlan(structuralFindings, conceptualFindings) {
    const plan = [];

    if (structuralFindings.length > 0) {
        plan.push({
            phase: 1,
            type: 'structural',
            action: 'Resolve DNA/structural duplicates first (identical implementation)',
            count: structuralFindings.length
        });
    }

    if (conceptualFindings.length > 0) {
        plan.push({
            phase: 2,
            type: 'conceptual',
            action: 'Review conceptual duplicates (same purpose, different implementation)',
            count: conceptualFindings.length
        });
    }

    return plan;
}

/**
 * Determina la prioridad general de un grupo coordinado de findings.
 *
 * @param {Array<Object>} overlapDetails
 * @returns {string}
 */
function resolveDuplicatePriority(overlapDetails) {
    return overlapDetails.length > 0 ? 'structural-critical' : 'structural';
}

/**
 * Combina findings de duplicados estructurales y conceptuales.
 *
 * @param {Array<Object>} structuralFindings
 * @param {Array<Object>} conceptualFindings
 * @returns {Object}
 */
export function coordinateDuplicateFindings(structuralFindings = [], conceptualFindings = []) {
    const overlapDetails = (
        structuralFindings.length > 0 && conceptualFindings.length > 0
    ) ? buildDuplicateOverlapDetails(structuralFindings, conceptualFindings) : [];

    return {
        structural: structuralFindings,
        conceptual: conceptualFindings,
        hasOverlap: overlapDetails.length > 0,
        overlapDetails,
        totalFindings: structuralFindings.length + conceptualFindings.length,
        priority: resolveDuplicatePriority(overlapDetails),
        combinedRemediation: buildDuplicateRemediationPlan(structuralFindings, conceptualFindings)
    };
}

/**
 * Carga findings previos de semantic_issues para trackear historial.
 *
 * @param {Object} db
 * @param {string} filePath
 * @param {string} [issueTypePrefix]
 * @returns {Array<Object>}
 */
export function loadPreviousFindings(db, filePath, issueTypePrefix = 'code_duplicate') {
    try {
        if (!db || !filePath) return [];

        const normalizedPath = normalizeFilePath(filePath);
        const rows = db.prepare(`
            SELECT context_json, detected_at
            FROM semantic_issues
            WHERE file_path = ?
              AND issue_type LIKE ?
              AND message LIKE '[watcher]%'
            ORDER BY detected_at DESC
            LIMIT 1
        `).all(normalizedPath, `${issueTypePrefix}%`);

        if (rows.length === 0) return [];

        const findings = [];
        for (const row of rows) {
            try {
                const context = JSON.parse(row.context_json);
                if (context?.findings && Array.isArray(context.findings)) {
                    findings.push(...context.findings);
                }
            } catch (error) {
                console.debug(`[LOAD PREVIOUS FINDINGS] Parse error for ${filePath}: ${error.message}`);
            }
        }

        return findings;
    } catch (error) {
        console.debug(`[LOAD PREVIOUS FINDINGS] Error for ${filePath}: ${error.message}`);
        return [];
    }
}
