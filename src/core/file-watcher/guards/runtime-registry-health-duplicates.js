export function findRuntimeRegistryHealthDuplicateRegistrations(snapshot) {
    const duplicates = [];
    const seen = new Set();

    if (snapshot.semanticGuards) {
        for (const [name, count] of snapshot.semanticGuards.entries()) {
            if (seen.has(name)) {
                duplicates.push({ name, type: 'semantic', count });
            } else {
                seen.add(name);
            }
        }
    }

    if (snapshot.impactGuards) {
        for (const [name, count] of snapshot.impactGuards.entries()) {
            if (seen.has(name)) {
                duplicates.push({ name, type: 'impact', count });
            } else {
                seen.add(name);
            }
        }
    }

    return duplicates;
}
