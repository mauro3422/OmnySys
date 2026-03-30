/**
 * @fileoverview Shared helpers for technical debt report assembly.
 *
 * These helpers keep the MCP tool lean while preserving the current
 * reporting semantics.
 *
 * @module mcp/tools/technical-debt-report-helpers
 */

/**
 * Calculates technical debt score (0-100).
 * @param {Object} metrics - Aggregated metrics used for scoring
 * @returns {{ score: number, level: string, breakdown: Object }}
 */
export function calculateTechnicalDebtScore(metrics) {
    const {
        structuralGroups = 0,
        conceptualGroups = 0,
        highRiskConceptual = 0,
        pipelineOrphans = 0,
        flatFamilies = 0,
        mixedFamilies = 0,
        namingFamilies = 0,
        namingTargets = 0
    } = metrics;

    const rawScore = (
        (structuralGroups * 3) +
        (conceptualGroups * 2) +
        (highRiskConceptual * 5) +
        (pipelineOrphans * 4) +
        (flatFamilies * 2) +
        (mixedFamilies * 3)
    );

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
            mixedFamilies: mixedFamilies * 3,
            namingFamilies,
            namingTargets
        }
    };
}

/**
 * Generate priority actions based on the data.
 * @param {Object} data - Report sections to transform into actions
 * @returns {Array<Object>} Sorted actions
 */
export function buildTechnicalDebtPriorityActions(data) {
    const actions = [];
    const {
        structural,
        conceptual,
        orphans,
        folderization = [],
        folderizationFamilyState = null,
        folderizationNaming = null,
        folderizationNamingPatterns = null
    } = data;

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

    const namingPatternCounts = folderizationNamingPatterns?.patternCounts || {};
    const namingPatternPriority = [
        ['collision_avoidance', namingPatternCounts.collision_avoidance || 0],
        ['rooted', namingPatternCounts.rooted || 0],
        ['shortened', namingPatternCounts.shortened || 0]
    ].filter(([, count]) => count > 0);

    if (namingPatternPriority.length > 0) {
        const [patternName, patternCount] = namingPatternPriority[0];
        actions.push({
            priority: patternName === 'collision_avoidance' ? 'high' : 'medium',
            type: 'folderization_naming_pattern',
            action: `Normalize ${patternCount} ${patternName.replace(/_/g, ' ')} naming target(s)`,
            impact: `Pattern summary: ${Object.entries(namingPatternCounts).filter(([, count]) => count > 0).map(([name, count]) => `${name}:${count}`).join(', ')}`,
            urgencyScore: patternCount * 3 + (patternName === 'collision_avoidance' ? 10 : 0)
        });
    }

    if (folderizationNaming?.renameTargetCount > 0) {
        actions.push({
            priority: 'medium',
            type: 'folderization_naming_debt',
            action: `Reduce ${folderizationNaming.renameTargetCount} remaining naming target(s) across ${folderizationNaming.familyCount} folderized families`,
            impact: `Naming debt remains concentrated in already-folderized helper surfaces`,
            urgencyScore: folderizationNaming.renameTargetCount + folderizationNaming.familyCount
        });
    }

    return actions.sort((a, b) => b.urgencyScore - a.urgencyScore).slice(0, 10);
}
