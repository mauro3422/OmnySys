import { createStandardContext, StandardSuggestions } from '../guard-standards.js';
import { buildDuplicateContext } from '../../../../shared/compiler/duplicate-debt/context.js';
import { buildDuplicateRiskPropagationPlan } from '../../../../shared/compiler/propagation-engine/change-type-plans/duplicate-risk.js';
import { summarizePropagationPlan } from '../../../../shared/compiler/propagation-engine/plan-builder.js';

export function buildConceptualDuplicatePropagation({
    normalizedFilePath,
    findings,
    severity,
    debtHistory,
    maxFindings
}) {
    const impactedFiles = findings.flatMap((finding) => finding.duplicateFiles || []);
    const uniqueImpactedFiles = [...new Set([
        normalizedFilePath,
        ...impactedFiles
    ].filter(Boolean))];

    return summarizePropagationPlan(buildDuplicateRiskPropagationPlan({
        severity,
        scopePath: normalizedFilePath || null,
        focusPath: normalizedFilePath || null,
        duplicateCount: findings.length,
        impactedFileCount: uniqueImpactedFiles.length || findings.length,
        rewriteCount: findings.length,
        candidateCount: findings.length,
        topCandidates: findings.slice(0, maxFindings).map((finding) => ({
            name: finding.symbol || null,
            filePath: finding.filePath || normalizedFilePath || null
        })),
        topImpactedFiles: uniqueImpactedFiles.slice(0, 5).map((filePath) => ({ filePath })),
        guidance: 'Route conceptual duplicate findings through watcher persistence, duplicate debt reporting, and canonical remediation before trusting parallel implementations.',
        recommendationStrategy: 'conceptual_duplicate_risk',
        drift: {
            state: findings.length > 0 ? 'watch' : 'stable',
            reason: findings.length > 0
                ? `${findings.length} conceptual duplicate finding(s) with debt=${debtHistory?.debt?.level || 'unknown'}`
                : 'no conceptual duplicate evidence'
        }
    }));
}

export function buildConceptualContext({
    normalizedFilePath,
    findings,
    maxFindings,
    debtHistory,
    severity
}) {
    const hasPublicApiIssue = findings.some((finding) => finding.isExported && finding.existingExports > 0);
    const enrichedContext = buildDuplicateContext(findings, debtHistory);
    const propagation = buildConceptualDuplicatePropagation({
        normalizedFilePath,
        findings,
        severity,
        debtHistory,
        maxFindings
    });

    const extraData = {
        conceptualDuplicateCount: findings.length,
        findings: findings.slice(0, maxFindings),
        fingerprintFormat: 'verb:chest:domain:entity',
        debtHistory: enrichedContext.debtHistory,
        recommendations: enrichedContext.recommendations,
        propagation
    };

    const context = createStandardContext({
        guardName: 'conceptual-duplicate-risk-guard',
        severity,
        suggestedAction: hasPublicApiIssue
            ? 'This function duplicates an existing public API. Consider reusing the canonical implementation.'
            : `${StandardSuggestions.DUPLICATE_REUSE} (same semantic purpose, different implementation)`,
        suggestedAlternatives: findings.flatMap((finding) => finding.suggestedAlternatives).slice(0, 6),
        relatedFiles: findings.flatMap((finding) => finding.duplicateFiles).filter((value, index, all) => all.indexOf(value) === index),
        extraData
    });

    return {
        ...context,
        extraData
    };
}
