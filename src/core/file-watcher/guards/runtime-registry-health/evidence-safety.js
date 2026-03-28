import { buildSlowInitializationIssue } from './issues.js';

export function collectRuntimeRegistryHealthSafetyIssues({ filePath, registrySnapshot, stats }) {
    if (!registrySnapshot?.initializationPromise || registrySnapshot.initialized) return [];

    const timeInInit = Date.now() - (stats.initStartTime || Date.now());
    return timeInInit > 5000
        ? [buildSlowInitializationIssue({
            filePath,
            timeInInit,
            hasInitPromise: true,
            isInitialized: registrySnapshot.initialized
        })]
        : [];
}
