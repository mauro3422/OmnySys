/**
 * Calculador de vectores estructurales.
 * @module storage/repository/utils/calculators/structural-calculator
 */

/**
 * Calcula lineas de código de forma robusta
 */
export function calculateLinesOfCode(atom) {
    if (atom.linesOfCode) return atom.linesOfCode;
    if (atom.endLine && atom.line) return atom.endLine - atom.line + 1;
    if (atom.lines?.end && atom.lines?.start) return atom.lines.end - atom.lines.start + 1;
    return 0;
}

/**
 * Calcula cohesión interna (0-1)
 */
export function calculateCohesion(atom) {
    const loc = calculateLinesOfCode(atom);
    const complexity = atom.complexity || 1;

    if (loc === 0) return 1;

    const ratio = complexity / loc;
    const cohesion = Math.max(0, Math.min(1, 1 - (ratio * 2)));

    return Math.round(cohesion * 100) / 100;
}

/**
 * Calcula acoplamiento externo (0-1)
 */
export function calculateCoupling(atom, context = {}) {
    const { callers = [], callees = [] } = context;

    const externalCalls = atom.externalCalls?.length || 0;
    const totalCalls = (atom.calls?.length || 0);
    const totalConnections = callers.length + callees.length + totalCalls;

    if (totalConnections === 0) return 0;

    const externalRatio = totalCalls > 0 ? externalCalls / totalCalls : 0;
    const connectionFactor = Math.min(totalConnections / 20, 1);

    const coupling = (connectionFactor * 0.6) + (externalRatio * 0.4);

    return Math.round(coupling * 100) / 100;
}

/**
 * Calcula profundidad en el grafo (simplificada)
 */
export function calculateDependencyDepth(atom) {
    const filePath = atom.file || atom.filePath || '';
    const depth = filePath.split('/').length - 1;
    return Math.min(depth, 10);
}
