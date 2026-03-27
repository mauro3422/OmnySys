import { normalizeSemanticKey, normalizeSemanticPath, isEnvSemanticReference } from './semantic-surface-derivation-helpers.js';

function pushConnectionRow(rows, seen, payload) {
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

export function deriveSharedStateConnections(atomSurface = [], now = Date.now()) {
  const rows = [];
  const seen = new Set();
  const sharedGroups = new Map();

  for (const atom of atomSurface || []) {
    const filePath = normalizeSemanticPath(atom?.filePath || '');
    const atomId = atom?.atomId || null;

    if (!filePath) {
      continue;
    }

    const sharedStateAccess = Array.isArray(atom.sharedStateAccess) ? atom.sharedStateAccess : [];
    for (const access of sharedStateAccess) {
      const connectionKey = normalizeSemanticKey(
        access?.fullReference ||
        (access?.objectName && access?.propName ? `${access.objectName}.${access.propName}` : '') ||
        access?.objectName ||
        access?.propName
      );

      if (!connectionKey) {
        continue;
      }

      const connectionType = isEnvSemanticReference(connectionKey) ? 'envVar' : 'sharedState';
      const groupKey = `${connectionType}::${connectionKey}`;
      const group = sharedGroups.get(groupKey) || {
        connectionType,
        connectionKey,
        files: new Map(),
        atomIds: new Set(),
        signalCount: 0
      };

      group.signalCount += 1;
      group.atomIds.add(atomId);
      group.files.set(filePath, (group.files.get(filePath) || 0) + 1);
      sharedGroups.set(groupKey, group);
    }
  }

  const globalCap = 200 * Math.max(1, sharedGroups.size);

  for (const group of sharedGroups.values()) {
    const files = [...group.files.keys()].sort();
    if (files.length < 2) continue;

    for (let i = 0; i < files.length; i++) {
      for (let j = i + 1; j < files.length; j++) {
        if (rows.length >= globalCap) break;
        pushConnectionRow(rows, seen, {
          sourcePath: files[i],
          targetPath: files[j],
          connectionType: group.connectionType,
          connectionKey: group.connectionKey,
          weight: group.signalCount,
          context: {
            derivedFrom: 'atoms.shared_state_json',
            connectionKey: group.connectionKey,
            fileCount: files.length,
            signalCount: group.signalCount,
            atomIds: [...group.atomIds].filter(Boolean)
          },
          now
        });
      }
      if (rows.length >= globalCap) break;
    }
  }

  rows.sort((a, b) =>
    `${a.connection_type}:${a.source_path}:${a.target_path}:${a.connection_key || ''}`
      .localeCompare(`${b.connection_type}:${b.source_path}:${b.target_path}:${b.connection_key || ''}`)
  );

  return {
    rows,
    summary: {
      sharedStateGroupCount: sharedGroups.size,
      eventGroupCount: 0,
      totalRows: rows.length
    }
  };
}
