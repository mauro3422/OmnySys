import { normalizeSemanticPath } from '../semantic-surface-derivation/index.js';

export function pushConnectionRow(rows, seen, payload) {
  const {
    sourcePath,
    targetPath,
    connectionType,
    connectionKey,
    weight,
    context,
    now
  } = payload;

  const normalizedSource = normalizeSemanticPath(sourcePath);
  const normalizedTarget = normalizeSemanticPath(targetPath);

  if (!normalizedSource || !normalizedTarget || normalizedSource === normalizedTarget) {
    return;
  }

  const pairKey = `${normalizedSource}::${normalizedTarget}::${connectionType}::${connectionKey || ''}`;
  if (seen.has(pairKey)) {
    return;
  }

  seen.add(pairKey);
  rows.push({
    source_path: normalizedSource,
    target_path: normalizedTarget,
    connection_type: connectionType,
    connection_key: connectionKey || null,
    context_json: JSON.stringify(context || {}),
    weight: Number.isFinite(Number(weight)) ? Number(weight) : 1.0,
    created_at: new Date(now).toISOString(),
    is_removed: 0,
    updated_at: new Date(now).toISOString(),
    lifecycle_status: 'active'
  });
}
