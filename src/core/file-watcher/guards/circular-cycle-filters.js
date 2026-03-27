export function isLikelyInfrastructureCycleAtom(atom) {
  const name = String(atom?.name || '');
  const filePath = String(atom?.file_path || atom?.filePath || '').replace(/\\/g, '/').toLowerCase();
  const semanticFingerprint = String(
    atom?.semanticFingerprint
    || atom?.dna?.semanticFingerprint
    || atom?.dnaJson?.semanticFingerprint
    || ''
  ).toLowerCase();
  const purpose = String(atom?.purpose || '').toUpperCase();
  const riskLevel = String(atom?.riskLevel || '').toUpperCase();
  const centrality = String(atom?.centralityClassification || '').toUpperCase();
  const atomType = String(atom?.type || atom?.functionType || '').toLowerCase();
  const callersCount = Number(atom?.callersCount || 0);
  const calleesCount = Number(atom?.calleesCount || 0);
  const infraName = /(Operation|Operations|Factory|Transaction)$/i.test(name);
  const infraPath = /\/(cache|storage|repository|adapters)\//.test(filePath);
  const infraFingerprint = semanticFingerprint.startsWith('process:storage:core:') ||
    semanticFingerprint.startsWith('process:logic:core:');

  if (atomType !== 'class') {
    return false;
  }

  if (
    purpose !== 'API_EXPORT' &&
    purpose !== 'FACTORY' &&
    !infraName &&
    !infraPath &&
    !infraFingerprint
  ) {
    return false;
  }

  return riskLevel === 'LOW' &&
    (centrality === 'LEAF' || centrality === 'BRIDGE') &&
    callersCount === 0 &&
    calleesCount === 0;
}
