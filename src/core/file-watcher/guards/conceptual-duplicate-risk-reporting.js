import { persistWatcherIssue, clearWatcherIssue } from '../watcher-issue-persistence.js';
import { createLogger } from '../../../utils/logger.js';
import { IssueDomains, createIssueType } from './guard-standards.js';
import { buildConceptualDuplicateReportPayload } from './conceptual-duplicate-risk-reporting-payload.js';
import { emitConceptualDuplicateFinding } from './conceptual-duplicate-risk-reporting-event.js';

const logger = createLogger('OmnySys:file-watcher:guards:conceptual-duplicate');

export async function persistConceptualDuplicateFinding({
    rootPath,
    normalizedFilePath,
    findings,
    previousFindings,
    eventEmitterContext,
    maxFindings
}) {
    const { preview, severity, debtHistory, context } = buildConceptualDuplicateReportPayload({
        normalizedFilePath,
        findings,
        previousFindings,
        maxFindings
    });
    const issueType = createIssueType(IssueDomains.CODE, 'conceptual_duplicate', severity);

    logger.warn(
        `[CONCEPTUAL DUPLICATE GUARD] ${normalizedFilePath}: ${findings.length} conceptual duplicate(s) -> ${preview} | Debt: ${debtHistory.debt.level} (${debtHistory.debt.score}/100, ${debtHistory.debt.trend})`
    );

    await persistWatcherIssue(
        rootPath,
        normalizedFilePath,
        issueType,
        severity,
        `${findings.length} conceptual duplicate(s): ${preview}`,
        context
    );

    if (severity === 'high') {
        await clearWatcherIssue(rootPath, normalizedFilePath, 'code_conceptual_duplicate_medium');
    } else {
        await clearWatcherIssue(rootPath, normalizedFilePath, 'code_conceptual_duplicate_high');
    }

    emitConceptualDuplicateFinding(eventEmitterContext, normalizedFilePath, severity, findings);
}
