import crypto from 'crypto';

function calculateHash(data) {
  const str = typeof data === 'string' ? data : JSON.stringify(data);
  return crypto.createHash('sha256').update(str).digest('hex');
}

export function calculateFieldHashes(atomData) {
  const hashes = {};
  const excludedFields = ['_meta', 'lineage', 'timestamp'];

  for (const [key, value] of Object.entries(atomData)) {
    if (excludedFields.includes(key)) continue;

    if (value && typeof value === 'object' && !Array.isArray(value)) {
      hashes[key] = calculateHash(value);
    } else if (Array.isArray(value)) {
      hashes[key] = calculateHash(value.map((item, i) =>
        typeof item === 'object' ? calculateHash(item) : `${i}:${item}`
      ));
    } else {
      hashes[key] = calculateHash(String(value));
    }
  }

  return hashes;
}

export function buildVersionPayload(atomData) {
  return {
    hash: calculateHash(atomData),
    fieldHashes: calculateFieldHashes(atomData),
    lastModified: Date.now(),
    filePath: atomData.file || atomData.filePath,
    atomName: atomData.name
  };
}

export function loadFieldHashes(row, atomId, logger) {
  try {
    return JSON.parse(row.field_hashes_json || '{}');
  } catch (_error) {
    logger.warn(`Corrupted field hashes for ${atomId}, treating as new`);
    return null;
  }
}

export function diffFieldHashes(oldFieldHashes, newFieldHashes) {
  const changedFields = [];
  const unchangedFields = [];

  for (const [field, newHash] of Object.entries(newFieldHashes)) {
    if (oldFieldHashes[field] !== newHash) {
      changedFields.push(field);
    } else {
      unchangedFields.push(field);
    }
  }

  for (const field of Object.keys(oldFieldHashes)) {
    if (!(field in newFieldHashes)) {
      changedFields.push(field);
    }
  }

  return { changedFields, unchangedFields };
}

export function insertOrUpdateVersion(db, atomId, version) {
  const stmt = db.prepare(`
    INSERT INTO atom_versions (atom_id, hash, field_hashes_json, last_modified, file_path, atom_name)
    VALUES (?, ?, ?, ?, ?, ?)
    ON CONFLICT(atom_id) DO UPDATE SET
      hash = excluded.hash,
      field_hashes_json = excluded.field_hashes_json,
      last_modified = excluded.last_modified
  `);

  stmt.run(
    atomId,
    version.hash,
    JSON.stringify(version.fieldHashes),
    version.lastModified,
    version.filePath,
    version.atomName
  );
}
