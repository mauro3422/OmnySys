/**
 * @fileoverview orchestration-gap-detector.js
 *
 * Meta-detector que verifica conexiones entre sistemas del pipeline.
 * A diferencia de los detectores tradicionales (que buscan código problemático),
 * este detector busca **flujos incompletos** o **conexiones faltantes**.
 *
 * @module layer-a-static/pattern-detection/detectors/orchestration-gap-detector
 */

import { PatternDetector } from '../detector-base.js';
import { createLogger } from '../../../utils/logger.js';

const logger = createLogger('OmnySys:OrchestrationGapDetector');

/**
 * Detecta brechas de orquestación en el pipeline
 */
export class OrchestrationGapDetector extends PatternDetector {
    constructor(options = {}) {
        super({
            id: 'orchestration-gaps',
            name: 'Orchestration Gap Detector',
            description: 'Detecta conexiones faltantes entre sistemas del pipeline',
            ...options
        });
    }

    /**
     * Detecta brechas en el flujo post-Phase 2
     * @param {Object} systemMap - Mapa del sistema
     * @returns {Object} Resultados de la detección
     */
    async detect(systemMap) {
        const findings = [];
        const files = systemMap?.files || {};

        // Check 1: Verificar si existe hook post-Phase 2
        const phase2IndexerPath = Object.keys(files).find(p => p.includes('phase2-indexer'));
        if (phase2IndexerPath) {
            const phase2File = files[phase2IndexerPath];
            const hasPostPhase2Hook = this._hasPostPhase2Hook(phase2File);

            if (!hasPostPhase2Hook) {
                findings.push({
                    type: 'missing-post-phase2-consolidation',
                    severity: 'high',
                    file: phase2IndexerPath,
                    message: 'Phase 2 indexer missing post-completion consolidation hook',
                    recommendation: 'Add post-Phase 2 tasks for technical debt report generation',
                    impact: 'Technical debt metrics not consolidated after deep scan'
                });
            }
        }

        // Check 2: Verificar si existen MCP tools de consolidación
        const mcpToolsPath = Object.keys(files).find(p => p.includes('technical-debt-report'));
        if (!mcpToolsPath) {
            findings.push({
                type: 'missing-debt-consolidation-tool',
                severity: 'medium',
                message: 'No MCP tool for consolidated technical debt report',
                recommendation: 'Create technical-debt-report.js MCP tool',
                impact: 'Users must manually query individual debt metrics'
            });
        }

        // Check 3: Verificar conexión guards → semantic_issues
        const guardsWithPersistence = this._findGuardsWithPersistence(files);
        if (guardsWithPersistence.length === 0) {
            findings.push({
                type: 'guards-not-persisting-findings',
                severity: 'high',
                message: 'No guards persisting findings to semantic_issues',
                recommendation: 'Ensure guards call persistWatcherIssue()',
                impact: 'Guard findings lost after execution'
            });
        }

        // Check 4: Verificar si hay reporte automático de deuda
        const hasDebtReport = this._hasDebtReportGeneration(files);
        if (!hasDebtReport) {
            findings.push({
                type: 'missing-automatic-debt-report',
                severity: 'medium',
                message: 'No automatic technical debt report generation',
                recommendation: 'Implement post-Phase 2 debt report consolidation',
                impact: 'Technical debt only visible via manual MCP tool calls'
            });
        }

        return this._summarize(findings);
    }

    /**
     * Verifica si el archivo tiene hook post-Phase 2
     */
    _hasPostPhase2Hook(fileData) {
        const atoms = fileData?.atoms || [];
        const hasCompleteHook = atoms.some(atom =>
            atom.name?.includes('stop') &&
            atom.name?.includes('complete')
        );

        const hasPostCompletionTask = atoms.some(atom => {
            const code = atom.code || '';
            return code.includes('post') &&
                   code.includes('Phase2') &&
                   code.includes('completion');
        });

        return hasCompleteHook || hasPostCompletionTask;
    }

    /**
     * Encuentra guards que persisten findings
     */
    _findGuardsWithPersistence(files) {
        const guardPaths = Object.keys(files).filter(p => p.includes('guard'));
        const guardsWithPersistence = [];

        for (const guardPath of guardPaths) {
            const guardFile = files[guardPath];
            const atoms = guardFile?.atoms || [];

            const hasPersistence = atoms.some(atom =>
                atom.name?.includes('persist') ||
                atom.name?.includes('WatcherIssue')
            );

            if (hasPersistence) {
                guardsWithPersistence.push(guardPath);
            }
        }

        return guardsWithPersistence;
    }

    /**
     * Verifica si hay generación de reporte de deuda
     */
    _hasDebtReportGeneration(files) {
        const debtPaths = Object.keys(files).filter(p =>
            p.includes('debt') || p.includes('deuda')
        );

        if (debtPaths.length === 0) return false;

        for (const debtPath of debtPaths) {
            const debtFile = files[debtPath];
            const atoms = debtFile?.atoms || [];

            const hasReportGeneration = atoms.some(atom =>
                atom.name?.includes('report') ||
                atom.name?.includes('consolidate')
            );

            if (hasReportGeneration) return true;
        }

        return false;
    }

    /**
     * Resume los hallazgos
     */
    _summarize(findings) {
        const highCount = findings.filter(f => f.severity === 'high').length;
        const mediumCount = findings.filter(f => f.severity === 'medium').length;
        const score = Math.max(0, 100 - highCount * 20 - mediumCount * 10);

        return {
            detector: 'orchestration-gap',
            findings,
            score,
            summary: {
                missingPostPhase2Hook: findings.filter(f => f.type === 'missing-post-phase2-consolidation').length,
                missingDebtConsolidationTool: findings.filter(f => f.type === 'missing-debt-consolidation-tool').length,
                guardsNotPersisting: findings.filter(f => f.type === 'guards-not-persisting-findings').length,
                missingAutomaticDebtReport: findings.filter(f => f.type === 'missing-automatic-debt-report').length,
                totalFindings: findings.length
            },
            recommendations: findings.map(f => f.recommendation)
        };
    }
}

export default OrchestrationGapDetector;
