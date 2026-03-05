import { persistWatcherIssue, clearWatcherIssue } from '../watcher-issue-persistence.js';
import { createLogger } from '../../../utils/logger.js';
const logger = createLogger('OmnySys:file-watcher:guards:shared-state');

/**
 * Detecta contención excesiva de estado compartido (Sociedades Radioactivas).
 */
export async function detectSharedStateContention(rootPath, filePath, EventEmitterContext, atoms = [], options = {}) {
    const {
        contentionThreshold = 5,   // >5 conexiones por un solo átomo es sospechoso
        criticalThreshold = 10,    // >10 es una "Sociedad Radioactiva" (peligro de race condition)
        verbose = true
    } = options;

    try {
        if (!atoms || atoms.length === 0) {
            await clearWatcherIssue(rootPath, filePath, 'shared_state_contention');
            return null;
        }

        const { getRepository } = await import('#layer-c/storage/repository/index.js');
        const repo = getRepository(rootPath);
        if (!repo?.db) return null;

        const atomIds = atoms.map(a => a.id);

        // Contar relaciones de tipo shares_state para los átomos del archivo actual
        const query = repo.db.prepare(`
            SELECT source_id, COUNT(*) as connection_count
            FROM atom_relations
            WHERE type = 'shares_state' AND source_id IN (${atomIds.map(() => '?').join(',')})
            GROUP BY source_id
        `);

        const rows = query.all(...atomIds);

        let maxContention = 0;
        let totalContention = 0;
        let hotAtom = null;

        for (const row of rows) {
            totalContention += row.connection_count;
            if (row.connection_count > maxContention) {
                maxContention = row.connection_count;
                hotAtom = atoms.find(a => a.id === row.source_id);
            }
        }

        let severity = 'none';
        let message = '';

        if (maxContention >= criticalThreshold) {
            severity = 'high';
            message = `Radioactive Atom detected: '${hotAtom?.name}' shares state with ${maxContention} other atoms. High risk of side effects.`;
        } else if (maxContention >= contentionThreshold) {
            severity = 'medium';
            message = `High State Contention: '${hotAtom?.name}' has ${maxContention} shared state dependencies. Consider refactoring to local state.`;
        } else if (totalContention > criticalThreshold * 1.5) {
            severity = 'low';
            message = `Diffuse State Contention: File has ${totalContention} total shared state links. High global coupling.`;
        }

        if (severity === 'none') {
            await clearWatcherIssue(rootPath, filePath, 'shared_state_contention');
            return null;
        }

        if (verbose) {
            logger.warn(`[SHARED STATE][${severity.toUpperCase()}] ${filePath}: maxContention=${maxContention}, hotAtom=${hotAtom?.name}`);
        }

        // Emitir evento para el UI/Logs en tiempo real
        EventEmitterContext.emit('shared-state:contention', {
            filePath,
            severity,
            message,
            maxContention,
            hotAtom: hotAtom?.name,
            totalContention
        });

        // Persistir error semántico para que aparezca en reportes y tool calls futuras
        await persistWatcherIssue(
            rootPath,
            filePath,
            'shared_state_contention',
            severity,
            message,
            { maxContention, hotAtom: hotAtom?.name, totalContention }
        );

        return { severity, maxContention, totalContention };

    } catch (error) {
        logger.debug(`[SHARED STATE GUARD SKIP] ${filePath}: ${error.message}`);
        return null;
    }
}
