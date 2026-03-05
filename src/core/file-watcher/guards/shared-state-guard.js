/**
 * @fileoverview shared-state-guard.js
 *
 * Detecta contención excesiva de estado compartido ("Sociedades Radioactivas").
 * Identifica átomos con demasiadas conexiones de estado compartido.
 *
 * @module core/file-watcher/guards/shared-state-guard
 * @version 2.0.0 - Estandarizado
 */

import { persistWatcherIssue, clearWatcherIssue } from '../watcher-issue-persistence.js';
import { createLogger } from '../../../utils/logger.js';
import {
    IssueDomains,
    createIssueType,
    createStandardContext,
    StandardThresholds,
    StandardSuggestions,
    severityFromSharedState
} from './guard-standards.js';

const logger = createLogger('OmnySys:file-watcher:guards:shared-state');

/**
 * Detecta contención excesiva de estado compartido
 * @param {string} rootPath - Ruta raíz del proyecto
 * @param {string} filePath - Archivo analizado
 * @param {Object} EventEmitterContext - Contexto para emitir eventos
 * @param {Array<Object>} atoms - Átomos extraídos del archivo
 * @param {Object} options - Opciones de configuración
 * @returns {Promise<Object|null>} Resultado del análisis
 */
export async function detectSharedStateContention(rootPath, filePath, EventEmitterContext, atoms = [], options = {}) {
    const {
        contentionThreshold = StandardThresholds.SHARED_STATE_MEDIUM,
        criticalThreshold = StandardThresholds.SHARED_STATE_HIGH,
        verbose = true
    } = options;

    try {
        if (!atoms || atoms.length === 0) {
            await clearWatcherIssue(rootPath, filePath, 'sem_shared_state_high');
            await clearWatcherIssue(rootPath, filePath, 'sem_shared_state_medium');
            await clearWatcherIssue(rootPath, filePath, 'sem_shared_state_low');
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

        // Determinar severidad usando estándar
        let severity = severityFromSharedState(maxContention);
        
        // Si no hay contención individual pero hay mucha difusa
        if (!severity && totalContention > criticalThreshold * 1.5) {
            severity = 'low';
        }

        if (!severity) {
            await clearWatcherIssue(rootPath, filePath, 'sem_shared_state_high');
            await clearWatcherIssue(rootPath, filePath, 'sem_shared_state_medium');
            await clearWatcherIssue(rootPath, filePath, 'sem_shared_state_low');
            return null;
        }

        // Crear mensaje según severidad
        let message;
        let suggestedAction;
        
        if (severity === 'high') {
            message = `Radioactive Atom detected: '${hotAtom?.name}' shares state with ${maxContention} other atoms. High risk of side effects and race conditions.`;
            suggestedAction = StandardSuggestions.SHARED_STATE_EXTRACT + ' (critical - immediate attention needed)';
        } else if (severity === 'medium') {
            message = `High State Contention: '${hotAtom?.name}' has ${maxContention} shared state dependencies. Consider refactoring to local state.`;
            suggestedAction = StandardSuggestions.SHARED_STATE_LOCAL;
        } else {
            message = `Diffuse State Contention: File has ${totalContention} total shared state links. High global coupling.`;
            suggestedAction = 'Review architecture for excessive shared state usage';
        }

        // Crear contexto estandarizado
        const context = createStandardContext({
            guardName: 'shared-state-guard',
            atomId: hotAtom?.id,
            atomName: hotAtom?.name,
            metricValue: maxContention,
            threshold: severity === 'high' ? criticalThreshold : contentionThreshold,
            severity,
            suggestedAction,
            suggestedAlternatives: [
                StandardSuggestions.SHARED_STATE_LOCAL,
                StandardSuggestions.SHARED_STATE_EXTRACT,
                'Use dependency injection to reduce coupling',
                'Consider immutable state patterns'
            ],
            extraData: {
                maxContention,
                totalContention,
                contentionThreshold,
                criticalThreshold,
                atomCount: atoms.length
            }
        });

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

        // Persistir error semántico con issue type estandarizado
        const issueType = createIssueType(IssueDomains.SEM, 'shared_state', severity);
        await persistWatcherIssue(
            rootPath,
            filePath,
            issueType,
            severity,
            message,
            context
        );

        // Limpiar otros niveles de severidad que ya no aplican
        if (severity !== 'high') await clearWatcherIssue(rootPath, filePath, 'sem_shared_state_high');
        if (severity !== 'medium') await clearWatcherIssue(rootPath, filePath, 'sem_shared_state_medium');
        if (severity !== 'low') await clearWatcherIssue(rootPath, filePath, 'sem_shared_state_low');

        return { severity, maxContention, totalContention, context };

    } catch (error) {
        logger.debug(`[SHARED STATE GUARD SKIP] ${filePath}: ${error.message}`);
        return null;
    }
}

export default detectSharedStateContention;
