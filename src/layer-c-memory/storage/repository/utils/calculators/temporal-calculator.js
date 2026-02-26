/**
 * Calculador de vectores temporales.
 * @module storage/repository/utils/calculators/temporal-calculator
 */

/**
 * Calcula vectores temporales desde metadatos del átomo.
 * @param {Object} atom - Atomo base
 * @returns {Object} { ageDays, changeFrequency }
 */
export function calculateTemporalVectors(atom) {
    const shadowNow = new Date();
    const extractedAt = atom.extractedAt || atom._meta?.extractedAt;

    let ageDays = 0;
    if (extractedAt) {
        const extracted = new Date(extractedAt);
        const diffMs = shadowNow - extracted;
        ageDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
    }

    const updatedAt = atom.updatedAt;
    let changeFrequency = 0;
    if (extractedAt && updatedAt) {
        const extracted = new Date(extractedAt);
        const updated = new Date(updatedAt);
        if (updated - extracted > 1000) {
            changeFrequency = 1;
        }
    }

    return { ageDays, changeFrequency };
}

/**
 * Calcula estabilidad (0-1)
 * @param {Object} atom - Atomo base
 * @param {Object} gitHistory - Historial de git opcional
 * @returns {number} Score de estabilidad
 */
export function calculateStability(atom, gitHistory = null) {
    let changeFreq = 0;

    if (gitHistory) {
        changeFreq = gitHistory.changeFrequency || 0;
    } else {
        const temporal = calculateTemporalVectors(atom);
        changeFreq = temporal.changeFrequency;
    }

    if (!changeFreq) return 1.0;

    const stability = Math.max(0, 1 - changeFreq);
    return Math.round(stability * 100) / 100;
}
