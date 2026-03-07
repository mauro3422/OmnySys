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
import { BaseSqlRepository } from '../../core/BaseSqlRepository.js';

/**
 * Guarda el system map completo en SQLite
 */
export async function persistSystemMapToDb(db, connectionManager, systemMap, logger) {
  const now = Date.now();

  try {
    db.transaction(() => {
      if (systemMap.files) saveSystemFiles(db, systemMap.files, now);
      if (systemMap.dependencies) saveFileDependencies(db, systemMap.dependencies, now);

      const connections = normalizeConnections(systemMap);
      const issues = normalizeIssues(systemMap);

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
 * Normaliza las conexiones semánticas desde diferentes formatos
 */
function normalizeConnections(systemMap) {
  if (Array.isArray(systemMap.semanticConnections) && systemMap.semanticConnections.length > 0) {
    return systemMap.semanticConnections;
  }

  if (systemMap.connections && typeof systemMap.connections === 'object') {
    const c = systemMap.connections;
    const buckets = [
      ...(Array.isArray(c.sharedState) ? c.sharedState : []),
      ...(Array.isArray(c.eventListeners) ? c.eventListeners : []),
      ...(Array.isArray(c.envVars) ? c.envVars : []),
      ...(Array.isArray(c.routes) ? c.routes : []),
      ...(Array.isArray(c.colocation) ? c.colocation : [])
    ];
    return buckets.map(conn => ({
      from: conn.sourceFile || conn.from || '',
      to: conn.targetFile || conn.to || '',
      type: conn.type || 'unknown',
      key: conn.connectionKey || conn.key || null,
      weight: typeof conn.weight === 'number' ? conn.weight : 1.0,
      metadata: conn.metadata || {}
    }));
  }

  return [];
}

/**
 * Normaliza los problemas semánticos
 */
function normalizeIssues(systemMap) {
  return Array.isArray(systemMap.semanticIssues)
    ? systemMap.semanticIssues
    : (systemMap.semanticIssues?.issues || []);
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
  const repo = new BaseSqlRepository(db, 'SystemMapMetadata');

  const liveCounts = {
    totalAtoms: db.prepare('SELECT COUNT(*) as n FROM atoms WHERE (is_removed IS NULL OR is_removed = 0)').get()?.n || 0,
    totalFiles: db.prepare('SELECT COUNT(DISTINCT file_path) as n FROM atoms WHERE (is_removed IS NULL OR is_removed = 0)').get()?.n || 0,
    totalFunctionLinks: db.prepare("SELECT COUNT(*) as n FROM atom_relations WHERE relation_type = 'calls' AND (is_removed IS NULL OR is_removed = 0)").get()?.n || 0
  };

  const normalizedMetadata = {
    ...metadata,
    totalFiles: liveCounts.totalFiles,
    totalAtoms: liveCounts.totalAtoms,
    totalFunctions: liveCounts.totalAtoms,
    totalFunctionLinks: liveCounts.totalFunctionLinks
  };

  repo.saveTableRows('system_metadata', ['key', 'value', 'updated_at'], [{
    key: 'core_metadata',
    value: safeJson(normalizedMetadata),
    updated_at: now
  }], 'key');
}

async function loadSystemMetadata(db) {
  const repo = new BaseSqlRepository(db, 'SystemMapMetadata');
  const rows = repo.loadTableRows('system_metadata', "key = 'core_metadata'");
  return rows.length > 0 ? safeParseJson(rows[0].value) : {};
}
