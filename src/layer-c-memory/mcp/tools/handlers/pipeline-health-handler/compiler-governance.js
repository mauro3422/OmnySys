import {
    loadCompilerDiagnosticsSnapshot
} from '../../../../../shared/compiler/index.js';

export async function enrichPipelineHealthWithCompilerGovernance({
    tool,
    projectPath,
    db,
    policySummary,
    compilerRemediation,
    tableCounts,
    warnings,
    issues
}) {
    const recentWatcherAlerts = tool.recentNotifications?.watcherAlerts || tool.latestRecentErrors?.watcherAlerts || [];
    const compilerDiagnostics = await loadCompilerDiagnosticsSnapshot({
        projectPath,
        db,
        policySummary,
        watcherAlerts: recentWatcherAlerts,
        sharedState: tool.server?.sharedCache?.metadata?.sharedState || tool.server?.sharedState || {},
        compilerRemediation,
        tableCounts
    });

    const {
        persistedFileCoverage,
        fileImportEvidenceCoverage,
        systemMapPersistenceCoverage,
        metadataSurfaceParity,
        semanticSurfaceGranularity,
        semanticCanonicality: canonicalSemanticSurface,
        standardizationReport,
        compilerContractLayer
    } = compilerDiagnostics;

    if (compilerContractLayer.summary.healthy === false) {
        warnings.push({
            field: 'compiler_contract_layer',
            coverage: `${compilerContractLayer.summary.failedInvariantCount} invariant(s) failed`,
            issue: 'The explicit compiler contract layer reports truth-surface violations; block new wrappers until the contract is healthy.'
        });
    }

    if (compilerContractLayer.apiGovernance.shouldCreateCanonicalApi === true) {
        warnings.push({
            field: 'compiler_api_governance',
            coverage: `${compilerContractLayer.apiGovernance.currentCreationCandidates.length} candidate(s)`,
            issue: 'The contract layer recommends creating or consolidating canonical APIs before adding more local wrappers.'
        });
    }

    const governanceMetrics = compilerContractLayer.apiGovernance.governanceMetrics || {};
    tableCounts.compiler_canonical_wrapper_findings = governanceMetrics.canonicalWrapperFindings || 0;
    tableCounts.compiler_canonical_bypass_findings = governanceMetrics.canonicalBypassFindings || 0;
    tableCounts.compiler_parallel_surface_findings = governanceMetrics.parallelCanonicalSurfaceFindings || 0;

    if ((governanceMetrics.canonicalWrapperFindings || 0) > 0) {
        warnings.push({
            field: 'compiler_canonical_wrappers',
            coverage: `${governanceMetrics.canonicalWrapperFindings} wrapper finding(s)`,
            issue: 'Runtime modules still wrap canonical shared/compiler APIs locally instead of calling them directly.'
        });
    }

    if ((governanceMetrics.canonicalBypassFindings || 0) > 0) {
        warnings.push({
            field: 'compiler_canonical_bypass',
            coverage: `${governanceMetrics.canonicalBypassFindings} bypass finding(s)`,
            issue: 'Some modules still recompute canonical diagnostics or policy surfaces instead of consuming the canonical snapshot.'
        });
    }

    if ((governanceMetrics.parallelCanonicalSurfaceFindings || 0) > 0) {
        warnings.push({
            field: 'compiler_parallel_surfaces',
            coverage: `${governanceMetrics.parallelCanonicalSurfaceFindings} parallel surface finding(s)`,
            issue: 'The compiler still sees local policy/helper surfaces that should be consolidated into the canonical layer.'
        });
    }

    const compilerHealthScore = Math.max(0, 100 - (issues.length * 15) - (warnings.length * 5));
    const expectedGovernanceFindings =
        (governanceMetrics.canonicalWrapperFindings || 0) +
        (governanceMetrics.canonicalBypassFindings || 0) +
        (governanceMetrics.parallelCanonicalSurfaceFindings || 0) +
        (compilerContractLayer.summary.failedInvariantCount || 0) +
        (tableCounts.compiler_policy_high || 0) * 2;
    const governancePenalty = expectedGovernanceFindings * 5;
    const governanceScore = Math.max(0, 100 - governancePenalty);

    return {
        persistedFileCoverage,
        fileImportEvidenceCoverage,
        systemMapPersistenceCoverage,
        metadataSurfaceParity,
        semanticSurfaceGranularity,
        standardizationReport,
        compilerContractLayer,
        semanticCanonicality: canonicalSemanticSurface,
        healthScore: Math.max(0, Math.floor((compilerHealthScore * 0.7) + (governanceScore * 0.3)))
    };
}
