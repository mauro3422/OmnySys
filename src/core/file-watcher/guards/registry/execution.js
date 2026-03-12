export async function persistGuardCrash(persistWatcherIssue, rootPath, filePath, name, type, error) {
    const issueType = `runtime_${type}_guard_crash_${name}_high`;
    await persistWatcherIssue(
        rootPath,
        filePath,
        issueType,
        'high',
        `${type} guard '${name}' crashed: ${error.message}`,
        {
            source: 'guard_registry',
            guardName: name,
            guardType: type,
            errorName: error.name || 'Error',
            errorMessage: error.message,
            stack: error.stack || null
        }
    );
}

export async function clearGuardCrash(clearWatcherIssue, rootPath, filePath, name, type) {
    const issueType = `runtime_${type}_guard_crash_${name}_high`;
    await clearWatcherIssue(rootPath, filePath, issueType);
}

export async function runGuardMap({
    guardMap,
    type,
    rootPath,
    filePath,
    runner,
    logger,
    persistWatcherIssue,
    clearWatcherIssue
}) {
    const results = {};

    for (const [name, guardFn] of guardMap.entries()) {
        const startTime = Date.now();
        try {
            results[name] = await runner(guardFn);
            await clearGuardCrash(clearWatcherIssue, rootPath, filePath, name, type);
            const duration = Date.now() - startTime;

            if (duration > 100) {
                logger.warn(`${type === 'semantic' ? 'Semantic' : 'Impact'} guard '${name}' took ${duration}ms (slow)`);
            }
        } catch (error) {
            logger.error(`Error in ${type} guard '${name}' for ${filePath}: ${error.message}`);
            await persistGuardCrash(persistWatcherIssue, rootPath, filePath, name, type, error);
            results[name] = { error: error.message };
        }
    }

    return results;
}
