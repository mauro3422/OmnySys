import {
    IssueDomains,
    createIssueType,
    createStandardContext
} from './guard-standards.js';

export function buildDeadCodeIssue(evaluation, minLines) {
    const issueType = createIssueType(IssueDomains.CODE, 'dead_code', evaluation.severity);

    return {
        atomId: evaluation.atomId,
        atomName: evaluation.atomName,
        severity: evaluation.severity,
        issueType,
        message: `Dead code detected: '${evaluation.atomName}' (${evaluation.metrics.linesOfCode} lines) ${evaluation.reason}`,
        context: createStandardContext({
            guardName: 'dead-code-guard',
            atomId: evaluation.metrics.id,
            atomName: evaluation.metrics.name,
            metricValue: evaluation.metrics.linesOfCode,
            threshold: minLines,
            severity: evaluation.severity,
            suggestedAction: evaluation.suggestedAction,
            suggestedAlternatives: evaluation.remediation.recommendedActions,
            extraData: {
                isExported: evaluation.metrics.isExported,
                isDeadCode: true,
                linesOfCode: evaluation.metrics.linesOfCode,
                functionType: evaluation.metrics.type,
                calledBy: evaluation.normalized.calledBy,
                calls: evaluation.normalized.calls,
                purpose: evaluation.normalized.purpose
            }
        })
    };
}

export function buildDeadCodeEventPayload(filePath, issues) {
    const totalLines = issues.reduce((sum, issue) => sum + issue.context.extraData.linesOfCode, 0);

    return {
        filePath,
        totalIssues: issues.length,
        medium: issues.filter((issue) => issue.severity === 'medium').length,
        low: issues.filter((issue) => issue.severity === 'low').length,
        totalLines,
        issues: issues.map((issue) => ({
            atomName: issue.atomName,
            severity: issue.severity,
            lines: issue.context.extraData.linesOfCode,
            isExported: issue.context.extraData.isExported
        }))
    };
}
