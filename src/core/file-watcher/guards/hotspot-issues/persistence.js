export function buildHotspotPersistencePayload(issues) {
    const highIssues = issues.filter((issue) => issue.severity === 'high');
    const mediumIssues = issues.filter((issue) => issue.severity === 'medium');

    return {
        highIssues,
        mediumIssues,
        totalChangeFrequency: issues.reduce((sum, issue) => sum + issue.context.extraData.changeFrequency, 0)
    };
}
