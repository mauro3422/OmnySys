import { createStandardContext, StandardSuggestions } from '../guard-standards.js';
import { buildDuplicateContext } from '../../../../shared/compiler/index.js';

export function buildConceptualContext({
    findings,
    maxFindings,
    debtHistory,
    severity
}) {
    const hasPublicApiIssue = findings.some((finding) => finding.isExported && finding.existingExports > 0);
    const enrichedContext = buildDuplicateContext(findings, debtHistory);

    return createStandardContext({
        guardName: 'conceptual-duplicate-risk-guard',
        severity,
        suggestedAction: hasPublicApiIssue
            ? 'This function duplicates an existing public API. Consider reusing the canonical implementation.'
            : `${StandardSuggestions.DUPLICATE_REUSE} (same semantic purpose, different implementation)`,
        suggestedAlternatives: findings.flatMap((finding) => finding.suggestedAlternatives).slice(0, 6),
        relatedFiles: findings.flatMap((finding) => finding.duplicateFiles).filter((value, index, all) => all.indexOf(value) === index),
        extraData: {
            conceptualDuplicateCount: findings.length,
            findings: findings.slice(0, maxFindings),
            fingerprintFormat: 'verb:chest:domain:entity',
            debtHistory: enrichedContext.debtHistory,
            recommendations: enrichedContext.recommendations
        }
    });
}
