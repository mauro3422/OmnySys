/**
 * @fileoverview report-generator.js
 * 
 * Genera reporte legible de issues
 * 
 * @module issue-detectors/report-generator
 */

/**
 * Genera reporte legible de issues
 * @param {object} issuesReport - Resultado de detectSemanticIssues
 * @returns {string} - Reporte formateado
 */
export function generateIssuesReport(issuesReport) {
  const { issues, stats } = issuesReport;
  const lines = [];

  lines.push('═══════════════════════════════════════════════════════════');
  lines.push('  SEMANTIC ISSUES REPORT');
  lines.push('═══════════════════════════════════════════════════════════');
  lines.push('');
  lines.push(`Total Issues: ${stats.totalIssues}`);
  lines.push(`  High:   ${stats.bySeverity.high}`);
  lines.push(`  Medium: ${stats.bySeverity.medium}`);
  lines.push(`  Low:    ${stats.bySeverity.low}`);
  lines.push('');

  // Orphaned Files
  if (issues.orphanedFilesWithSideEffects.length > 0) {
    lines.push('───────────────────────────────────────────────────────────');
    lines.push('⚠️  ORPHANED FILES WITH SIDE EFFECTS');
    lines.push('───────────────────────────────────────────────────────────');
    issues.orphanedFilesWithSideEffects.forEach(issue => {
      lines.push(`\n[${issue.severity.toUpperCase()}] ${issue.file}`);
      lines.push(`  ${issue.reason}`);
      if (issue.evidence.sharedStateWrites?.length > 0) {
        lines.push(`  Writes: ${issue.evidence.sharedStateWrites.join(', ')}`);
      }
      if (issue.evidence.sharedStateReads?.length > 0) {
        lines.push(`  Reads: ${issue.evidence.sharedStateReads.join(', ')}`);
      }
    });
    lines.push('');
  }

  // Unhandled Events
  if (issues.unhandledEvents.length > 0) {
    lines.push('───────────────────────────────────────────────────────────');
    lines.push('⚠️  UNHANDLED EVENTS');
    lines.push('───────────────────────────────────────────────────────────');
    issues.unhandledEvents.forEach(issue => {
      lines.push(`\n[${issue.severity.toUpperCase()}] Event: "${issue.event}"`);
      lines.push(`  Emitted by: ${issue.emitters.join(', ')}`);
      lines.push(`  ${issue.reason}`);
      lines.push(`  💡 ${issue.suggestion}`);
    });
    lines.push('');
  }

  // Undefined Shared State
  if (issues.undefinedSharedState.length > 0) {
    lines.push('───────────────────────────────────────────────────────────');
    lines.push('⚠️  UNDEFINED SHARED STATE');
    lines.push('───────────────────────────────────────────────────────────');
    issues.undefinedSharedState.forEach(issue => {
      lines.push(`\n[${issue.severity.toUpperCase()}] Property: "${issue.property}"`);
      lines.push(`  Read by: ${issue.readers.join(', ')}`);
      lines.push(`  ${issue.reason}`);
      lines.push(`  💡 ${issue.suggestion}`);
    });
    lines.push('');
  }

  // Dead Shared State
  if (issues.deadSharedState.length > 0) {
    lines.push('───────────────────────────────────────────────────────────');
    lines.push('⚠️  DEAD SHARED STATE');
    lines.push('───────────────────────────────────────────────────────────');
    issues.deadSharedState.forEach(issue => {
      lines.push(`\n[${issue.severity.toUpperCase()}] Property: "${issue.property}"`);
      lines.push(`  Written by: ${issue.writers.join(', ')}`);
      lines.push(`  ${issue.reason}`);
      lines.push(`  💡 ${issue.suggestion}`);
    });
    lines.push('');
  }

  // Connection Hotspots
  if (issues.connectionHotspots.length > 0) {
    lines.push('───────────────────────────────────────────────────────────');
    lines.push('⚠️  CONNECTION HOTSPOTS');
    lines.push('───────────────────────────────────────────────────────────');
    issues.connectionHotspots.slice(0, 5).forEach(issue => {
      lines.push(`\n[${issue.severity.toUpperCase()}] ${issue.file}`);
      lines.push(`  ${issue.connectionCount} connections`);
      lines.push(`  Imports: ${issue.breakdown.imports}, UsedBy: ${issue.breakdown.usedBy}`);
      lines.push(`  💡 ${issue.suggestion}`);
    });
    lines.push('');
  }

  // Suspicious Patterns
  if (issues.suspiciousPatterns.length > 0) {
    lines.push('───────────────────────────────────────────────────────────');
    lines.push('⚠️  SUSPICIOUS PATTERNS');
    lines.push('───────────────────────────────────────────────────────────');
    issues.suspiciousPatterns.slice(0, 5).forEach(issue => {
      lines.push(`\n[${issue.severity.toUpperCase()}] ${issue.type}`);
      lines.push(`  File: ${issue.file}`);
      lines.push(`  ${issue.reason}`);
      if (issue.suggestion) {
        lines.push(`  💡 ${issue.suggestion}`);
      }
    });
    lines.push('');
  }

  lines.push('═══════════════════════════════════════════════════════════');

  return lines.join('\n');
}
