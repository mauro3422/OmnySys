/**
 * @fileoverview standardization-report.js
 *
 * Reporte canónico para decidir qué familias del compilador ya están
 * estandarizadas, cuáles siguen con deriva en sus consumers y qué nuevas
 * APIs conviene crear según la telemetría viva del sistema.
 *
 * @module shared/compiler/standardization-report
 */

import {
  buildMissingCanonicalApis,
  buildMissingCanonicalSurfaceReport
} from './standardization-report/recommendations.js';

const CANONICAL_COMPILER_FAMILIES = [
  { id: 'duplicates', label: 'Duplicate policy', status: 'canonical' },
  { id: 'impact', label: 'Impact/topology', status: 'canonical' },
  { id: 'file_discovery', label: 'File discovery', status: 'canonical' },
  { id: 'signal_coverage', label: 'Signal coverage', status: 'canonical' },
  { id: 'file_import_evidence', label: 'File import evidence coverage', status: 'canonical' },
  { id: 'system_map_persistence', label: 'System-map persistence coverage', status: 'canonical' },
  { id: 'metadata_surface_parity', label: 'Metadata surface parity', status: 'canonical' },
  { id: 'metadata_propagation', label: 'Metadata propagation drift', status: 'canonical' },
  { id: 'semantic_surface_granularity', label: 'Semantic surface granularity', status: 'canonical' },
  { id: 'file_universe_granularity', label: 'File-universe granularity', status: 'canonical' },
  { id: 'live_row_drift', label: 'Live/stale row drift', status: 'canonical' },
  { id: 'pipeline_orphans', label: 'Pipeline orphan classification', status: 'canonical' },
  { id: 'dead_code', label: 'Dead code reporting/remediation', status: 'canonical' },
  { id: 'watcher_diagnostics', label: 'Watcher diagnostics contract', status: 'canonical' },
  { id: 'watcher_lifecycle', label: 'Watcher diagnostics lifecycle', status: 'canonical' },
  { id: 'runtime_ownership', label: 'Runtime ownership/daemon lock', status: 'canonical' },
  { id: 'state_ownership', label: 'State ownership/singleton policy', status: 'canonical' },
  { id: 'service_boundary', label: 'Service boundary policy', status: 'canonical' },
  { id: 'canonical_extension', label: 'Canonical extension policy', status: 'canonical' },
  { id: 'async_error', label: 'Async error/recovery policy', status: 'canonical' },
  { id: 'shared_state_hotspots', label: 'Shared-state hotspot policy', status: 'canonical' },
  { id: 'centrality_coverage', label: 'Centrality coverage policy', status: 'canonical' },
  { id: 'testability', label: 'Testability policy', status: 'canonical' },
  { id: 'semantic_purity', label: 'Semantic purity policy', status: 'canonical' },
  { id: 'compiler_diagnostics', label: 'Compiler diagnostics', status: 'canonical' },
  { id: 'session_lifecycle', label: 'Session/restart lifecycle', status: 'canonical' },
  { id: 'remediation', label: 'Compiler remediation backlog', status: 'canonical' }
];

function normalizeDriftArea(area, count = 0) {
  return {
    area,
    count,
    status: count > 0 ? 'adoption_gap' : 'stable'
  };
}

function buildCanonicalAdoptionCoverage(canonicalFamilies = [], adoptionGaps = []) {
  const totalFamilies = canonicalFamilies.length;
  const adoptedFamilies = canonicalFamilies.filter((family) =>
    !adoptionGaps.some((gap) => gap.area === family.id)
  ).length;

  return {
    totalFamilies,
    adoptedFamilies,
    adoptionRatio: totalFamilies > 0 ? Number((adoptedFamilies / totalFamilies).toFixed(3)) : 0,
    gapFamilies: adoptionGaps.length
  };
}

export function buildCompilerStandardizationReport({
  policySummary = {},
  watcherAlerts = [],
  sharedState = {},
  compilerRemediation = null,
  canonicalAdoptions = {},
  persistedFileCoverage = null,
  fileImportEvidenceCoverage = null,
  systemMapPersistenceCoverage = null
  ,
  metadataSurfaceParity = null,
  semanticSurfaceGranularity = null,
  fileUniverseGranularity = null,
  contractTaxonomy = null
} = {}) {
  const driftAreas = Object.entries(policySummary?.byPolicyArea || {})
    .map(([area, count]) => normalizeDriftArea(area, count))
    .sort((a, b) => b.count - a.count || a.area.localeCompare(b.area));

  const adoptionGaps = driftAreas.filter((item) => item.count > 0);
  const missingCanonicalApis = buildMissingCanonicalApis({
    driftAreas,
    watcherAlerts,
    sharedState,
    canonicalAdoptions,
    persistedFileCoverage,
    fileImportEvidenceCoverage,
    systemMapPersistenceCoverage,
    metadataSurfaceParity,
    semanticSurfaceGranularity,
    fileUniverseGranularity
  });
  const stableCanonicalFamilies = CANONICAL_COMPILER_FAMILIES.filter((family) =>
    !adoptionGaps.some((gap) => gap.area === family.id)
  );
  const adoptionCoverage = buildCanonicalAdoptionCoverage(CANONICAL_COMPILER_FAMILIES, adoptionGaps);
  const missingCanonicalSurfaces = buildMissingCanonicalSurfaceReport(adoptionGaps);

  const totalRemediationItems = compilerRemediation?.totalItems || 0;
  const contractTaxonomyHealthy = Number(contractTaxonomy?.coverage?.coverageRatio || 0) >= 1;
  const nextAction = missingCanonicalApis[0]?.recommendation
    || missingCanonicalSurfaces[0]?.recommendation
    || (adoptionGaps.length > 0
      ? 'Reduce policy drift in existing canonical families before adding new ones.'
      : 'No missing canonical family detected right now; focus on adopting the existing ones consistently.');

  return {
    canonicalFamilies: CANONICAL_COMPILER_FAMILIES,
    stableCanonicalFamilies,
    adoptionGaps,
    adoptionCoverage,
    contractTaxonomy,
    missingCanonicalApis,
    missingCanonicalSurfaces,
    summary: {
      canonicalFamilyCount: CANONICAL_COMPILER_FAMILIES.length,
      adoptionGapCount: adoptionGaps.length,
      missingCanonicalApiCount: missingCanonicalApis.length,
      missingCanonicalSurfaceCount: missingCanonicalSurfaces.length,
      contractTaxonomyHealthy,
      totalRemediationItems,
      nextAction
    }
  };
}
