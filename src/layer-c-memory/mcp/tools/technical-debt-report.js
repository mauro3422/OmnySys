/**
 * @fileoverview technical-debt-report.js
 *
 * Tool MCP para reporte automático de deuda técnica al conectar.
 * Ejecuta múltiples queries de duplicados, orphans y dead code
 * y consolida en un reporte unificado.
 *
 * @module mcp/tools/technical-debt-report
 */

import { AggregateMetricsTool } from './aggregate-metrics.js';

/**
 * Ejecuta reporte completo de deuda técnica
 * @param {Object} args - Argumentos MCP
 * @param {Object} context - Contexto MCP
 * @returns {Promise<Object>} Reporte consolidado
 */
export async function getTechnicalDebtReport(args, context) {
    const aggregateTool = new AggregateMetricsTool();

    try {
        // Ejecutar todas las métricas en paralelo
        const [
            duplicatesResult,
            conceptualResult,
            pipelineHealthResult
        ] = await Promise.all([
            aggregateTool.execute({ aggregationType: 'duplicates', limit: 10 }, context),
            aggregateTool.execute({ aggregationType: 'conceptual_duplicates', limit: 10 }, context),
            aggregateTool.execute({ aggregationType: 'pipeline_health' }, context)
        ]);

        // Consolidar resultados
        const report = {
            summary: {
                structuralDuplicates: duplicatesResult.duplicates?.summary || {},
                conceptualDuplicates: conceptualResult.summary || {},
                pipelineHealth: {
                    score: pipelineHealthResult.healthScore || 0,
                    grade: pipelineHealthResult.grade || 'F',
                    orphans: pipelineHealthResult.orphanPipelineFunctions?.length || 0
                }
            },
            structural: {
                totalGroups: duplicatesResult.duplicates?.summary?.duplicateGroups || 0,
                totalInstances: duplicatesResult.duplicates?.summary?.totalDuplicateInstances || 0,
                topIssues: (duplicatesResult.remediation?.items || []).slice(0, 5).map(item => ({
                    name: item.name || 'Unknown',
                    file: item.canonical?.file || item.file || 'Unknown',
                    groupSize: item.groupSize,
                    urgencyScore: item.urgencyScore,
                    duplicateFiles: item.duplicateFiles?.length || 0
                }))
            },
            conceptual: {
                totalGroups: conceptualResult.summary?.totalGroups || 0,
                totalImplementations: conceptualResult.summary?.totalImplementations || 0,
                highRiskGroups: conceptualResult.summary?.highRisk || 0,
                topIssues: (conceptualResult.groups || []).slice(0, 5).map(group => ({
                    fingerprint: group.semanticFingerprint,
                    concept: group.concept,
                    implementationCount: group.implementationCount,
                    fileCount: group.fileCount,
                    risk: group.risk
                }))
            },
            pipelineOrphans: {
                total: pipelineHealthResult.orphanPipelineFunctions?.length || 0,
                items: (pipelineHealthResult.orphanPipelineFunctions || []).map(orphan => ({
                    name: orphan.name,
                    file: orphan.file,
                    complexity: orphan.complexity,
                    diagnosis: orphan.diagnosis
                }))
            },
            debtScore: calculateDebtScore({
                structuralGroups: duplicatesResult.duplicates?.summary?.duplicateGroups || 0,
                conceptualGroups: conceptualResult.summary?.totalGroups || 0,
                highRiskConceptual: conceptualResult.summary?.highRisk || 0,
                pipelineOrphans: pipelineHealthResult.orphanPipelineFunctions?.length || 0
            }),
            priorityActions: generatePriorityActions({
                structural: duplicatesResult.remediation?.items || [],
                conceptual: conceptualResult.groups || [],
                orphans: pipelineHealthResult.orphanPipelineFunctions || []
            }),
            timestamp: new Date().toISOString()
        };

        return {
            success: true,
            aggregationType: 'technical_debt_report',
            ...report
        };

    } catch (error) {
        console.error('[TechnicalDebtReport] Error:', error.message);
        return {
            success: false,
            error: error.message,
            timestamp: new Date().toISOString()
        };
    }
}

/**
 * Calcula score de deuda técnica (0-100)
 */
function calculateDebtScore(metrics) {
    const {
        structuralGroups = 0,
        conceptualGroups = 0,
        highRiskConceptual = 0,
        pipelineOrphans = 0
    } = metrics;

    // Pesos: structural=3x, conceptual=2x, highRisk=5x, orphans=4x
    const rawScore = (
        (structuralGroups * 3) +
        (conceptualGroups * 2) +
        (highRiskConceptual * 5) +
        (pipelineOrphans * 4)
    );

    // Normalizar a 0-100 (max esperado: 500)
    const normalizedScore = Math.min(100, Math.round((rawScore / 500) * 100));

    return {
        score: normalizedScore,
        level: normalizedScore >= 75 ? 'critical' : normalizedScore >= 50 ? 'high' : normalizedScore >= 25 ? 'medium' : 'low',
        breakdown: {
            structural: structuralGroups * 3,
            conceptual: conceptualGroups * 2,
            highRisk: highRiskConceptual * 5,
            orphans: pipelineOrphans * 4
        }
    };
}

/**
 * Genera acciones prioritarias basadas en los datos
 */
function generatePriorityActions(data) {
    const actions = [];
    const { structural, conceptual, orphans } = data;

    // Top structural duplicates
    if (structural.length > 0) {
        const top = structural[0];
        actions.push({
            priority: 'high',
            type: 'structural_duplicate',
            action: `Consolidar ${top.groupSize} duplicados de '${top.name}' en ${top.canonical?.file || top.file}`,
            impact: `Reducir ${top.duplicateFiles} archivos duplicados`,
            urgencyScore: top.urgencyScore
        });
    }

    // High risk conceptual duplicates
    const highRiskConceptual = conceptual.filter(g => g.risk === 'high').slice(0, 3);
    highRiskConceptual.forEach(group => {
        actions.push({
            priority: 'high',
            type: 'conceptual_duplicate',
            action: `Estandarizar ${group.implementationCount} implementaciones de '${group.concept.verb}:${group.concept.chest}:${group.concept.domain}:${group.concept.entity}'`,
            impact: `Reducir ${group.fileCount} archivos con lógica similar`,
            urgencyScore: group.implementationCount
        });
    });

    // Pipeline orphans
    orphans.forEach(orphan => {
        actions.push({
            priority: 'medium',
            type: 'pipeline_orphan',
            action: `Revisar '${orphan.name}' en ${orphan.file}`,
            impact: orphan.diagnosis,
            urgencyScore: orphan.complexity
        });
    });

    // Ordenar por urgencia
    return actions.sort((a, b) => b.urgencyScore - a.urgencyScore).slice(0, 10);
}

/**
 * Export como MCP tool
 */
export const technical_debt_report = async (args, context) => {
    return getTechnicalDebtReport(args, context);
};

export default { technical_debt_report };
