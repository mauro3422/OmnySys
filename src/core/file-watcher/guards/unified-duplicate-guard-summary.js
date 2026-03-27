import { createIssueType, IssueDomains } from './guard-standards.js';
import { buildUnifiedDuplicateRemediationPlan } from './unified-duplicate-guard-summary-remediation.js';
import { buildUnifiedDuplicateSummaryContext } from './unified-duplicate-guard-summary-context.js';
import { resolveUnifiedDuplicateSeverity } from './unified-duplicate-guard-summary-severity.js';

export function buildUnifiedDuplicateSummary(rootPath, normalizedFilePath, coordinated, debtHistory) {
    const allFindings = [...coordinated.structural, ...coordinated.conceptual];
    const { severity, issueTypeLabel } = resolveUnifiedDuplicateSeverity(coordinated, allFindings);
    const issueType = createIssueType(IssueDomains.CODE, issueTypeLabel, severity);
    const remediationPlan = buildUnifiedDuplicateRemediationPlan(allFindings, normalizedFilePath);
    const preview = allFindings
        .map((finding) => `${finding.symbol}(${finding.duplicateType}:${finding.totalInstances})`)
        .join(', ');
    const context = buildUnifiedDuplicateSummaryContext({
        coordinated,
        allFindings,
        severity,
        remediationPlan,
        debtHistory
    });

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
