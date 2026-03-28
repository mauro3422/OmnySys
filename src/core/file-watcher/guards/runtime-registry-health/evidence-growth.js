import { buildRegistryLeakIssue } from './issues.js';

const MAX_EXPECTED_GUARDS = 50;

export function collectRuntimeRegistryHealthGrowthIssues({ filePath, registrySnapshot }) {
    if (!registrySnapshot) return [];

    const semanticCount = registrySnapshot.semanticGuards?.size || 0;
    const impactCount = registrySnapshot.impactGuards?.size || 0;
    const totalSize = semanticCount + impactCount;

    return totalSize > MAX_EXPECTED_GUARDS
        ? [buildRegistryLeakIssue({
            filePath,
            semanticCount,
            impactCount,
            totalSize
        })]
        : [];
}
