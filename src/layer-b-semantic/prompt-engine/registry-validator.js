export function validateRegistry(registry) {
  const issues = [];

  if (!Array.isArray(registry)) {
    return { valid: false, issues: ['ARCHETYPE_REGISTRY is not an array'] };
  }

  const typeSet = new Set();
  const mergeKeySet = new Set();

  for (const entry of registry) {
    if (!entry || typeof entry !== 'object') {
      issues.push('Registry entry is not an object');
      continue;
    }

    if (!entry.type || typeof entry.type !== 'string') {
      issues.push('Registry entry missing valid "type"');
    } else if (typeSet.has(entry.type)) {
      issues.push(`Duplicate archetype type: ${entry.type}`);
    } else {
      typeSet.add(entry.type);
    }

    if (typeof entry.severity !== 'number') {
      issues.push(`Archetype ${entry.type || 'unknown'} missing numeric severity`);
    }

    if (typeof entry.detector !== 'function') {
      issues.push(`Archetype ${entry.type || 'unknown'} missing detector function`);
    }

    if (!entry.template || typeof entry.template !== 'object') {
      issues.push(`Archetype ${entry.type || 'unknown'} missing template`);
    } else {
      if (!entry.template.systemPrompt || !entry.template.userPrompt) {
        issues.push(`Archetype ${entry.type || 'unknown'} template missing systemPrompt or userPrompt`);
      }
    }

    if (!entry.mergeKey || typeof entry.mergeKey !== 'string') {
      issues.push(`Archetype ${entry.type || 'unknown'} missing mergeKey`);
    } else if (mergeKeySet.has(entry.mergeKey)) {
      issues.push(`Duplicate mergeKey: ${entry.mergeKey}`);
    } else {
      mergeKeySet.add(entry.mergeKey);
    }

    if (!Array.isArray(entry.fields)) {
      issues.push(`Archetype ${entry.type || 'unknown'} missing fields array`);
    }
  }

  if (!typeSet.has('default')) {
    issues.push('Registry missing "default" archetype');
  }

  return { valid: issues.length === 0, issues };
}
