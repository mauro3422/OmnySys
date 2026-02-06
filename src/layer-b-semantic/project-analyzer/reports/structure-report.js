/**
 * @fileoverview structure-report.js
 * 
 * Generación de reportes de estructura
 * 
 * @module project-analyzer/reports/structure-report
 */

import { REPORT_TEXTS, FORMAT_CONFIG } from '../constants.js';

/**
 * Genera reporte legible de la estructura del proyecto
 * @param {object} structure - Resultado de analyzeProjectStructure
 * @returns {string} - Reporte formateado
 */
export function generateStructureReport(structure) {
  const lines = [];

  // Header
  lines.push(generateHeader());
  lines.push('');
  
  // Estadísticas
  lines.push(...generateStats(structure.stats));
  lines.push('');

  // Subsistemas
  if (structure.subsystems?.length > 0) {
    lines.push(...generateSubsystemsSection(structure.subsystems));
  }

  // Huérfanos
  if (structure.orphans?.length > 0) {
    lines.push(...generateOrphansSection(structure.orphans));
  }

  // Footer
  lines.push(generateFooter());

  return lines.join('\n');
}

/**
 * Genera encabezado del reporte
 * @private
 */
function generateHeader() {
  const width = 59;
  const title = REPORT_TEXTS.TITLE;
  const padding = Math.floor((width - title.length) / 2);
  
  return [
    '═'.repeat(width),
    ' '.repeat(padding) + title,
    '═'.repeat(width)
  ].join('\n');
}

/**
 * Genera sección de estadísticas
 * @private
 */
function generateStats(stats) {
  return [
    `Total Files: ${stats.totalFiles}`,
    `Subsystems Detected: ${stats.subsystemCount}`,
    `Clustered Files: ${stats.clusteredFiles} (${stats.coveragePercentage}%)`,
    `Orphan Files: ${stats.orphanFiles}`
  ];
}

/**
 * Genera sección de subsistemas
 * @private
 */
function generateSubsystemsSection(subsystems) {
  const lines = [];
  const width = 59;
  
  lines.push('─'.repeat(width));
  lines.push(REPORT_TEXTS.SUBSYSTEMS_TITLE);
  lines.push('─'.repeat(width));
  lines.push('');

  for (const subsystem of subsystems) {
    lines.push(...generateSubsystemDetails(subsystem));
  }

  return lines;
}

/**
 * Genera detalles de un subsistema
 * @private
 */
function generateSubsystemDetails(subsystem) {
  const lines = [];
  
  lines.push(`[${subsystem.name}]`);
  lines.push(`  Files: ${subsystem.fileCount}`);
  lines.push(`  Cohesion: ${subsystem.cohesion.toFixed(FORMAT_CONFIG.COHESION_DECIMALS)}`);
  lines.push(`  Directory: ${subsystem.commonDirectory || '(mixed)'}`);

  if (subsystem.files.length <= FORMAT_CONFIG.MAX_FILES_TO_LIST) {
    lines.push('  Files:');
    subsystem.files.forEach(f => lines.push(`    - ${f}`));
  }

  lines.push('');
  
  return lines;
}

/**
 * Genera sección de huérfanos
 * @private
 */
function generateOrphansSection(orphans) {
  const lines = [];
  const width = 59;
  
  lines.push('─'.repeat(width));
  lines.push(REPORT_TEXTS.ORPHANS_TITLE);
  lines.push('─'.repeat(width));
  lines.push('');

  for (const orphan of orphans) {
    lines.push(...generateOrphanDetails(orphan));
  }

  return lines;
}

/**
 * Genera detalles de un huérfano
 * @private
 */
function generateOrphanDetails(orphan) {
  const lines = [];
  const severity = orphan.severity === 'high' 
    ? REPORT_TEXTS.HIGH_SEVERITY 
    : REPORT_TEXTS.LOW_SEVERITY;
  
  lines.push(`${severity} ${orphan.file}`);

  if (orphan.hasSideEffects) {
    if (orphan.sharedState?.writes?.length > 0) {
      lines.push(`  Writes: ${orphan.sharedState.writes.join(', ')}`);
    }
    if (orphan.events?.emits?.length > 0) {
      lines.push(`  Emits: ${orphan.events.emits.join(', ')}`);
    }
  } else {
    lines.push('  No side effects detected');
  }

  lines.push('');
  
  return lines;
}

/**
 * Genera pie del reporte
 * @private
 */
function generateFooter() {
  return '═'.repeat(59);
}
