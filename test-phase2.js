import { analyzeProjectFilesUnified } from './src/layer-a-static/pipeline/unified-analysis.js';
import { scanProject } from './src/layer-a-static/scanner.js';
import { getRepository } from './src/layer-c-memory/storage/repository/index.js';
import path from 'path';

const root = path.resolve('c:/Dev/OmnySystem');
const repo = getRepository(root);
async function run() {
    const files = await scanProject(root, { returnAbsolute: true });

    // Phase 1 to populate atoms
    console.log('Extracting (Phase 1 Structural)...');
    await analyzeProjectFilesUnified(files, root, true);

    const total = repo.db.prepare('SELECT count(*) as c FROM atoms').get().c;
    console.log('Total Atoms Extracted Before Trigger:', total);

    const testFile = files.find(f => f.includes('atom-extractor.js'));
    if (testFile) {
        console.log('Triggering Phase 2 for:', testFile);
        const { analyzeSingleFile } = await import('./src/layer-a-static/pipeline/single-file.js');
        const relPath = testFile.replace('c:\\Dev\\OmnySystem\\', '').replace(/\\/g, '/');
        console.log('Using relative path for single-file:', relPath);
        await analyzeSingleFile(root, relPath, { verbose: true, incremental: false }, 'deep');

        const phase2Count = repo.db.prepare("SELECT count(*) as c FROM atoms WHERE file_path = ? AND is_phase2_complete = 1").get(relPath).c;
        console.log('Atoms deeply analyzed in test file:', phase2Count);
        console.log('Sample deeply analyzed atom:', repo.db.prepare("SELECT name, is_phase2_complete, function_type FROM atoms WHERE file_path = ? LIMIT 1").get(relPath));
    }
}
run()
    .catch(console.error)
    .finally(() => repo.close());
