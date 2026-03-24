/**
 * @fileoverview integrity-dashboard.js
 *
 * Dashboard de integridad del pipeline de OmnySys.
 * Calcula score de salud general y genera recomendaciones.
 *
 * @module core/meta-detector/integrity-dashboard
 */

import { createLogger } from '../../utils/logger.js';
import { buildIntegrityRecommendation } from './integrity-contract.js';

const logger = createLogger('OmnySys:IntegrityDashboard');

function buildIntegrityGrade(score) {
    if (score >= 95) return 'A+';
    if (score >= 90) return 'A';
    if (score >= 85) return 'B+';
    if (score >= 80) return 'B';
    if (score >= 75) return 'C+';
    if (score >= 70) return 'C';
    if (score >= 65) return 'D+';
    if (score >= 60) return 'D';
    return 'F';
}

function summarizeIntegrityResults(results, weights) {
    let totalWeight = 0;
    let passedWeight = 0;

    for (const result of results) {
        const weight = weights[result.severity] || 10;
        totalWeight += weight;
        if (result.passed) {
            passedWeight += weight;
        }
    }

    const overallHealth = totalWeight === 0 ? 100 : Math.round((passedWeight / totalWeight) * 100);
    const criticalIssues = results.filter((r) => r.severity === 'high' && !r.passed);
    const warnings = results.filter((r) => r.severity === 'medium' && !r.passed);

    return {
        overallHealth,
        grade: buildIntegrityGrade(overallHealth),
        summary: {
            totalChecks: results.length,
            passedChecks: results.filter((r) => r.passed).length,
            failedChecks: results.filter((r) => !r.passed).length,
            criticalIssues: criticalIssues.length,
            warnings: warnings.length
        },
        criticalIssues,
        warnings
    };
}

function mapIntegrityIssues(issues) {
    return issues.map((issue) => ({
        check: issue.name,
        severity: issue.severity,
        details: issue.details,
        recommendation: issue.recommendation
    }));
}

function appendSection(lines, title, items, renderItem) {
    if (items.length === 0) return;

    lines.push(title);
    for (const item of items) {
        lines.push(renderItem(item));
    }
    lines.push('');
}

function buildIntegrityConsoleLines(report) {
    const lines = [
        '',
        '==============================================',
        '        OMNYSYS PIPELINE INTEGRITY REPORT',
        '==============================================',
        '',
        `Timestamp: ${report.timestamp}`,
        `Overall Health: ${report.overallHealth}/100 (Grade: ${report.grade})`,
        '',
        'Summary:',
        `  Passed Checks: ${report.summary.passedChecks}/${report.summary.totalChecks}`,
        `  Failed Checks: ${report.summary.failedChecks}`,
        `  Critical Issues: ${report.summary.criticalIssues}`,
        `  Warnings: ${report.summary.warnings}`,
        ''
    ];

    appendSection(lines, 'CRITICAL ISSUES:', report.criticalIssues, (issue) => `   - ${issue.check}: ${issue.recommendation}`);
    appendSection(lines, 'WARNINGS:', report.warnings, (issue) => `   - ${issue.check}: ${issue.recommendation}`);

    if (report.recommendations.length > 0) {
        lines.push('TOP RECOMMENDATIONS:');
        for (let i = 0; i < Math.min(5, report.recommendations.length); i++) {
            const rec = report.recommendations[i];
            lines.push(`   ${i + 1}. [${rec.priority.toUpperCase()}] ${rec.action}`);
            lines.push(`      Reason: ${rec.reason}`);
            lines.push(`      Effort: ${rec.estimatedEffort}`);
            lines.push('');
        }
    }

    lines.push('==============================================');
    return lines.join('\n');
}

/**
 * Dashboard de integridad del pipeline
 */
export class IntegrityDashboard {
    constructor() {
        this.weights = {
            high: 30,
            medium: 15,
            low: 5
        };
    }

    /**
     * Genera reporte completo de integridad
     * @param {Array} results - Resultados de PipelineIntegrityDetector.verify()
     * @returns {Object} Reporte consolidado
     */
    async generateReport(results) {
        const { overallHealth, grade, summary, criticalIssues, warnings } = summarizeIntegrityResults(results, this.weights);
        const recommendations = this.buildIntegrityRecommendations(results);

        return {
            timestamp: new Date().toISOString(),
            overallHealth,
            grade,
            summary,
            criticalIssues: mapIntegrityIssues(criticalIssues),
            warnings: mapIntegrityIssues(warnings),
            recommendations,
            detailedResults: results
        };
    }

    /**
     * Calcula score de salud general (0-100)
     */
    calculateOverallHealth(results) {
        return summarizeIntegrityResults(results, this.weights).overallHealth;
    }

    /**
     * Calcula grade basado en score
     */
    calculateIntegrityGrade(score) {
        return buildIntegrityGrade(score);
    }

    /**
     * Genera recomendaciones priorizadas
     */
    buildIntegrityRecommendations(results) {
        const recommendations = [];

        for (const result of results.filter(r => !r.passed)) {
            const recommendation = buildIntegrityRecommendation(result);
            recommendations.push({
                priority: result.severity === 'high' ? 'critical' : result.severity === 'medium' ? 'high' : 'medium',
                action: recommendation.action,
                reason: recommendation.reason,
                impact: recommendation.impact,
                estimatedEffort: recommendation.estimatedEffort
            });
        }

        const priorityOrder = { critical: 0, high: 1, medium: 2, low: 3 };
        recommendations.sort((a, b) => priorityOrder[a.priority] - priorityOrder[b.priority]);

        return recommendations;
    }

    /**
     * Genera resumen ejecutivo para mostrar en consola
     */
    generateConsoleSummary(report) {
        return buildIntegrityConsoleLines(report);
    }
}

export default IntegrityDashboard;
