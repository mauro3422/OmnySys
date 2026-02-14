/**
 * @fileoverview Alert Formatter
 * 
 * Formats tunnel vision alerts for console display.
 * Creates visual boxed output with emojis.
 * 
 * @module tunnel-vision-detector/reports/alert-formatter
 */

/**
 * Severity emojis
 * @const {Object}
 */
const SEVERITY_EMOJI = {
  'CRITICAL': '🔴',
  'HIGH': '🟠',
  'MEDIUM': '🟡',
  'LOW': '🟢'
};

/**
 * Formats alerts for display
 * 
 * @class AlertFormatter
 */
export class AlertFormatter {
  /**
   * Formats an alert for console display
   * 
   * @param {Object} alert - Alert to format
   * @returns {string} Formatted alert string
   */
  format(alert) {
    if (!alert) return '';

    const lines = [];
    lines.push('');
    lines.push(this._header(alert));
    lines.push(this._content(alert));
    lines.push(this._recommendations(alert));
    lines.push(this._footer());
    lines.push('');

    return lines.join('\n');
  }

  /**
   * Creates header section
   * @private
   */
  _header(alert) {
    const emoji = SEVERITY_EMOJI[alert.severity] || '⚪';
    return [
      '╔══════════════════════════════════════════════════════════════╗',
      `║  ${emoji} TUNNEL VISION MOLECULAR v3.0 - ${alert.severity.padEnd(14)}║`,
      '╠══════════════════════════════════════════════════════════════╣'
    ].join('\n');
  }

  /**
   * Creates content section
   * @private
   */
  _content(alert) {
    if (alert.type === 'TUNNEL_VISION_ATOMIC') {
      return this._atomicContent(alert);
    }
    return this._fileContent(alert);
  }

  /**
   * Creates atomic alert content
   * @private
   */
  _atomicContent(alert) {
    const lines = [];
    lines.push(`║  🧬 Atom modified: ${alert.functionName.padEnd(37)}║`);
    lines.push(`║  📁 File: ${alert.filePath.padEnd(45)}║`);
    lines.push('║                                                              ║');
    lines.push(`║  📊 Atom metadata:                                           ║`);
    lines.push(`║    • Complexity: ${String(alert.atom.complexity).padEnd(38)}║`);
    lines.push(`║    • Archetype: ${(alert.atom.archetype?.type || 'standard').padEnd(40)}║`);
    lines.push(`║    • Exported: ${(alert.atom.isExported ? 'Yes' : 'No').padEnd(42)}║`);
    lines.push('║                                                              ║');
    lines.push(`║  📞 Unmodified callers: ${String(alert.callers.unmodified).padEnd(27)}║`);
    lines.push('║                                                              ║');
    return lines.join('\n');
  }

  /**
   * Creates file alert content
   * @private
   */
  _fileContent(alert) {
    const lines = [];
    lines.push(`║  📁 Modified file: ${alert.filePath.padEnd(33)}║`);
    lines.push(`║  🧬 Exported functions modified: ${String(alert.atomsModified.count).padEnd(17)}║`);
    lines.push('║                                                              ║');
    lines.push(`║  📞 Unmodified callers: ${String(alert.callers.totalAffected).padEnd(27)}║`);
    lines.push('║                                                              ║');
    return lines.join('\n');
  }

  /**
   * Creates recommendations section
   * @private
   */
  _recommendations(alert) {
    const lines = [];

    if (alert.recommendations?.length > 0) {
      lines.push('║  💡 Recommendations:                                         ║');
      alert.recommendations.forEach(rec => {
        const wrapped = this._wrapText(rec, 56);
        wrapped.forEach((line, i) => {
          const prefix = i === 0 ? '  ' : '     ';
          lines.push(`║${prefix}${line.padEnd(59)}║`);
        });
      });
    }

    return lines.join('\n');
  }

  /**
   * Creates footer section
   * @private
   */
  _footer() {
    return '╚══════════════════════════════════════════════════════════════╝';
  }

  /**
   * Wraps text to fit in box
   * @private
   */
  _wrapText(text, maxLength) {
    if (text.length <= maxLength) return [text];

    const lines = [];
    let remaining = text;

    while (remaining.length > maxLength) {
      lines.push(remaining.substring(0, maxLength));
      remaining = remaining.substring(maxLength);
    }

    if (remaining.length > 0) {
      lines.push(remaining);
    }

    return lines;
  }
}

export default AlertFormatter;
