import { detectGlobalState } from './src/layer-a-static/analyses/tier3/shared-state/parsers/state-parser.js';
import fs from 'fs/promises';

async function test() {
    const code = await fs.readFile('./src/layer-c-memory/mcp-http-server.js', 'utf8');
    const result = await detectGlobalState(code, 'src/layer-c-memory/mcp-http-server.js');

    console.log('Result:', JSON.stringify(result, null, 2));
}

test();
