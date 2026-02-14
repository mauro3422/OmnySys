/**
 * @fileoverview exporter.js
 * 
 * Data export functionality
 * 
 * @module core/tunnel-vision-logger/storage/exporter
 */

import fs from 'fs/promises';
import { readAllEvents } from '../events/logger.js';

/**
 * Exporta eventos a CSV para análisis externo
 */
export async function exportToCSV(outputPath) {
  const events = await readAllEvents();

  if (events.length === 0) {
    throw new Error('No hay eventos para exportar');
  }

  // Header CSV
  const headers = [
    'timestamp',
    'severity',
    'modifiedFile',
    'totalAffected',
    'unmodified',
    'hasExports',
    'exportCount',
    'riskLevel',
    'userAction',
    'preventedBug'
  ].join(',');

  // Rows
  const rows = events.map(event => {
    return [
      event.timestamp,
      event.severity,
      `"${event.modifiedFile}"`,
      event.affectedFiles.total,
      event.affectedFiles.unmodified,
      event.metadata.hasExports,
      event.metadata.exportCount,
      event.metadata.riskLevel,
      event.context?.userAction || 'unknown',
      event.context?.preventedBug !== null ? event.context.preventedBug : ''
    ].join(',');
  });

  const csv = [headers, ...rows].join('\n');

  await fs.writeFile(outputPath, csv, 'utf-8');

  return {
    exported: events.length,
    path: outputPath
  };
}
