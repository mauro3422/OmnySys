import { analyzeProjectFilesUnified } from './layer-a-static/pipeline/unified-analysis.js';
import fs from 'fs';

async function test() {
    const files = [
        'src/layer-c-memory/storage/enrichers/atom-enricher.js',
        'src/layer-c-memory/storage/repository/utils/calculators/semantic-calculator.js',
        'src/layer-c-memory/storage/repository/utils/vector-calculator.js'
    ];
    try {
        const res = await analyzeProjectFilesUnified(files, 'c:/Dev/OmnySystem', true, 'deep', 'Test');
        console.log("Success:", JSON.stringify(res, null, 2));
    } catch (e) {
        console.error("Crash:", e.stack);
    }
}
test();
