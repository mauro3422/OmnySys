import { persistWatcherIssue, clearWatcherIssue } from '../watcher-issue-persistence.js';
import { createLogger } from '../../../utils/logger.js';
import {
    IssueDomains,
    createIssueType,
    createStandardContext,
    StandardSuggestions
} from './guard-standards.js';
import {
    buildDuplicateContext,
    buildDuplicateDebtHistory
} from '../../../shared/compiler/index.js';

const logger = createLogger('OmnySys:file-watcher:guards:conceptual-duplicate');

function buildConceptualSeverity(findings) {
    const chests = findings.map((finding) => finding.semanticFingerprint.split(':')[1] || 'logic');
    const hasPublicApiIssue = findings.some((finding) => finding.isExported && finding.existingExports > 0);

    if (chests.includes('logic') || chests.includes('orchestration')) {
        return hasPublicApiIssue ? 'high' : 'medium';
    }

    if (chests.every((chest) => chest === 'lifecycle')) {
        return 'low';
    }

    if (chests.includes('telemetry') || chests.includes('storage')) {
        return 'medium';
    }

    return 'medium';
}

function buildConceptualContext({
    findings,
    maxFindings,
    debtHistory,
    severity
}) {
    const hasPublicApiIssue = findings.some((finding) => finding.isExported && finding.existingExports > 0);
    const enrichedContext = buildDuplicateContext(findings, debtHistory);

    return createStandardContext({
        guardName: 'conceptual-duplicate-risk-guard',
        severity,
        suggestedAction: hasPublicApiIssue
            ? 'This function duplicates an existing public API. Consider reusing the canonical implementation.'
            : `${StandardSuggestions.DUPLICATE_REUSE} (same semantic purpose, different implementation)`,
        suggestedAlternatives: findings.flatMap((finding) => finding.suggestedAlternatives).slice(0, 6),
        relatedFiles: findings.flatMap((finding) => finding.duplicateFiles).filter((value, index, all) => all.indexOf(value) === index),
        extraData: {
            conceptualDuplicateCount: findings.length,
            findings: findings.slice(0, maxFindings),
            fingerprintFormat: 'verb:chest:domain:entity',
            debtHistory: enrichedContext.debtHistory,
            recommendations: enrichedContext.recommendations
        }
    });
}

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
