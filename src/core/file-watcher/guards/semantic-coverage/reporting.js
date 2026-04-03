import { persistWatcherIssue } from '../../watcher-issue-persistence.js';
import { createIssueType, createStandardContext, IssueDomains, StandardSuggestions } from '../guard-standards.js';
import {
    buildSemanticCoveragePropagationPlan,
    summarizePropagationPlan,
    summarizeSemanticCoverage
} from '../../../../shared/compiler/index.js';

export async function persistSemanticCoverageFinding({ rootPath, filePath, evidence, EventEmitterContext }) {
    const issueType = createIssueType(IssueDomains.SEM, 'coverage_gap', evidence.severity);
    const message = evidence.gaps.map((gap) => gap.message).join('; ');
    const semanticCoverage = summarizeSemanticCoverage(evidence.sharedStateCandidates || [], {
        filePath,
        sharesStateRelations: evidence.sharesStateRelations || 0
    });
    const propagationPlan = buildSemanticCoveragePropagationPlan({
        scopePath: rootPath,
        focusPath: filePath,
        severity: evidence.severity,
        gapCount: evidence.gaps.length,
        sharesStateRelations: evidence.sharesStateRelations || 0,
        networkCandidateCount: (evidence.networkCandidates || []).length,
        impactedFileCount: 1,
        rewriteCount: evidence.gaps.length,
        candidateCount: evidence.gaps.length + (evidence.networkCandidates || []).length,
        topCandidates: (evidence.sharedStateCandidates || []).slice(0, 5).map((candidate) => ({
            name: candidate?.name || candidate?.symbol || candidate?.filePath || null,
            filePath: candidate?.filePath || filePath
        })),
        topImpactedFiles: [{ filePath }],
        guidance: 'Route semantic coverage gaps through watcher persistence, semantic storage, and drift governance before trusting the extracted graph.',
        recommendationStrategy: 'semantic_coverage',
        drift: {
            state: evidence.gaps.length > 0 ? 'watch' : 'stable',
            reason: evidence.gaps.length > 0 ? 'semantic coverage gap' : 'no semantic coverage gap'
        }
    });
    const propagation = summarizePropagationPlan(propagationPlan);

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
                sharesStateRelations: evidence.sharesStateRelations,
                semanticCoverage,
                propagation
            }
        })
    );

    EventEmitterContext.emit('sem:coverage-gap', {
        filePath,
        severity: evidence.severity,
        gaps: evidence.gaps,
        networkCandidates: evidence.networkCandidates,
        sharedStateCandidates: evidence.sharedStateCandidates,
        propagation
    });

    return {
        issueType,
        severity: evidence.severity,
        message,
        gaps: evidence.gaps,
        propagation
    };
}
