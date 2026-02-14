/**
 * @fileoverview Report Formatter - Formateador de reportes
 * 
 * Formatea reportes en diferentes formatos de salida.
 * OCP: Permite agregar nuevos formatos sin modificar código existente.
 * 
 * @module validation-engine/reports/report-formatter
 */

/**
 * Formatea reportes en diferentes formatos
 */
export class ReportFormatter {
  /**
   * Formatea un reporte según el formato especificado
   * @param {ValidationReport} report
   * @param {string} format - Formato: 'text', 'json', 'html', 'markdown'
   * @returns {string}
   */
  static format(report, format = 'text') {
    switch (format.toLowerCase()) {
      case 'json':
        return this.toJSON(report);
      case 'html':
        return this.toHTML(report);
      case 'markdown':
      case 'md':
        return this.toMarkdown(report);
      case 'text':
      default:
        return report.toString();
    }
  }

  /**
   * Formatea como JSON
   * @param {ValidationReport} report
   * @returns {string}
   */
  static toJSON(report) {
    return JSON.stringify(report.toJSON(), null, 2);
  }

  /**
   * Formatea como HTML
   * @param {ValidationReport} report
   * @returns {string}
   */
  static toHTML(report) {
    const { stats, layers, invariantViolations, staleEntities } = report;
    
    return `<!DOCTYPE html>
<html>
<head>
  <title>Validation Report</title>
  <style>
    body { font-family: sans-serif; margin: 2rem; }
    .header { background: #f0f0f0; padding: 1rem; border-radius: 8px; }
    .stats { display: grid; grid-template-columns: repeat(5, 1fr); gap: 1rem; margin: 1rem 0; }
    .stat { padding: 1rem; border-radius: 8px; text-align: center; }
    .stat.passed { background: #d4edda; }
    .stat.failed { background: #f8d7da; }
    .stat.warning { background: #fff3cd; }
    .stat.critical { background: #f5c6cb; }
    .critical-section { background: #fee; padding: 1rem; border-left: 4px solid #dc3545; margin: 1rem 0; }
    table { width: 100%; border-collapse: collapse; margin: 1rem 0; }
    th, td { padding: 0.5rem; text-align: left; border-bottom: 1px solid #ddd; }
    th { background: #f8f9fa; }
  </style>
</head>
<body>
  <div class="header">
    <h1>Validation Report</h1>
    <p>Project: ${report.projectPath}</p>
    <p>Duration: ${report.duration}ms</p>
  </div>
  
  <div class="stats">
    <div class="stat passed">✅ Passed<br><strong>${stats.passed}</strong></div>
    <div class="stat warning">⚠️ Warnings<br><strong>${stats.warnings}</strong></div>
    <div class="stat failed">❌ Failed<br><strong>${stats.failed}</strong></div>
    <div class="stat critical">🚨 Critical<br><strong>${stats.critical}</strong></div>
    <div class="stat">🛠️ Fixed<br><strong>${stats.fixed}</strong></div>
  </div>

  ${invariantViolations.length > 0 ? `
  <div class="critical-section">
    <h2>🚨 Critical Invariant Violations</h2>
    <ul>
      ${invariantViolations.map(v => `<li><strong>${v.entity}:</strong> ${v.message}</li>`).join('')}
    </ul>
  </div>
  ` : ''}

  ${staleEntities.length > 0 ? `
  <div>
    <h2>🔄 Stale Entities</h2>
    <ul>
      ${staleEntities.map(e => `<li><strong>${e.entity}:</strong> ${e.reason}</li>`).join('')}
    </ul>
  </div>
  ` : ''}
</body>
</html>`;
  }

  /**
   * Formatea como Markdown
   * @param {ValidationReport} report
   * @returns {string}
   */
  static toMarkdown(report) {
    const { stats } = report;
    
    const lines = [
      '# Validation Report',
      '',
      `**Project:** ${report.projectPath}`,
      `**Duration:** ${report.duration}ms`,
      '',
      '## Summary',
      '',
      '| Metric | Count |',
      '|--------|-------|',
      `| ✅ Passed | ${stats.passed} |`,
      `| ⚠️ Warnings | ${stats.warnings} |`,
      `| ❌ Failed | ${stats.failed} |`,
      `| 🚨 Critical | ${stats.critical} |`,
      `| 🛠️ Fixed | ${stats.fixed} |`,
      ''
    ];

    if (report.invariantViolations.length > 0) {
      lines.push(
        '## 🚨 Critical Invariant Violations',
        '',
        ...report.invariantViolations.map((v, i) => `${i + 1}. **${v.entity}:** ${v.message}`),
        ''
      );
    }

    return lines.join('\n');
  }
}

export default { ReportFormatter };
