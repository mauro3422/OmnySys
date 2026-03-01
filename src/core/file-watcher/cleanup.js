import fs from 'fs/promises';
import path from 'path';

const DATA_DIR = '.omnysysdata';

/**
 * 🧹 Limpia átomos que ya no existen en el código fuente
 * Elimina tanto archivos JSON como registros en SQLite
 * 
 * @param {string} rootPath - Raíz del proyecto
 * @param {string} filePath - Ruta relativa del archivo
 * @param {Set} validAtomNames - Set con los nombres de átomos válidos (que existen en el código)
 */
export async function cleanupOrphanedAtomFiles(rootPath, filePath, validAtomNames) {
    // 🧹 1. Limpiar archivos JSON (legacy)
    try {
        const atomsDir = path.join(rootPath, DATA_DIR, 'atoms');
        const fileDir = path.dirname(filePath);
        const fileName = path.basename(filePath, path.extname(filePath));
        const targetDir = path.join(atomsDir, fileDir, fileName);

        // Verificar si el directorio existe
        try {
            await fs.access(targetDir);
        } catch {
            return; // Directorio no existe, nada que limpiar
        }

        // Leer todos los archivos JSON en el directorio
        const files = await fs.readdir(targetDir);
        const jsonFiles = files.filter(f => f.endsWith('.json'));

        let cleanedCount = 0;

        for (const jsonFile of jsonFiles) {
            // Extraer el nombre del átomo del nombre del archivo (quitar .json)
            const atomName = jsonFile.slice(0, -5);

            // Si el átomo no está en la lista de válidos, eliminar el archivo
            if (!validAtomNames.has(atomName)) {
                const fileToDelete = path.join(targetDir, jsonFile);
                await fs.unlink(fileToDelete);
                cleanedCount++;
            }
        }

        if (cleanedCount > 0) {
            console.log(`🧹 Eliminados ${cleanedCount} átomos obsoletos de ${filePath}`);
        }
    } catch (error) {
        // No propagar errores de limpieza JSON - no es crítico
        console.warn(`⚠️ Error limpiando átomos obsoletos (JSON):`, error.message);
    }

    // 🧹 2. Marcar átomos como REMOVED en SQLite (preserva lineage)
    try {
        const { getRepository } = await import('#layer-c/storage/repository/index.js');
        const repo = getRepository(rootPath);

        if (!repo?.db) return;

        // Obtener todos los átomos del archivo
        const existingAtoms = repo.db.prepare(
            'SELECT id, name, purpose_type as purpose FROM atoms WHERE file_path = ?'
        ).all(filePath);

        let markedCount = 0;

        for (const atom of existingAtoms) {
            // Solo marcar como removed si no está ya marcado y no está en la lista válida
            if (atom.purpose !== 'REMOVED' && !validAtomNames.has(atom.name)) {
                repo.db.prepare(`
          UPDATE atoms 
          SET purpose_type = 'REMOVED', 
              is_dead_code = 1,
              derived_json = json_set(COALESCE(derived_json, '{}'), '$.status', 'removed', '$.removedAt', datetime('now'))
          WHERE id = ?
        `).run(atom.id);
                markedCount++;
            }
        }

        if (markedCount > 0) {
            console.log(`🧹 Marcados como REMOVED: ${markedCount} átomos de ${filePath}`);
        }
    } catch (error) {
        console.warn(`⚠️ Error marcando átomos como REMOVED:`, error.message);
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
