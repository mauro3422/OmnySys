import {
    buildDuplicateRegistrationIssue,
    buildInitializationChurnIssue,
    buildRegistryLeakIssue,
    buildSlowInitializationIssue
} from './runtime-registry-health-issues.js';
import { findRuntimeRegistryHealthDuplicateRegistrations } from './runtime-registry-health-duplicates.js';

const MAX_EXPECTED_GUARDS = 50;
const MAX_INIT_CALLS = 3;

export function collectRuntimeRegistryHealthIssues({ filePath, registrySnapshot, stats }) {
    const issues = [];

    if (registrySnapshot) {
        const duplicates = findRuntimeRegistryHealthDuplicateRegistrations(registrySnapshot);
        if (duplicates.length > 0) {
            issues.push(buildDuplicateRegistrationIssue({ filePath, duplicates }));
        }
    }

    if (stats.initCalls > MAX_INIT_CALLS) {
        issues.push(buildInitializationChurnIssue({
            filePath,
            initCalls: stats.initCalls,
            lastInitTime: stats.lastInitTime
        }));
    }

    if (registrySnapshot) {
        const semanticCount = registrySnapshot.semanticGuards?.size || 0;
        const impactCount = registrySnapshot.impactGuards?.size || 0;
        const totalSize = semanticCount + impactCount;

        if (totalSize > MAX_EXPECTED_GUARDS) {
            issues.push(buildRegistryLeakIssue({
                filePath,
                semanticCount,
                impactCount,
                totalSize
            }));
        }

        if (registrySnapshot.initializationPromise && !registrySnapshot.initialized) {
            const timeInInit = Date.now() - (stats.initStartTime || Date.now());
            if (timeInInit > 5000) {
                issues.push(buildSlowInitializationIssue({
                    filePath,
                    timeInInit,
                    hasInitPromise: true,
                    isInitialized: registrySnapshot.initialized
                }));
            }
        }
    }

    return issues;
}
