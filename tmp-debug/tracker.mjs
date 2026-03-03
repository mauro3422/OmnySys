import fs from 'fs';
import Database from 'better-sqlite3';

try {
    const db = new Database('./.omnysysdata/omnysys.db', { readonly: true });
    const rows = db.prepare(`SELECT file_path, name as atom_name, _meta_json FROM atoms WHERE atom_type = 'sql_query'`).all();

    const selectsByParent = {};
    for (const atom of rows) {
        const meta = JSON.parse(atom._meta_json || '{}');
        if (meta.sql_operation !== 'SELECT') continue;
        const pid = meta.parent_atom_name || meta.parent_atom_id;
        if (!pid) continue;
        if (!selectsByParent[pid]) selectsByParent[pid] = [];
        selectsByParent[pid].push({ ...atom, _meta: meta });
    }

    const findings = [];
    for (const [parentName, selects] of Object.entries(selectsByParent)) {
        if (selects.length < 2) continue;
        const allTables = selects.flatMap(s => s._meta.tables_referenced || []);
        const uniqueTables = new Set(allTables);
        if (uniqueTables.size >= 2) {
            findings.push({
                filePath: selects[0].file_path,
                parentFunction: parentName,
                selects: selects.map(s => s._meta.raw_sql),
                tables: [...uniqueTables]
            });
        }
    }

    fs.writeFileSync('tmp-debug/tracker-out.json', JSON.stringify(findings, null, 2), 'utf8');
} catch (e) {
    console.error(e);
}
