/**
 * @fileoverview async-safety-guard.js
 *
 * Detecta funciones asíncronas que realizan llamadas de red sin manejo de errores adecuado.
 * Previene runtime crashes por excepciones no capturadas en operaciones async.
 *
 * Rate-limited: Max 3 issues por archivo para evitar saturación.
 * Ignora funciones de test automáticamente.
 *
 * @module core/file-watcher/guards/async-safety-guard
 * @version 1.1.0
 */

import { persistWatcherIssue, clearWatcherIssue } from '../watcher-issue-persistence.js';
import { createLogger } from '../../../utils/logger.js';
import {
    IssueDomains,
    createIssueType,
    createStandardContext,
    StandardThresholds,
    StandardSuggestions,
    isValidGuardTarget,
    extractAtomMetrics,
    formatAsyncSafetyMessage
} from './guard-standards.js';

const logger = createLogger('OmnySys:file-watcher:guards:async-safety');

// Rate limiting
const MAX_ISSUES_PER_FILE = 3;
const TEST_FILE_PATTERNS = /\.(test|spec)\.(js|ts|mjs|cjs)$/i;
const TEST_FUNCTION_PATTERNS = /^(test|it|describe|before|after|setup|teardown)/i;

/**
 * Detecta issues de seguridad asíncrona en átomos
 * Rate-limited para evitar saturación en proyectos grandes.
 * 
 * @param {string} rootPath - Ruta raíz del proyecto
 * @param {string} filePath - Archivo analizado
 * @param {Object} EventEmitterContext - Contexto para emitir eventos
 * @param {Array<Object>} atoms - Átomos extraídos del archivo
 * @param {Object} options - Opciones de configuración
 * @returns {Promise<Array<Object>>} Issues detectados
 */
export async function detectAsyncSafetyIssues(rootPath, filePath, EventEmitterContext, atoms = [], options = {}) {
    const {
        maxAsyncLines = StandardThresholds.ASYNC_MAX_LINES,
        maxIssues = MAX_ISSUES_PER_FILE,
        verbose = true,
        skipTestFiles = true
    } = options;

    try {
        // Limpiar issues previos
        await clearWatcherIssue(rootPath, filePath, 'runtime_async_safety_high');
        await clearWatcherIssue(rootPath, filePath, 'runtime_async_safety_medium');

        // Skip archivos de test
        if (skipTestFiles && TEST_FILE_PATTERNS.test(filePath)) {
            return [];
        }

        // Si no hay átomos, retornar vacío
        if (!atoms || atoms.length === 0) {
            return [];
        }

        const issues = [];
        let networkIssues = 0;

        // Solo analizar purposes de producción (no tests, scripts internos)
        const productionPurposes = ['API_EXPORT', 'CLASS_METHOD', 'INTERNAL_HELPER', 
                                    'PRIVATE_HELPER', 'NETWORK_HANDLER', 'TIMER_ASYNC'];
        
        for (const atom of atoms) {
            // Rate limiting por archivo
            if (issues.length >= maxIssues) break;

            // Solo analizar funciones válidas
            if (!isValidGuardTarget(atom)) continue;
            
            // Solo purposes de producción
            const purpose = atom.purpose || atom.purpose_type || '';
            if (!productionPurposes.includes(purpose)) continue;

            const metrics = extractAtomMetrics(atom);

            // Solo funciones async
            if (!metrics.isAsync) continue;

            // Skip funciones de test
            if (TEST_FUNCTION_PATTERNS.test(metrics.name)) continue;

            // Verificar combinación peligrosa: network calls + no error handling
            const hasNetworkCalls = metrics.hasNetworkCalls || hasNetworkPattern(atom);
            const hasErrorHandling = metrics.hasErrorHandling || hasTryCatch(atom);

            if (hasNetworkCalls && !hasErrorHandling) {
                networkIssues++;
                
                // Solo reportar HIGH si es función larga + network sin handling
                // MEDIUM para network sin handling en función normal
                const severity = metrics.linesOfCode > maxAsyncLines ? 'high' : 'medium';
                const issueType = createIssueType(IssueDomains.RUNTIME, 'async_safety', severity);

                const reason = metrics.linesOfCode > maxAsyncLines
                    ? `makes network calls and has ${metrics.linesOfCode} lines without error handling`
                    : 'makes network calls without error handling';

                issues.push({
                    atomId: metrics.id,
                    atomName: metrics.name,
                    severity,
                    issueType,
                    message: formatAsyncSafetyMessage(metrics.name, reason),
                    context: createStandardContext({
                        guardName: 'async-safety-guard',
                        atomId: metrics.id,
                        atomName: metrics.name,
                        metricValue: metrics.linesOfCode,
                        threshold: maxAsyncLines,
                        severity,
                        suggestedAction: StandardSuggestions.ASYNC_ADD_TRY_CATCH,
                        suggestedAlternatives: [
                            'Wrap network calls in try/catch blocks',
                            'Add .catch() to promises with error logging',
                            'Use async/await with proper error boundaries'
                        ],
                        extraData: {
                            hasNetworkCalls: true,
                            hasErrorHandling: false,
                            functionType: metrics.type,
                            complexity: metrics.complexity
                        }
                    })
                });
            }
        }

        // Persistir solo el issue más severo (prioridad: high > medium)
        if (issues.length > 0) {
            const highIssues = issues.filter(i => i.severity === 'high');
            const primaryIssue = highIssues[0] || issues[0];
            
            // Solo persistir el principal, el resto va en contexto
            await persistWatcherIssue(
                rootPath,
                filePath,
                primaryIssue.issueType,
                primaryIssue.severity,
                `[${issues.length} async issue(s)] ${primaryIssue.message}`,
                {
                    totalIssues: issues.length,
                    networkIssues,
                    issues: issues.map(i => ({
                        atomName: i.atomName,
                        severity: i.severity,
                        message: i.message
                    })),
                    ...primaryIssue.context
                }
            );

            // Emitir evento resumido
            EventEmitterContext.emit('runtime:async-safety', {
                filePath,
                totalIssues: issues.length,
                high: highIssues.length,
                networkIssues,
                sample: issues.slice(0, 3).map(i => i.atomName)
            });

            if (verbose) {
                logger.warn(`[ASYNC-SAFETY] ${filePath}: ${issues.length} issue(s), showing top ${Math.min(issues.length, 3)}`);
            }
        }

        return issues;

    } catch (error) {
        logger.debug(`[ASYNC-SAFETY GUARD SKIP] ${filePath}: ${error.message}`);
        return [];
    }
}

/**
 * Verifica si un átomo tiene patrones de llamadas de red
 * @param {Object} atom - Átomo a analizar
 * @returns {boolean}
 */
function hasNetworkPattern(atom) {
    const code = atom.sourceCode || atom.code || '';
    const networkPatterns = [
        /fetch\s*\(/,
        /axios\./,
        /http\.(get|post|put|delete)/,
        /request\s*\(/,
        /\.request\s*\(/,
        /new\s+XMLHttpRequest/,
        /WebSocket\s*\(/,
        /ws\./,
        /socket\./,
        /io\./,
        /\.connect\s*\(/,
        /query\s*\(/,
        /execute\s*\(/,
        /\.findOne\s*\(/,
        /\.findAll\s*\(/,
        /prisma\./,
        /mongoose\./,
        /sequelize\./
    ];

    return networkPatterns.some(pattern => pattern.test(code));
}

/**
 * Verifica si un átomo tiene try/catch
 * @param {Object} atom - Átomo a analizar
 * @returns {boolean}
 */
function hasTryCatch(atom) {
    const code = atom.sourceCode || atom.code || '';
    return /try\s*\{[\s\S]*?\}\s*catch/.test(code) || 
           /\.catch\s*\(/.test(code);
}

export default detectAsyncSafetyIssues;
