/**
 * @fileoverview Complexity Strategy
 */
export class ComplexityStrategy {
    score(fileAnalysis) {
        const atoms = fileAnalysis.atoms || [];
        if (atoms.length === 0) return 0.1;

        // Promedio de complejidad de átomos
        const avgComplexity = atoms.reduce((sum, a) =>
            sum + (a.complexity?.cyclomatic || 1), 0) / atoms.length;

        // Normalizar: complejidad 1-5 = bajo, 6-10 = medio, >10 = alto
        if (avgComplexity <= 5) return 0.2;
        if (avgComplexity <= 10) return 0.5;
        return 0.8;
    }
}
