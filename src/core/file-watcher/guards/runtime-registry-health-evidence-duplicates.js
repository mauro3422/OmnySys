import { buildDuplicateRegistrationIssue } from './runtime-registry-health-issues.js';
import { findRuntimeRegistryHealthDuplicateRegistrations } from './runtime-registry-health-duplicates.js';

export function collectRuntimeRegistryHealthDuplicateIssues({ filePath, registrySnapshot }) {
    if (!registrySnapshot) return [];

    const duplicates = findRuntimeRegistryHealthDuplicateRegistrations(registrySnapshot);
    return duplicates.length > 0
        ? [buildDuplicateRegistrationIssue({ filePath, duplicates })]
        : [];
}
