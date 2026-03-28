import { createIssueType, IssueDomains, createStandardContext, StandardSuggestions } from './guard-standards.js';

export function buildPipelineOrphanReportPayload({
    disconnected,
    deadCodeSummary,
    fileImporterCount,
    severity
}) {
    const issueType = createIssueType(IssueDomains.ARCH, 'pipeline_orphan', severity);
    const message = `Detected ${disconnected.length} exported pipeline atom(s) with no callers, no callees, and no file-level import evidence`;

    const context = createStandardContext({
        guardName: 'pipeline-orphan-guard',
        severity,
        threshold: 0,
        metricValue: disconnected.length,
        suggestedAction: 'Verify whether this export is actually wired into the production pipeline or can be removed.',
        suggestedAlternatives: [
            StandardSuggestions.IMPACT_REVIEW,
            'If the module is integrated by import only, ensure file_dependencies/import metadata is persisted.',
            'If the export is obsolete, remove it or move it to test/support code.'
        ],
        extraData: {
            fileImporterCount,
            deadCodePlausibility: deadCodeSummary ? {
                flaggedDeadCode: deadCodeSummary.flaggedDeadCode,
                suspiciousDeadCandidates: deadCodeSummary.suspiciousDeadCandidates,
                hasCoverageGap: deadCodeSummary.hasCoverageGap
            } : null,
            disconnectedAtoms: disconnected.slice(0, 10).map((atom) => ({
                name: atom.name,
                complexity: atom.complexity || 0,
                atomType: atom.type || atom.atom_type || 'unknown'
            }))
        }
    });

    return {
        issueType,
        message,
        context
    };
}
