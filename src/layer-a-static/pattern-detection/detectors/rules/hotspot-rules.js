export class BusinessLogicHotspotRule {
    constructor(config = {}) {
        this.type = 'function_hotspot';
        this.minUsageThreshold = config.minUsageThreshold || 10;
        this.highUsageThreshold = config.highUsageThreshold || 20;
    }

    check(findings, stats, { calculateRiskScore, isUtilityFunction, generateFinding }) {
        const { usageCount, callers, functionData, filePath, funcId } = stats;

        if (isUtilityFunction(funcId, functionData)) return;

        const riskScore = calculateRiskScore(stats);

        if (usageCount >= this.minUsageThreshold && riskScore >= 15) {
            const severity = usageCount >= this.highUsageThreshold ? 'high' : 'medium';
            const funcName = funcId.split('::').pop();

            findings.push(generateFinding({
                type: this.type,
                severity,
                filePath,
                line: functionData?.line || 0,
                message: `Function "${funcName}" called from ${usageCount} places`,
                metadata: {
                    functionName: funcName,
                    fullId: funcId,
                    usageCount,
                    riskScore,
                    complexity: functionData?.complexity || 0
                }
            }));
        }
    }
}
