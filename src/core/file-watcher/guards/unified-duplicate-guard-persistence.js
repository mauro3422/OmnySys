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
    buildDuplicateContext
} from '../../../shared/compiler/index.js';

const logger = createLogger('OmnySys:file-watcher:guards:unified-duplicate:persistence');

export async function persistUnifiedFinding(rootPath, normalizedFilePath, coordinated, debtHistory, EventEmitterContext) {
    const allFindings = [...coordinated.structural, ...coordinated.conceptual];

    let severity = 'medium';
    let issueTypeLabel = 'duplicate_unified';

    if (coordinated.hasOverlap) {
        severity = 'high';
        issueTypeLabel = 'duplicate_unified_critical';
    } else if (coordinated.structural.length >= 3 || allFindings.length >= 5) {
        severity = 'high';
    }

    const issueType = createIssueType(IssueDomains.CODE, issueTypeLabel, severity);
    const remediationPlan = buildDuplicateRemediationPlan(allFindings.map((finding) => ({
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
    })));

    const preview = allFindings
        .map((finding) => `${finding.symbol}(${finding.duplicateType}:${finding.totalInstances})`)
        .join(', ');

    logger.warn(
        `[UNIFIED DUPLICATE GUARD] ${normalizedFilePath}: ${allFindings.length} total -> ${preview} | Debt: ${debtHistory.debt.level} (${debtHistory.debt.score}/100, ${debtHistory.debt.trend})`
    );

    const enrichedContext = buildDuplicateContext(allFindings, debtHistory);
    const context = createStandardContext({
        guardName: 'unified-duplicate-risk-guard',
        severity,
        suggestedAction: coordinated.hasOverlap
            ? 'CRITICAL: Same symbols have both structural and conceptual duplicates. Immediate refactoring required.'
            : coordinated.structural.length > 0
                ? `${StandardSuggestions.DUPLICATE_REUSE} (structural duplicates detected)`
                : `${StandardSuggestions.DUPLICATE_REUSE} (conceptual duplicates detected)`,
        suggestedAlternatives: remediationPlan.items.flatMap((item) => item.recommendedActions).slice(0, 8),
        relatedFiles: allFindings.flatMap((finding) => finding.duplicateFiles).filter((value, index, all) => all.indexOf(value) === index),
        extraData: {
            totalDuplicateCount: allFindings.length,
            structuralCount: coordinated.structural.length,
            conceptualCount: coordinated.conceptual.length,
            hasOverlap: coordinated.hasOverlap,
            overlapDetails: coordinated.overlapDetails,
            priority: coordinated.priority,
            combinedRemediation: coordinated.combinedRemediation,
            findings: allFindings.slice(0, 10),
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
