import {
  buildEmptyFolderizationReport,
  buildFolderizationReportFromRepo
} from '../../../../../shared/compiler/index.js';
import {
  buildEmptyConceptualResult,
  buildEmptyDuplicatesResult,
  buildEmptyPipelineHealthResult
} from '../../technical-debt-report-cache.js';

function buildTechnicalDebtReportNeeds(snapshotCurrent = {}, folderizationSnapshotReport = null) {
  return {
    needsStructuralDetails: Number(snapshotCurrent.structuralGroups || 0) > 0,
    needsConceptualDetails:
      Number(snapshotCurrent.conceptualGroups || 0) > 0
      || Number(snapshotCurrent.conceptualRawGroups || 0) > 0,
    needsPipelineDetails: Number(snapshotCurrent.pipelineOrphans || 0) > 0,
    needsFolderizationDetails: Boolean(folderizationSnapshotReport)
      || Number(snapshotCurrent.folderizationCandidateCount || 0) > 0
      || Number(snapshotCurrent.namingDebt || 0) > 0
      || Number(snapshotCurrent.namingFamilies || 0) > 0
      || Number(snapshotCurrent.namingTargets || 0) > 0
      || Number(snapshotCurrent.flatFamilies || 0) > 0
      || Number(snapshotCurrent.mixedFamilies || 0) > 0
  };
}

export async function loadTechnicalDebtReportArtifacts({
  aggregateTool,
  context,
  repo,
  folderizationOptions,
  snapshotCurrent,
  folderizationSnapshotReport = null
} = {}) {
  const needs = buildTechnicalDebtReportNeeds(snapshotCurrent, folderizationSnapshotReport);

  const [
    duplicatesResult,
    conceptualResult,
    pipelineHealthResult,
    folderizationReport
  ] = await Promise.all([
    needs.needsStructuralDetails
      ? aggregateTool.execute({ aggregationType: 'duplicates', limit: 10 }, context)
          .catch((error) => {
            console.error('[technical-debt] Failed to load duplicates:', error.message);
            return buildEmptyDuplicatesResult();
          })
      : buildEmptyDuplicatesResult(),
    needs.needsConceptualDetails
      ? aggregateTool.execute({ aggregationType: 'conceptual_duplicates', limit: 10 }, context)
          .catch((error) => {
            console.error('[technical-debt] Failed to load conceptual duplicates:', error.message);
            return buildEmptyConceptualResult();
          })
      : buildEmptyConceptualResult(),
    needs.needsPipelineDetails
      ? aggregateTool.execute({ aggregationType: 'pipeline_health' }, context)
          .catch((error) => {
            console.error('[technical-debt] Failed to load pipeline health:', error.message);
            return buildEmptyPipelineHealthResult();
          })
      : buildEmptyPipelineHealthResult(),
    folderizationSnapshotReport
      || (repo && needs.needsFolderizationDetails
        ? Promise.resolve(buildFolderizationReportFromRepo(repo, folderizationOptions))
            .catch((error) => {
              console.error('[technical-debt] Failed to load folderization report:', error.message);
              return buildEmptyFolderizationReport(folderizationOptions);
            })
        : buildEmptyFolderizationReport(folderizationOptions))
  ]);

  return {
    duplicatesResult,
    conceptualResult,
    pipelineHealthResult,
    folderizationReport
  };
}
