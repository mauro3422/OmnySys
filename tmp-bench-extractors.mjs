import { parseFileFromDisk } from './src/layer-a-static/parser/index.js';
import { extractFunctionCode } from './src/shared/utils/ast-utils.js';
import { warmExtractorCache, loadExtractor } from './src/layer-a-static/pipeline/phases/atom-extraction/extraction/atom-extractor/extractor-loader.js';
import { getAtomLevelExtractors } from './src/layer-a-static/extractors/metadata/registry.js';
import fs from 'fs/promises';
import path from 'path';

await warmExtractorCache();

const testFiles = [
    'src/layer-c-memory/storage/database/connection.js',
    'src/layer-a-static/pipeline/unified-analysis.js',
    'src/layer-a-static/extractors/metadata/tree-sitter-integration.js',
];
const parsed = await Promise.all(testFiles.map(async f => {
    const fp = path.resolve('c:/Dev/OmnySystem', f);
    const code = await fs.readFile(fp, 'utf8');
    const info = await parseFileFromDisk(fp, code);
    return { info, code };
}));

const testCases = [];
for (const { info, code } of parsed) {
    for (const fn of info.functions) {
        testCases.push({ fn, code: extractFunctionCode(code, fn), fullCode: code });
    }
}
console.log('Testing on ' + testCases.length + ' real functions');

const entries = getAtomLevelExtractors();
const times = {};
const N = 3;

for (const entry of entries) {
    const extFn = await loadExtractor(entry);
    const t0 = Date.now();
    for (let i = 0; i < N; i++) {
        for (const { fn, code: fnCode, fullCode } of testCases) {
            const ctx = { functionCode: fnCode, functionInfo: fn, fileMetadata: {}, filePath: 'x', fullFileCode: fullCode, results: { performanceHints: {}, typeContracts: {} } };
            const args = entry.getArgs(ctx);
            extFn(...args);
        }
    }
    times[entry.name] = ((Date.now() - t0) / N / testCases.length).toFixed(2);
}

const sorted = Object.entries(times).sort((a, b) => parseFloat(b[1]) - parseFloat(a[1]));
console.log('');
console.log('=== COSTO REAL por extractor ===');
let total = 0;
for (const [k, v] of sorted) {
    total += parseFloat(v);
    const toolsEntry = entries.find(e => e.name === k);
    console.log(k.padEnd(22) + v + 'ms  ->  ' + toolsEntry.usedByTools.join(', '));
}
console.log('TOTAL: ' + total.toFixed(2) + 'ms/atom (solo extractores)');
