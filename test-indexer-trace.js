import { IncrementalAnalyzer } from './src/core/file-watcher/incremental-analyzer.js';
import { connectionManager } from './src/layer-c-memory/storage/repository/adapters/sqlite-adapter-core.js';
import path from 'path';

async function run() {
    const rootPath = process.cwd();
    connectionManager.initialize(rootPath);

    const testFile = 'src/utils/logger.js';

    try {
        const analyzer = new IncrementalAnalyzer(null, rootPath);
        analyzer._checkContentChanged = async () => true; // force modify branch

        console.log('Testing Process Change (Modify) on', testFile);
        await analyzer.processChange(testFile, 'modified');
        console.log('Success - no crashes!');
    } catch (err) {
        console.error('FAILED:', err);
    } finally {
        connectionManager.close();
    }
}

run();
