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
        const overallHealth = this.calculateOverallHealth(results);
        const criticalIssues = results.filter(r => r.severity === 'high' && !r.passed);
        const warnings = results.filter(r => r.severity === 'medium' && !r.passed);
        const recommendations = this.generateRecommendations(results);

        return {
            timestamp: new Date().toISOString(),
            overallHealth,
            grade: this.calculateGrade(overallHealth),
            summary: {
                totalChecks: results.length,
                passedChecks: results.filter(r => r.passed).length,
                failedChecks: results.filter(r => !r.passed).length,
                criticalIssues: criticalIssues.length,
                warnings: warnings.length
            },
            criticalIssues: criticalIssues.map(issue => ({
                check: issue.name,
                severity: issue.severity,
                details: issue.details,
                recommendation: issue.recommendation
            })),
            warnings: warnings.map(issue => ({
                check: issue.name,
                severity: issue.severity,
                details: issue.details,
                recommendation: issue.recommendation
            })),
            recommendations,
            detailedResults: results
        };
    }

    /**
     * Calcula score de salud general (0-100)
     */
    calculateOverallHealth(results) {
        let totalWeight = 0;
        let passedWeight = 0;

        for (const result of results) {
            const weight = this.weights[result.severity] || 10;
            totalWeight += weight;
            if (result.passed) {
                passedWeight += weight;
            }
        }

        if (totalWeight === 0) return 100;

        return Math.round((passedWeight / totalWeight) * 100);
    }

    /**
     * Calcula grade basado en score
     */
    calculateGrade(score) {
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

    /**
     * Genera recomendaciones priorizadas
     */
    generateRecommendations(results) {
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
        const lines = [];

        lines.push('');
        lines.push('==============================================');
        lines.push('        OMNYSYS PIPELINE INTEGRITY REPORT');
        lines.push('==============================================');
        lines.push('');
        lines.push(`Timestamp: ${report.timestamp}`);
        lines.push(`Overall Health: ${report.overallHealth}/100 (Grade: ${report.grade})`);
        lines.push('');
        lines.push('Summary:');
        lines.push(`  Passed Checks: ${report.summary.passedChecks}/${report.summary.totalChecks}`);
        lines.push(`  Failed Checks: ${report.summary.failedChecks}`);
        lines.push(`  Critical Issues: ${report.summary.criticalIssues}`);
        lines.push(`  Warnings: ${report.summary.warnings}`);
        lines.push('');

        if (report.criticalIssues.length > 0) {
            lines.push('CRITICAL ISSUES:');
            for (const issue of report.criticalIssues) {
                lines.push(`   - ${issue.check}: ${issue.recommendation}`);
            }
            lines.push('');
        }

        if (report.warnings.length > 0) {
            lines.push('WARNINGS:');
            for (const issue of report.warnings) {
                lines.push(`   - ${issue.check}: ${issue.recommendation}`);
            }
            lines.push('');
        }

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
}

export default IntegrityDashboard;
