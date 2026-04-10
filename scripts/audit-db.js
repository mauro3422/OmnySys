const sqlite3 = require('sqlite3').verbose();

const dbPath = 'C:\\Dev\\OmnySystem\\omnysys.db';
const db = new sqlite3.Database(dbPath);

async function query(sql, label) {
    return new Promise((resolve, reject) => {
        console.log(`\n=== ${label} ===`);
        db.all(sql, [], (err, rows) => {
            if (err) {
                console.log(`ERROR: ${err.message}`);
                resolve();
            } else {
                console.log(JSON.stringify(rows, null, 2));
                resolve();
            }
        });
    });
}

async function main() {
    console.log('=== AUDITORÍA DB OMNYSYS ===');
    console.log(`DB: ${dbPath}`);

    await query("SELECT name, type FROM sqlite_master WHERE type='table'", "TABLAS");

    await query(`
        SELECT 'atoms' as tabla, COUNT(*) as total FROM atoms
        UNION ALL SELECT 'files', COUNT(*) FROM files
        UNION ALL SELECT 'atom_relations', COUNT(*) FROM atom_relations
        UNION ALL SELECT 'societies', COUNT(*) FROM societies
        UNION ALL SELECT 'risk_assessments', COUNT(*) FROM risk_assessments
        UNION ALL SELECT 'semantic_connections', COUNT(*) FROM semantic_connections
        UNION ALL SELECT 'modules', COUNT(*) FROM modules
        UNION ALL SELECT 'mcp_sessions', COUNT(*) FROM mcp_sessions
        UNION ALL SELECT 'mcp_tool_runs', COUNT(*) FROM mcp_tool_runs
    `, "CONTEO TABLAS");

    await query(`
        SELECT atom_type, COUNT(*) as total,
               ROUND(COUNT(*)*100.0/(SELECT COUNT(*) FROM atoms),2) as pct
        FROM atoms GROUP BY atom_type ORDER BY total DESC
    `, "DISTRIBUCIÓN ÁTOMOS POR TIPO");

    await query(`
        SELECT file_path, COUNT(*) as total, 
               ROUND(AVG(complexity),2) as complejidad_prom
        FROM atoms GROUP BY file_path ORDER BY total DESC LIMIT 10
    `, "TOP 10 FICHEROS");

    await query(`
        SELECT COUNT(*) as orphan_count FROM atoms 
        WHERE file_path NOT IN (SELECT path FROM files)
    `, "ÁTOMO-FICHERO INCONSISTENCIAS");

    await query(`
        SELECT relation_type, COUNT(*) as total FROM atom_relations GROUP BY relation_type
    `, "TIPOS DE RELACIONES");

    await query(`
        SELECT COUNT(*) as orphan_calls FROM atom_relations ar 
        WHERE ar.target_atom_id NOT IN (SELECT id FROM atoms)
    `, "RELACIONES HUÉRFANAS (target)");

    await query(`
        SELECT severity, COUNT(*) as total FROM risk_assessments 
        WHERE is_active = 1 GROUP BY severity
    `, "RIESGOS ACTIVOS");

    await query(`
        SELECT status, COUNT(*) as total FROM mcp_tool_runs GROUP BY status
    `, "TOOL RUNS POR STATUS");

    await query(`
        SELECT ROUND(AVG(complexity),2) as complejidad_promedio, 
               MAX(complexity) as complejidad_max,
               MIN(complexity) as complejidad_min
        FROM atoms
    `, "ESTADÍSTICAS COMPLEJIDAD");

    console.log('\n=== FIN AUDITORÍA ===');
    db.close();
}

main();
