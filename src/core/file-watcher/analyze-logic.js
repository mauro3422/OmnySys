/**
 * @fileoverview analyze-logic.js - Specialized handlers for analyzeFlow
 */
import { createLogger } from '../../utils/logger.js';

const logger = createLogger('OmnySys:analyze:logic');

/**
 * Detects removed atoms and marks them accordingly.
 */
export async function handleRemovedAtoms(repoPath, filePath, moleculeAtoms, previousAtoms, markFn, saveFn) {
    const newAtomNames = new Set(moleculeAtoms.filter(a => a.name).map(a => a.name));
    for (const prev of previousAtoms) {
        if (prev.name && !newAtomNames.has(prev.name) && prev.lineage?.status !== 'removed') {
            await saveFn(repoPath, filePath, prev.name, markFn(prev));
        }
    }
    return newAtomNames;
}

/**
 * Filters atoms to save based on recent atomic-edit protections.
 */
export function filterProtectedAtoms(moleculeAtoms, previousAtoms) {
    const RECENT_EDIT_THRESHOLD = 2000;
    const now = Date.now();
    const atomsToSave = [];
    const atomsToSkip = [];

    for (const atom of moleculeAtoms) {
        const prevAtom = previousAtoms.find(p => p.name === atom.name);
        if (prevAtom &&
            prevAtom._meta?.source === 'atomic-edit' &&
            prevAtom._meta?.lastModified &&
            (now - prevAtom._meta.lastModified) < RECENT_EDIT_THRESHOLD) {
            atomsToSkip.push(atom.name);
        } else {
            atomsToSave.push(atom);
        }
    }

    if (atomsToSkip.length > 0) {
        logger.info(`[PROTECTION] Protected ${atomsToSkip.length} atoms from watcher overwrite: ${atomsToSkip.join(', ')}`);
    }

    return { atomsToSave, atomsToSkip };
}
