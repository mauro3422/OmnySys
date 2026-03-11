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
