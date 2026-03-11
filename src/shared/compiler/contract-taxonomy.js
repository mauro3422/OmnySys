function normalizeFilePath(filePath = '') {
  return String(filePath || '').replace(/\\/g, '/').toLowerCase();
}

function inferContractFamily(normalizedFilePath) {
  if (
    normalizedFilePath.includes('/extractors/') ||
    normalizedFilePath.includes('/parser/') ||
    normalizedFilePath.includes('/ast-')
  ) {
    return 'syntax_model';
  }

  if (
    normalizedFilePath.includes('/storage/') ||
    normalizedFilePath.includes('/repository/') ||
    normalizedFilePath.includes('/query/')
  ) {
    return 'data_access';
  }

  if (
    normalizedFilePath.includes('/mcp/') ||
    normalizedFilePath.includes('/status') ||
    normalizedFilePath.includes('/report')
  ) {
    return 'runtime_surface';
  }

  if (normalizedFilePath.includes('/tests/') || normalizedFilePath.includes('/test/')) {
    return 'test_support';
  }

  if (normalizedFilePath.includes('/scripts/')) {
    return 'script_surface';
  }

  return 'general_code';
}

function inferContractFlavor(normalizedFilePath) {
  if (normalizedFilePath.includes('/ts-ast-utils.js')) {
    return 'tree_sitter';
  }

  if (normalizedFilePath.includes('/helpers/ast-helpers.js')) {
    return 'babel_ast';
  }

  if (
    normalizedFilePath.includes('/storage/') ||
    normalizedFilePath.includes('/repository/')
  ) {
    return 'sqlite_repository';
  }

  if (normalizedFilePath.includes('/query/readers/') || normalizedFilePath.includes('/query/apis/')) {
    return 'query_api';
  }

  if (normalizedFilePath.includes('/mcp/')) {
    return 'mcp_runtime';
  }

  if (normalizedFilePath.includes('/scripts/')) {
    return 'script_runtime';
  }

  return 'generic';
}

function inferTruthRole(purposeType, isExported, normalizedFilePath) {
  if (purposeType === 'TEST_HELPER') {
    return 'local';
  }

  if (purposeType === 'ANALYSIS_SCRIPT' || normalizedFilePath.includes('/scripts/')) {
    return 'advisory';
  }

  if (purposeType === 'WRAPPER') {
    return 'compat';
  }

  if (isExported || purposeType === 'API_EXPORT') {
    return 'canonical';
  }

  return 'local';
}

function inferRepresentationLevel(normalizedFilePath, purposeType) {
  if (purposeType === 'ANALYSIS_SCRIPT') {
    return 'summary';
  }

  if (
    normalizedFilePath.includes('/helpers/') ||
    normalizedFilePath.includes('/utils/')
  ) {
    return 'normalized';
  }

  if (
    normalizedFilePath.includes('/readers/') ||
    normalizedFilePath.includes('/repository/') ||
    normalizedFilePath.includes('/storage/')
  ) {
    return 'raw';
  }

  if (
    normalizedFilePath.includes('/status') ||
    normalizedFilePath.includes('/report') ||
    normalizedFilePath.includes('/tool')
  ) {
    return 'projection';
  }

  return 'normalized';
}

export function classifyContractSurface({
  filePath = '',
  purposeType = '',
  isExported = false
} = {}) {
  const normalizedFilePath = normalizeFilePath(filePath);
  const contractFamily = inferContractFamily(normalizedFilePath);
  const contractFlavor = inferContractFlavor(normalizedFilePath);
  const truthRole = inferTruthRole(purposeType, isExported, normalizedFilePath);
  const representationLevel = inferRepresentationLevel(normalizedFilePath, purposeType);

  return {
    contractFamily,
    contractFlavor,
    truthRole,
    representationLevel,
    interoperability: `${contractFamily}:${contractFlavor}`,
    filePath: normalizedFilePath
  };
}

export function evaluateContractCompatibility(localSurface, peerSurface) {
  if (!localSurface || !peerSurface) {
    return { compatible: true, reason: 'unknown_surface' };
  }

  if (localSurface.contractFamily !== peerSurface.contractFamily) {
    return {
      compatible: false,
      reason: 'contract_family_mismatch'
    };
  }

  if (
    localSurface.contractFlavor !== 'generic' &&
    peerSurface.contractFlavor !== 'generic' &&
    localSurface.contractFlavor !== peerSurface.contractFlavor
  ) {
    return {
      compatible: false,
      reason: 'contract_flavor_mismatch'
    };
  }

  if (
    localSurface.representationLevel === 'summary' &&
    peerSurface.representationLevel === 'raw'
  ) {
    return {
      compatible: false,
      reason: 'representation_level_mismatch'
    };
  }

  if (
    localSurface.truthRole === 'canonical' &&
    peerSurface.truthRole === 'advisory'
  ) {
    return {
      compatible: false,
      reason: 'truth_role_mismatch'
    };
  }

  return {
    compatible: true,
    reason: 'compatible'
  };
}

export function summarizeContractTaxonomy(db) {
  if (!db) {
    return {
      coverage: { totalRelevantAtoms: 0, classifiedAtoms: 0, coverageRatio: 0 },
      byFamily: {},
      byFlavor: {},
      byTruthRole: {},
      byRepresentationLevel: {},
      summary: {
        dominantFamily: null,
        dominantFlavor: null,
        canonicalRatio: 0
      }
    };
  }

  const rows = db.prepare(`
    SELECT file_path, purpose_type, is_exported
    FROM atoms
    WHERE atom_type IN ('function', 'method', 'arrow')
      AND (is_removed IS NULL OR is_removed = 0)
      AND json_extract(dna_json, '$.semanticFingerprint') IS NOT NULL
  `).all();

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
