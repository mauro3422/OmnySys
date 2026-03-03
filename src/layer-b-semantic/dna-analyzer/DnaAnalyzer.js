/**
 * @fileoverview DnaAnalyzer.js
 * 
 * Motor de análisis de similitud basado en ADN (hashing estructural).
 * Detecta clones de código a través de todo el proyecto.
 * 
 * @module layer-b-semantic/dna-analyzer
 */

import { compareDNA } from '../../layer-a-static/extractors/metadata/dna-extractor/dna-helpers.js';
import { createLogger } from '../../utils/logger.js';

const logger = createLogger('OmnySys:DNA:Analyzer');

export class DnaAnalyzer {
    /**
     * Compara dos átomos y retorna su similitud estructural.
     */
    static getSimilarity(atomA, atomB) {
        if (!atomA.dna || !atomB.dna) return 0;
        return compareDNA(atomA.dna, atomB.dna);
    }

    /**
     * Agrupa átomos por ADN idéntico (Colisiones de Hash).
     * @param {Array} atoms - Lista de átomos a analizar
     */
    static findExactDuplicates(atoms) {
        const groups = new Map();

        atoms.forEach(atom => {
            if (!atom.dna || !atom.dna.structuralHash) return;

            const hash = atom.dna.structuralHash;
            if (!groups.has(hash)) {
                groups.set(hash, []);
            }
            groups.get(hash).push(atom);
        });

        return Array.from(groups.values()).filter(g => g.length > 1);
    }
}
