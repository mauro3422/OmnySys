import { createStandardContext, StandardSuggestions } from '../guard-standards.js';
import {
    buildPropagationPlan,
    buildDuplicateContext,
    buildDuplicateRiskPropagationPlan,
    summarizePropagationPlan
} from '../../../../shared/compiler/index.js';

export function buildStructuralDuplicateContext({
    findings,
    debtHistory,
    severity,
    remediationPlan,
    maxFindings
}) {
    const enrichedContext = buildDuplicateContext(findings, debtHistory);
    const propagation = summarizePropagationPlan(buildDuplicateRiskPropagationPlan({
        severity,
        scopePath: null,
        focusPath: null,
        duplicateCount: findings.length,
        impactedFileCount: findings.flatMap((finding) => finding.duplicateFiles || []).length || findings.length,
        rewriteCount: findings.length,
        candidateCount: findings.length,
        topCandidates: findings.slice(0, maxFindings).map((finding) => ({
            name: finding.name || finding.familyRoot || null,
            filePath: finding.filePath || null
        })),
        guidance: 'Route duplicate-risk remediation through folderization, renaming, debt reporting, and cache policy before mutating families.',
        recommendationStrategy: 'duplicate_risk_remediation',
        drift: {
            state: findings.length > 0 ? 'watch' : 'stable',
            reason: findings.length > 0 ? 'duplicate risk evidence present' : 'no duplicate risk evidence'
        }
    }));

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
            recommendations: enrichedContext.recommendations,
            propagation
        }
    });
}
