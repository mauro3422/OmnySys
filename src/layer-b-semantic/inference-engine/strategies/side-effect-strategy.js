/**
 * @fileoverview Side Effects Strategy
 */
export class SideEffectStrategy {
    score(fileAnalysis) {
        const atoms = fileAnalysis.atoms || [];
        if (atoms.length === 0) return 0;

        const sideEffectCount = atoms.filter(a => a.hasSideEffects).length;
        const ratio = sideEffectCount / atoms.length;

        // Más side effects = más riesgo
        return ratio;
    }
}
