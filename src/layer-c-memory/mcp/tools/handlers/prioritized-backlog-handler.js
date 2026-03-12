/**
 * @fileoverview prioritized-backlog-handler.js
 *
 * Handler para el aggregationType 'prioritized_backlog'.
 * Deja el archivo como coordinador fino y delega scoring, item building y
 * predicciones a módulos cohesivos.
 *
 * @module mcp/tools/handlers/prioritized-backlog
 * @version 1.0.0
 */

import { collectRecentNotifications, normalizeRecentNotifications } from '../../core/recent-notifications.js';
import { getRiskAssessment } from '../../../query/queries/risk-query.js';
import { buildPrioritizedItems } from './prioritized-backlog/items.js';
import { generatePredictions } from './prioritized-backlog/predictions.js';
import { getScoringFormula } from './prioritized-backlog/scoring.js';

export async function handlePrioritizedBacklog(tool, projectPath, options = {}) {
    const {
        limit = 20,
        minScore = 0.3,
        severity = ['high', 'medium', 'low'],
        includePredicted = true,
        server = null
    } = options;

    const [notifications, riskData] = await Promise.all([
        normalizeRecentNotifications(await collectRecentNotifications(projectPath, {
            clearLoggerBuffer: false,
            watcherLimit: 100,
            server
        })),
        getRiskAssessment(projectPath).catch(() => ({ hotspots: [] }))
    ]);

    const { recurrenceData, items } = buildPrioritizedItems(
        notifications,
        riskData,
        severity,
        minScore
    );
    const predictions = includePredicted ? generatePredictions(recurrenceData) : [];

    return {
        aggregationType: 'prioritized_backlog',
        summary: buildSummary(items),
        items: items.slice(0, limit),
        predictions: predictions.slice(0, 5),
        formula: getScoringFormula()
    };
}

function buildSummary(items) {
    return {
        totalIssues: items.length,
        highPriority: items.filter((item) => item.score >= 0.7).length,
        mediumPriority: items.filter((item) => item.score >= 0.4 && item.score < 0.7).length,
        lowPriority: items.filter((item) => item.score < 0.4).length,
        bySource: {
            watcher: items.filter((item) => item.source === 'watcher').length,
            risk: items.filter((item) => item.source === 'risk_analysis').length
        }
    };
}

export default handlePrioritizedBacklog;
