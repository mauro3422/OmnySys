import { cleanupOrphanedCompilerArtifacts } from '../../shared/compiler/index.js';

/**
 * 🧹 Limpia átomos que ya no existen en el código fuente
 * Elimina tanto archivos JSON como registros en SQLite
 * 
 * @param {string} rootPath - Raíz del proyecto
 * @param {string} filePath - Ruta relativa del archivo
 * @param {Set} validAtomNames - Set con los nombres de átomos válidos (que existen en el código)
 */
export async function cleanupOrphanedAtomFiles(rootPath, filePath, validAtomNames) {
    try {
        const cleanup = await cleanupOrphanedCompilerArtifacts(rootPath, filePath, validAtomNames);
        if (cleanup.deletedJsonFiles > 0) {
            console.log(`🧹 Eliminados ${cleanup.deletedJsonFiles} átomos obsoletos de ${filePath}`);
        }
        if (cleanup.markedRemovedAtoms > 0) {
            console.log(`🧹 Marcados como REMOVED: ${cleanup.markedRemovedAtoms} átomos de ${filePath}`);
        }
    } catch (error) {
        console.warn(`⚠️ Error reconciliando átomos obsoletos:`, error.message);
    }
}

/**
 * Marca un atom como removido preservando su metadata como snapshot histórico.
 * Mismo comportamiento que single-file.js::markAtomAsRemoved (DRY candidate).
 */
export function _markAtomAsRemoved(atom) {
    return {
        ...atom,
        purpose: 'REMOVED',
        isDeadCode: true,
        callerPattern: { id: 'removed', label: 'Eliminado', reason: 'Function no longer exists in source file' },
        lineage: {
            status: 'removed',
            removedAt: new Date().toISOString(),
            lastSeenAt: atom.extractedAt || atom.analyzedAt || null,
            lastSeenLine: atom.line || null,
            snapshotLOC: atom.linesOfCode ?? atom.lines ?? null,
            snapshotComplexity: atom.complexity ?? null,
            snapshotCallers: Array.isArray(atom.calledBy) ? atom.calledBy.length : 0,
            dnaHash: atom.dna?.structuralHash || atom.dna?.patternHash || null
        }
    };
}
