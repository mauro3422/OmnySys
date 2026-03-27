import { buildDuplicateRemediationPlan, buildDuplicateContext } from '../../../shared/compiler/index.js';
import { createIssueType, IssueDomains, StandardSuggestions } from './guard-standards.js';

export function buildUnifiedDuplicateSummary(rootPath, normalizedFilePath, coordinated, debtHistory) {
    const allFindings = [...coordinated.structural, ...coordinated.conceptual];

    let severity = 'medium';
    let issueTypeLabel = 'duplicate_unified';

    if (coordinated.hasOverlap) {
        severity = 'high';
        issueTypeLabel = 'duplicate_unified_critical';
    } else if (coordinated.structural.length >= 3 || allFindings.length >= 5) {
        severity = 'high';
    }

    const issueType = createIssueType(IssueDomains.CODE, issueTypeLabel, severity);
    const remediationPlan = buildDuplicateRemediationPlan(allFindings.map((finding) => ({
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

    const preview = allFindings
        .map((finding) => `${finding.symbol}(${finding.duplicateType}:${finding.totalInstances})`)
        .join(', ');

    const enrichedContext = buildDuplicateContext(allFindings, debtHistory);
    const context = {
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

    return {
        allFindings,
        severity,
        issueType,
        issueTypeLabel,
        remediationPlan,
        preview,
        context
    };
}
