/**
 * @fileoverview Churn Rate Strategy
 */
export class ChurnRateStrategy {
    score(fileAnalysis) {
        const churn = fileAnalysis.metadata?.historical?.churnRate || 0;

        if (churn === 0) return 0.3;
        if (churn < 5) return 0.2;
        if (churn < 20) return 0.5;
        return 0.8;
    }
}
