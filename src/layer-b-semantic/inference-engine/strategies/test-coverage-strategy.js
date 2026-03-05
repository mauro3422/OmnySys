/**
 * @fileoverview Test Coverage Strategy
 */
export class TestCoverageStrategy {
    score(fileAnalysis) {
        const filePath = fileAnalysis.filePath || '';

        // Archivos de test no necesitan test coverage
        if (filePath.includes('.test.') || filePath.includes('.spec.')) {
            return 0;
        }

        // Por ahora, score neutral hasta que tengamos datos reales de coverage
        return 0.5;
    }
}
