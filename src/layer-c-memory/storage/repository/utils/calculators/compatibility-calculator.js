/**
 * Calculador de compatibilidad entre átomos.
 * @module storage/repository/utils/calculators/compatibility-calculator
 */

/**
 * Calcula compatibilidad entre dos atomos para merge (0-1)
 */
export function calculateCompatibility(atomA, atomB) {
    const vectorA = [
        atomA.complexity || 1,
        atomA.linesOfCode || 0,
        atomA.parameterCount || 0,
        atomA.callersCount || 0,
        atomA.calleesCount || 0
    ];

    const vectorB = [
        atomB.complexity || 1,
        atomB.linesOfCode || 0,
        atomB.parameterCount || 0,
        atomB.callersCount || 0,
        atomB.calleesCount || 0
    ];

    const dotProduct = vectorA.reduce((sum, a, i) => sum + a * vectorB[i], 0);
    const normA = Math.sqrt(vectorA.reduce((sum, a) => sum + a * a, 0));
    const normB = Math.sqrt(vectorB.reduce((sum, b) => sum + b * b, 0));

    if (normA === 0 || normB === 0) return 0;

    const similarity = dotProduct / (normA * normB);

    const callersA = new Set(atomA.calledBy || []);
    const callersB = new Set(atomB.calledBy || []);
    const intersection = [...callersA].filter(x => callersB.has(x));
    const sharedRatio = intersection.length / Math.max(callersA.size, callersB.size, 1);

    const compatibility = (similarity * 0.6) + (sharedRatio * 0.4);

    return Math.round(compatibility * 100) / 100;
}
