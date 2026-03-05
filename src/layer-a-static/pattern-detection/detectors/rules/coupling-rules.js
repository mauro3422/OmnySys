export class GodObjectRule {
    constructor(config = {}) {
        this.type = 'architectural_coupling';
        this.highImportThreshold = config.highImportThreshold || 15;
        this.highDependentThreshold = config.highDependentThreshold || 10;
        this.criticalImportThreshold = config.criticalImportThreshold || 25;
    }

    check(findings, filePath, fileNode, { generateFinding }) {
        const importCount = fileNode.imports?.length || 0;
        const dependentCount = fileNode.usedBy?.length || 0;
        const couplingRatio = (importCount + dependentCount) / 2;

        let riskScore = 0;
        let severity = 'low';

        if (importCount >= this.criticalImportThreshold && dependentCount >= this.highDependentThreshold) {
            riskScore = 50 + (importCount - this.criticalImportThreshold) * 2;
            severity = 'critical';
        } else if (importCount >= this.highImportThreshold && dependentCount >= this.highDependentThreshold) {
            riskScore = 30 + couplingRatio;
            severity = 'high';
        } else if (importCount >= 10 && dependentCount >= 5) {
            riskScore = 15 + couplingRatio / 2;
            severity = 'medium';
        }

        if (riskScore > 20) {
            findings.push(generateFinding({
                type: this.type,
                severity,
                filePath,
                message: this._generateMessage(filePath, importCount, dependentCount, severity),
                metadata: { importCount, dependentCount, couplingRatio, riskScore }
            }));
        }
    }

    _generateMessage(filePath, imports, dependents, severity) {
        const fileName = filePath.split('/').pop();
        if (severity === 'critical') return `${fileName} is a God Object: ${imports} imports, ${dependents} dependents`;
        if (imports > dependents) return `${fileName} imports ${imports} modules (high dependency)`;
        return `${fileName} is used by ${dependents} modules (high coupling)`;
    }
}
