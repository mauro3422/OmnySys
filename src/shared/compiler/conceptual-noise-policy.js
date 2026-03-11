export function parseSemanticFingerprint(fingerprint = '') {
  const parts = String(fingerprint || '').split(':');
  if (parts.length === 4) {
    const [verb, chest, domain, entity] = parts;
    return { verb, chest, domain, entity };
  }

  const [verb = 'unknown', domain = 'unknown', entity = 'unknown'] = parts;
  return { verb, chest: 'legacy', domain, entity };
}

export function classifyConceptualNoise(fingerprint = '', atomName = '') {
  const { chest, entity } = parseSemanticFingerprint(fingerprint);
  const normalizedEntity = String(entity || '').toLowerCase();
  const normalizedName = String(atomName || '').toLowerCase();
  const callbackArtifact = /(^|_)(callback|arg\d+)$/.test(normalizedEntity) || normalizedName.endsWith('callback');

  if (chest === 'lifecycle' && (
    normalizedEntity === 'constructor' ||
    normalizedEntity === 'describe_arg1' ||
    normalizedEntity === 'it_arg1' ||
    callbackArtifact
  )) {
    return 'expected_repeat';
  }

  if (normalizedEntity === 'unknown' && (chest === 'legacy' || chest === 'lifecycle')) {
    return 'low_signal';
  }

  return 'actionable';
}
