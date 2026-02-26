import { FileWatcher } from './src/core/file-watcher/index.js';
import { connectionManager } from './src/layer-c-memory/storage/repository/adapters/sqlite-adapter-core.js';

async function run() {
    const rootPath = process.cwd();
    connectionManager.initialize(rootPath);

    const watcher = new FileWatcher(rootPath, { batchDelayMs: 100, useSmartBatch: true });

    try {
        console.log('Initializing watcher...');
        await watcher.initialize();

        console.log('Faking a file modification event...');
        await watcher.notifyChange('src/utils/logger.js', 'modified');

        // Wait for batch processor to pick it up
        await new Promise(r => setTimeout(r, 1000));

        console.log('Success - no crashes!');
    } catch (err) {
        console.error('FAILED:', err);
    } finally {
        if (watcher.fsWatcher) watcher.fsWatcher.close();
        if (watcher.processingInterval) clearInterval(watcher.processingInterval);
        connectionManager.close();
        process.exit(0);
    }
}

run();
