/**
 * @fileoverview SoftwarePhysicsEngine.js
 * 
 * Motor de Cálculo para Software Physics Algebra.
 * Convierte métricas estáticas en conceptos físicos (Gravedad, Reactividad, etc.)
 * 
 * @module layer-b-semantic/physics-engine
 */

export class SoftwarePhysicsEngine {
    /**
     * Calcula la Gravedad Estructural (G) de un átomo.
     * Representa la "fuerza de atracción" o peso técnico.
     */
    static calculateGravity(atom) {
        const importance = atom.importanceScore || 0;
        const complexity = atom.complexity || 1;

        // G = I * C
        return Math.round(importance * complexity * 100) / 100;
    }

    /**
     * Calcula la Reactividad Química (R) de un átomo.
     * Representa la inestabilidad y el "Blast Radius".
     * R = (Risk * (1 + FanOut + FanIn))
     */
    static calculateReactivity(atom) {
        const changeRisk = atom.changeRisk || 0;
        const fanOut = atom.internalCalls?.length || 0;
        const fanIn = atom.calledBy?.length || 0;
        const coupling = fanOut + fanIn;

        return Math.round(changeRisk * (1 + coupling) * 100) / 100;
    }

    /**
     * Calcula la Fragilidad (F).
     * F = (Reactivity / (1 + TestCoverage)) * Complexity
     */
    static calculateFragility(atom) {
        const reactivity = this.calculateReactivity(atom);
        const hasTests = !!(atom.testFile || (atom._meta && atom._meta.has_tests));
        const complexity = atom.complexity || 1;

        const fragility = (reactivity / (hasTests ? 2 : 1)) * (complexity / 5);
        return Math.round(fragility * 100) / 100;
    }

    /**
     * Calcula la Salud Sistémica.
     */
    static calculateHealth(atom) {
        const gravity = this.calculateGravity(atom);
        const reactivity = this.calculateReactivity(atom);
        const fragility = this.calculateFragility(atom);

        const score = 100 - (gravity + reactivity + fragility);
        return Math.max(0, Math.round(score));
    }
}
