import { persistWatcherIssue } from '../watcher-issue-persistence.js';
import { createIssueType, createStandardContext, IssueDomains, StandardSuggestions } from './guard-standards.js';

export async function persistSemanticCoverageFinding({ rootPath, filePath, evidence, EventEmitterContext }) {
    const issueType = createIssueType(IssueDomains.SEM, 'coverage_gap', evidence.severity);
    const message = evidence.gaps.map((gap) => gap.message).join('; ');

    await persistWatcherIssue(
        rootPath,
        filePath,
        issueType,
        evidence.severity,
        message,
        createStandardContext({
            guardName: 'semantic-coverage-guard',
            severity: evidence.severity,
            suggestedAction: 'Re-run semantic extraction for this file and inspect missing flags/relations.',
            suggestedAlternatives: [
                StandardSuggestions.ASYNC_ADD_TRY_CATCH,
                'Check network/shared-state extractors for this syntax pattern.',
                'Verify semantic relations are persisted after Phase 2 or watcher indexing.'
            ],
            extraData: {
                gaps: evidence.gaps,
                networkCandidates: evidence.networkCandidates,
                networkFlagged: evidence.networkFlagged,
                sharedStateCandidates: evidence.sharedStateCandidates,
                sharesStateRelations: evidence.sharesStateRelations
            }
        })
    );

    EventEmitterContext.emit('sem:coverage-gap', {
        filePath,
        severity: evidence.severity,
        gaps: evidence.gaps,
        networkCandidates: evidence.networkCandidates,
        sharedStateCandidates: evidence.sharedStateCandidates
    });

    return {
        issueType,
        severity: evidence.severity,
        message,
        gaps: evidence.gaps
    };
}
