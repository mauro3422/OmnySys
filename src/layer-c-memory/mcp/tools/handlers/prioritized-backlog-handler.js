/**
 * @fileoverview prioritized-backlog-handler.js
 *
 * Handler para el aggregationType 'prioritized_backlog'.
 * Combina signalConfidence + impact + domain + freshness + recurrence
 * para ordenar deuda real antes que ruido.
 *
 * @module mcp/tools/handlers/prioritized-backlog
 * @version 1.0.0
 */

import { collectRecentNotifications, normalizeRecentNotifications } from '../../core/recent-notifications.js';
import { getRiskAssessment } from '../../../query/queries/risk-query.js';

const DOMAIN_WEIGHTS = {
    arch: 1.0,    // Arquitectura - más crítico
    sem: 0.9,     // Semántica
    code: 0.7,    // Código
    perf: 0.6,    // Performance
    runtime: 0.5  // Runtime
};

const SEVERITY_MULTIPLIERS = {
    high: 1.0,
    medium: 0.7,
    low: 0.4,
    info: 0.2
};

const CONFIDENCE_LEVELS = {
    high_confidence: 1.0,
    medium_confidence: 0.7,
    low_confidence: 0.4
};

const SIGNAL_QUALITY = {
    high_signal: 1.0,
    normal_signal: 0.8,
    low_signal: 0.5
};

/**
 * Calcula el score causal para un item
 * Formula: signal*0.30 + impact*0.25 + domain*0.20 + freshness*0.15 + recurrence*0.10
 */
function calculateCausalScore(item, recurrenceData) {
    // 1. Signal Confidence (30%)
    const confidenceScore = CONFIDENCE_LEVELS[item.confidence?.level] || 
                           CONFIDENCE_LEVELS[item.confidence] || 0.5;
    const signalQuality = SIGNAL_QUALITY[item.confidence?.signal] || 0.8;
    const signalComponent = confidenceScore * signalQuality * 0.30;

    // 2. Impact Potential (25%)
    const impactScore = (item.context?.metricValue || item.impact || 50) / 100;
    const severityMult = SEVERITY_MULTIPLIERS[item.severity] || 0.5;
    const impactComponent = Math.min(impactScore * severityMult, 1.0) * 0.25;

    // 3. Domain Criticality (20%)
    const domain = item.context?.domain || 
                   (item.issueType?.includes('arch') ? 'arch' :
                    item.issueType?.includes('sem') ? 'sem' :
                    item.issueType?.includes('code') ? 'code' :
                    item.issueType?.includes('perf') ? 'perf' : 'runtime');
    const domainWeight = DOMAIN_WEIGHTS[domain] || 0.5;
    const domainComponent = domainWeight * 0.20;

    // 4. Freshness Recency (15%)
    const detectedAt = item.detectedAt || item.timestamp || item.context?.timestamp;
    let freshnessScore = 1.0;
    if (detectedAt) {
        const ageMs = Date.now() - new Date(detectedAt).getTime();
        const ageHours = ageMs / (1000 * 60 * 60);
        freshnessScore = ageHours < 1 ? 1.0 : ageHours < 24 ? 0.8 : ageHours < 72 ? 0.6 : 0.4;
    }
    const freshnessComponent = freshnessScore * 0.15;

    // 5. Watcher Recurrence (10%)
    const recurrenceKey = `${item.filePath}::${item.issueType}`;
    const recurrenceCount = recurrenceData[recurrenceKey] || 1;
    const recurrenceScore = Math.min(recurrenceCount / 3, 1.0); // Max at 3 occurrences
    const recurrenceComponent = recurrenceScore * 0.10;

    // Score total (0-1)
    const totalScore = signalComponent + impactComponent + domainComponent + 
                      freshnessComponent + recurrenceComponent;

    return {
        score: Math.round(totalScore * 1000) / 1000,
        components: {
            signal: Math.round(signalComponent * 1000) / 1000,
            impact: Math.round(impactComponent * 1000) / 1000,
            domain: Math.round(domainComponent * 1000) / 1000,
            freshness: Math.round(freshnessComponent * 1000) / 1000,
            recurrence: Math.round(recurrenceComponent * 1000) / 1000
        },
        breakdown: {
            confidenceLevel: item.confidence?.level,
            signalQuality: item.confidence?.signal,
            impactValue: item.context?.metricValue,
            severity: item.severity,
            domain,
            ageHours: detectedAt ? Math.round((Date.now() - new Date(detectedAt).getTime()) / (1000 * 60 * 60)) : null,
            recurrenceCount
        }
    };
}

/**
 * Genera la acción sugerida basada en el tipo de issue
 */
function generateSuggestedAction(item) {
    const actions = {
        'code_complexity_high': 'Refactor function to reduce cyclomatic complexity (extract methods, simplify conditionals)',
        'code_function_length_high': 'Split long function into smaller focused functions',
        'sem_data_flow_high': 'Review data-flow logic - check for disconnected inputs/outputs',
        'arch_impact_high': 'Review all related files before committing this change',
        'arch_impact_medium': 'Check related files for unexpected side effects',
        'arch_impact_low': 'Monitor for potential ripple effects',
        'pipeline_orphan': 'Verify import connections and re-export relationships',
        'duplicate_code': 'Extract common logic into shared function',
        'race_condition': 'Review async patterns - add proper synchronization',
        'shared_state_contention': 'Reduce shared state or implement proper locking',
        'event_leak': 'Add cleanup logic for event listeners'
    };

    // Match por patrones en el issueType
    for (const [pattern, action] of Object.entries(actions)) {
        if (item.issueType?.includes(pattern)) return action;
    }

    return item.context?.suggestedAction || 
           item.suggestedAction || 
           'Review and address this issue';
}

/**
 * Estima el esfuerzo en horas basado en el tipo de issue
 */
function estimateEffort(item) {
    const effortMap = {
        'code_complexity_high': { min: 2, max: 8 },
        'code_function_length_high': { min: 1, max: 4 },
        'sem_data_flow_high': { min: 2, max: 6 },
        'arch_impact_high': { min: 4, max: 12 },
        'arch_impact_medium': { min: 2, max: 6 },
        'arch_impact_low': { min: 0.5, max: 2 },
        'duplicate_code': { min: 1, max: 3 },
        'race_condition': { min: 3, max: 10 },
        'shared_state_contention': { min: 4, max: 16 }
    };

    for (const [pattern, effort] of Object.entries(effortMap)) {
        if (item.issueType?.includes(pattern)) return effort;
    }

    // Default basado en severidad
    const defaultEffort = {
        high: { min: 2, max: 8 },
        medium: { min: 1, max: 4 },
        low: { min: 0.5, max: 2 }
    };

    return defaultEffort[item.severity] || { min: 1, max: 4 };
}

/**
 * Handler principal para prioritized_backlog
 */
export async function handlePrioritizedBacklog(tool, projectPath, options = {}) {
  const { 
        limit = 20, 
        minScore = 0.3, 
        severity = ['high', 'medium', 'low'],
        includePredicted = true,
        server = null
    } = options;

    // 1. Recolectar fuentes de datos
    const [notifications, riskData] = await Promise.all([
        normalizeRecentNotifications(await collectRecentNotifications(projectPath, {
            clearLoggerBuffer: false,
            watcherLimit: 100,
            server
        })),
        getRiskAssessment(projectPath).catch(() => ({ hotspots: [] }))
    ]);

    // 2. Calcular recurrencia (agrupar por archivo+tipo)
    const recurrenceData = {};
    notifications.watcherAlerts?.forEach(alert => {
        const key = `${alert.filePath}::${alert.issueType}`;
        recurrenceData[key] = (recurrenceData[key] || 0) + 1;
    });

    // 3. Combinar y puntuar todos los items
    const allItems = [];

    // Agregar watcher alerts
    notifications.watcherAlerts?.forEach(alert => {
        if (severity.includes(alert.severity)) {
            const scoring = calculateCausalScore(alert, recurrenceData);
            allItems.push({
                id: alert.id,
                source: 'watcher',
                type: alert.issueType,
                severity: alert.severity,
                filePath: alert.filePath,
                message: alert.message,
                score: scoring.score,
                scoring,
                suggestedAction: generateSuggestedAction(alert),
                estimatedEffort: estimateEffort(alert),
                lifecycle: alert.lifecycle,
                confidence: alert.confidence,
                detectedAt: alert.detectedAt,
                context: alert.context
            });
        }
    });

    // Agregar hotspots de riesgo
    riskData.hotspots?.forEach(hotspot => {
        const mockAlert = {
            issueType: `risk_${hotspot.type}`,
            severity: hotspot.severity || 'medium',
            filePath: hotspot.filePath,
            context: { domain: 'code', metricValue: hotspot.score },
            confidence: { level: 'medium_confidence', signal: 'normal_signal' }
        };
        const scoring = calculateCausalScore(mockAlert, recurrenceData);
        
        if (scoring.score >= minScore && severity.includes(mockAlert.severity)) {
            allItems.push({
                id: `risk_${hotspot.filePath}`,
                source: 'risk_analysis',
                type: hotspot.type,
                severity: hotspot.severity,
                filePath: hotspot.filePath,
                message: `Risk hotspot: ${hotspot.type}`,
                score: scoring.score,
                scoring,
                suggestedAction: 'Review and mitigate risk factors',
                estimatedEffort: estimateEffort(mockAlert),
                lifecycle: { status: 'active' },
                confidence: mockAlert.confidence,
                context: hotspot
            });
        }
    });

    // 4. Ordenar por score descendente
    allItems.sort((a, b) => b.score - a.score);

    // 5. Filtrar por score mínimo
    const filtered = allItems.filter(item => item.score >= minScore);

    // 6. Predecir próximos items si se solicita
    const predictions = includePredicted ? generatePredictions(filtered, recurrenceData) : [];

    return {
        aggregationType: 'prioritized_backlog',
        summary: {
            totalIssues: filtered.length,
            highPriority: filtered.filter(i => i.score >= 0.7).length,
            mediumPriority: filtered.filter(i => i.score >= 0.4 && i.score < 0.7).length,
            lowPriority: filtered.filter(i => i.score < 0.4).length,
            bySource: {
                watcher: filtered.filter(i => i.source === 'watcher').length,
                risk: filtered.filter(i => i.source === 'risk_analysis').length
            }
        },
        items: filtered.slice(0, limit),
        predictions: predictions.slice(0, 5),
        formula: {
            description: 'signal*0.30 + impact*0.25 + domain*0.20 + freshness*0.15 + recurrence*0.10',
            weights: {
                signal: 0.30,
                impact: 0.25,
                domain: 0.20,
                freshness: 0.15,
                recurrence: 0.10
            },
            domainWeights: DOMAIN_WEIGHTS,
            severityMultipliers: SEVERITY_MULTIPLIERS
        }
    };
}

/**
 * Genera predicciones de issues basado en patrones de recurrencia
 */
function generatePredictions(items, recurrenceData) {
    const highRecurrence = Object.entries(recurrenceData)
        .filter(([_, count]) => count >= 2)
        .map(([key, count]) => ({
            filePath: key.split('::')[0],
            issueType: key.split('::')[1],
            recurrenceCount: count,
            confidence: Math.min(count * 0.3, 0.9),
            message: `Predicted: issue likely to recur based on ${count} previous occurrences`
        }));

    return highRecurrence.map(pred => ({
        ...pred,
        type: 'prediction',
        severity: 'low',
        score: pred.confidence
    }));
}

export default handlePrioritizedBacklog;
