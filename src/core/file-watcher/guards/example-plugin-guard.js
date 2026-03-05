/**
 * @fileoverview example-plugin-guard.js
 * 
 * Guardia de ejemplo para validar el sistema de plugins del FileWatcher.
 */

import { persistWatcherIssue, clearWatcherIssue } from '../watcher-issue-persistence.js';
import { createLogger } from '../../../utils/logger.js';

const logger = createLogger('OmnySys:guards:example');

/**
 * Ejemplo de guardia semántico que busca la palabra "TODO" en los comentarios de los átomos.
 */
export async function examplePluginGuard(rootPath, filePath, context, atoms = [], options = {}) {
    if (!filePath.endsWith('.js')) return null;

    const todoAtoms = atoms.filter(a => a.source && a.source.includes('TODO'));

    if (todoAtoms.length > 0) {
        const message = `Found ${todoAtoms.length} TODOs in atoms of ${filePath}`;

        await persistWatcherIssue(
            rootPath,
            filePath,
            'technical_debt_todo',
            'low',
            message,
            { atoms: todoAtoms.map(a => a.name) }
        );

        logger.info(`[EXAMPLE-GUARD] ${message}`);
        return { count: todoAtoms.length };
    }

    await clearWatcherIssue(rootPath, filePath, 'technical_debt_todo');
    return null;
}
