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
} from './recommendations.js';
import { CANONICAL_COMPILER_FAMILIES } from '../standardization-report-catalog.js';
import {
  buildCanonicalAdoptionCoverage,
  normalizeDriftArea
} from './helpers.js';

const CANONICAL_FAMILY_IDS = new Set(CANONICAL_COMPILER_FAMILIES.map((family) => family.id));

export function buildCompilerStandardizationReport({
  policySummary = {},
  watcherAlerts = [],
  sharedState = {},
  compilerRemediation = null,
  canonicalAdoptions = {},
  persistedFileCoverage = null,
  fileImportEvidenceCoverage = null,
  systemMapPersistenceCoverage = null,
  metadataSurfaceParity = null,
  metadataExtractionCoverage = null,
  semanticSurfaceGranularity = null,
  fileUniverseGranularity = null,
  contractTaxonomy = null,
  dataGatewayContract = null
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
    metadataExtractionCoverage,
    semanticSurfaceGranularity,
    fileUniverseGranularity,
    dataGatewayContract
  });
  const stableCanonicalFamilies = CANONICAL_COMPILER_FAMILIES.filter((family) =>
    !adoptionGaps.some((gap) => gap.area === family.id)
  );
  const adoptionCoverage = buildCanonicalAdoptionCoverage(CANONICAL_COMPILER_FAMILIES, adoptionGaps);
  const missingCanonicalSurfaces = buildMissingCanonicalSurfaceReport(adoptionGaps)
    .filter((surface) => !CANONICAL_FAMILY_IDS.has(surface.id));

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
