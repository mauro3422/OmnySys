export function pruneToolPayloadShape(value) {
  if (value === null || value === undefined) return undefined;
  if (typeof value !== 'object') return value;

  if (Array.isArray(value)) {
    const compacted = value.map(pruneToolPayloadShape).filter((entry) => entry !== undefined);
    return compacted.length > 0 ? compacted : undefined;
  }

  const result = {};
  for (const [key, entry] of Object.entries(value)) {
    if (key.startsWith('_')) {
      result[key] = entry;
      continue;
    }

    const compacted = pruneToolPayloadShape(entry);
    if (compacted !== undefined) {
      result[key] = compacted;
    }
  }

  return Object.keys(result).length > 0 ? result : undefined;
}
