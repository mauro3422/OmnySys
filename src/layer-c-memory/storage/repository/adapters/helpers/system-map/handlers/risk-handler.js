/**
 * @fileoverview risk-handler.js
 * Persistence handlers for risk assessments
 */
import { safeJson, safeParseJson } from '../../converters.js';

function normalizeRiskFactors(riskEntry, fallbackLevel = 'low') {
  if (Array.isArray(riskEntry?.factors)) {
    return riskEntry.factors;
  }

  const breakdown = riskEntry?.breakdown && typeof riskEntry.breakdown === 'object'
    ? riskEntry.breakdown
    : {};

  const factors = Object.entries(breakdown)
    .filter(([, value]) => Number(value) > 0)
    .map(([type, score]) => ({ type, score: Number(score) }));

  if (riskEntry?.explanation) {
    factors.push({ type: 'explanation', message: riskEntry.explanation });
  }

  if (factors.length === 0) {
    factors.push({ type: 'severity', level: riskEntry?.severity || riskEntry?.risk_level || fallbackLevel });
  }

  return factors;
}

function extractRiskRows(riskAssessment) {
  const extracted = new Map();

  if (riskAssessment?.scores && typeof riskAssessment.scores === 'object') {
    for (const [filePath, score] of Object.entries(riskAssessment.scores)) {
      if (!filePath || !score || typeof score !== 'object') continue;

      extracted.set(filePath, {
        file_path: filePath,
        risk_score: Number.isFinite(Number(score.total)) ? Number(score.total) : 0,
        risk_level: String(score.severity || score.risk_level || 'low').toLowerCase(),
        factors: normalizeRiskFactors(score),
        shared_state_count: Number.isFinite(Number(score.breakdown?.semanticConnections)) ? Number(score.breakdown.semanticConnections) : null,
        external_deps_count: null,
        complexity_score: Number.isFinite(Number(score.breakdown?.staticComplexity)) ? Number(score.breakdown.staticComplexity) : null,
        propagation_score: Number.isFinite(Number(score.breakdown?.hotspotRisk)) ? Number(score.breakdown.hotspotRisk) : null
      });
    }
  }

  const reportBuckets = [
    ...(riskAssessment?.report?.criticalRiskFiles || []),
    ...(riskAssessment?.report?.highRiskFiles || []),
    ...(riskAssessment?.report?.mediumRiskFiles || []),
    ...(riskAssessment?.report?.lowRiskFiles || [])
  ];

  for (const item of reportBuckets) {
    const filePath = item?.file_path || item?.file || item?.path || item?.filePath;
    if (!filePath || extracted.has(filePath)) continue;

    extracted.set(filePath, {
      file_path: filePath,
      risk_score: Number.isFinite(Number(item.score ?? item.total)) ? Number(item.score ?? item.total) : 0,
      risk_level: String(item.severity || item.risk_level || 'low').toLowerCase(),
      factors: normalizeRiskFactors(item),
      shared_state_count: null,
      external_deps_count: null,
      complexity_score: null,
      propagation_score: null
    });
  }

  return Array.from(extracted.values());
}

export async function saveRiskAssessments(db, riskAssessment, now) {
  db.prepare('DELETE FROM risk_assessments').run();

  if (!riskAssessment) return;

  const isoNow = new Date(now).toISOString();
  const extractedRisks = extractRiskRows(riskAssessment);

  if (extractedRisks.length === 0) return;

  const insertRisk = db.prepare(`
    INSERT INTO risk_assessments (
      file_path, risk_score, risk_level, factors_json,
      shared_state_count, external_deps_count, complexity_score, propagation_score, assessed_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  const insertFile = db.prepare(`
    INSERT OR IGNORE INTO files (path, last_analyzed, total_lines)
    VALUES (?, ?, 0)
  `);

  for (const item of extractedRisks) {
    insertFile.run(item.file_path, isoNow);
    insertRisk.run(
      item.file_path,
      item.risk_score,
      item.risk_level,
      safeJson(item.factors),
      item.shared_state_count,
      item.external_deps_count,
      item.complexity_score,
      item.propagation_score,
      isoNow
    );
  }
}

export async function loadRiskAssessments(db) {
  const rows = db.prepare('SELECT * FROM risk_assessments').all();
  const assessment = {};

  for (const row of rows) {
    const category = row.risk_level || 'low';
    if (!assessment[category]) assessment[category] = [];
    assessment[category].push({
      severity: row.risk_level,
      file_path: row.file_path,
      risk_score: row.risk_score,
      factors: safeParseJson(row.factors_json, []),
      shared_state_count: row.shared_state_count,
      external_deps_count: row.external_deps_count,
      complexity_score: row.complexity_score,
      propagation_score: row.propagation_score
    });
  }

  return assessment;
}
