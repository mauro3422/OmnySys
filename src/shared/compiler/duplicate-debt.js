/**
 * @fileoverview Canonical duplicate debt tracking helpers.
 *
 * Centralizes duplicate debt history, scoring, and persistence context so
 * duplicate-utils can focus on coordination/policy helpers.
 *
 * @module shared/compiler/duplicate-debt
 */

/**
 * Construye historial de deuda técnica por duplicados.
 * Trackea nuevos, persistentes y resueltos para medir deuda técnica acumulada.
 *
 * @param {string} filePath - Archivo afectado
 * @param {Array<Object>} currentFindings - Findings actuales
 * @param {Array<Object>} [previousFindings] - Findings previos
 * @returns {Object} Reporte de deuda técnica con historial y métricas
 */
export function buildDuplicateDebtHistory(filePath, currentFindings = [], previousFindings = []) {
    const currentSymbols = new Set(currentFindings.map(buildFindingIdentity));
    const previousSymbols = new Set(previousFindings.map(buildFindingIdentity));

    const newFindings = currentFindings.filter((finding) => !previousSymbols.has(buildFindingIdentity(finding)));
    const resolvedFindings = previousFindings.filter((finding) => !currentSymbols.has(buildFindingIdentity(finding)));
    const persistentFindings = currentFindings.filter((finding) => previousSymbols.has(buildFindingIdentity(finding)));

    const debtScore = calculateDebtScore(newFindings, persistentFindings, resolvedFindings);
    const trend = calculateTrend(newFindings.length, resolvedFindings.length, persistentFindings.length);

    return {
        filePath,
        detectedAt: new Date().toISOString(),
        summary: {
            total: currentFindings.length,
            new: newFindings.length,
            persistent: persistentFindings.length,
            resolved: resolvedFindings.length,
            resolutionRate: previousFindings.length > 0
                ? Math.round((resolvedFindings.length / previousFindings.length) * 100)
                : 0
        },
        debt: {
            score: debtScore,
            level: debtScore >= 75 ? 'critical' : debtScore >= 50 ? 'high' : debtScore >= 25 ? 'medium' : 'low',
            trend,
            accumulationRate: persistentFindings.length > 0 ? 'high' : newFindings.length > 0 ? 'medium' : 'low'
        },
        history: {
            new: newFindings.map((finding) => mapDebtFinding(finding)),
            persistent: persistentFindings.map((finding) => ({
                ...mapDebtFinding(finding),
                isDebt: true
            })),
            resolved: resolvedFindings.map((finding) => ({
                symbol: finding.symbol,
                type: finding.duplicateType,
                resolvedAt: new Date().toISOString()
            }))
        },
        recommendations: generateDebtRecommendations(newFindings, persistentFindings, resolvedFindings)
    };
}

/**
 * Exporta findings para persistencia en semantic_issues.
 *
 * @param {Array<Object>} currentFindings - Findings actuales
 * @param {Object} debtHistory - Historial de deuda
 * @returns {Object} Contexto enriquecido para persistWatcherIssue
 */
export function buildDuplicateContext(currentFindings = [], debtHistory = null) {
    return {
        findings: currentFindings,
        debtHistory: debtHistory ? {
            summary: debtHistory.summary,
            score: debtHistory.debt.score,
            trend: debtHistory.debt.trend,
            level: debtHistory.debt.level
        } : null,
        recommendations: debtHistory?.recommendations || []
    };
}

function buildFindingIdentity(finding = {}) {
    return `${finding.symbol}:${finding.duplicateType || 'UNKNOWN'}`;
}

function mapDebtFinding(finding = {}) {
    return {
        symbol: finding.symbol,
        type: finding.duplicateType,
        semanticFingerprint: finding.semanticFingerprint || null,
        totalInstances: finding.totalInstances || 0,
        duplicateFiles: finding.duplicateFiles || []
    };
}

function calculateDebtScore(newFindings, persistentFindings, resolvedFindings) {
    const persistentWeight = 3;
    const newWeight = 2;
    const resolvedWeight = -1;

    const rawScore = (
        (persistentFindings.length * persistentWeight) +
        (newFindings.length * newWeight) +
        (resolvedFindings.length * resolvedWeight)
    );

    const maxScore = 10 * persistentWeight;
    const normalizedScore = Math.min(100, Math.max(0, (rawScore / maxScore) * 100));
    return Math.round(normalizedScore);
}

function calculateTrend(newCount, resolvedCount, persistentCount) {
    if (persistentCount > 5) return 'critical-increasing';
    if (newCount > resolvedCount) return 'increasing';
    if (newCount < resolvedCount) return 'decreasing';
    if (persistentCount > 0) return 'stable-high';
    return 'stable';
}

function generateDebtRecommendations(newFindings, persistentFindings, resolvedFindings) {
    const recommendations = [];

    if (persistentFindings.length > 3) {
        recommendations.push({
            priority: 'critical',
            action: 'High technical debt from persistent duplicates. Schedule refactoring sprint.',
            reason: `${persistentFindings.length} duplicate(s) carried over without resolution`
        });
    }

    if (newFindings.length > persistentFindings.length && newFindings.length > 2) {
        recommendations.push({
            priority: 'high',
            action: 'New duplicates detected faster than resolution. Review code review process.',
            reason: `${newFindings.length} new vs ${resolvedFindings.length} resolved`
        });
    }

    if (resolvedFindings.length > 0 && persistentFindings.length === 0 && newFindings.length === 0) {
        recommendations.push({
            priority: 'positive',
            action: 'All duplicates resolved. Consider adding duplicate detection to CI/CD.',
            reason: 'Clean state achieved'
        });
    }

    if (persistentFindings.length > 0 && newFindings.length === 0) {
        recommendations.push({
            priority: 'medium',
            action: 'Focus on resolving existing duplicates before adding new features.',
            reason: `${persistentFindings.length} persistent duplicate(s) blocking technical health`
        });
    }

    return recommendations;
}
