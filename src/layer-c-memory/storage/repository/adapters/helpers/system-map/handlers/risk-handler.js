/**
 * @fileoverview risk-handler.js
 * Persistence handlers for risk assessments
 */
import { safeJson, safeParseJson } from '../../converters.js';

export async function saveRiskAssessments(db, riskAssessment, now) {
  // Using a simplified purge + insert pattern for risks
  db.prepare('DELETE FROM risk_assessments').run();

  if (!riskAssessment) return;

  const isoNow = new Date(now).toISOString();

  const insertRisk = db.prepare(`
    INSERT OR REPLACE INTO risk_assessments (file_path, risk_level, factors_json, assessed_at)
    VALUES (?, ?, ?, ?)
  `);

  const insertFile = db.prepare(`
    INSERT OR IGNORE INTO files (path, last_analyzed, total_lines) 
    VALUES (?, ?, 0)
  `);

  for (const [category, data] of Object.entries(riskAssessment)) {
    const items = Array.isArray(data) ? data : [data];
    for (const item of items) {
      // Only persist items that have a real file path — skip metadata blobs
      // (e.g. 'scores', 'report' category entries that are summary objects, not file risks)
      const filePath = item.file_path || item.file || item.path;
      if (!filePath || typeof filePath !== 'string' || filePath.startsWith('_category_')) continue;

      insertFile.run(filePath, isoNow);
      insertRisk.run(filePath, item.severity || item.risk_level || category || 'low', safeJson(item.factors || item), now);
    }
  }
}

export async function loadRiskAssessments(db) {
  const rows = db.prepare('SELECT * FROM risk_assessments').all();
  const assessment = {};
  for (const row of rows) {
    const category = row.risk_level || 'low'; // Mapping risk_level to category back for legacy
    if (!assessment[category]) assessment[category] = [];
    assessment[category].push({
      severity: row.risk_level,
      file_path: row.file_path,
      ...safeParseJson(row.factors_json)
    });
  }
  return assessment;
}
