import { safeArray } from '../../../shared/compiler/index.js';
import { isLowSignalName } from './guard-standards.js';

function shouldTrackAtom(atom) {
    return Boolean(atom?.name) && !isLowSignalName(atom.name);
}

export function collectImpactWaveAtomChanges(previousAtoms, currentAtoms, countRequiredParams) {
    const previousByName = new Map(previousAtoms.map((atom) => [atom.name, atom]));
    const currentNames = new Set(currentAtoms.map((atom) => atom.name));
    const changedAtoms = [];

    for (const atom of currentAtoms) {
        if (!shouldTrackAtom(atom)) continue;

        const previousAtom = previousByName.get(atom.name);
        if (!previousAtom) {
            changedAtoms.push({ id: atom.id, name: atom.name, type: 'added' });
            continue;
        }

        if (countRequiredParams(previousAtom) !== countRequiredParams(atom)) {
            changedAtoms.push({ id: atom.id, name: atom.name, type: 'signature' });
        }
    }

    for (const previousAtom of previousAtoms) {
        if (!shouldTrackAtom(previousAtom)) continue;
        if (!currentNames.has(previousAtom.name)) {
            changedAtoms.push({ id: previousAtom.id, name: previousAtom.name, type: 'removed' });
        }
    }

    return changedAtoms;
}

export function collectImpactWaveRelatedFiles(currentAtoms, focusedAtomNames, filePath, extractRelationFile) {
    const relatedFiles = new Set();

    for (const atom of currentAtoms) {
        if (!focusedAtomNames.has(atom.name)) continue;

        for (const rel of safeArray(atom.calledBy)) {
            const relFile = extractRelationFile(rel);
            if (relFile && relFile !== filePath) relatedFiles.add(relFile);
        }

        for (const rel of safeArray(atom.calls)) {
            const relFile = extractRelationFile(rel);
            if (relFile && relFile !== filePath) relatedFiles.add(relFile);
        }
    }

    return relatedFiles;
}
