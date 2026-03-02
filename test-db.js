import { getRepository } from './src/layer-c-memory/storage/repository/index.js';
import path from 'path';

const root = path.resolve('c:/Dev/OmnySystem');
const repo = getRepository(root);
async function run() {
    console.log('Testing raw saveMany()...');

    const testAtom = {
        id: 'test-file.js::testFunc',
        name: 'testFunc',
        file_path: 'test-file.js',
        atom_type: 'function',
        complexity: 1,
        line_start: 1,
        line_end: 10,
        lines_of_code: 10,
        isPhase2Complete: true // the key before conversion
    };

    try {
        repo.saveMany([testAtom]);
        console.log('Saved test atom.');

        const row = repo.db.prepare("SELECT * FROM atoms WHERE id = 'test-file.js::testFunc'").get();
        console.log('Result in DB:', {
            name: row.name,
            is_phase2_complete: row.is_phase2_complete
        });
    } catch (e) {
        console.error(e);
    }
}
run()
    .catch(console.error)
    .finally(() => repo.close());
