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
     */
    static calculateReactivity(atom) {
        const changeRisk = atom.changeRisk || 0;
        const coupling = (atom.externalCallCount || 0) + (atom.internalCalls?.length || 0);

        // R = Risk * Coupling
        return Math.round(changeRisk * (1 + coupling) * 100) / 100;
    }

    /**
     * Calcula la Salud Sistémica simplificada.
     */
    static calculateHealth(atom) {
        const gravity = this.calculateGravity(atom);
        const reactivity = this.calculateReactivity(atom);

        // Mas gravedad + mas reactividad = Menos salud
        const score = 100 - (gravity + reactivity);
        return Math.max(0, Math.round(score));
    }
}
