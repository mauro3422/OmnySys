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
        issuePersistence = null,
        folderization = [],
        folderizationFamilyState = null,
        folderizationNaming = null,
        folderizationNamingPatterns = null,
        folderizationNormalization = null,
        folderizationCreationGuidance = null
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

    if (issuePersistence && Number(issuePersistence.orphanedIssues || 0) > 0) {
        actions.push({
            priority: Number(issuePersistence.orphanedIssues || 0) > 100 ? 'high' : 'medium',
            type: 'issue_persistence',
            action: 'Reconcile watcher issue persistence and lifecycle metadata',
            impact: `Watcher active=${issuePersistence.activeIssueCount || 0}, orphans=${issuePersistence.orphanedIssues || 0}, withoutLifecycle=${issuePersistence.withoutLifecycle || 0}, withoutContext=${issuePersistence.withoutContext || 0}`,
            urgencyScore: Number(issuePersistence.orphanedIssues || 0) + Number(issuePersistence.withoutLifecycle || 0) + Number(issuePersistence.withoutContext || 0)
        });
    }

    const folderizableFamilies = folderization
        .filter((plan) => plan?.decision === 'approve')
        .slice(0, 5);
    folderizableFamilies.forEach((plan) => {
      actions.push({
        priority: 'high',
        type: 'folderization_candidate',
        action: `Folderize ${plan.candidate?.familyRoot || 'family'} into ${plan.candidate?.recommendedFolder || 'dedicated folder'}`,
        impact: `Requires ${plan.moveTargets?.length || 0} moves, ${plan.importImpact?.rewriteCount || 0} rewrites and affects ${plan.importImpact?.impactedFileCount || 0} dependent file(s)`,
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

    const normalizationSummary = folderizationNormalization?.summary || folderizationNormalization || null;
    if (normalizationSummary?.renameTargetCount > 0) {
        const safetyLevel = normalizationSummary.safetyLevel || folderizationNormalization?.analysis?.safety?.level || 'none';
        actions.push({
            priority: safetyLevel === 'safe' ? 'high' : 'medium',
            type: 'folderization_naming_normalizer',
            action: `Review normalization for ${normalizationSummary.renameTargetCount} folderized naming target(s) across ${normalizationSummary.familyCount || 0} family/families`,
            impact: `Safety=${safetyLevel}, density=${normalizationSummary.renameTargetDensity || 0}, recommended=${normalizationSummary.recommendedAction || folderizationNormalization?.analysis?.recommendation?.action || 'noop'}`,
            urgencyScore: normalizationSummary.renameTargetCount * 2 + (safetyLevel === 'safe' ? 10 : 0)
        });
    }

    if (folderizationCreationGuidance?.guidance) {
        actions.push({
            priority: 'low',
            type: 'folderization_creation_guidance',
            action: folderizationCreationGuidance.guidance,
            impact: folderizationCreationGuidance.preferredFolder
                ? `Prefer ${folderizationCreationGuidance.preferredFolder} with stems like ${(folderizationCreationGuidance.preferredRoleStems || []).slice(0, 3).map((item) => item.stem).join(', ')}`
                : 'Prefer folderized family directories and role-only basenames',
            urgencyScore: (folderizationCreationGuidance.preferredRoleStems?.length || 0) + (folderizationCreationGuidance.familyExamples?.length || 0)
        });
    }

    return actions.sort((a, b) => b.urgencyScore - a.urgencyScore).slice(0, 10);
}
