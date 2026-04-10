#!/bin/bash
# ============================================
# AUDITORÍA DE DB OMNYSYS - Script Completo
# Ejecutar cuando el servidor MCP esté disponible
# ============================================

echo "=== AUDITORÍA DB OMNYSYS ==="
echo ""

# Función para ejecutar query SQL via MCP
execute_query() {
    echo "--- $1 ---"
    echo "$2"
    echo ""
}

# 1. CONTEO BÁSICO
execute_query "CONTEO TABLAS" "
SELECT 'atoms' as tabla, COUNT(*) as total FROM atoms
UNION ALL SELECT 'files', COUNT(*) FROM files  
UNION ALL SELECT 'atom_relations', COUNT(*) FROM atom_relations
UNION ALL SELECT 'societies', COUNT(*) FROM societies
UNION ALL SELECT 'risk_assessments', COUNT(*) FROM risk_assessments
"

# 2. COHERENCIA ÁTOMO-FICHERO
execute_query "ÁTOMO-FICHERO INCONSISTENCIAS" "
SELECT COUNT(*) as orphan_atoms FROM atoms 
WHERE file_path NOT IN (SELECT path FROM files)
"

# 3. RELACIONES HUÉRFANAS
execute_query "RELACIONES HUÉRFANAS" "
SELECT COUNT(*) as orphan_relations FROM atom_relations ar 
WHERE ar.target_atom_id NOT IN (SELECT id FROM atoms)
OR ar.source_atom_id NOT IN (SELECT id FROM atoms)
"

# 4. DISTRIBUCIÓN ÁTOMOS POR TIPO
execute_query "DISTRIBUCIÓN ÁTOMOS" "
SELECT atom_type, COUNT(*) as total, 
       ROUND(COUNT(*)*100.0/(SELECT COUNT(*) FROM atoms),2) as porcentaje
FROM atoms GROUP BY atom_type ORDER BY total DESC
"

# 5. TOP 10 FICHEROS CON MÁS ÁTOMOS
execute_query "TOP 10 FICHEROS" "
SELECT file_path, COUNT(*) as total, 
       AVG(complexity) as complejidad_promedio
FROM atoms GROUP BY file_path ORDER BY total DESC LIMIT 10
"

# 6. COMPLEJIDAD EXTREMA
execute_query "ALTA COMPLEJIDAD (>15)" "
SELECT file_path, name, complexity FROM atoms 
WHERE complexity > 15 ORDER BY complexity DESC LIMIT 20
"

# 7. RIESGOS ACTIVOS
execute_query "RIESGOS" "
SELECT severity, COUNT(*) as total FROM risk_assessments 
WHERE is_active = 1 GROUP BY severity
"

# 8. TOOL RUNS
execute_query "TOOL RUNS POR STATUS" "
SELECT status, COUNT(*) as total FROM mcp_tool_runs GROUP BY status
"

# 9. COHERENCIA HEALTH PANEL vs DB
execute_query "COMPARACIÓN HEALTH PANEL" "
SELECT 
  (SELECT COUNT(*) FROM atoms) as db_atoms,
  (SELECT COUNT(*) FROM files) as db_files,
  (SELECT COUNT(*) FROM atom_relations) as db_relations
"

echo "=== FIN AUDITORÍA ==="
