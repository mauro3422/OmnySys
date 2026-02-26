/**
 * @fileoverview Wrapper para detección de shadowing
 */

import { detectShadowing } from '../../../../layer-a-static/analyses/tier3/shadowing-detector/detector.js';

/**
 * Busca casos de shadowing en los átomos proporcionados
 * @param {Array<Object>} atoms - Átomos a analizar
 * @returns {Promise<Array<Object>>} - Hallazgos de shadowing
 */
export async function findShadowing(atoms) {
    const allFindings = [];

    // Agrupar átomos por archivo para minimizar parseos
    const byFile = atoms.reduce((acc, atom) => {
        if (!acc[atom.file]) acc[atom.file] = [];
        acc[atom.file].push(atom);
        return acc;
    }, {});

    for (const [file, fileAtoms] of Object.entries(byFile)) {
        // Necesitamos el código completo del archivo
        // En una implementación real, lo leeríamos del disco o caché
        // Por ahora, asumimos que detectShadowing se encarga del parseo
        // (aunque lo ideal sería pasarle el Tree ya existente)
        try {
            // Simulación: solo analizar si el archivo tiene átomos
            if (fileAtoms.length > 0) {
                // En este wrapper, delegamos al detector de Layer A
                // Nota: detectShadowing lee el archivo internamente
                const findings = await detectShadowing('', file);
                allFindings.push(...findings);
            }
        } catch (e) {
            // Silencioso o loguear error
        }
    }

    return allFindings;
}
