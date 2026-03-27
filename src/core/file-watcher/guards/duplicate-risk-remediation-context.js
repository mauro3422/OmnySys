import { createStandardContext, StandardSuggestions } from './guard-standards.js';
import { buildDuplicateContext } from '../../../shared/compiler/index.js';

export function buildStructuralDuplicateContext({
    findings,
    debtHistory,
    severity,
    remediationPlan,
    maxFindings
}) {
    const enrichedContext = buildDuplicateContext(findings, debtHistory);

    return createStandardContext({
        guardName: 'duplicate-risk-guard',
        severity,
        suggestedAction: findings.length >= 3
            ? `${StandardSuggestions.DUPLICATE_REUSE} (multiple duplicates detected)`
            : StandardSuggestions.DUPLICATE_REUSE,
        suggestedAlternatives: remediationPlan.items.flatMap((item) => item.recommendedActions).slice(0, 6),
        relatedFiles: findings.flatMap((finding) => finding.duplicateFiles).filter((value, index, all) => all.indexOf(value) === index),
        extraData: {
            duplicateCount: findings.length,
            findings: findings.slice(0, maxFindings),
            remediation: remediationPlan,
            debtHistory: enrichedContext.debtHistory,
            recommendations: enrichedContext.recommendations
        }
    });
}
