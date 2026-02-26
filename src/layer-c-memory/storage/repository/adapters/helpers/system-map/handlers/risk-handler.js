/**
 * @fileoverview risk-handler.js
 * Persistence handlers for risk assessments
 */
import { safeJson, safeParseJson } from '../../converters.js';

export async function saveRiskAssessments(db, riskAssessment, now) {
  db.prepare('DELETE FROM risk_assessments').run();
  const stmt = db.prepare(`
    INSERT OR REPLACE INTO risk_assessments (file_path, risk_level, factors_json, assessed_at)
    VALUES (?, ?, ?, ?)
  `);

  if (!riskAssessment) return;

  const fileStmt = db.prepare(`INSERT OR IGNORE INTO files (path, last_analyzed, total_lines) VALUES (?, ?, 0)`);
  const isoNow = new Date(now).toISOString();

  for (const [category, data] of Object.entries(riskAssessment)) {
    // Some legacy risk assessments grouping passed here use category as the key.
    // The DB schema expects `file_path`. We'll encode category into a pseudo file path
    // or use the file_path if it exists in data, and set risk_level to category.
    if (Array.isArray(data)) {
      for (const item of data) {
        const path = item.file_path || item.file || item.path || `_category_${category}_${Math.random()}`;
        fileStmt.run(path, isoNow);
        stmt.run(path, item.severity || category || 'low', safeJson(item), now);
      }
    } else {
      const path = data.file_path || data.file || data.path || `_category_${category}`;
      fileStmt.run(path, isoNow);
      stmt.run(path, data.severity || category || 'low', safeJson(data), now);
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
