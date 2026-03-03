import { initializeStorage, getDatabase } from './src/layer-c-memory/storage/database/connection.js';
import { OmnysysHealthDetector } from './src/layer-a-static/pattern-detection/detectors/omnysys-health-detector.js';

async function run() {
    initializeStorage(process.cwd());
    const db = getDatabase();
    const atoms = db.prepare('SELECT * FROM atoms').all();
    const files = {};
    for (const a of atoms) {
        if (!files[a.file_path]) files[a.file_path] = { atoms: [] };
        a._meta = JSON.parse(a._meta_json || '{}');
        a.type = a.atom_type;
        files[a.file_path].atoms.push(a);
    }
    const d = new OmnysysHealthDetector();
    const r = await d.detect({ files });

    const dyn = r.findings.filter(f => f.type === 'sql-dynamic-in-storage').map(f => ({
        file: f.filePath,
        line: f.line,
        details: f.details
    }));

    console.log(JSON.stringify(dyn, null, 2));
}

run().catch(console.error);
