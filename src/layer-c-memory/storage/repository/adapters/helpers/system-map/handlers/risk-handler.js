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

  // Recursively extract file-level risks from deep report structures
  const extractedRisks = [];

  function scanForRisks(obj, parentCategory = 'low') {
    if (!obj || typeof obj !== 'object') return;

    // Si el objeto actual tiene filePath/file_path, considerarlo un file-risk
    const filePath = obj.file_path || obj.file || obj.path || obj.filePath;
    if (filePath && typeof filePath === 'string' && !filePath.startsWith('_category_')) {
      extractedRisks.push({
        file_path: filePath,
        risk_level: obj.severity || obj.risk_level || parentCategory,
        factors: obj.factors || obj
      });
      return;
    }

    // Continuar explorando
    for (const [key, val] of Object.entries(obj)) {
      if (!val || typeof val !== 'object') continue;

      const newCategory = (key === 'critical' || key === 'high' || key === 'medium' || key === 'low') ? key : parentCategory;
      if (Array.isArray(val)) {
        val.forEach(item => scanForRisks(item, newCategory));
      } else {
        scanForRisks(val, newCategory);
      }
    }
  }

  scanForRisks(riskAssessment);

  for (const item of extractedRisks) {
    insertFile.run(item.file_path, isoNow);
    insertRisk.run(item.file_path, item.risk_level, safeJson(item.factors), now);
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
