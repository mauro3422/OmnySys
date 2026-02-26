import path from 'path';

/**
 * Construye índice: resolvedAbsPath → Map(fnName → atom)
 * para búsqueda rápida en FASE 3 y FASE 4.
 */
export function buildFileAtomIndex(allAtoms, rootPath) {
    const index = new Map(); // absFilePath → Map(name → atom)

    for (const atom of allAtoms) {
        if (!atom.filePath || !atom.name) continue;
        const absPath = path.resolve(rootPath, atom.filePath);

        if (!index.has(absPath)) index.set(absPath, new Map());
        index.get(absPath).set(atom.name, atom);
    }

    return index;
}

/**
 * Agrega calledBy al targetAtom si no está ya presente.
 * Retorna true si se agregó.
 */
export function addCalledBy(targetAtom, callerAtomId) {
    if (!targetAtom.calledBy) targetAtom.calledBy = [];
    if (targetAtom.calledBy.includes(callerAtomId)) return false;
    targetAtom.calledBy.push(callerAtomId);
    return true;
}
