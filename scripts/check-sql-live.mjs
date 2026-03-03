import { getDb } from './src/layer-c-memory/storage/database/connection.js';

async function run() {
    const db = await getDb();
    const rows = await db.all("SELECT id, name, type, file_path, _meta_json FROM atoms WHERE type = 'sql_query' LIMIT 20");
    console.log(`Encontrados ${rows.length} atoms de tipo sql_query`);
    console.log(JSON.stringify(rows, null, 2));
}

run().catch(console.error);
