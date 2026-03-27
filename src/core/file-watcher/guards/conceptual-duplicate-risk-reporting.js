import { persistWatcherIssue, clearWatcherIssue } from '../watcher-issue-persistence.js';
import { createLogger } from '../../../utils/logger.js';
import { IssueDomains, createIssueType } from './guard-standards.js';
import { buildDuplicateDebtHistory } from '../../../shared/compiler/index.js';
import { buildConceptualSeverity } from './conceptual-duplicate-risk-severity.js';
import { buildConceptualContext } from './conceptual-duplicate-risk-context.js';

const logger = createLogger('OmnySys:file-watcher:guards:conceptual-duplicate');

export async function persistConceptualDuplicateFinding({
    rootPath,
    normalizedFilePath,
    findings,
    previousFindings,
    eventEmitterContext,
    maxFindings
}) {
    const preview = findings
        .map((finding) => `${finding.symbol}(${finding.semanticFingerprint})`)
        .join(', ');
    const severity = buildConceptualSeverity(findings);
    const issueType = createIssueType(IssueDomains.CODE, 'conceptual_duplicate', severity);
    const debtHistory = buildDuplicateDebtHistory(normalizedFilePath, findings, previousFindings);

    logger.warn(
        `[CONCEPTUAL DUPLICATE GUARD] ${normalizedFilePath}: ${findings.length} conceptual duplicate(s) -> ${preview} | Debt: ${debtHistory.debt.level} (${debtHistory.debt.score}/100, ${debtHistory.debt.trend})`
    );

    const context = buildConceptualContext({
        findings,
        maxFindings,
        debtHistory,
        severity
    });

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

    eventEmitterContext.emit('code:conceptual_duplicate', {
        filePath: normalizedFilePath,
        severity,
        duplicateCount: findings.length,
        findings: findings.map((finding) => ({
            symbol: finding.symbol,
            semanticFingerprint: finding.semanticFingerprint,
            instances: finding.totalInstances,
            files: finding.duplicateFiles.length
        }))
    });
}
