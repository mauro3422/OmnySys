import { collectRuntimeRegistryHealthDuplicateIssues } from './runtime-registry-health-evidence-duplicates.js';
import { collectRuntimeRegistryHealthLifecycleIssues } from './runtime-registry-health-evidence-lifecycle.js';
import { collectRuntimeRegistryHealthGrowthIssues } from './runtime-registry-health-evidence-growth.js';
import { collectRuntimeRegistryHealthSafetyIssues } from './runtime-registry-health-evidence-safety.js';

export function collectRuntimeRegistryHealthIssues({ filePath, registrySnapshot, stats }) {
    return [
        ...collectRuntimeRegistryHealthDuplicateIssues({ filePath, registrySnapshot }),
        ...collectRuntimeRegistryHealthLifecycleIssues({ filePath, stats }),
        ...collectRuntimeRegistryHealthGrowthIssues({ filePath, registrySnapshot }),
        ...collectRuntimeRegistryHealthSafetyIssues({ filePath, registrySnapshot, stats })
    ];
}
