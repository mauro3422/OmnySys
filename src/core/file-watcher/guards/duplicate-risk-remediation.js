import { persistWatcherIssue, clearWatcherIssue } from '../watcher-issue-persistence.js';
import { createLogger } from '../../../utils/logger.js';
import {
    IssueDomains,
    createIssueType,
    createStandardContext,
    StandardSuggestions
} from './guard-standards.js';
import {
    buildDuplicateRemediationPlan,
    loadPreviousFindings,
    buildDuplicateDebtHistory,
    buildDuplicateContext
} from '../../../shared/compiler/index.js';

const logger = createLogger('OmnySys:file-watcher:guards:duplicate');

function buildStructuralRemediationInput(normalizedFilePath, findings) {
    return findings.map((finding) => ({
        groupSize: finding.totalInstances,
        urgencyScore: finding.totalInstances,
        instances: [{
            name: finding.symbol,
            file: normalizedFilePath,
            importanceScore: 0,
            callerCount: 0,
            changeFrequency: 0
        }, ...finding.duplicateFiles.map((duplicateFile) => ({
            name: finding.symbol,
            file: duplicateFile,
            importanceScore: 0,
            callerCount: 0,
            changeFrequency: 0
        }))]
    }));
}

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
    const severity = findings.length >= 3 ? 'high' : 'medium';
    const issueType = createIssueType(IssueDomains.CODE, 'duplicate', severity);
    const debtHistory = buildDuplicateDebtHistory(normalizedFilePath, findings, previousFindings);

    logger.warn(
        `[DUPLICATE GUARD] ${normalizedFilePath}: ${findings.length} duplicated symbol(s) -> ${preview} | Debt: ${debtHistory.debt.level} (${debtHistory.debt.score}/100, ${debtHistory.debt.trend})`
    );

    const enrichedContext = buildDuplicateContext(findings, debtHistory);
    const context = createStandardContext({
        guardName: 'duplicate-risk-guard',
        severity,
        suggestedAction: findings.length >= 3
            ? `${StandardSuggestions.DUPLICATE_REUSE} (multiple duplicates detected)`
            : StandardSuggestions.DUPLICATE_REUSE,
        suggestedAlternatives: remediationPlan.items.flatMap((item) => item.recommendedActions).slice(0, 6),
        relatedFiles: findings.flatMap((finding) => finding.duplicateFiles).filter((value, index, all) => all.indexOf(value) === index),
        extraData: {
            duplicateCount: findings.length,
            findings: findings.slice(0, maxFindings),
            remediation: remediationPlan,
            debtHistory: enrichedContext.debtHistory,
            recommendations: enrichedContext.recommendations
        }
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
