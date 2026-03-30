import { persistWatcherIssue, clearWatcherIssue } from '../../watcher-issue-persistence.js';
import { createLogger } from '../../../../utils/logger.js';
import {
    IssueDomains,
    createIssueType,
} from '../guard-standards.js';
import {
    buildDuplicateRemediationPlan,
    loadPreviousFindings,
    buildDuplicateDebtHistory
} from '../../../../shared/compiler/index.js';
import { buildStructuralRemediationInput } from './input.js';
import { resolveStructuralDuplicateSeverity } from './severity.js';
import { buildStructuralDuplicateContext } from './context.js';

const logger = createLogger('OmnySys:file-watcher:guards:duplicate');

export async function persistStructuralDuplicateFinding({
    rootPath,
    normalizedFilePath,
    findings,
    eventEmitterContext,
    maxFindings
}) {
    const { getRepository } = await import('#layer-c/storage/repository/index.js');
    const repo = getRepository(rootPath);
    const previousFindings = loadPreviousFindings(repo.db, normalizedFilePath, 'code_duplicate');
    const remediationPlan = buildDuplicateRemediationPlan(
        buildStructuralRemediationInput(normalizedFilePath, findings)
    );
    const preview = findings.map((finding) => `${finding.symbol}(${finding.totalInstances})`).join(', ');
    const severity = resolveStructuralDuplicateSeverity(findings);
    const issueType = createIssueType(IssueDomains.CODE, 'duplicate', severity);
    const debtHistory = buildDuplicateDebtHistory(normalizedFilePath, findings, previousFindings);

    logger.warn(
        `[DUPLICATE GUARD] ${normalizedFilePath}: ${findings.length} duplicated symbol(s) -> ${preview} | Debt: ${debtHistory.debt.level} (${debtHistory.debt.score}/100, ${debtHistory.debt.trend})`
    );

    const context = buildStructuralDuplicateContext({
        findings,
        debtHistory,
        severity,
        remediationPlan,
        maxFindings
    });

    await persistWatcherIssue(
        rootPath,
        normalizedFilePath,
        issueType,
        severity,
        `${findings.length} duplicate symbol(s): ${preview}`,
        context
    );

    if (severity === 'high') {
        await clearWatcherIssue(rootPath, normalizedFilePath, 'code_duplicate_medium');
    } else {
        await clearWatcherIssue(rootPath, normalizedFilePath, 'code_duplicate_high');
    }

    eventEmitterContext.emit('code:duplicate', {
        filePath: normalizedFilePath,
        severity,
        duplicateCount: findings.length,
        findings: findings.map((finding) => ({
            symbol: finding.symbol,
            instances: finding.totalInstances,
            files: finding.duplicateFiles.length
        }))
    });
}
