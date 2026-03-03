import fs from 'fs';
import Database from 'better-sqlite3';

try {
    const db = new Database('./.omnysysdata/omnysys.db', { readonly: true });

    const rows = db.prepare(`
    SELECT 
      file_path, 
      COUNT(*) as function_count,
      SUM(lines_of_code) as total_loc,
      SUM(complexity) as total_complexity,
      MAX(complexity) as max_complexity
    FROM atoms
    WHERE atom_type != 'sql_query' AND atom_type != 'variable'
    GROUP BY file_path
    ORDER BY total_complexity DESC, total_loc DESC
    LIMIT 3
  `).all();

    const godObjects = db.prepare(`
    SELECT file_path, name, archetype_type, complexity, lines_of_code 
    FROM atoms 
    WHERE archetype_type LIKE '%god%' OR complexity > 25
    ORDER BY complexity DESC
    LIMIT 3
  `).all();

    const out = {
        TopMonoliths: rows,
        GodObjects: godObjects
    };

    fs.writeFileSync('tmp-debug/monoliths-out.json', JSON.stringify(out, null, 2));

} catch (e) {
    console.error(e);
}
