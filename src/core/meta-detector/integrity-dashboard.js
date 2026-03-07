/**
 * @fileoverview integrity-dashboard.js
 *
 * Dashboard de integridad del pipeline de OmnySys.
 * Calcula score de salud general y genera recomendaciones.
 *
 * @module core/meta-detector/integrity-dashboard
 */

import { createLogger } from '../../utils/logger.js';

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
            const recommendation = this.getRecommendationForResult(result);
            if (recommendation) {
                recommendations.push({
                    priority: result.severity === 'high' ? 'critical' : result.severity === 'medium' ? 'high' : 'medium',
                    action: recommendation.action,
                    reason: recommendation.reason,
                    impact: recommendation.impact,
                    estimatedEffort: recommendation.estimatedEffort
                });
            }
        }
        
        // Ordenar por prioridad
        const priorityOrder = { critical: 0, high: 1, medium: 2, low: 3 };
        recommendations.sort((a, b) => priorityOrder[a.priority] - priorityOrder[b.priority]);
        
        return recommendations;
    }

    /**
     * Obtiene recomendación específica para un resultado
     */
    getRecommendationForResult(result) {
        const recommendations = {
            'scan_to_atom_coverage': {
                action: 'Re-run full analysis with --force-reanalysis',
                reason: `${result.details.missingFiles} files scanned but not indexed`,
                impact: 'Missing files means incomplete analysis and blind spots in guards',
                estimatedEffort: '5-10 minutes (one-time reanalysis)'
            },
            'atom_metadata_completeness': {
                action: 'Fix extractors to populate missing required fields',
                reason: `${result.details.missingRequired} atoms with incomplete metadata`,
                impact: 'Incomplete metadata reduces guard accuracy and MCP tool effectiveness',
                estimatedEffort: '1-2 hours (extractor fixes)'
            },
            'calledBy_resolution': {
                action: 'Enable Class Instantiation Tracker and improve import resolution',
                reason: `${result.details.unresolvedLinks} calledBy links unresolved`,
                impact: 'Unresolved links break impact analysis and dependency tracking',
                estimatedEffort: '2-4 hours (tracker implementation)'
            },
            'guard_execution': {
                action: `Register missing guards: ${result.details.missingGuards?.join(', ') || 'unknown'}`,
                reason: `Only ${result.details.byType?.semantic || 0}/${result.details.expectedGuards?.semantic || 0} semantic guards registered`,
                impact: 'Missing guards means undetected code quality issues',
                estimatedEffort: '30 minutes (guard registration)'
            },
            'issue_persistence': {
                action: result.details.orphanedIssues > 0 
                    ? 'Run lifecycle cleanup to remove orphaned issues'
                    : 'Fix guards to include lifecycle in context',
                reason: result.details.orphanedIssues > 0
                    ? `${result.details.orphanedIssues} orphaned issues from deleted files`
                    : `${result.details.withoutLifecycle} issues missing lifecycle`,
                impact: 'Orphaned issues clutter the system and reduce signal quality',
                estimatedEffort: '1 hour (cleanup script)'
            },
            'mcp_data_access': {
                action: `Fix database access for tools: ${result.details.failedTools?.join(', ') || 'unknown'}`,
                reason: `${result.details.failedTools?.length || 0} MCP tools cannot access data`,
                impact: 'Tools failing means reduced AI assistance capabilities',
                estimatedEffort: '1-2 hours (database fixes)'
            },
            'orphaned_data': {
                action: 'Run database cleanup script to remove orphaned records',
                reason: `${result.details.totalOrphans} orphaned records in database`,
                impact: 'Orphaned data wastes storage and can cause query errors',
                estimatedEffort: '30 minutes (cleanup script)'
            },
            'relation_consistency': {
                action: 'Fix inconsistent relations in calledBy/usedBy links',
                reason: `${result.details.inconsistencies} inconsistent relations found`,
                impact: 'Inconsistent relations break dependency analysis',
                estimatedEffort: '2-3 hours (relation fixes)'
            }
        };
        
        return recommendations[result.name] || {
            action: 'Investigate and fix the issue',
            reason: result.details.error || 'Unknown issue',
            impact: 'System integrity may be compromised',
            estimatedEffort: 'Unknown'
        };
    }

    /**
     * Genera resumen ejecutivo para mostrar en consola
     */
    generateConsoleSummary(report) {
        const lines = [];
        
        lines.push('');
        lines.push('╔══════════════════════════════════════════════════════════════╗');
        lines.push('║        OMNYSYS PIPELINE INTEGRITY REPORT                     ║');
        lines.push('╚══════════════════════════════════════════════════════════════╝');
        lines.push('');
        lines.push(`Timestamp: ${report.timestamp}`);
        lines.push(`Overall Health: ${report.overallHealth}/100 (Grade: ${report.grade})`);
        lines.push('');
        lines.push('Summary:');
        lines.push(`  ✓ Passed Checks: ${report.summary.passedChecks}/${report.summary.totalChecks}`);
        lines.push(`  ✗ Failed Checks: ${report.summary.failedChecks}`);
        lines.push(`  🔴 Critical Issues: ${report.summary.criticalIssues}`);
        lines.push(`  🟡 Warnings: ${report.summary.warnings}`);
        lines.push('');
        
        if (report.criticalIssues.length > 0) {
            lines.push('🔴 CRITICAL ISSUES:');
            for (const issue of report.criticalIssues) {
                lines.push(`   • ${issue.check}: ${issue.recommendation}`);
            }
            lines.push('');
        }
        
        if (report.warnings.length > 0) {
            lines.push('🟡 WARNINGS:');
            for (const issue of report.warnings) {
                lines.push(`   • ${issue.check}: ${issue.recommendation}`);
            }
            lines.push('');
        }
        
        if (report.recommendations.length > 0) {
            lines.push('📋 TOP RECOMMENDATIONS:');
            for (let i = 0; i < Math.min(5, report.recommendations.length); i++) {
                const rec = report.recommendations[i];
                lines.push(`   ${i + 1}. [${rec.priority.toUpperCase()}] ${rec.action}`);
                lines.push(`      Reason: ${rec.reason}`);
                lines.push(`      Effort: ${rec.estimatedEffort}`);
                lines.push('');
            }
        }
        
        lines.push('═══════════════════════════════════════════════════════════════');
        
        return lines.join('\n');
    }
}

export default IntegrityDashboard;
