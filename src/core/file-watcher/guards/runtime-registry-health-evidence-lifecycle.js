import { buildInitializationChurnIssue } from './runtime-registry-health-issues.js';

const MAX_INIT_CALLS = 3;

export function collectRuntimeRegistryHealthLifecycleIssues({ filePath, stats }) {
    if (stats.initCalls <= MAX_INIT_CALLS) return [];

    return [buildInitializationChurnIssue({
        filePath,
        initCalls: stats.initCalls,
        lastInitTime: stats.lastInitTime
    })];
}
