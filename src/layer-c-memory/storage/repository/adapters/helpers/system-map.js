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

      // Normalize connections — accept both shapes:
      // 1. flat array:  systemMap.semanticConnections = [{from, to, type, ...}]  (new enhancer)
      // 2. structured:  systemMap.connections.{sharedState, eventListeners, envVars, routes, ...} (old enhancer)
      let connections = [];
      if (Array.isArray(systemMap.semanticConnections) && systemMap.semanticConnections.length > 0) {
        connections = systemMap.semanticConnections;
      } else if (systemMap.connections && typeof systemMap.connections === 'object') {
        // Flatten the structured object into the schema saveSemanticData expects
        const c = systemMap.connections;
        const buckets = [
          ...(Array.isArray(c.sharedState) ? c.sharedState : []),
          ...(Array.isArray(c.eventListeners) ? c.eventListeners : []),
          ...(Array.isArray(c.envVars) ? c.envVars : []),
          ...(Array.isArray(c.routes) ? c.routes : []),
          ...(Array.isArray(c.colocation) ? c.colocation : [])
        ];
        connections = buckets.map(conn => ({
          from: conn.sourceFile || conn.from || '',
          to: conn.targetFile || conn.to || '',
          type: conn.type || 'unknown',
          key: conn.connectionKey || conn.key || null,
          weight: typeof conn.weight === 'number' ? conn.weight : 1.0,
          metadata: conn.metadata || {}
        }));
      }

      const issues = Array.isArray(systemMap.semanticIssues)
        ? systemMap.semanticIssues
        : (systemMap.semanticIssues?.issues || []);

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
  const liveCounts = {
    totalAtoms: db.prepare('SELECT COUNT(*) as n FROM atoms').get()?.n || 0,
    totalFiles: db.prepare('SELECT COUNT(DISTINCT file_path) as n FROM atoms').get()?.n || 0,
    totalFunctionLinks: db.prepare("SELECT COUNT(*) as n FROM atom_relations WHERE relation_type = 'calls'").get()?.n || 0
  };

  const normalizedMetadata = {
    ...metadata,
    totalFiles: liveCounts.totalFiles,
    totalAtoms: liveCounts.totalAtoms,
    totalFunctions: liveCounts.totalAtoms,
    totalFunctionLinks: liveCounts.totalFunctionLinks
  };

  const stmt = db.prepare(`
    INSERT INTO system_metadata (key, value, updated_at)
    VALUES (?, ?, ?)
    ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = excluded.updated_at
  `);
  stmt.run('core_metadata', safeJson(normalizedMetadata), now);
}

async function loadSystemMetadata(db) {
  const row = db.prepare("SELECT value FROM system_metadata WHERE key = 'core_metadata'").get();
  return row ? safeParseJson(row.value) : {};
}
