export function calculateTechnicalDebtSeverity(totalDebtItems) {
    if (totalDebtItems > 10) {
        return 'high';
    }

    if (totalDebtItems > 5) {
        return 'medium';
    }

    return 'low';
}

export function buildTechnicalDebtPayload({
    structuralDuplicates,
    duplicateStats,
    structuralRemediation,
    conceptualSummary,
    conceptualGroups,
    orphanSummary,
    phase2Counts
}) {
    return {
        source: 'phase2_post_completion',
        timestamp: new Date().toISOString(),
        structural: {
            groups: structuralDuplicates.length,
            instances: duplicateStats.total_instances,
            topIssues: structuralRemediation?.items?.slice(0, 5) || []
        },
        conceptual: {
            groups: conceptualSummary?.actionable?.groupCount || conceptualGroups.length,
            rawGroups: conceptualSummary?.raw?.groupCount || conceptualGroups.length,
            noiseByClass: conceptualSummary?.noiseByClass || {},
            topIssues: conceptualGroups.slice(0, 5).map((group) => ({
                fingerprint: group.semanticFingerprint,
                implementationCount: group.implementationCount
            }))
        },
        pipelineOrphans: {
            total: orphanSummary?.total || 0,
            items: orphanSummary?.items?.slice(0, 5) || []
        },
        phase2: {
            pendingFiles: phase2Counts.pendingFiles,
            completedFiles: phase2Counts.completedFiles,
            liveFileCount: phase2Counts.liveFileCount
        },
        remediation: {
            nextAction: structuralRemediation?.recommendation || orphanSummary?.recommendation || 'No immediate action required'
        }
    };
}
