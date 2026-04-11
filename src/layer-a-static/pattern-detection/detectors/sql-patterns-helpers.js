export function getJsAtomIndexes(files = {}) {
  const jsAtomsByName = new Map();
  const jsAtomsById = new Map();

  for (const fileData of Object.values(files)) {
    for (const atom of (fileData?.atoms || [])) {
      if (atom.type === 'sql_query') continue;
      if (atom.name) jsAtomsByName.set(atom.name, atom);
      if (atom.id) jsAtomsById.set(atom.id, atom);
    }
  }

  return { jsAtomsByName, jsAtomsById };
}

export function getSqlAtomsByFile(files = {}) {
  const sqlAtomsByFile = [];

  for (const [filePath, fileData] of Object.entries(files)) {
    const sqlAtoms = (fileData?.atoms || []).filter((atom) => atom.type === 'sql_query');
    if (sqlAtoms.length > 0) {
      sqlAtomsByFile.push([filePath, sqlAtoms]);
    }
  }

  return sqlAtomsByFile;
}

export function buildSqlFinding(type, severity, filePath, atom, message, details = {}) {
  return {
    type,
    severity,
    filePath,
    atomId: atom.id,
    atomName: atom.name,
    line: atom.lineStart || atom.line || 0,
    message,
    details: { sql_purpose: atom._meta?.sql_purpose, ...details }
  };
}

export function scoreSqlFindings(findings = []) {
  const highCount = findings.filter((finding) => finding.severity === 'high').length;
  const mediumCount = findings.filter((finding) => finding.severity === 'medium').length;
  return Math.max(0, 100 - highCount * 8 - mediumCount * 3);
}

export function summarizeSqlFindings(findings = []) {
  return {
    selectStar: findings.filter((finding) => finding.type === 'sql-select-star').length,
    bulkMutation: findings.filter((finding) => finding.type === 'sql-bulk-mutation').length,
    missingTransaction: findings.filter((finding) => finding.type === 'sql-missing-transaction').length,
    n1Risk: findings.filter((finding) => finding.type === 'sql-n1-risk').length,
    deadQuery: findings.filter((finding) => finding.type === 'sql-dead-query').length,
    queryDensity: findings.filter((finding) => finding.type === 'sql-query-density').length,
    totalFindings: findings.length
  };
}

export default {
  buildSqlFinding,
  getJsAtomIndexes,
  getSqlAtomsByFile,
  scoreSqlFindings,
  summarizeSqlFindings
};
