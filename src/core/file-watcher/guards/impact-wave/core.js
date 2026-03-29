import { clearPersistedImpactWaveIssues } from './persistence.js';
import { collectImpactWaveEvidence } from './evidence.js';
import { reportImpactWaveFinding } from './reporting.js';

export async function detectImpactWave(rootPath, filePath, previousAtoms = [], EventEmitterContext, getAtomsFn, options = {}) {
    try {
        const evidence = await collectImpactWaveEvidence({
            rootPath,
            filePath,
            previousAtoms,
            getAtomsFn,
            ...options
        });
        if (!evidence) return null;
        return await reportImpactWaveFinding(rootPath, filePath, evidence, EventEmitterContext);
    } catch (error) {
        clearPersistedImpactWaveIssues(rootPath, filePath).catch(() => {});
        return null;
    }
}
