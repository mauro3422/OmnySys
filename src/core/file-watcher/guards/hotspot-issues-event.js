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
