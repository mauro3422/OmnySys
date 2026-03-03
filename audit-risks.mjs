import Database from 'better-sqlite3';
import path from 'path';

try {
    const db = new Database('./.omnysysdata/omnysys.db', { readonly: true });
    const rows = db.prepare(`SELECT id, file_path, line_start, _meta_json FROM atoms WHERE atom_type='sql_query' AND _meta_json LIKE '%"injectionRisk":true%'`).all();

    const results = rows.map(r => {
        let meta = {};
        try { meta = JSON.parse(r._meta_json); } catch (e) { }
        return {
            id: r.id,
            file: r.file_path,
            line: r.line_start,
            injectionSources: meta.injectionSources || []
        };
    });

    console.log(JSON.stringify(results, null, 2));
} catch (error) {
    console.error(error.message);
}
