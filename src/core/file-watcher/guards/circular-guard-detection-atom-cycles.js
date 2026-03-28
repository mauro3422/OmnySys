import { classifyCircularCycle } from '../../../shared/compiler/index.js';
import { detectCycles } from '../../../layer-graph/algorithms/cycle-detector.js';
import { getCircularCallRelations } from './circular-repository.js';
import { getRepository } from '#layer-c/storage/repository/index.js';

export async function detectCircularAtomCycles({
    rootPath,
    filePath,
    relPath,
    localAtoms,
    fileCycle,
    persistLifecycleCycleIssue,
    persistFunctionalCycleIssue,
    clearCircularIssues,
    isLikelyInfrastructureCycleAtom,
    logger
}) {
    try {
        const atomIdPattern = `${relPath}::%`;
        const relations = getCircularCallRelations(getRepository(rootPath)?.db, atomIdPattern);
        const callGraph = {};

        for (const relation of relations) {
            if (!callGraph[relation.source_id]) {
                callGraph[relation.source_id] = { dependsOn: [] };
            }
            callGraph[relation.source_id].dependsOn.push(relation.target_id);
        }

        const cycles = detectCycles(callGraph);

        for (const atom of localAtoms) {
            const atomCycle = cycles.find((cycle) => cycle.includes(atom.id));
            if (!atomCycle || atomCycle.length <= 2) continue;

            const atomNames = atomCycle.map((atomId) => atomId.split('::')[1] || atomId);
            const cycleClassification = classifyCircularCycle(relPath, atomCycle, atomNames);

            if (cycleClassification === 'algorithmic') {
                logger.debug(`[CIRCULAR FUNCTION GUARD][ALGORITHMIC] Ignoring intentional recursion: ${atomNames.join(' -> ')}`);
                await clearCircularIssues(rootPath, filePath);
                continue;
            }

            if (cycleClassification === 'lifecycle') {
                const context = await persistLifecycleCycleIssue(rootPath, filePath, atom, atomCycle, atomNames);
                return { fileCycle, atomCycle, context };
            }

            if (isLikelyInfrastructureCycleAtom(atom)) {
                logger.debug(`[CIRCULAR FUNCTION GUARD][INFRA] Ignoring infrastructure leaf cycle: ${atomNames.join(' -> ')}`);
                await clearCircularIssues(rootPath, filePath);
                continue;
            }

            const context = await persistFunctionalCycleIssue(rootPath, filePath, atom, atomCycle, atomNames);
            return { fileCycle, atomCycle, context };
        }

        await clearCircularIssues(rootPath, filePath);
        return { fileCycle, atomCycle: null };
    } catch (error) {
        logger.debug(`[CIRCULAR FUNCTION GUARD][SKIP] ${relPath}: ${error.message}`);
        return { fileCycle, atomCycle: null };
    }
}
