import { buildDuplicateRegistrationIssue } from './issues.js';
import { findRuntimeRegistryHealthDuplicateRegistrations } from './duplicates.js';

export function collectRuntimeRegistryHealthDuplicateIssues({ filePath, registrySnapshot }) {
    if (!registrySnapshot) return [];

    const duplicates = findRuntimeRegistryHealthDuplicateRegistrations(registrySnapshot);
    return duplicates.length > 0
        ? [buildDuplicateRegistrationIssue({ filePath, duplicates })]
        : [];
}
