import { persistWatcherIssue } from '../../watcher-issue-persistence.js';
import { buildPipelineOrphanReportPayload } from './reporting-payload.js';
import { emitPipelineOrphanFinding } from './reporting-event.js';

export async function persistPipelineOrphanFinding({
    rootPath,
    filePath,
    disconnected,
    deadCodeSummary,
    fileImporterCount,
    severity,
    EventEmitterContext
}) {
    const fileImporterCountSafe = fileImporterCount;
    const { issueType, message, context } = buildPipelineOrphanReportPayload({
        disconnected,
        deadCodeSummary,
        fileImporterCount: fileImporterCountSafe,
        severity
    });

    await persistWatcherIssue(
        rootPath,
        filePath,
        issueType,
        severity,
        message,
        context
    );

    emitPipelineOrphanFinding(EventEmitterContext, filePath, severity, fileImporterCountSafe, disconnected);

    return {
        issueType,
        severity,
        message,
        disconnectedAtoms: disconnected.map((atom) => atom.name)
    };
}
