import {
    IssueDomains,
    StandardSuggestions,
    createIssueType,
    createStandardContext
} from './guard-standards.js';

export function buildHotspotIssue({ issue, highThreshold, mediumThreshold }) {
    if (issue.severity === 'high') {
        const issueType = createIssueType(IssueDomains.PERF, 'hotspot', 'high');
        return {
            atomId: issue.atomId,
            atomName: issue.atomName,
            severity: 'high',
            issueType,
            message: `Hotspot detected: '${issue.atomName}' changes frequently (${issue.metrics.changeFrequency.toFixed(2)}/day over ${issue.metrics.ageDays} days)`,
            context: createStandardContext({
                guardName: 'hotspot-guard',
                atomId: issue.metrics.id,
                atomName: issue.metrics.name,
                metricValue: issue.metrics.changeFrequency,
                threshold: highThreshold / issue.metrics.ageDays,
                severity: 'high',
                suggestedAction: StandardSuggestions.HOTSPOT_STABILIZE,
                suggestedAlternatives: [
                    'Extract the changing parts into separate functions',
                    'Add comprehensive tests to prevent regressions',
                    StandardSuggestions.HOTSPOT_DOCUMENT,
                    'Consider if the interface design is unstable'
                ],
                extraData: {
                    changeFrequency: issue.metrics.changeFrequency,
                    ageDays: issue.metrics.ageDays,
                    changeScore: issue.changeScore,
                    fragilityScore: issue.metrics.fragilityScore,
                    riskLevel: issue.metrics.riskLevel,
                    complexity: issue.metrics.complexity
                }
            })
        };
    }

    const issueType = createIssueType(IssueDomains.PERF, 'hotspot', 'medium');
    return {
        atomId: issue.atomId,
        atomName: issue.atomName,
        severity: 'medium',
        issueType,
        message: `Potential hotspot: '${issue.atomName}' (${issue.metrics.changeFrequency.toFixed(2)}/day)`,
        context: createStandardContext({
            guardName: 'hotspot-guard',
            atomId: issue.metrics.id,
            atomName: issue.metrics.name,
            metricValue: issue.metrics.changeFrequency,
            threshold: mediumThreshold / issue.metrics.ageDays,
            severity: 'medium',
            suggestedAction: 'Monitor this function for further instability',
            extraData: {
                changeFrequency: issue.metrics.changeFrequency,
                ageDays: issue.metrics.ageDays,
                changeScore: issue.changeScore,
                complexity: issue.metrics.complexity
            }
        })
    };
}

export function buildHotspotPersistencePayload(issues) {
    const highIssues = issues.filter((issue) => issue.severity === 'high');
    const mediumIssues = issues.filter((issue) => issue.severity === 'medium');

    return {
        highIssues,
        mediumIssues,
        totalChangeFrequency: issues.reduce((sum, issue) => sum + issue.context.extraData.changeFrequency, 0)
    };
}

export function buildHotspotEventPayload(filePath, issues) {
    return {
        filePath,
        totalIssues: issues.length,
        high: issues.filter((issue) => issue.severity === 'high').length,
        medium: issues.filter((issue) => issue.severity === 'medium').length,
        totalChangeFrequency: issues.reduce((sum, issue) => sum + issue.context.extraData.changeFrequency, 0),
        issues: issues.map((issue) => ({
            atomName: issue.atomName,
            severity: issue.severity,
            changeFrequency: issue.context.extraData.changeFrequency,
            ageDays: issue.context.extraData.ageDays
        }))
    };
}
