/**
 * Mapeo de purpose de átomo a responsabilidad legible.
 */
const PURPOSE_TO_RESPONSIBILITY = {
    API_EXPORT: 'api',
    EVENT_HANDLER: 'event-handling',
    TEST_HELPER: 'testing',
    TIMER_ASYNC: 'async-orchestration',
    NETWORK_HANDLER: 'network',
    INTERNAL_HELPER: 'internal-logic',
    CONFIG_SETUP: 'configuration',
    SCRIPT_MAIN: 'entry-point',
    CLASS_METHOD: 'class-api',
    DEAD_CODE: 'unused',
};

/**
 * Calcula riskLevel desde complejidad de átomos y número de dependientes.
 */
function deriveRiskLevel(atoms, usedByCount) {
    const avgComplexity = atoms.length > 0
        ? atoms.reduce((sum, a) => sum + (a.complexity || 1), 0) / atoms.length
        : 1;

    const hasGodFunction = atoms.some(a => a.archetype?.type === 'god-function');
    const hasHotPath = atoms.some(a => a.archetype?.type === 'hot-path');

    if (hasGodFunction || (avgComplexity > 15 && usedByCount > 10)) return 'high';
    if (hasHotPath || avgComplexity > 8 || usedByCount > 5) return 'medium';
    return 'low';
}

/**
 * Extrae responsabilidades únicas desde los purposes de los átomos.
 */
function deriveResponsibilities(atoms) {
    const seen = new Set();
    for (const atom of atoms) {
        if (atom.purpose && PURPOSE_TO_RESPONSIBILITY[atom.purpose]) {
            seen.add(PURPOSE_TO_RESPONSIBILITY[atom.purpose]);
        }
    }
    return [...seen];
}

/**
 * Deriva insights estáticos para un archivo desde sus átomos.
 */
export function deriveFileInsights(fileAnalysis, totalFiles = 1000) {
    const atoms = fileAnalysis.atoms || [];
    const usedBy = fileAnalysis.usedBy || [];
    const imports = fileAnalysis.imports || [];

    const usedByCount = usedBy.length;
    const isEntryPoint = imports.length > 0 && usedByCount === 0;
    const isOrphan = usedByCount === 0 && !isEntryPoint && atoms.length > 0;

    // Arquetipo dominante del archivo
    const archetypeCounts = {};
    for (const atom of atoms) {
        const t = atom.archetype?.type;
        if (t) archetypeCounts[t] = (archetypeCounts[t] || 0) + 1;
    }
    const dominantAtomArchetype = Object.entries(archetypeCounts)
        .sort((a, b) => b[1] - a[1])[0]?.[0] || 'standard';

    const riskLevel = deriveRiskLevel(atoms, usedByCount);
    const responsibilities = deriveResponsibilities(atoms);
    const impactScore = Math.min(usedByCount / Math.max(totalFiles * 0.1, 1), 1.0);

    return {
        derivedInsights: {
            source: 'static-atoms',
            riskLevel,
            responsibilities,
            impactScore: parseFloat(impactScore.toFixed(3)),
            isOrphan,
            isEntryPoint,
            dominantAtomArchetype,
            atomCount: atoms.length,
            usedByCount,
            confidence: 1.0,
        }
    };
}
