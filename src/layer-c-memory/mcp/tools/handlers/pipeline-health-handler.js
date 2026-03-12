/**
 * Maneja el autodiagnóstico del pipeline (pipeline_health)
 * @param {Object} tool - Instancia de AggregateMetricsTool
 * @returns {Promise<Object>} Resultado del diagnóstico
 */
import { checkMetadataParity } from './pipeline-health-domain/metadata-health.js';
import { enrichPipelineHealthWithCompilerGovernance } from './pipeline-health-handler/compiler-governance.js';
import { collectPipelineHealthFoundation } from './pipeline-health-handler/foundation.js';



export async function aggregatePipelineHealth(tool) {
    const db = tool.repo?.db;
    if (!db) throw new Error('Repository (DB) not available');
    const projectPath = tool.projectPath;

    try {
        const {
            issues,
            warnings,
            tableCounts,
            liveRowSync,
            liveRowReconciliation,
            liveRowRemediation,
            deadCodeRemediation,
            duplicateRemediation,
            pipelineOrphanRemediation,
            compilerRemediation,
            runtimeTableHealth,
            orphanFunctions,
            pipelineOrphanSummary,
            zeroFields,
            suspiciousDeadCandidates,
            policySummary,
            issueSummary
        } = await collectPipelineHealthFoundation({ db, projectPath });

        const {
            persistedFileCoverage,
            fileImportEvidenceCoverage,
            systemMapPersistenceCoverage,
            metadataSurfaceParity,
            semanticSurfaceGranularity,
            standardizationReport,
            compilerContractLayer,
            semanticCanonicality: canonicalSemanticSurface,
            healthScore
        } = await enrichPipelineHealthWithCompilerGovernance({
            tool,
            projectPath,
            db,
            policySummary,
            compilerRemediation,
            tableCounts,
            warnings,
            issues
        });
        checkMetadataParity(
            metadataSurfaceParity,
            semanticSurfaceGranularity,
            canonicalSemanticSurface,
            warnings,
            tableCounts
        );
        const grade = healthScore >= 80 ? 'A' : healthScore >= 60 ? 'B' : healthScore >= 40 ? 'C' : 'D';

        return {
            healthScore,
            grade,
            tableCounts,
            issues,
            warnings,
            liveRowSync,
            liveRowReconciliation,
            liveRowRemediation,
            deadCodeRemediation,
            duplicateRemediation,
            pipelineOrphanRemediation,
            compilerRemediation,
            persistedFileCoverage,
            fileImportEvidenceCoverage,
            systemMapPersistenceCoverage,
            standardizationReport,
            compilerContractLayer,
            runtimeTableHealth,
            semanticCanonicality: canonicalSemanticSurface,
            orphanPipelineFunctions: pipelineOrphanSummary.normalizedOrphans,
            summary: {
                totalIssues: issues.length,
                totalWarnings: warnings.length,
                orphanFunctionsFound: orphanFunctions.length,
                zeroFieldsFound: zeroFields.length,
                suspiciousDeadCandidates,
                issueSummary,
                recommendation: issues.length > 0
                    ? `${issues.length} critical issues detected`
                    : warnings.length > 0
                        ? `${warnings.length} warnings detected — compiler telemetry still needs cleanup`
                        : 'Pipeline looks healthy ✅'
            }
        };
    } catch (error) {
        throw new Error(`Failed to aggregate pipeline health: ${error.message}`);
    }
}
