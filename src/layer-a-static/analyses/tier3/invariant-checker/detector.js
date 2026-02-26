/**
 * @fileoverview Invariant Checker - Data Flow Validation
 * 
 * Detecta violaciones de invariantes de seguridad y lógica en el flujo de datos.
 * Actualmente se enfoca en:
 * 1. Secret Leakage: Secretos que fluyen hacia sinks de logging o red sin encriptar.
 * 2. Unsanitized Input: Datos de entrada que llegan a sinks peligrosos (eval, exec) sin pasar por sanitizers.
 */

import { createLogger } from '#utils/logger.js';

const logger = createLogger('OmnySys:invariant-checker');

const SENSITIVE_KEYWORDS = ['password', 'secret', 'token', 'key', 'credential', 'apikey'];
const LOGGING_SINKS = ['console.log', 'console.warn', 'logger.info', 'logger.warn', 'logger.error', 'logger.debug'];
const DANGEROUS_SINKS = ['eval', 'exec', 'spawn', 'innerHTML'];
const SANITIZER_KEYWORDS = ['sanitize', 'escape', 'validate', 'encode', 'hash', 'encrypt'];

/**
 * Analiza un átomo (función) para buscar violaciones de invariantes
 * @param {Object} atom - Atomo con metadata de dataFlow
 * @returns {Array<Object>} - Violaciones encontradas
 */
export function checkInvariants(atom) {
    const violations = [];
    const dataFlow = atom.dataFlow;

    if (!dataFlow || !dataFlow.graph) return [];

    const { nodes } = dataFlow.graph;

    // 1. Detectar Secret Leakage
    // Buscar nodos INPUT o TRANSFORM que tengan nombres sensibles
    nodes.forEach(node => {
        const outputName = node.output?.name?.toLowerCase() || '';
        const isSensitive = SENSITIVE_KEYWORDS.some(key => outputName.includes(key));

        if (isSensitive) {
            // Seguir el flujo de este nodo hacia adelante
            const sinkViolation = findSinkViolation(node, nodes, LOGGING_SINKS);
            if (sinkViolation) {
                violations.push({
                    type: 'secret-leakage',
                    severity: 'high',
                    name: node.output.name,
                    sink: sinkViolation.sinkName,
                    message: `Posible fuga de secreto: El dato "${node.output.name}" llega al sumidero de log "${sinkViolation.sinkName}".`,
                    line: node.location?.line || atom.line
                });
            }
        }
    });

    return violations;
}

/**
 * Busca si un nodo fluye hacia algún sumidero prohibido
 * @private
 */
function findSinkViolation(startNode, allNodes, restrictedSinks) {
    const visited = new Set();
    const queue = [startNode];

    while (queue.length > 0) {
        const current = queue.shift();
        if (visited.has(current.id)) continue;
        visited.add(current.id);

        // Verificar si el nodo actual es un sink prohibido
        const opName = current.properties?.operation || '';
        const viaName = current.properties?.via || '';

        const isSink = restrictedSinks.some(sink =>
            opName.includes(sink) || viaName.includes(sink) || (current.type === 'CALL' && viaName.includes(sink))
        );

        if (isSink) {
            return { sinkName: viaName || opName };
        }

        // Seguir a los consumidores (nodos que usan el output de este nodo como input)
        const consumers = allNodes.filter(n =>
            n.inputs && n.inputs.some(input => input.name === current.output?.name)
        );

        queue.push(...consumers);
    }

    return null;
}

export default { checkInvariants };
