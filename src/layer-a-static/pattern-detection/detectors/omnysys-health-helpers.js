export const STORAGE_PATHS = [
  'src/layer-c-memory/storage/',
  'src/layer-c-memory/mcp/',
  'src/layer-c-memory/query/',
  'src/core/orchestrator/',
  'src/core/unified-server/',
  'src/core/cache/',
  'src/core/file-watcher/',
  'src/layer-a-static/pipeline/',
  'src/layer-a-static/indexer',
  'src/layer-c-memory/verification/',
  'src/layer-c-memory/shadow-registry/',
  'scripts/',
  'migrations/',
  'tests/',
  'check-sql',
  'test-health',
  'tmp-debug'
];

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

export function isStoragePath(filePath, storagePaths = STORAGE_PATHS) {
  return storagePaths.some((path) => filePath.includes(path));
}

export function summarizeOmnysysHealthFindings(findings = []) {
  let repositoryBypass = 0;
  let joinCandidates = 0;
  let schemaDrift = 0;
  let dynamicInStorage = 0;
  let highCount = 0;
  let mediumCount = 0;

  for (const finding of findings) {
    if (finding.severity === 'high') highCount += 1;
    if (finding.severity === 'medium') mediumCount += 1;
    if (finding.type === 'sql-repo-bypass') repositoryBypass += 1;
    if (finding.type === 'sql-join-candidate') joinCandidates += 1;
    if (finding.type === 'sql-schema-drift') schemaDrift += 1;
    if (finding.type === 'sql-dynamic-in-storage') dynamicInStorage += 1;
  }

  return {
    repositoryBypass,
    joinCandidates,
    schemaDrift,
    dynamicInStorage,
    totalFindings: findings.length,
    score: Math.max(0, 100 - highCount * 10 - mediumCount * 4)
  };
}

export default {
  getSqlAtomsByFile,
  isStoragePath,
  summarizeOmnysysHealthFindings,
  STORAGE_PATHS
};
