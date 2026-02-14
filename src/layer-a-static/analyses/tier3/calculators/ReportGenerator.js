/**
 * @fileoverview ReportGenerator.js
 * 
 * Generates risk assessment reports.
 * 
 * @module analyses/tier3/calculators/ReportGenerator
 */

/**
 * Generates risk assessment report
 */
export class ReportGenerator {
  /**
   * Generate report from risk scores
   */
  generate(riskScores, options = {}) {
    const { threshold = 6.0 } = options;

    const allFiles = Object.entries(riskScores).map(([file, analysis]) => ({
      file,
      ...analysis
    }));

    const highRisk = allFiles.filter(f => f.severity === 'critical' || f.severity === 'high');
    const mediumRisk = allFiles.filter(f => f.severity === 'medium');
    const lowRisk = allFiles.filter(f => f.severity === 'low');

    const avgScore = allFiles.reduce((sum, f) => sum + f.total, 0) / (allFiles.length || 1);

    return {
      summary: {
        totalFiles: allFiles.length,
        averageScore: avgScore.toFixed(2),
        criticalCount: highRisk.filter(f => f.severity === 'critical').length,
        highCount: highRisk.filter(f => f.severity === 'high').length,
        mediumCount: mediumRisk.length,
        lowCount: lowRisk.length
      },
      highRiskFiles: highRisk.sort((a, b) => b.total - a.total),
      mediumRiskFiles: mediumRisk.sort((a, b) => b.total - a.total),
      recommendations: this.generateRecommendations(highRisk, mediumRisk)
    };
  }

  /**
   * Generate recommendations
   * @private
   */
  generateRecommendations(highRisk, mediumRisk) {
    const recommendations = [];

    if (highRisk.length > 5) {
      recommendations.push({
        priority: 'critical',
        message: 'Too many high-risk files. Consider refactoring architecture'
      });
    }

    if (highRisk.length > 0) {
      recommendations.push({
        priority: 'high',
        message: `Review ${highRisk.length} high-risk files for potential issues`
      });
    }

    const criticalFiles = highRisk.filter(f => f.severity === 'critical');
    if (criticalFiles.length > 0) {
      recommendations.push({
        priority: 'critical',
        message: `${criticalFiles.length} files have critical risk. Schedule immediate review`
      });
    }

    return recommendations;
  }
}

export default ReportGenerator;
