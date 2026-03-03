import fs from 'fs';
import Database from 'better-sqlite3';

const STORAGE_PATHS = [
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

try {
    const db = new Database('./.omnysysdata/omnysys.db', { readonly: true });
    const rows = db.prepare(`SELECT file_path, name as atom_name, _meta_json FROM atoms WHERE atom_type = 'sql_query'`).all();

    const findings = [];
    for (const row of rows) {
        let isStorageLayer = STORAGE_PATHS.some(p => row.file_path.includes(p));
        if (isStorageLayer) {
            const meta = JSON.parse(row._meta_json || '{}');
            if (meta.sql_purpose === 'DYNAMIC_QUERY' && !meta.sql_injection_risk) {
                findings.push({
                    file: row.file_path,
                    parent: meta.parent_atom_name || meta.parent_atom_id,
                    raw: meta.raw_sql
                });
            }
        }
    }

    fs.writeFileSync('tmp-debug/dynamic-out.json', JSON.stringify(findings, null, 2), 'utf8');
} catch (e) {
    console.error(e);
}
