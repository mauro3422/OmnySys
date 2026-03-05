import { refreshPatterns } from '#layer-a/indexer.js';
import { resolveProjectPath } from '../utils/paths.js';
import { log } from '../utils/logger.js';

export const aliases = ['refresh', 'rethink'];

export async function refreshLogic(projectPath, options = {}) {
    const absolutePath = resolveProjectPath(projectPath);
    const { verbose = true } = options;

    log(`\n🧠 Rethinking technical debt for: ${absolutePath}\n`, 'info');

    try {
        const result = await refreshPatterns(absolutePath, verbose);

        log('\n✅ System refresh complete! All patterns re-calculated.', 'success');
        return { success: true, exitCode: 0, projectPath: absolutePath, result };
    } catch (error) {
        log(`\n❌ Refresh failed: ${error.message}`, 'error');
        return { success: false, exitCode: 1, error: error.message };
    }
}

export async function execute(projectPath) {
    const result = await refreshLogic(projectPath);
    if (!result.success) {
        process.exit(result.exitCode);
    }
}
