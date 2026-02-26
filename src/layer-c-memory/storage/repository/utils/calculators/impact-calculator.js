/**
 * Calculador de impacto para operaciones de refactorización.
 * @module storage/repository/utils/calculators/impact-calculator
 */

/**
 * Calcula impacto de una operacion rename
 */
export function calculateRenameImpact(atom, context = {}) {
    const { callers = [] } = context;

    let totalImpact = 0;

    for (const caller of callers) {
        const callerImportance = caller.importance || 0.5;
        const propagation = caller.propagationScore || 0.5;

        totalImpact += callerImportance * propagation;
    }

    return Math.min(totalImpact, 1.0);
}

/**
 * Calcula impacto de una operacion move
 */
export function calculateMoveImpact(atom, context = {}) {
    const { affectedFiles = [] } = context;

    const fileImpact = Math.min(affectedFiles.length / 10, 1);
    const avgPropagation = context.avgPropagation || 0.5;

    return Math.round(fileImpact * avgPropagation * 100) / 100;
}
