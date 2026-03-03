import { initializeStorage, getDatabase } from './src/layer-c-memory/storage/database/connection.js';
import { OmnysysHealthDetector } from './src/layer-a-static/pattern-detection/detectors/omnysys-health-detector.js';
import path from 'path';
import fs from 'fs';

async function run() {
    initializeStorage(path.resolve(process.cwd()));
    const db = getDatabase();

    const allAtoms = db.prepare('SELECT name, atom_type, file_path, line_start, line_end, _meta_json, id FROM atoms').all();
    const files = {};
    for (const row of allAtoms) {
        if (!files[row.file_path]) files[row.file_path] = { atoms: [] };
        let meta = null;
        try { meta = JSON.parse(row._meta_json || 'null'); } catch (e) { }
        files[row.file_path].atoms.push({
            id: row.id, name: row.name, type: row.atom_type,
            filePath: row.file_path, lineStart: row.line_start, lineEnd: row.line_end, _meta: meta
        });
    }

    const detector = new OmnysysHealthDetector();
    const result = await detector.detect({ files });

    fs.writeFileSync('health.json', JSON.stringify({
        score: result.score,
        summary: result.summary,
        findings: result.findings
    }, null, 2));
}
run().catch(e => process.stderr.write(e.stack + '\n'));
