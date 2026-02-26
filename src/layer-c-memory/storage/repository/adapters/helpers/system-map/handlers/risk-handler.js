/**
 * @fileoverview risk-handler.js
 * Persistence handlers for risk assessments
 */
import { safeJson, safeParseJson } from '../../converters.js';

export async function saveRiskAssessments(db, riskAssessment, now) {
  db.prepare('DELETE FROM risk_assessments').run();
  const stmt = db.prepare(`
    INSERT INTO risk_assessments (category, severity, details, created_at)
    VALUES (?, ?, ?, ?)
  `);

  if (!riskAssessment) return;

  for (const [category, data] of Object.entries(riskAssessment)) {
    if (Array.isArray(data)) {
      for (const item of data) {
        stmt.run(category, item.severity || 'low', safeJson(item), now);
      }
    } else {
      stmt.run(category, data.severity || 'low', safeJson(data), now);
    }
  }
}

export async function loadRiskAssessments(db) {
  const rows = db.prepare('SELECT * FROM risk_assessments').all();
  const assessment = {};
  for (const row of rows) {
    if (!assessment[row.category]) assessment[row.category] = [];
    assessment[row.category].push({
      severity: row.severity,
      ...safeParseJson(row.details)
    });
  }
  return assessment;
}
