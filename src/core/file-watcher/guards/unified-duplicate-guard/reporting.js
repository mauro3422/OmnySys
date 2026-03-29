import { persistWatcherIssue, clearWatcherIssue } from '../../watcher-issue-persistence.js';
import { createLogger } from '../../../../utils/logger.js';
import { buildUnifiedDuplicateReportingPayload } from './reporting-payload.js';
import { emitUnifiedDuplicateFinding } from './reporting-event.js';

const logger = createLogger('OmnySys:file-watcher:guards:unified-duplicate:persistence');

export async function persistUnifiedFinding(rootPath, normalizedFilePath, coordinated, debtHistory, EventEmitterContext) {
    const summary = coordinated.summary;
    const payload = buildUnifiedDuplicateReportingPayload(summary, debtHistory);
    const { allFindings, severity, issueType, preview, context, message, loggerMessage } = payload;

    logger.warn(loggerMessage);

    await persistWatcherIssue(
        rootPath,
        normalizedFilePath,
        issueType,
        severity,
        message,
        context
    );

    if (severity === 'high') {
        await clearWatcherIssue(rootPath, normalizedFilePath, 'code_duplicate_unified_medium');
    } else {
        await clearWatcherIssue(rootPath, normalizedFilePath, 'code_duplicate_unified_high');
    }

    emitUnifiedDuplicateFinding(EventEmitterContext, normalizedFilePath, payload, allFindings);
}
