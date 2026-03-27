import { persistWatcherIssue } from '../watcher-issue-persistence.js';
import {
    IssueDomains,
    createIssueType,
    createStandardContext,
    StandardSuggestions
} from './guard-standards.js';

export async function persistMetadataCompletenessFinding({
    rootPath,
    filePath,
    evidence,
    EventEmitterContext
}) {
    const issueType = createIssueType(IssueDomains.CODE, 'metadata_completeness', evidence.severity);
    const message = `Derived graph metadata missing for ${evidence.missingAtoms}/${evidence.candidateAtoms} production atoms (fragility/coupling/cohesion all zero)`;

    await persistWatcherIssue(
        rootPath,
        filePath,
        issueType,
        evidence.severity,
        message,
        createStandardContext({
            guardName: 'metadata-completeness-guard',
            metricValue: evidence.missingAtoms,
            threshold: evidence.candidateAtoms,
            severity: evidence.severity,
            suggestedAction: 'Derived compiler metadata is missing. Trigger a reindex or inspect enrichment/persistence.',
            suggestedAlternatives: [
                StandardSuggestions.IMPACT_REVIEW,
                'Check persistGraphMetrics() and downstream graph enrichment.',
                'Verify watcher analysis ran deep enough to populate derived scores.'
            ],
            extraData: {
                candidateAtoms: evidence.candidateAtoms,
                missingAtoms: evidence.missingAtoms,
                missingRatio: evidence.missingRatio,
                sampleAtoms: evidence.sampleAtoms
            }
        })
    );

    EventEmitterContext.emit('code:metadata-completeness', {
        filePath,
        severity: evidence.severity,
        candidateAtoms: evidence.candidateAtoms,
        missingAtoms: evidence.missingAtoms,
        sampleAtoms: evidence.sampleAtoms
    });

    return {
        issueType,
        severity: evidence.severity,
        message,
        sampleAtoms: evidence.sampleAtoms,
        candidateAtoms: evidence.candidateAtoms,
        missingAtoms: evidence.missingAtoms
    };
}
