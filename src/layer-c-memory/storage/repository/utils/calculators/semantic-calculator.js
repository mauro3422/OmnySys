/**
 * Calculador de vectores semánticos y de impacto.
 * @module storage/repository/utils/calculators/semantic-calculator
 */

import { calculateCoupling, calculateCohesion } from './structural-calculator.js';
import { calculateStability } from './temporal-calculator.js';

function getRelationCount(value, fallback = 0) {
    if (Array.isArray(value)) return value.length;
    const numeric = Number(value);
    return Number.isFinite(numeric) ? numeric : fallback;
}

/**
 * Calcula centralidad (0-1) basada en el grado de entrada/salida y dependencias
 */
export function calculateCentrality(atom, context = {}) {
    const inDegree = getRelationCount(
        context.callers,
        getRelationCount(atom.calledBy, atom.callersCount || atom.callerCount || atom.callers_count || atom.inDegree || atom.in_degree || 0)
    );
    const outDegree = getRelationCount(
        context.callees,
        getRelationCount(atom.calls, atom.calleesCount || atom.calleeCount || atom.callees_count || atom.outDegree || atom.out_degree || 0)
    );

    const normIn = Math.min(inDegree / 10, 1);
    const normOut = Math.min(outDegree / 10, 1);

    // La centralidad valora más ser utilizado (hub) que utilizar
    const centrality = (normIn * 0.7) + (normOut * 0.3);

    return Math.round(centrality * 100) / 100;
}

/**
 * Calcula importancia del atomo (PageRank-like) (0-1)
 */
export function calculateImportance(atom, context = {}) {
    const callerCount = getRelationCount(
        context.callers,
        getRelationCount(atom.calledBy, atom.callersCount || atom.callerCount || atom.callers_count || atom.inDegree || atom.in_degree || 0)
    );
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
    const complexity = atom.complexity || 1;
    const callerCount = getRelationCount(
        context.callers,
        getRelationCount(atom.calledBy, atom.callersCount || atom.callerCount || atom.callers_count || atom.inDegree || atom.in_degree || 0)
    );
    const calleeCount = getRelationCount(
        context.callees,
        getRelationCount(atom.calls, atom.calleesCount || atom.calleeCount || atom.callees_count || atom.outDegree || atom.out_degree || 0)
    );
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
    const complexity = atom.complexity || 1;
    const coupling = calculateCoupling(atom, context);
    const cohesion = calculateCohesion(atom);
    const stability = atom.stabilityScore
        ?? atom.stability_score
        ?? calculateStability(atom, context.gitHistory || null);

    const numerator = complexity * coupling;
    const denominator = Math.max(0.1, cohesion * stability);

    return Math.round(Math.min(1, numerator / denominator) * 100) / 100;
}

/**
 * Calcula testabilidad (0-1)
 */
export function calculateTestability(atom, context = {}) {
    const complexity = atom.complexity || 1;
    const cohesion = calculateCohesion(atom);
    const stability = atom.stabilityScore
        ?? atom.stability_score
        ?? calculateStability(atom, context.gitHistory || null);
    const externalCalls = Math.max(
        1,
        Number(atom.externalCallCount)
        || Number(atom.external_call_count)
        || getRelationCount(atom.externalCalls, 0)
        || 1
    );

    const numerator = cohesion * stability;
    const denominator = Math.max(1, complexity * externalCalls);

    return Math.round(Math.min(1, numerator / denominator) * 100) / 100;
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
