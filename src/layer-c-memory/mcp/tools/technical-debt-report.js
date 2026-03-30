/**
 * @fileoverview technical-debt-report.js
 *
 * MCP tool for automatic technical debt reporting at connect time.
 * Executes multiple duplicate, orphan and dead code queries and
 * consolidates them into a unified report.
 *
 * @module mcp/tools/technical-debt-report
 */

import { AggregateMetricsTool } from './aggregate-metrics.js';
import { getRepository } from '#layer-c/storage/repository/index.js';
import {
    buildEmptyFolderizationReport,
    buildFolderizationReportFromRepo
} from '../../../shared/compiler/index.js';
import {
    buildTechnicalDebtPriorityActions,
    calculateTechnicalDebtScore
} from './technical-debt-report-helpers.js';

/**
 * Executes the complete technical debt report.
 * @param {Object} args - MCP arguments
 * @param {Object} context - MCP context
 * @returns {Promise<Object>} Consolidated report
 */
export async function getTechnicalDebtReport(args, context) {
    const aggregateTool = new AggregateMetricsTool();

    try {
        const projectPath = context?.projectPath || null;
        const folderizationOptions = {
            scopePath: args?.scopePath || null,
            focusPath: args?.focusPath || null
        };
        const repo = projectPath ? getRepository(projectPath) : null;

        // Execute all metrics in parallel
        const [
            duplicatesResult,
            conceptualResult,
            pipelineHealthResult
        ] = await Promise.all([
            aggregateTool.execute({ aggregationType: 'duplicates', limit: 10 }, context),
            aggregateTool.execute({ aggregationType: 'conceptual_duplicates', limit: 10 }, context),
            aggregateTool.execute({ aggregationType: 'pipeline_health' }, context)
        ]);

        const folderizationReport = repo
            ? buildFolderizationReportFromRepo(repo, folderizationOptions)
            : buildEmptyFolderizationReport();

        // Consolidate results
        const report = {
            summary: {
                structuralDuplicates: duplicatesResult.duplicates?.summary || {},
                conceptualDuplicates: {
                    ...(conceptualResult.summary || {}),
                    actionableGroups: conceptualResult.summary?.actionableGroups ?? conceptualResult.summary?.totalGroups ?? 0,
                    actionableImplementations: conceptualResult.summary?.actionableImplementations ?? conceptualResult.summary?.totalImplementations ?? 0,
                    rawGroups: conceptualResult.summary?.rawGroups ?? conceptualResult.summary?.totalGroups ?? 0,
                    rawImplementations: conceptualResult.summary?.rawImplementations ?? conceptualResult.summary?.totalImplementations ?? 0,
                    noiseByClass: conceptualResult.summary?.noiseByClass || {},
                    chestDistribution: conceptualResult.summary?.chestDistribution || {}
                },
                pipelineHealth: {
                    score: pipelineHealthResult.healthScore || 0,
                    grade: pipelineHealthResult.grade || 'F',
                    orphans: pipelineHealthResult.orphanPipelineFunctions?.length || 0
                },
                folderization: folderizationReport.summary
            },
            structural: {
                totalGroups: duplicatesResult.duplicates?.summary?.duplicateGroups || 0,
                totalInstances: duplicatesResult.duplicates?.summary?.totalDuplicateInstances || 0,
                topIssues: (duplicatesResult.remediation?.items || []).slice(0, 5).map((item) => ({
                    name: item.name || 'Unknown',
                    file: item.canonical?.file || item.file || 'Unknown',
                    groupSize: item.groupSize,
                    urgencyScore: item.urgencyScore,
                    duplicateFiles: item.duplicateFiles?.length || 0
                }))
            },
            conceptual: {
                totalGroups: conceptualResult.summary?.actionableGroups || conceptualResult.summary?.totalGroups || 0,
                actionableGroups: conceptualResult.summary?.actionableGroups || conceptualResult.summary?.totalGroups || 0,
                rawGroups: conceptualResult.summary?.rawGroups || conceptualResult.summary?.totalGroups || 0,
                totalImplementations: conceptualResult.summary?.actionableImplementations || conceptualResult.summary?.totalImplementations || 0,
                actionableImplementations: conceptualResult.summary?.actionableImplementations || conceptualResult.summary?.totalImplementations || 0,
                rawImplementations: conceptualResult.summary?.rawImplementations || conceptualResult.summary?.totalImplementations || 0,
                highRiskGroups: conceptualResult.summary?.highRisk || 0,
                noiseByClass: conceptualResult.summary?.noiseByClass || {},
                chestDistribution: conceptualResult.summary?.chestDistribution || {},
                topIssues: (conceptualResult.groups || []).slice(0, 5).map((group) => ({
                    fingerprint: group.semanticFingerprint,
                    concept: group.concept,
                    implementationCount: group.implementationCount,
                    fileCount: group.fileCount,
                    risk: group.risk
                }))
            },
            pipelineOrphans: {
                total: pipelineHealthResult.orphanPipelineFunctions?.length || 0,
                items: (pipelineHealthResult.orphanPipelineFunctions || []).map((orphan) => ({
                    name: orphan.name,
                    file: orphan.file,
                    complexity: orphan.complexity,
                    diagnosis: orphan.diagnosis
                }))
            },
            folderization: {
                candidates: folderizationReport.candidateReport?.topCandidates || [],
                familyState: folderizationReport.familyState,
                migrationPlans: folderizationReport.migrationPlans?.candidates || [],
                focusPlan: folderizationReport.migrationPlans?.focusCandidate || null,
                naming: folderizationReport.naming,
                namingPatterns: folderizationReport.namingPatterns,
                creationGuidance: folderizationReport.creationGuidance,
                namingDebt: {
                    familyCount: folderizationReport.naming?.familyCount || 0,
                    renameTargetCount: folderizationReport.naming?.renameTargetCount || 0,
                    renameTargetDensity: folderizationReport.naming?.familyCount
                        ? Math.round((folderizationReport.naming?.renameTargetCount || 0) / folderizationReport.naming.familyCount * 100) / 100
                        : 0
                },
                recommendation: folderizationReport.recommendation,
                decision: folderizationReport.decision,
                summary: folderizationReport.summary
            },
            debtScore: calculateTechnicalDebtScore({
                structuralGroups: duplicatesResult.duplicates?.summary?.duplicateGroups || 0,
                conceptualGroups: conceptualResult.summary?.actionableGroups || conceptualResult.summary?.totalGroups || 0,
                highRiskConceptual: conceptualResult.summary?.highRisk || 0,
                pipelineOrphans: pipelineHealthResult.orphanPipelineFunctions?.length || 0,
                flatFamilies: folderizationReport.familyState.stateCounts.flat || 0,
                mixedFamilies: folderizationReport.familyState.stateCounts.mixed || 0,
                namingFamilies: folderizationReport.naming?.familyCount || 0,
                namingTargets: folderizationReport.naming?.renameTargetCount || 0,
                namingPatternFamilies: folderizationReport.namingPatterns?.totalFamilies || 0
            }),
            priorityActions: buildTechnicalDebtPriorityActions({
                structural: duplicatesResult.remediation?.items || [],
                conceptual: conceptualResult.groups || [],
                orphans: pipelineHealthResult.orphanPipelineFunctions || [],
                folderization: folderizationReport.migrationPlans.candidates || [],
                folderizationFamilyState: folderizationReport.familyState,
                folderizationNaming: folderizationReport.naming,
                folderizationNamingPatterns: folderizationReport.namingPatterns,
                folderizationCreationGuidance: folderizationReport.creationGuidance
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
 * Export as MCP tool
 */
export const technical_debt_report = async (args, context) => {
    return getTechnicalDebtReport(args, context);
};

export default { technical_debt_report };
