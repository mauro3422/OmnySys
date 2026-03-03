import fs from 'fs';
import Database from 'better-sqlite3';
import { TABLE_DEFINITIONS } from './src/layer-c-memory/storage/database/schema-registry.js';

const KNOWN_COLUMNS_BY_TABLE = {};
for (const [tableName, definition] of Object.entries(TABLE_DEFINITIONS)) {
    KNOWN_COLUMNS_BY_TABLE[tableName] = new Set(definition.columns.map(col => col.name));
}

try {
    const db = new Database('./.omnysysdata/omnysys.db', { readonly: true });
    const rows = db.prepare(`SELECT file_path, name as atom_name, _meta_json FROM atoms WHERE atom_type = 'sql_query'`).all();

    const findings = [];
    for (const row of rows) {
        const meta = JSON.parse(row._meta_json || '{}');
        const referencedCols = meta.columns_referenced || [];
        const tables = meta.tables_referenced || [];

        for (const table of tables) {
            const knownCols = KNOWN_COLUMNS_BY_TABLE[table];
            if (!knownCols) continue;

            for (const col of referencedCols) {
                if (!knownCols.has(col) && col !== '*' && col.length > 1) {
                    findings.push({
                        file: row.file_path,
                        parent: meta.parent_atom_name || meta.parent_atom_id,
                        table,
                        missingCol: col
                    });
                }
            }
        }
    }

    console.log('Schema drifts:', findings.length);
    console.log(JSON.stringify(findings, null, 2));

} catch (e) {
    console.error(e);
}
