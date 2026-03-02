import { Worker } from 'worker_threads';
import { fileURLToPath } from 'url';
import path from 'path';
import fs from 'fs';

fs.rmSync(path.resolve('.omnysysdata'), { recursive: true, force: true });

const workerPath = fileURLToPath(new URL('./src/layer-a-static/pipeline/worker-analysis.js', import.meta.url));

const worker = new Worker(workerPath, {
    workerData: {
        files: [path.resolve('./src/layer-a-static/pipeline/unified-analysis.js')],
        absoluteRootPath: path.resolve('.')
    }
});

worker.on('message', msg => {
    if (msg.type === 'DONE') {
        const atoms = msg.liteResults[Object.keys(msg.liteResults)[0]].atoms;
        console.log('EXTRACTED ATOM IDs:');
        atoms.forEach(a => console.log(' - ' + a.id));
        console.log('TOTAL EXTRACTED:', msg.extractedCount);
    }
});
