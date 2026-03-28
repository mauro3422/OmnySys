import { collectRuntimeRegistryHealthDuplicateIssues } from './evidence-duplicates.js';
import { collectRuntimeRegistryHealthLifecycleIssues } from './evidence-lifecycle.js';
import { collectRuntimeRegistryHealthGrowthIssues } from './evidence-growth.js';
import { collectRuntimeRegistryHealthSafetyIssues } from './evidence-safety.js';

export function collectRuntimeRegistryHealthIssues({ filePath, registrySnapshot, stats }) {
    return [
        ...collectRuntimeRegistryHealthDuplicateIssues({ filePath, registrySnapshot }),
        ...collectRuntimeRegistryHealthLifecycleIssues({ filePath, stats }),
        ...collectRuntimeRegistryHealthGrowthIssues({ filePath, registrySnapshot }),
        ...collectRuntimeRegistryHealthSafetyIssues({ filePath, registrySnapshot, stats })
    ];
}
