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
  const { verb, chest, entity } = parseSemanticFingerprint(fingerprint);
  const normalizedEntity = String(entity || '').toLowerCase();
  const normalizedName = String(atomName || '').toLowerCase();

  // Generic callback patterns - these are NOT conceptual duplicates
  // They are language-level callback patterns (forEach, filter, map, some, etc.)
  const genericCallbackName = /^(fn_)?(callback|_callback)$/.test(normalizedName);
  const forEachCallback = /_each_callback$/.test(normalizedName) || /_each_callback$/.test(normalizedEntity);
  const filterCallback = /filter.*callback/i.test(normalizedName);
  const mapCallback = /map.*callback/i.test(normalizedName);
  const someCallback = /some.*callback/i.test(normalizedName) || /some_callback$/.test(normalizedName);
  const everyCallback = /every.*callback/i.test(normalizedName);
  const reduceCallback = /reduce.*callback/i.test(normalizedName);
  const findCallback = /find.*callback/i.test(normalizedName);
  const afterEachCallback = /after_each_callback/.test(normalizedName) || /after_each_callback/.test(normalizedEntity);
  const callbackArtifact = /(^|_)(callback|arg\d+)$/.test(normalizedEntity) || normalizedName.endsWith('callback');

  const isGenericCallback = genericCallbackName || forEachCallback || filterCallback ||
    mapCallback || someCallback || everyCallback || reduceCallback || findCallback ||
    afterEachCallback || callbackArtifact;

  const genericLifecycleInitializer =
    /^(init|initialize)$/.test(normalizedName) ||
    /^(init|initialize|ialize)$/.test(normalizedEntity);

  if (chest === 'lifecycle' && (
    normalizedEntity === 'constructor' ||
    normalizedEntity === 'describe_arg1' ||
    normalizedEntity === 'it_arg1' ||
    isGenericCallback ||
    genericLifecycleInitializer
  )) {
    return 'expected_repeat';
  }

  // Also filter if the verb is 'process' AND entity is generic callback-related
  if (verb === 'process' && chest === 'lifecycle' && isGenericCallback) {
    return 'expected_repeat';
  }

  if (normalizedEntity === 'unknown' && (chest === 'legacy' || chest === 'lifecycle')) {
    return 'low_signal';
  }

  return 'actionable';
}
