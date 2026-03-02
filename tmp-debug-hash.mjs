import { getRepository } from './src/layer-c-memory/storage/repository/index.js';
import { scanProjectFiles } from './src/layer-a-static/pipeline/scan.js';
import { analyzeProjectFilesUnified } from './src/layer-a-static/pipeline/unified-analysis.js';

const root = process.cwd();
const { files } = await scanProjectFiles(root, false);

// Use only 3 batches = 180 files
const subset = files.slice(0, 180);

// Clear existing hashes so we can measure fresh
const repo = getRepository(root);
repo.db.prepare("UPDATE files SET hash = NULL").run();
console.log('Cleared all hashes');

await analyzeProjectFilesUnified(subset, root, false);
console.log('Analysis done for 180 files');

const count = repo.db.prepare("SELECT count(*) as c FROM files WHERE hash IS NOT NULL AND hash != ''").get();
console.log('Files with hash:', count.c, '(expected up to 180)');

// Show sample paths from files table
const samples = repo.db.prepare("SELECT path FROM files WHERE hash IS NOT NULL LIMIT 5").all();
console.log('Sample paths with hash:', samples.map(r => r.path));
