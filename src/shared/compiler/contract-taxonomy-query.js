export function loadContractTaxonomyRows(db) {
  if (!db) {
    return [];
  }

  return db.prepare(`
    SELECT file_path, purpose_type, is_exported
    FROM atoms
    WHERE atom_type IN ('function', 'method', 'arrow')
      AND (is_removed IS NULL OR is_removed = 0)
      AND json_extract(dna_json, '$.semanticFingerprint') IS NOT NULL
  `).all();
}
