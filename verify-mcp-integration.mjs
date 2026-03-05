import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';
import { parseFileFromDisk } from './src/layer-a-static/parser/index.js';
import { analyzeAndIndex } from './src/core/file-watcher/analyze.js';
import { initializeStorage } from './src/layer-c-memory/storage/database/connection.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function run() {
    try {
        const rootPath = process.cwd();
        initializeStorage(rootPath);

        const filePath = 'src/test-integrity-mcp.js';
        const fullPath = path.join(rootPath, filePath);

        const context = {
            rootPath,
            emit: (event, data) => {
                console.log(`[EVENT][${event}]`, JSON.stringify(data, null, 2));
            }
        };

        console.log(`Manual indexing for: ${filePath}`);
        await analyzeAndIndex.call(context, filePath, fullPath);
        console.log('Manual indexing completed.');
        process.exit(0);
    } catch (err) {
        console.error('GLOBAL ERROR CAUGHT:', err);
        process.exit(1);
    }
}

run();
