/**
 * @fileoverview Recommendation Engine
 */
export class RecommendationEngine {
    generate(factors, fileAnalysis) {
        const recommendations = [];

        if (factors.complexity > 0.6) {
            recommendations.push({
                type: 'refactor',
                message: 'Considerar refactorizar funciones complejas',
                priority: 'medium'
            });
        }

        if (factors.coupling > 0.6) {
            recommendations.push({
                type: 'architecture',
                message: 'Alto acoplamiento - considerar desacoplar',
                priority: 'high'
            });
        }

        if (factors.errorHandling > 0.7) {
            recommendations.push({
                type: 'reliability',
                message: 'Agregar manejo de errores para operaciones de red',
                priority: 'critical'
            });
        }

        if (factors.sideEffects > 0.5) {
            recommendations.push({
                type: 'purity',
                message: 'Muchos side effects - considerar funciones puras',
                priority: 'low'
            });
        }

        return recommendations;
    }
}
