import Database from 'better-sqlite3';

const dbPath = '.omnysysdata/omnysys.db';
try {
    const db = new Database(dbPath, { readonly: true });
    const row = db.prepare('SELECT path, imports_json FROM files WHERE path = ?').get('src/core/batch-processor/priority-calculator.js');

    if (row) {
        console.log(`Path: ${row.path}`);
        console.log(`Imports: ${row.imports_json}`);
    } else {
        console.log("FILE NOT FOUND");
    }
} catch (e) {
    console.error("Error:", e);
}
