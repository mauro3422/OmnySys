import { persistWatcherIssue } from '../watcher-issue-persistence.js';
import {
    IssueDomains,
    createIssueType,
    createStandardContext,
    StandardSuggestions
} from './guard-standards.js';

export async function persistPipelineOrphanFinding({
    rootPath,
    filePath,
    disconnected,
    deadCodeSummary,
    fileImporterCount,
    severity,
    EventEmitterContext
}) {
    const issueType = createIssueType(IssueDomains.ARCH, 'pipeline_orphan', severity);
    const message = `Detected ${disconnected.length} exported pipeline atom(s) with no callers, no callees, and no file-level import evidence`;

    await persistWatcherIssue(
        rootPath,
        filePath,
        issueType,
        severity,
        message,
        createStandardContext({
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
        })
    );

    EventEmitterContext.emit('arch:pipeline-orphan', {
        filePath,
        severity,
        fileImporterCount,
        disconnectedAtoms: disconnected.map((atom) => atom.name)
    });

    return {
        issueType,
        severity,
        message,
        disconnectedAtoms: disconnected.map((atom) => atom.name)
    };
}
