import { persistWatcherIssue } from '../watcher-issue-persistence.js';
import {
    IssueDomains,
    createIssueType,
    createStandardContext,
    StandardSuggestions
} from './guard-standards.js';

export async function persistTopologyRegressionFinding({
    rootPath,
    filePath,
    severity,
    previousSignal,
    currentSignal,
    ratio,
    regressedAtoms,
    EventEmitterContext
}) {
    const issueType = createIssueType(IssueDomains.ARCH, 'topology_regression', severity);
    const message = `Topology signal regressed from ${previousSignal} to ${currentSignal} after re-analysis`;

    await persistWatcherIssue(
        rootPath,
        filePath,
        issueType,
        severity,
        message,
        createStandardContext({
            guardName: 'topology-regression-guard',
            metricValue: currentSignal,
            threshold: previousSignal,
            severity,
            suggestedAction: 'Verify link extraction and caller/callee persistence before trusting downstream metrics.',
            suggestedAlternatives: [
                StandardSuggestions.IMPACT_REVIEW,
                'Re-run deep analysis for the file and inspect calls/calledBy extraction.',
                'Check if parser/extractor changes removed call topology metadata.'
            ],
            extraData: {
                previousSignal,
                currentSignal,
                ratio: Number(ratio.toFixed(3)),
                regressedAtoms: regressedAtoms.slice(0, 5)
            }
        })
    );

    EventEmitterContext.emit('arch:topology-regression', {
        filePath,
        severity,
        previousSignal,
        currentSignal,
        regressedAtoms: regressedAtoms.slice(0, 5)
    });

    return {
        issueType,
        severity,
        message,
        regressedAtoms
    };
}
