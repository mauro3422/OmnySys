/**
 * Calculador de vectores semánticos y de impacto.
 * @module storage/repository/utils/calculators/semantic-calculator
 */

import { calculateCoupling, calculateCohesion } from './structural-calculator.js';

/**
 * Calcula importancia del atomo (PageRank-like) (0-1)
 */
export function calculateImportance(atom, context = {}) {
    const { callers = [] } = context;

    const callerCount = callers.length;
    const isExported = atom.isExported || atom.exported ? 1 : 0;
    const complexity = Math.min(atom.complexity || 1, 50) / 50;

    const callerWeight = callerCount > 0 ? Math.log2(callerCount + 1) / 5 : 0;
    const cappedCallerWeight = Math.min(callerWeight, 0.5);

    const importance = (cappedCallerWeight * 0.4) +
        (isExported * 0.3) +
        (complexity * 0.3);

    return Math.round(importance * 100) / 100;
}

/**
 * Calcula score de propagación de cambios (0-1)
 */
export function calculatePropagation(atom, context = {}) {
    const { callers = [], callees = [] } = context;

    const complexity = atom.complexity || 1;
    const callerCount = callers.length;
    const calleeCount = callees.length;
    const coupling = calculateCoupling(atom, context);

    const normComplexity = Math.min(complexity / 30, 1);
    const normCallers = Math.min(callerCount / 10, 1);
    const normCallees = Math.min(calleeCount / 10, 1);

    const propagation = (normComplexity * 0.30) +
        (normCallers * 0.30) +
        (normCallees * 0.20) +
        (coupling * 0.20);

    return Math.round(propagation * 100) / 100;
}

/**
 * Calcula fragilidad (0-1)
 */
export function calculateFragility(atom, context = {}) {
    const complexity = Math.min((atom.complexity || 1) / 20, 1);
    const noErrorHandling = atom.hasErrorHandling ? 0 : 1;
    const hasNetwork = atom.hasNetworkCalls ? 0.5 : 0;
    const highCoupling = calculateCoupling(atom, context);

    const fragility = (complexity * 0.3) +
        (noErrorHandling * 0.3) +
        (hasNetwork * 0.2) +
        (highCoupling * 0.2);

    return Math.round(fragility * 100) / 100;
}

/**
 * Calcula testabilidad (0-1)
 */
export function calculateTestability(atom, context = {}) {
    const lowComplexity = 1 - Math.min((atom.complexity || 1) / 20, 1);
    const noSideEffects = atom.hasSideEffects ? 0 : 1;
    const highCohesion = calculateCohesion(atom);
    const fewParams = atom.signature?.params?.length < 4 ? 1 : 0.5;

    const testability = (lowComplexity * 0.3) +
        (noSideEffects * 0.3) +
        (highCohesion * 0.2) +
        (fewParams * 0.2);

    return Math.round(testability * 100) / 100;
}

/**
 * Calcula peso del arquetipo (0-1)
 */
export function calculateArchetypeWeight(atom) {
    const severity = atom.archetype?.severity || 0;
    const confidence = atom.archetype?.confidence || 0;
    const normalizedSeverity = severity / 10;
    return normalizedSeverity * confidence;
}
