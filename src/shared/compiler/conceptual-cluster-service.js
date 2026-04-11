import { getRepository } from '#layer-c/storage/repository/index.js';

export function loadConsolidationClusterContext(projectPath, semanticFingerprint, ssotFilePath) {
  if (!projectPath || !semanticFingerprint || !ssotFilePath) {
    return {
      success: false,
      error: 'projectPath, semanticFingerprint and ssotFilePath are required'
    };
  }

  const repository = getRepository(projectPath);
  const query = `
      SELECT id, name, file_path, atom_type, is_exported,
             json_extract(dna_json, '$.structuralHash') as structuralHash
      FROM atoms
      WHERE json_extract(dna_json, '$.semanticFingerprint') = ?
        AND (is_removed = 0 OR is_removed IS NULL)
        AND (is_dead_code = 0 OR is_dead_code IS NULL)
  `;

  const allAtoms = repository.db.prepare(query).all(semanticFingerprint);
  const normalizedSsotPath = ssotFilePath.replace(/\\/g, '/');
  const ssotAtom = allAtoms.find((atom) => atom.file_path.includes(normalizedSsotPath));

  if (!ssotAtom) {
    return {
      success: false,
      error: `No se encontro el atomo SSOT en ${ssotFilePath} para el fingerprint ${semanticFingerprint}.`,
      foundPaths: allAtoms.map((atom) => atom.file_path)
    };
  }

  const duplicates = allAtoms.filter((atom) => atom.id !== ssotAtom.id);
  return {
    success: true,
    ssotAtom,
    duplicates,
    totalFound: allAtoms.length
  };
}

export default {
  loadConsolidationClusterContext
};
