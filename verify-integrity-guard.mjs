process.env.LOG_LEVEL = 'debug';
process.env.DEBUG = 'OmnySys:*';
import { analyzeAndIndex } from './src/core/file-watcher/analyze.js';
import { parseFileFromDisk } from './src/layer-a-static/parser/index.js';
import { initializeStorage } from './src/layer-c-memory/storage/database/connection.js';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function run() {
    try {
        const rootPath = process.cwd();

        // Inicializar DB para que Repository y VersionManager funcionen
        initializeStorage(rootPath);
        const filePath = 'test-integrity.js';
        const fullPath = path.join(rootPath, filePath);

        console.log(`Testing Integrity Guard for: ${filePath}`);

        // Mocking FileWatcher context
        const context = {
            rootPath,
            emit: (event, data) => {
                console.log(`[EVENT][${event}]`, JSON.stringify(data, null, 2));
            }
        };

        console.log(`Testing Integrity Guard for: ${filePath}`);
        console.log('TYPES:', {
            filePath: typeof filePath,
            fullPath: typeof fullPath,
            rootPath: typeof rootPath
        });

        try {
            const fileInfo = await parseFileFromDisk(fullPath);
            console.log('FileInfo Atoms Count:', fileInfo.atoms?.length || 0);
            console.log('FileInfo Functions Count:', fileInfo.functions?.length || 0);
            console.log('Atoms Raw:', JSON.stringify(fileInfo.atoms?.map(a => ({ name: a.name, type: a.type })), null, 2));

            // Intentar solo analyzeFile primero
            console.log('--- CALLING analyzeFile ---');
            // const result = await analyzeAndIndex.call(context, filePath, fullPath); // Comentado para probar analyzeFile
            const { analyzeFile } = await import('./src/core/file-watcher/analyze.js'); // Import analyzeFile
            const result = await analyzeFile.call(context, filePath, fullPath);
            console.log('analyzeFile succeeded');

            // Si funciona, intentar los guardias manualmente
            console.log('--- CALLING guards manually ---');
            const { detectIntegrityViolations } = await import('./src/core/file-watcher/guards/integrity-guard.js');
            await detectIntegrityViolations(rootPath, filePath, context, result.moleculeAtoms, { verbose: true });
            console.log('Guards succeeded');

            console.log('Molecule Structure:', JSON.stringify({
                atomCount: result.atomCount,
                molecularChains: !!result.molecularChains
            }, null, 2));
            console.log('Molecule Atoms:', JSON.stringify(result.moleculeAtoms, (key, value) => {
                if (key === 'source' || key === 'content') return undefined; // Skip large fields
                return value;
            }, 2));
            console.log('Analysis completed successfully');
        } catch (error) {
            console.error('Analysis failed:', error);
            if (error.stack) console.error(error.stack);
        }
    } catch (err) {
        console.error('GLOBAL ERROR CAUGHT:');
        console.error(err);
        if (err.stack) console.error(err.stack);
        process.exit(1);
    }
}

run();
