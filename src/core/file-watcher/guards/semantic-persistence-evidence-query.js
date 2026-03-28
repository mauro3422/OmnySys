import { isValidGuardTarget } from './guard-standards.js';

export function getSemanticPersistenceTargetNames(atoms = []) {
    return atoms
        .filter(isValidGuardTarget)
        .map((atom) => atom?.name)
        .filter(Boolean);
}

export function loadSemanticPersistenceRows(db, filePath, targetNames) {
    const placeholders = targetNames.map(() => '?').join(',');
    return db.prepare(`
        SELECT
            id,
            name,
            atom_type,
            dna_json,
            data_flow_json,
            signature_json
        FROM atoms
        WHERE file_path = ?
          AND name IN (${placeholders})
          AND (is_removed IS NULL OR is_removed = 0)
    `).all(filePath, ...targetNames);
}
