import fs from 'fs';

const ghosts = [
    'src/cli/utils/opencode-config.js',
    'src/layer-c-memory/storage/atoms/incremental-atom-saver.js',
    'src/layer-a-static/pipeline/enhancers/legacy/index.js',
    'src/layer-a-static/pipeline/enhancers/legacy/system-map-enhancer.js',
    'src/layer-c-memory/mcp/tools/generate-tests/test-coverage-analyzer.js',
    'src/layer-c-memory/mcp/tools/generate-tests/source-analyzer.js',
    'src/layer-c-memory/mcp/tools/generate-tests/branch-extractor.js',
    'src/layer-c-memory/mcp/tools/generate-tests/analyze-for-tests.js',
    'src/layer-a-static/preprocessor/handlers/javascript.js',
    'src/layer-a-static/preprocessor/engine.js',
    'src/layer-a-static/extractors/metadata/dna-extractor.js',
    'src/layer-a-static/analyses/tier3/shared-state-detector.js',
    'src/core/file-watcher/lifecycle.js',
    'src/core/file-watcher/batch-processor.js',
    'src/core/file-watcher/handlers.js',
    'src/core/cache/manager/storage.js'
];

ghosts.forEach(f => {
    try {
        if (fs.existsSync(f)) {
            fs.unlinkSync(f);
            console.log(`Deleted: ${f}`);
        }
    } catch (e) {
        console.error(`Failed to delete ${f}:`, e.message);
    }
});
