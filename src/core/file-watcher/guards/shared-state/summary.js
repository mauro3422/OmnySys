import { getSharedStateContentionSummary } from '../../../../shared/compiler/index.js';

export function getSharedStateContentionSummaryForAtoms(db, atomIds, contentionThreshold, criticalThreshold) {
    return getSharedStateContentionSummary(db, {
        atomIds,
        mediumThreshold: contentionThreshold,
        highThreshold: criticalThreshold
    });
}

export function resolveHotSharedStateAtom(atoms, hottestKey) {
    return hottestKey
        ? atoms.find((atom) => atom.name === hottestKey.key) || null
        : null;
}
