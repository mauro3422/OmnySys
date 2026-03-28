import { persistWatcherIssue } from '../watcher-issue-persistence.js';
import { buildPipelineOrphanReportPayload } from './pipeline-orphan-reporting-payload.js';
import { emitPipelineOrphanFinding } from './pipeline-orphan-reporting-event.js';

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
