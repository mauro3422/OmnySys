/**
 * @fileoverview Coupling Strategy
 */
export class CouplingStrategy {
    score(fileAnalysis) {
        const incoming = fileAnalysis.usedBy?.length || 0;
        const outgoing = fileAnalysis.imports?.length || 0;

        // Muchas dependencias entrantes = alto riesgo (si se rompe, rompe mucho)
        // Muchas dependencias salientes = medio riesgo (depende de mucho)

        const incomingRisk = Math.min(1, incoming / 10);
        const outgoingRisk = Math.min(0.5, outgoing / 20);

        return (incomingRisk * 0.7) + (outgoingRisk * 0.3);
    }
}
