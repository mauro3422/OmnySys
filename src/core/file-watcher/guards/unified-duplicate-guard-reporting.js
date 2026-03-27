import { persistWatcherIssue, clearWatcherIssue } from '../watcher-issue-persistence.js';
import { createLogger } from '../../../utils/logger.js';

const logger = createLogger('OmnySys:file-watcher:guards:unified-duplicate:persistence');

export async function persistUnifiedFinding(rootPath, normalizedFilePath, coordinated, debtHistory, EventEmitterContext) {
    const summary = coordinated.summary;
    const { allFindings, severity, issueType, preview, context } = summary;

    logger.warn(
        `[UNIFIED DUPLICATE GUARD] ${normalizedFilePath}: ${allFindings.length} total -> ${preview} | Debt: ${debtHistory.debt.level} (${debtHistory.debt.score}/100, ${debtHistory.debt.trend})`
    );

    await persistWatcherIssue(
        rootPath,
        normalizedFilePath,
        issueType,
        severity,
        `${allFindings.length} duplicate(s): ${preview}`,
        context
    );

    if (severity === 'high') {
        await clearWatcherIssue(rootPath, normalizedFilePath, 'code_duplicate_unified_medium');
    } else {
        await clearWatcherIssue(rootPath, normalizedFilePath, 'code_duplicate_unified_high');
    }

    EventEmitterContext.emit('code:duplicate_unified', {
        filePath: normalizedFilePath,
        severity,
        totalDuplicateCount: allFindings.length,
        structuralCount: coordinated.structural.length,
        conceptualCount: coordinated.conceptual.length,
        hasOverlap: coordinated.hasOverlap,
        debtScore: debtHistory.debt.score,
        debtTrend: debtHistory.debt.trend,
        findings: allFindings.map((finding) => ({
            symbol: finding.symbol,
            type: finding.duplicateType,
            instances: finding.totalInstances,
            files: finding.duplicateFiles.length
        }))
    });
}
