import { persistWatcherIssue } from '../../watcher-issue-persistence.js';
import { createIssueType, createStandardContext, IssueDomains, StandardSuggestions } from '../guard-standards.js';

export async function persistSemanticPersistenceFinding({ rootPath, filePath, evidence, EventEmitterContext }) {
    const issueType = createIssueType(IssueDomains.SEM, 'persistence_gap', evidence.severity);
    const message = `Semantic persistence gap after indexing: ${evidence.missingAny.size}/${evidence.persistedTargets} persisted atoms are missing DNA/data-flow/signature coverage`;

    await persistWatcherIssue(
        rootPath,
        filePath,
        issueType,
        evidence.severity,
        message,
        createStandardContext({
            guardName: 'semantic-persistence-guard',
            severity: evidence.severity,
            metricValue: evidence.missingAny.size,
            threshold: evidence.persistedTargets,
            suggestedAction: 'Inspect converter/persistence mapping for derived semantic fields and reindex the affected file.',
            suggestedAlternatives: [
                StandardSuggestions.IMPACT_REVIEW,
                'Compare in-memory atoms vs persisted rows for dna_json, data_flow_json and signature_json.',
                'Re-run incremental analysis and verify semantic metadata survives storage conversion.'
            ],
            extraData: {
                persistedTargets: evidence.persistedTargets,
                missingDna: evidence.missingDna,
                missingDataFlow: evidence.missingDataFlow,
                missingSignature: evidence.missingSignature
            }
        })
    );

    EventEmitterContext.emit('sem:persistence-gap', {
        filePath,
        severity: evidence.severity,
        persistedTargets: evidence.persistedTargets,
        missingDna: evidence.missingDna,
        missingDataFlow: evidence.missingDataFlow,
        missingSignature: evidence.missingSignature
    });

    return {
        issueType,
        severity: evidence.severity,
        message,
        missingDna: evidence.missingDna,
        missingDataFlow: evidence.missingDataFlow,
        missingSignature: evidence.missingSignature
    };
}
