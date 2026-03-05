import Database from 'better-sqlite3';

try {
    const db = new Database('.omnysysdata/omnysys.db');
    const rows = db.prepare(`
        SELECT name, atom_type, file_path, complexity 
        FROM atoms 
        WHERE is_removed = 0 AND (
            name LIKE '%wrapper%' OR 
            name LIKE '%deprecated%' OR
            purpose_type = 'DEPRECATED' OR
            purpose_type = 'WRAPPER'
        )
        ORDER BY complexity DESC
        LIMIT 20
    `).all();
    console.table(rows);
} catch (err) {
    console.error(err);
}
