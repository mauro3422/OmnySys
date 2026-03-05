/**
 * @fileoverview Error Handling Strategy
 */
export class ErrorHandlerStrategy {
    score(fileAnalysis) {
        const atoms = fileAnalysis.atoms || [];
        if (atoms.length === 0) return 0.1;

        // Verificar si tiene network calls sin error handling
        const hasNetworkCalls = atoms.some(a => a.hasNetworkCalls);
        const hasErrorHandling = atoms.some(a => a.hasErrorHandling);

        // Si tiene network calls pero no error handling = alto riesgo
        if (hasNetworkCalls && !hasErrorHandling) return 0.9;

        // Si no tiene network calls, el riesgo es bajo
        if (!hasNetworkCalls) return 0.1;

        // Si tiene network calls y error handling = bajo riesgo
        return 0.2;
    }
}
