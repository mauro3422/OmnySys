import { createLogger } from '../../../utils/logger.js';
import { loadHotspotAtoms, collectHotspotIssues } from './hotspot-query.js';
import { buildHotspotIssue, buildHotspotEventPayload, buildHotspotPersistencePayload } from './hotspot-issues/index.js';
import { clearPersistedHotspotIssues, persistHotspotIssues } from './hotspot-persistence.js';
import { StandardThresholds } from './guard-standards.js';

const logger = createLogger('OmnySys:file-watcher:guards:hotspot');

export async function detectHotspots(rootPath, filePath, EventEmitterContext, options = {}) {
    const {
        highThreshold = StandardThresholds.HOTSPOT_HIGH,
        mediumThreshold = StandardThresholds.HOTSPOT_MEDIUM,
        maxAgeDays = 30,
        verbose = true
    } = options;

    try {
        const { getRepository } = await import('#layer-c/storage/repository/index.js');
        const repo = getRepository(rootPath);
        if (!repo?.db) return [];

        const atoms = loadHotspotAtoms(repo, filePath, maxAgeDays);
        if (!atoms || atoms.length === 0) {
            await clearPersistedHotspotIssues(rootPath, filePath);
            return [];
        }

        const rawIssues = collectHotspotIssues(atoms, highThreshold, mediumThreshold);
        const issues = rawIssues.map((issue) => buildHotspotIssue({ issue, highThreshold, mediumThreshold }));

        if (issues.length > 0) {
            const payload = buildHotspotPersistencePayload(issues);
            await persistHotspotIssues(rootPath, filePath, payload);

            EventEmitterContext.emit('perf:hotspot', buildHotspotEventPayload(filePath, issues));

            if (verbose) {
                logger.warn(`[HOTSPOT] ${filePath}: ${issues.length} hotspot(s) detected`);
            }
        } else {
            await clearPersistedHotspotIssues(rootPath, filePath);
        }

        return issues;
    } catch (error) {
        logger.debug(`[HOTSPOT GUARD SKIP] ${filePath}: ${error.message}`);
        return [];
    }
}
