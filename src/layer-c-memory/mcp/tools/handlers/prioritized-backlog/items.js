import {
    calculateCausalScore,
    estimateEffort,
    generateSuggestedAction
} from './scoring.js';
import {
    classifyFileOperationalRole,
    resolveArchitecturalRecommendation
} from '#shared/compiler/index.js';

export function buildPrioritizedItems(notifications, riskData, severity, minScore) {
    const recurrenceData = buildRecurrenceData(notifications.watcherAlerts);
    const items = [];

    appendWatcherItems(items, notifications.watcherAlerts, severity, recurrenceData);
    appendRiskItems(items, riskData.hotspots, severity, minScore, recurrenceData);

    items.sort((left, right) => right.score - left.score);

    return {
        recurrenceData,
        items: items.filter((item) => item.score >= minScore)
    };
}

function buildRecurrenceData(watcherAlerts = []) {
    const recurrenceData = {};

    watcherAlerts.forEach((alert) => {
        const key = `${alert.filePath}::${alert.issueType}`;
        recurrenceData[key] = (recurrenceData[key] || 0) + 1;
    });

    return recurrenceData;
}

function appendWatcherItems(target, watcherAlerts = [], severity, recurrenceData) {
    watcherAlerts.forEach((alert) => {
        if (!severity.includes(alert.severity)) {
            return;
        }

        const scoring = calculateCausalScore(alert, recurrenceData);
        const operationalRole = classifyFileOperationalRole(alert.filePath || '');
        const architecturalRecommendation = resolveArchitecturalRecommendation({
            issueType: alert.issueType,
            filePath: alert.filePath,
            context: alert.context,
            operationalRole
        });
        target.push({
            id: alert.id,
            source: 'watcher',
            type: alert.issueType,
            severity: alert.severity,
            filePath: alert.filePath,
            message: alert.message,
            score: scoring.score,
            scoring,
            suggestedAction: generateSuggestedAction(alert),
            suggestedAlternatives: architecturalRecommendation?.alternatives
                || alert.context?.suggestedAlternatives
                || [],
            architecturalRecommendation: architecturalRecommendation?.strategy || null,
            estimatedEffort: estimateEffort(alert),
            lifecycle: alert.lifecycle,
            confidence: alert.confidence,
            detectedAt: alert.detectedAt,
            context: alert.context
        });
    });
}

function appendRiskItems(target, hotspots = [], severity, minScore, recurrenceData) {
    hotspots.forEach((hotspot) => {
        const mockAlert = createRiskAlert(hotspot);
        const scoring = calculateCausalScore(mockAlert, recurrenceData);
        const operationalRole = classifyFileOperationalRole(mockAlert.filePath || '');
        const architecturalRecommendation = resolveArchitecturalRecommendation({
            issueType: mockAlert.issueType,
            filePath: mockAlert.filePath,
            context: mockAlert.context,
            operationalRole
        });

        if (scoring.score < minScore || !severity.includes(mockAlert.severity)) {
            return;
        }

        target.push({
            id: `risk_${hotspot.filePath}`,
            source: 'risk_analysis',
            type: hotspot.type,
            severity: hotspot.severity,
            filePath: hotspot.filePath,
            message: `Risk hotspot: ${hotspot.type}`,
            score: scoring.score,
            scoring,
            suggestedAction: architecturalRecommendation?.action || 'Review and mitigate risk factors',
            suggestedAlternatives: architecturalRecommendation?.alternatives || [],
            architecturalRecommendation: architecturalRecommendation?.strategy || null,
            estimatedEffort: estimateEffort(mockAlert),
            lifecycle: { status: 'active' },
            confidence: mockAlert.confidence,
            context: hotspot
        });
    });
}

function createRiskAlert(hotspot) {
    return {
        issueType: `risk_${hotspot.type}`,
        severity: hotspot.severity || 'medium',
        filePath: hotspot.filePath,
        context: { domain: 'code', metricValue: hotspot.score },
        confidence: { level: 'medium_confidence', signal: 'normal_signal' }
    };
}
