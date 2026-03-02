// Quick diagnostic: count errors vs successful in analyzeProjectFilesUnified
import { getRepository } from './src/layer-c-memory/storage/repository/index.js';
import { scanProjectFiles } from './src/layer-a-static/pipeline/scan.js';
import { parseFileFromDisk } from './src/layer-a-static/parser/index.js';
import { AtomExtractionPhase } from './src/layer-a-static/pipeline/phases/atom-extraction/index.js';
import path from 'path';
import crypto from 'crypto';
import fs from 'fs/promises';

const root = process.cwd();
const { files } = await scanProjectFiles(root, false);

let errors = 0, successes = 0, atomless = 0;
const atomPhase = new AtomExtractionPhase();

// Sample just first 200 files to keep it quick
for (const absoluteFilePath of files.slice(0, 200)) {
    try {
        const relativeFilePath = path.relative(root, absoluteFilePath).replace(/\\/g, '/');
        const content = await fs.readFile(absoluteFilePath, 'utf8');
        crypto.createHash('md5').update(content).digest('hex');
        const parsedFile = await parseFileFromDisk(absoluteFilePath);
        const context = { filePath: relativeFilePath, code: content, fullFileCode: content, fileInfo: parsedFile, fileMetadata: parsedFile.metadata || {} };
        await atomPhase.execute(context);
        const atoms = context.atoms || [];
        if (atoms.length > 0) successes++;
        else atomless++;
    } catch (e) {
        errors++;
        console.log('ERROR:', path.relative(root, absoluteFilePath), e.message.split('\n')[0]);
    }
}

console.log(`\n=== Results for 200 files ===`);
console.log(`Successes (with atoms): ${successes}`);
console.log(`Atomless (no error, no atoms): ${atomless}`);
console.log(`Errors (catch block): ${errors}`);
