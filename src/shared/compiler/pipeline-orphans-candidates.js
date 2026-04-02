export function getPipelineNamePatternSqlCondition(columnName = 'name') {
  return ['persist', 'analyze', 'compute', 'calculate', 'build', 'generate', 'process', 'index']
    .map((pattern) => `${columnName} LIKE '%${pattern}%'`)
    .join(' OR ');
}

export function getPipelineOrphanCandidates(db, options = {}) {
  const {
    limit = 50,
    minComplexity = 3
  } = options;

  const patternCondition = getPipelineNamePatternSqlCondition('name');

  return db.prepare(`
    SELECT
        a.id,
        a.name,
        a.file_path,
        a.atom_type,
        a.callers_count,
        a.callees_count,
        a.complexity,
        a.is_phase2_complete,
        (
          SELECT COUNT(*)
          FROM files f
          WHERE f.path != a.file_path
            AND f.imports_json LIKE '%' || a.file_path || '%'
        ) AS file_importer_count,
        (
          SELECT COUNT(*)
          FROM file_dependencies fd
          WHERE fd.target_path = a.file_path
            AND fd.source_path != a.file_path
        ) AS dependency_importer_count,
        (
          SELECT COUNT(*)
          FROM files f
          WHERE f.path != a.file_path
            AND f.exports_json LIKE '%"name":"' || a.name || '"%'
        ) AS barrel_exporter_count
    FROM atoms a
    WHERE a.is_exported = 1
      AND a.atom_type IN ('function', 'arrow', 'method', 'class')
    AND a.is_test_callback = 0
    AND a.is_phase2_complete = 1
    AND a.file_path NOT LIKE 'tests/%'
    AND a.file_path NOT LIKE 'scripts/%'
    AND a.file_path NOT LIKE 'src/layer-b-semantic/llm-analyzer/%'
    AND (${patternCondition})
    AND a.complexity > ?
    ORDER BY a.complexity DESC
    LIMIT ?
  `).all(minComplexity, limit);
}

export function normalizePipelineOrphan(atomRow = {}) {
  return {
    name: atomRow.name,
    file: atomRow.file_path,
    complexity: atomRow.complexity,
    diagnosis: 'Exported pipeline atom with no effective callers — likely disconnected'
  };
}
