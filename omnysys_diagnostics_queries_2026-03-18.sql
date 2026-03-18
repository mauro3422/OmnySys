-- OmnySys diagnostic queries
-- Generated 2026-03-18

-- 1) Table counts
SELECT name FROM sqlite_master WHERE type='table' ORDER BY name;

-- 2) Active vs removed overview
SELECT 'atoms' table_name, COUNT(*) total,
       SUM(CASE WHEN COALESCE(is_removed,0)=0 THEN 1 ELSE 0 END) active,
       SUM(CASE WHEN COALESCE(is_removed,0)=1 THEN 1 ELSE 0 END) removed
FROM atoms
UNION ALL
SELECT 'atom_relations', COUNT(*),
       SUM(CASE WHEN COALESCE(is_removed,0)=0 THEN 1 ELSE 0 END),
       SUM(CASE WHEN COALESCE(is_removed,0)=1 THEN 1 ELSE 0 END)
FROM atom_relations
UNION ALL
SELECT 'files', COUNT(*),
       SUM(CASE WHEN COALESCE(is_removed,0)=0 THEN 1 ELSE 0 END),
       SUM(CASE WHEN COALESCE(is_removed,0)=1 THEN 1 ELSE 0 END)
FROM files
UNION ALL
SELECT 'risk_assessments', COUNT(*),
       SUM(CASE WHEN COALESCE(is_removed,0)=0 THEN 1 ELSE 0 END),
       SUM(CASE WHEN COALESCE(is_removed,0)=1 THEN 1 ELSE 0 END)
FROM risk_assessments;

-- 3) Atom ID format split
SELECT
  CASE WHEN id LIKE 'C:/Dev/OmnySystem/%' THEN 'abs_windows'
       WHEN id LIKE '/%' THEN 'abs_unix'
       ELSE 'relative'
  END AS id_format,
  COUNT(*) total,
  SUM(CASE WHEN COALESCE(is_removed,0)=0 THEN 1 ELSE 0 END) active
FROM atoms
GROUP BY 1;

-- 4) Relation type health
SELECT relation_type,
       COUNT(*) total,
       SUM(CASE WHEN COALESCE(is_removed,0)=0 THEN 1 ELSE 0 END) active
FROM atom_relations
GROUP BY relation_type
ORDER BY total DESC;

-- 5) call_graph rows that do not map to active atoms
SELECT COUNT(*) AS call_graph_rows,
       SUM(CASE WHEN a1.id IS NOT NULL AND COALESCE(a1.is_removed,0)=0 THEN 1 ELSE 0 END) active_callers,
       SUM(CASE WHEN a2.id IS NOT NULL AND COALESCE(a2.is_removed,0)=0 THEN 1 ELSE 0 END) active_callees
FROM call_graph cg
LEFT JOIN atoms a1 ON cg.caller_id = a1.id
LEFT JOIN atoms a2 ON cg.callee_id = a2.id;

-- 6) Embedded call edges vs canonical tables
SELECT 'embedded_calls_json_edges' AS metric, COUNT(*) AS value
FROM atoms a, json_each(a.calls_json)
WHERE COALESCE(a.is_removed,0)=0
  AND a.calls_json IS NOT NULL
  AND json_valid(a.calls_json)
  AND json_type(a.calls_json)='array'
UNION ALL
SELECT 'embedded_called_by_edges', COUNT(*)
FROM atoms a, json_each(a.called_by_json)
WHERE COALESCE(a.is_removed,0)=0
  AND a.called_by_json IS NOT NULL
  AND json_valid(a.called_by_json)
  AND json_type(a.called_by_json)='array'
UNION ALL
SELECT 'active_atom_relations_calls', COUNT(*)
FROM atom_relations
WHERE relation_type='calls' AND COALESCE(is_removed,0)=0
UNION ALL
SELECT 'call_graph_rows', COUNT(*)
FROM call_graph;

-- 7) File-universe drift
SELECT 'active_files_not_scanned' AS metric, COUNT(*) AS value
FROM files f
LEFT JOIN compiler_scanned_files cs ON f.path=cs.path
WHERE COALESCE(f.is_removed,0)=0 AND cs.path IS NULL
UNION ALL
SELECT 'scanned_not_active_files', COUNT(*)
FROM compiler_scanned_files cs
LEFT JOIN files f ON cs.path=f.path AND COALESCE(f.is_removed,0)=0
WHERE f.path IS NULL
UNION ALL
SELECT 'active_files_missing_hashes', COUNT(*)
FROM files f
LEFT JOIN file_hashes h ON h.file_path=f.path
WHERE COALESCE(f.is_removed,0)=0 AND h.file_path IS NULL
UNION ALL
SELECT 'system_files_missing_active_files', COUNT(*)
FROM system_files sf
LEFT JOIN files f ON sf.path=f.path AND COALESCE(f.is_removed,0)=0
WHERE f.path IS NULL;

-- 8) Show scanned files missing from system_files
SELECT cs.path
FROM compiler_scanned_files cs
LEFT JOIN system_files sf ON cs.path=sf.path
WHERE sf.path IS NULL
ORDER BY cs.path;

-- 9) Show system_files with no semantic projection payload
SELECT path
FROM system_files
WHERE COALESCE(semantic_analysis_json,'') IN ('', '[]', '{}')
  AND COALESCE(semantic_connections_json,'') IN ('', '[]', '{}')
ORDER BY path
LIMIT 100;

-- 10) Risk label calibration check
SELECT risk_level,
       COUNT(*) count_rows,
       ROUND(AVG(risk_score), 3) avg_score,
       MIN(risk_score) min_score,
       MAX(risk_score) max_score
FROM risk_assessments
WHERE COALESCE(is_removed,0)=0
GROUP BY risk_level
ORDER BY avg_score DESC;

-- 11) "critical" rows with low numeric scores
SELECT file_path, risk_score, risk_level, factors_json
FROM risk_assessments
WHERE COALESCE(is_removed,0)=0
  AND risk_level='critical'
ORDER BY risk_score DESC, file_path;

-- 12) Latest semantic issues
SELECT id, file_path, issue_type, severity, message, detected_at
FROM semantic_issues
WHERE COALESCE(is_removed,0)=0
ORDER BY detected_at DESC;

-- 13) Example zero-atom files marked removed
SELECT path, atom_count, total_lines, is_removed, exports_json
FROM files
WHERE COALESCE(is_removed,0)=1
  AND COALESCE(atom_count,0)=0
ORDER BY path
LIMIT 100;

-- 14) Active dependencies whose target is not active in files
SELECT d.target_path, COUNT(*) AS references
FROM file_dependencies d
LEFT JOIN files f ON d.target_path=f.path AND COALESCE(f.is_removed,0)=0
WHERE COALESCE(d.is_removed,0)=0 AND f.path IS NULL
GROUP BY d.target_path
ORDER BY references DESC, d.target_path
LIMIT 100;

-- 15) Atom versions without a current atom
SELECT v.atom_id, v.file_path, v.atom_name, v.last_modified
FROM atom_versions v
LEFT JOIN atoms a ON v.atom_id=a.id
WHERE a.id IS NULL
ORDER BY v.file_path, v.atom_name
LIMIT 100;
