import { buildDuplicateContext } from '../../../shared/compiler/index.js';
import { createStandardContext, StandardSuggestions } from './guard-standards.js';

export function buildUnifiedDuplicateSummaryContext({
    coordinated,
    allFindings,
    severity,
    remediationPlan,
    debtHistory
}) {
    const enrichedContext = buildDuplicateContext(allFindings, debtHistory);

    return {
        guardName: 'unified-duplicate-risk-guard',
        severity,
        suggestedAction: coordinated.hasOverlap
            ? 'CRITICAL: Same symbols have both structural and conceptual duplicates. Immediate refactoring required.'
            : coordinated.structural.length > 0
                ? `${StandardSuggestions.DUPLICATE_REUSE} (structural duplicates detected)`
                : `${StandardSuggestions.DUPLICATE_REUSE} (conceptual duplicates detected)`,
        suggestedAlternatives: remediationPlan.items.flatMap((item) => item.recommendedActions).slice(0, 8),
        relatedFiles: allFindings.flatMap((finding) => finding.duplicateFiles).filter((value, index, all) => all.indexOf(value) === index),
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
    };
}
