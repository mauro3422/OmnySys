import { analyzeProjectFilesUnified } from './src/layer-a-static/pipeline/unified-analysis.js';
import path from 'path';

async function test() {
    const projectPath = process.cwd();
    const filePath = path.join(projectPath, 'src/layer-c-memory/mcp-http-server.js');

    console.log('Starting Manual Deep Scan...');
    await analyzeProjectFilesUnified([filePath], projectPath, true, 'deep');
    console.log('Manual Deep Scan Complete.');
}

test();
