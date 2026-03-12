/**
 * @fileoverview complexity-guard.js
 *
 * Monitorea complejidad ciclomática y tamaño de funciones.
 * El archivo queda como coordinador fino; el análisis y la persistencia
 * viven en módulos dedicados.
 *
 * @module core/file-watcher/guards/complexity-guard
 * @version 1.0.0
 */

import { createLogger } from '../../../utils/logger.js';
import { StandardThresholds } from './guard-standards.js';
import { classifyFileOperationalRole } from '../../../shared/compiler/index.js';
import { collectComplexityIssues } from './complexity-guard/analysis.js';
import { clearComplexityIssues, persistComplexityIssues } from './complexity-guard/persistence.js';

const logger = createLogger('OmnySys:file-watcher:guards:complexity');

export async function detectHighComplexity(rootPath, filePath, EventEmitterContext, atoms = [], options = {}) {
    const {
        complexityHigh = StandardThresholds.COMPLEXITY_HIGH,
        complexityMedium = StandardThresholds.COMPLEXITY_MEDIUM,
        linesHigh = StandardThresholds.LINES_HIGH,
        linesMedium = StandardThresholds.LINES_MEDIUM,
        verbose = true
    } = options;

    try {
        if (!atoms || atoms.length === 0) {
            await clearComplexityIssues(rootPath, filePath);
            return [];
        }

        const operationalRole = classifyFileOperationalRole(filePath);
        const issues = collectComplexityIssues(filePath, atoms, {
            complexityHigh,
            complexityMedium,
            linesHigh,
            linesMedium,
            operationalRole
        });

        if (issues.length === 0) {
            await clearComplexityIssues(rootPath, filePath);
            return [];
        }

        const { highIssues, mediumIssues } = await persistComplexityIssues(rootPath, filePath, issues);
        emitComplexityEvent(EventEmitterContext, filePath, issues, highIssues, mediumIssues);

        if (verbose) {
            logger.warn(`[COMPLEXITY] ${filePath}: ${issues.length} complexity issue(s) detected`);
        }

        return issues;
    } catch (error) {
        logger.debug(`[COMPLEXITY GUARD SKIP] ${filePath}: ${error.message}`);
        return [];
    }
}

function emitComplexityEvent(EventEmitterContext, filePath, issues, highIssues, mediumIssues) {
    EventEmitterContext.emit('code:complexity', {
        filePath,
        totalIssues: issues.length,
        high: highIssues.length,
        medium: mediumIssues.length,
        issues: issues.map((issue) => ({
            atomName: issue.atomName,
            severity: issue.severity,
            metricType: issue.metricType,
            value: issue.context.metricValue
        }))
    });
}

export default detectHighComplexity;
