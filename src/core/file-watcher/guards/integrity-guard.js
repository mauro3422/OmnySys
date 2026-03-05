import { persistWatcherIssue, clearWatcherIssue } from '../watcher-issue-persistence.js';
import { createLogger } from '../../../utils/logger.js';
import { DataFlowAnalyzer } from '../../../layer-a-static/extractors/data-flow/core/data-flow-analyzer.js';

const logger = createLogger('OmnySys:file-watcher:guards:integrity');

/**
 * IntegrityGuard - Sprint 11
 * Valida la coherencia atómica y el flujo de datos en tiempo real.
 */
export async function detectIntegrityViolations(rootPath, filePath, EventEmitterContext, atoms = [], options = {}) {
    const { verbose = true } = options;

    try {
        if (!atoms || atoms.length === 0) {
            await clearWatcherIssue(rootPath, filePath, 'atomic_integrity');
            return null;
        }

        const violations = [];

        for (const atom of atoms) {
            // 1. Validar Data Flow si está presente
            if (atom.dataFlow) {
                const analyzer = new DataFlowAnalyzer(
                    atom.dataFlow.inputs || [],
                    atom.dataFlow.transformations || [],
                    atom.dataFlow.outputs || []
                );

                const analysis = analyzer.analyze();

                if (analysis.coherence < 0.3) {
                    violations.push({
                        atom: atom.name,
                        type: 'LOW_COHERENCE',
                        message: `Atom '${atom.name}' has low data-flow coherence (${Math.round(analysis.coherence * 100)}%). Possible broken logic.`
                    });
                }

                if (analysis.unusedInputs?.length > 0) {
                    const inputNames = analysis.unusedInputs.map(input =>
                        typeof input === 'object' ? (input.name || JSON.stringify(input)) : input
                    );
                    violations.push({
                        atom: atom.name,
                        type: 'UNUSED_INPUTS',
                        message: `Atom '${atom.name}' has unused inputs: ${inputNames.join(', ')}.`
                    });
                }
            }

            // 2. Validar inconsistencias semánticas básicas
            // Ejemplo: funciones async que no tienen await pero sí efectos secundarios marcados
            if (atom.is_async === 0 && atom.name.toLowerCase().includes('async')) {
                violations.push({
                    atom: atom.name,
                    type: 'NAMING_MISMATCH',
                    message: `Function '${atom.name}' is synchronous but its name suggests async behavior.`
                });
            }
        }

        if (violations.length === 0) {
            await clearWatcherIssue(rootPath, filePath, 'atomic_integrity');
            return null;
        }

        // Tomar la violación más severa para el reporte principal
        const mainViolation = violations[0];
        const severity = violations.some(v => v.type === 'LOW_COHERENCE') ? 'medium' : 'low';

        if (verbose) {
            logger.warn(`[INTEGRITY][${severity.toUpperCase()}] ${filePath}: ${mainViolation.message} (+${violations.length - 1} more)`);
        }

        // Emitir evento para tiempo real
        EventEmitterContext.emit('integrity:violation', {
            filePath,
            severity,
            message: mainViolation.message,
            totalViolations: violations.length,
            violations
        });

        // Persistir en semantic_issues
        await persistWatcherIssue(
            rootPath,
            filePath,
            'atomic_integrity',
            severity,
            mainViolation.message,
            { totalViolations: violations.length, violations }
        );

        return { severity, totalViolations: violations.length };

    } catch (error) {
        logger.debug(`[INTEGRITY GUARD SKIP] ${filePath}: ${error.message}`);
        return null;
    }
}
