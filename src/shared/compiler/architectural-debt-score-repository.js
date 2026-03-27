export function hasArchitecturalDebtRepo(repo) {
  return Boolean(repo?.db?.prepare);
}

export function loadDistinctFilePaths(repo) {
  if (!hasArchitecturalDebtRepo(repo)) return [];
  return repo.db.prepare(`
    SELECT DISTINCT file_path
    FROM atoms
    WHERE file_path IS NOT NULL
  `).all();
}

export function loadPatternAtoms(repo) {
  if (!hasArchitecturalDebtRepo(repo)) return [];
  return repo.db.prepare(`
    SELECT id, name, file_path, complexity, is_exported,
           json_extract(dna_json, '$.semanticFingerprint') as fingerprint
    FROM atoms
    WHERE atom_type IN ('function', 'method', 'arrow', 'class')
      AND (is_removed IS NULL OR is_removed = 0)
  `).all();
}

export function loadCouplingRows(repo) {
  if (!hasArchitecturalDebtRepo(repo)) return [];
  return repo.db.prepare(`
    SELECT
      file_path,
      COUNT(DISTINCT json_extract(j.value, '$.source')) as importCount
    FROM atoms
    JOIN json_each(
      CASE
        WHEN json_valid(imports_json) THEN imports_json
        ELSE '[]'
      END
    ) AS j
    WHERE imports_json IS NOT NULL
      AND imports_json != ''
      AND imports_json != '[]'
      AND (is_removed IS NULL OR is_removed = 0)
    GROUP BY file_path
    HAVING importCount > 10
  `).all();
}

export function loadDuplicateRows(repo) {
  if (!hasArchitecturalDebtRepo(repo)) return [];
  return repo.db.prepare(`
    SELECT json_extract(dna_json, '$.semanticFingerprint') as fingerprint,
           COUNT(*) as instanceCount,
           GROUP_CONCAT(file_path) as files
    FROM atoms
    WHERE json_extract(dna_json, '$.semanticFingerprint') IS NOT NULL
      AND json_extract(dna_json, '$.semanticFingerprint') != 'unknown:unknown:unknown'
      AND (is_removed IS NULL OR is_removed = 0)
    GROUP BY fingerprint
    HAVING instanceCount > 1
  `).all();
}
