/**
 * @fileoverview system-map.js
 * 
 * Métodos para guardar y cargar el system map en SQLite.
 * Refactored to use specialized handlers.
 */

import { saveSystemFiles, loadSystemFiles } from './system-map/handlers/file-handler.js';
import { saveFileDependencies, loadFileDependencies } from './system-map/handlers/dependency-handler.js';
import { saveSemanticData, loadSemanticConnections, loadSemanticIssues } from './system-map/handlers/semantic-handler.js';
import { saveRiskAssessments, loadRiskAssessments } from './system-map/handlers/risk-handler.js';
import { safeJson, safeParseJson } from './converters.js';

/**
 * Guarda el system map completo en SQLite
 */
export async function persistSystemMapToDb(db, connectionManager, systemMap, logger) {
  const now = Date.now();

  try {
    db.transaction(() => {
      if (systemMap.files) saveSystemFiles(db, systemMap.files, now);
      if (systemMap.dependencies) saveFileDependencies(db, systemMap.dependencies, now);

      const connections = Array.isArray(systemMap.semanticConnections) ? systemMap.semanticConnections : [];
      const issues = Array.isArray(systemMap.semanticIssues) ? systemMap.semanticIssues : [];
      saveSemanticData(db, connections, issues, now);

      if (systemMap.riskAssessment) saveRiskAssessments(db, systemMap.riskAssessment, now);
      if (systemMap.metadata) updateSystemMetadata(db, systemMap.metadata, now);
    })();
    return true;
  } catch (error) {
    logger?.error('Error saving system map:', error);
    throw error;
  }
}

/**
 * Carga el system map completo desde SQLite
 */
export async function retrieveSystemMapFromDb(db) {
  return {
    files: await loadSystemFiles(db) || {},
    dependencies: await loadFileDependencies(db) || {},
    semanticConnections: await loadSemanticConnections(db) || [],
    semanticIssues: await loadSemanticIssues(db) || [],
    riskAssessment: await loadRiskAssessments(db) || {},
    metadata: await loadSystemMetadata(db) || {}
  };
}

function updateSystemMetadata(db, metadata, now) {
  const stmt = db.prepare(`
    INSERT INTO system_metadata (key, value, updated_at)
    VALUES (?, ?, ?)
    ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = excluded.updated_at
  `);
  stmt.run('core_metadata', safeJson(metadata), now);
}

async function loadSystemMetadata(db) {
  const row = db.prepare("SELECT value FROM system_metadata WHERE key = 'core_metadata'").get();
  return row ? safeParseJson(row.value) : {};
}
