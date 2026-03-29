import { classifyContractSurface } from '../contract-taxonomy-classification.js';

export function summarizeContractTaxonomyRows(rows = []) {
  const byFamily = {};
  const byFlavor = {};
  const byTruthRole = {};
  const byRepresentationLevel = {};

  for (const row of rows) {
    const surface = classifyContractSurface({
      filePath: row.file_path,
      purposeType: row.purpose_type,
      isExported: row.is_exported === 1
    });

    byFamily[surface.contractFamily] = (byFamily[surface.contractFamily] || 0) + 1;
    byFlavor[surface.contractFlavor] = (byFlavor[surface.contractFlavor] || 0) + 1;
    byTruthRole[surface.truthRole] = (byTruthRole[surface.truthRole] || 0) + 1;
    byRepresentationLevel[surface.representationLevel] = (byRepresentationLevel[surface.representationLevel] || 0) + 1;
  }

  const totalRelevantAtoms = rows.length;
  const classifiedAtoms = totalRelevantAtoms;
  const canonicalCount = byTruthRole.canonical || 0;

  const dominantFamily = Object.entries(byFamily).sort((a, b) => b[1] - a[1])[0]?.[0] || null;
  const dominantFlavor = Object.entries(byFlavor).sort((a, b) => b[1] - a[1])[0]?.[0] || null;

  return {
    coverage: {
      totalRelevantAtoms,
      classifiedAtoms,
      coverageRatio: totalRelevantAtoms > 0
        ? Number((classifiedAtoms / totalRelevantAtoms).toFixed(3))
        : 0
    },
    byFamily,
    byFlavor,
    byTruthRole,
    byRepresentationLevel,
    summary: {
      dominantFamily,
      dominantFlavor,
      canonicalRatio: totalRelevantAtoms > 0
        ? Number((canonicalCount / totalRelevantAtoms).toFixed(3))
        : 0
    }
  };
}
