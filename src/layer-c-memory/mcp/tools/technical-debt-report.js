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
    buildFolderizationCandidateReport,
    buildFolderizationFamilyStateReportFromRepo,
    buildFolderizationMigrationPlanFromRepo,
    buildFolderizationNamingReportFromRepo,
    findFolderizationCandidatesFromRepo
} from '../../../shared/compiler/directory-structure-folderization.js';

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

        const folderizationCandidateList = repo ? findFolderizationCandidatesFromRepo(repo) : [];
        const folderizationCandidates = buildFolderizationCandidateReport(folderizationCandidateList);
        const folderizationFamilyState = repo ? buildFolderizationFamilyStateReportFromRepo(repo) : {
            totalFamilies: 0,
            stateCounts: { flat: 0, mixed: 0, already_folderized: 0 },
            topFamilies: []
        };
        const folderizationMigrationPlans = repo ? buildFolderizationMigrationPlanFromRepo(repo) : {
            candidateCount: 0,
            focusCandidate: null,
            candidates: []
        };
        const folderizationNamingReport = repo ? buildFolderizationNamingReportFromRepo(repo) : {
            familyCount: 0,
            renameTargetCount: 0,
            topFamilies: []
        };

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
                folderization: {
                    candidates: folderizationCandidates.candidateCount || 0,
                    flatFamilies: folderizationFamilyState.stateCounts.flat || 0,
                    mixedFamilies: folderizationFamilyState.stateCounts.mixed || 0,
                    alreadyFolderizedFamilies: folderizationFamilyState.stateCounts.already_folderized || 0,
                    namingFamilies: folderizationNamingReport.familyCount || 0,
                    namingTargets: folderizationNamingReport.renameTargetCount || 0
                }
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
                candidates: folderizationCandidates.topCandidates || [],
                familyState: folderizationFamilyState,
                migrationPlans: folderizationMigrationPlans.candidates || [],
                focusPlan: folderizationMigrationPlans.focusCandidate || null,
                naming: folderizationNamingReport
            },
            debtScore: calculateDebtScore({
                structuralGroups: duplicatesResult.duplicates?.summary?.duplicateGroups || 0,
                conceptualGroups: conceptualResult.summary?.actionableGroups || conceptualResult.summary?.totalGroups || 0,
                highRiskConceptual: conceptualResult.summary?.highRisk || 0,
                pipelineOrphans: pipelineHealthResult.orphanPipelineFunctions?.length || 0,
                flatFamilies: folderizationFamilyState.stateCounts.flat || 0,
                mixedFamilies: folderizationFamilyState.stateCounts.mixed || 0
            }),
            priorityActions: generatePriorityActions({
                structural: duplicatesResult.remediation?.items || [],
                conceptual: conceptualResult.groups || [],
                orphans: pipelineHealthResult.orphanPipelineFunctions || [],
                folderization: folderizationMigrationPlans.candidates || [],
                folderizationFamilyState,
                folderizationNaming: folderizationNamingReport
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
 * Calculates technical debt score (0-100)
 */
function calculateDebtScore(metrics) {
    const {
        structuralGroups = 0,
        conceptualGroups = 0,
        highRiskConceptual = 0,
        pipelineOrphans = 0,
        flatFamilies = 0,
        mixedFamilies = 0
    } = metrics;

    // Weights: structural=3x, conceptual=2x, highRisk=5x, orphans=4x
    const rawScore = (
        (structuralGroups * 3) +
        (conceptualGroups * 2) +
        (highRiskConceptual * 5) +
        (pipelineOrphans * 4) +
        (flatFamilies * 2) +
        (mixedFamilies * 3)
    );

    // Normalize to 0-100 (expected max: 500)
    const normalizedScore = Math.min(100, Math.round((rawScore / 500) * 100));

    return {
        score: normalizedScore,
        level: normalizedScore >= 75 ? 'critical' : normalizedScore >= 50 ? 'high' : normalizedScore >= 25 ? 'medium' : 'low',
        breakdown: {
            structural: structuralGroups * 3,
            conceptual: conceptualGroups * 2,
            highRisk: highRiskConceptual * 5,
            orphans: pipelineOrphans * 4,
            flatFamilies: flatFamilies * 2,
            mixedFamilies: mixedFamilies * 3
        }
    };
}

/**
 * Generate priority actions based on the data.
 */
function generatePriorityActions(data) {
    const actions = [];
    const {
        structural,
        conceptual,
        orphans,
        folderization = [],
        folderizationFamilyState = null,
        folderizationNaming = null
    } = data;

    // Top structural duplicates
    if (structural.length > 0) {
        const top = structural[0];
        actions.push({
            priority: 'high',
            type: 'structural_duplicate',
            action: `Consolidate ${top.groupSize} duplicates of '${top.name}' into ${top.canonical?.file || top.file}`,
            impact: `Reduce ${top.duplicateFiles} duplicate files`,
            urgencyScore: top.urgencyScore
        });
    }

    // High risk conceptual duplicates
    const highRiskConceptual = conceptual.filter((g) => g.risk === 'high').slice(0, 3);
    highRiskConceptual.forEach((group) => {
        actions.push({
            priority: 'high',
            type: 'conceptual_duplicate',
            action: `Standardize ${group.implementationCount} implementations of '${group.concept.verb}:${group.concept.chest}:${group.concept.domain}:${group.concept.entity}'`,
            impact: `Reduce ${group.fileCount} files with similar logic`,
            urgencyScore: group.implementationCount
        });
    });

    // Pipeline orphans
    orphans.forEach((orphan) => {
        actions.push({
            priority: 'medium',
            type: 'pipeline_orphan',
            action: `Review '${orphan.name}' in ${orphan.file}`,
            impact: orphan.diagnosis,
            urgencyScore: orphan.complexity
        });
    });

    const folderizableFamilies = folderization
        .filter((plan) => plan?.decision === 'approve')
        .slice(0, 5);
    folderizableFamilies.forEach((plan) => {
        actions.push({
            priority: 'high',
            type: 'folderization_candidate',
            action: `Folderize ${plan.candidate?.familyRoot || 'family'} into ${plan.candidate?.recommendedFolder || 'dedicated folder'}`,
            impact: `Requires ${plan.moveTargets?.length || 0} moves and ${plan.importImpact?.rewriteCount || 0} rewrites`,
            urgencyScore: (plan.candidate?.confidence || 0) + (plan.importImpact?.rewriteCount || 0)
        });
    });

    const mixedFamilies = folderizationFamilyState?.topFamilies
        ?.filter((family) => family.migrationState === 'mixed')
        ?.slice(0, 3) || [];
    mixedFamilies.forEach((family) => {
        actions.push({
            priority: 'medium',
            type: 'folderization_mixed',
            action: `Complete migration of ${family.familyRoot} in ${family.directory}`,
            impact: `Mixed state: ${family.rootFileCount} root / ${family.folderFileCount} folderized`,
            urgencyScore: family.rootFileCount + family.folderFileCount
        });
    });

    const namingFamilies = folderizationNaming?.topFamilies?.slice(0, 3) || [];
    namingFamilies.forEach((family) => {
        const topTarget = family.renameTargets?.[0] || null;
        actions.push({
            priority: 'medium',
            type: 'folderization_naming',
            action: `Simplify names for ${family.familyRoot} in ${family.directory}`,
            impact: topTarget
                ? `Rename ${family.renameTargetCount} files; example: ${topTarget.currentName} -> ${topTarget.recommendedName}`
                : `Rename ${family.renameTargetCount} folderized files`,
            urgencyScore: family.renameTargetCount * 2 + family.fileCount
        });
    });

    // Order by urgency
    return actions.sort((a, b) => b.urgencyScore - a.urgencyScore).slice(0, 10);
}

/**
 * Export as MCP tool
 */
export const technical_debt_report = async (args, context) => {
    return getTechnicalDebtReport(args, context);
};

export default { technical_debt_report };
