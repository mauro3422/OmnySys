import { BaseSqlRepository } from '#layer-c/storage/repository/core/BaseSqlRepository.js';
import { safeJson, safeParseJson } from '../../converters.js';

function normalizeDerivedRiskLevel(score) {
  if (score >= 0.85) return 'critical';
  if (score >= 0.65) return 'high';
  if (score >= 0.4) return 'medium';
  return 'low';
}

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

function extractDerivedRiskRows(db) {
  return db.prepare(`
    SELECT
      a.file_path,
      ROUND(AVG(COALESCE(a.propagation_score, 0)), 4) as propagation_score,
      ROUND(AVG(COALESCE(a.complexity, 0) / 15.0), 4) as complexity_score,
      ROUND(AVG(COALESCE(a.coupling_score, 0)), 4) as coupling_score,
      ROUND(AVG(COALESCE(a.fragility_score, 0)), 4) as fragility_score,
      ROUND(AVG(COALESCE(a.centrality_score, 0) / 100.0), 4) as centrality_score,
      SUM(CASE WHEN COALESCE(a.has_network_calls, 0) = 1 THEN 1 ELSE 0 END) as network_atoms,
      SUM(CASE WHEN LOWER(COALESCE(a.risk_level, 'low')) IN ('high', 'critical') THEN 1 ELSE 0 END) as high_risk_atoms,
      SUM(CASE WHEN COALESCE(a.has_error_handling, 0) = 0 THEN 1 ELSE 0 END) as atoms_without_error_handling,
      COUNT(*) as atom_count
    FROM atoms a
    WHERE (a.is_removed IS NULL OR a.is_removed = 0)
      AND a.file_path IS NOT NULL
    GROUP BY a.file_path
  `).all().map((row) => {
    const rawScore =
      (Number(row.propagation_score) || 0) * 0.3 +
      (Number(row.complexity_score) || 0) * 0.2 +
      (Number(row.coupling_score) || 0) * 0.15 +
      (Number(row.fragility_score) || 0) * 0.15 +
      (Number(row.centrality_score) || 0) * 0.1 +
      (Math.min(Number(row.network_atoms) || 0, 5) / 5) * 0.05 +
      (Math.min(Number(row.high_risk_atoms) || 0, 5) / 5) * 0.05;

    const riskScore = Number(Math.max(0, Math.min(1, rawScore)).toFixed(4));
    return {
      file_path: row.file_path,
      risk_score: riskScore,
      risk_level: normalizeDerivedRiskLevel(riskScore),
      factors: [
        { type: 'derived_from_atoms', atomCount: Number(row.atom_count) || 0 },
        { type: 'propagation_score', score: Number(row.propagation_score) || 0 },
        { type: 'complexity_score', score: Number(row.complexity_score) || 0 },
        { type: 'coupling_score', score: Number(row.coupling_score) || 0 },
        { type: 'fragility_score', score: Number(row.fragility_score) || 0 },
        { type: 'network_atoms', count: Number(row.network_atoms) || 0 },
        { type: 'high_risk_atoms', count: Number(row.high_risk_atoms) || 0 },
        { type: 'atoms_without_error_handling', count: Number(row.atoms_without_error_handling) || 0 }
      ],
      shared_state_count: null,
      external_deps_count: Number(row.network_atoms) || 0,
      complexity_score: Number(row.complexity_score) || 0,
      propagation_score: Number(row.propagation_score) || 0
    };
  });
}

export async function saveRiskAssessments(db, riskAssessment, now) {
  const repo = new BaseSqlRepository(db, 'RiskHandler');
  repo.clearTable('risk_assessments');

  const isoNow = new Date(now).toISOString();
  const extractedRisks = riskAssessment
    ? extractRiskRows(riskAssessment)
    : extractDerivedRiskRows(db);

  if (extractedRisks.length === 0) return;

  // Usamos el repository para asegurar que el archivo existe (como hacía la lógica original)
  const insertFile = db.prepare(`
    INSERT OR IGNORE INTO files (path, last_analyzed, total_lines)
    VALUES (?, ?, 0)
  `);

  repo.transaction(() => {
    for (const item of extractedRisks) {
      insertFile.run(item.file_path, isoNow);
    }
  });

  const riskRows = extractedRisks.map(item => ({
    file_path: item.file_path,
    risk_score: item.risk_score,
    risk_level: item.risk_level,
    factors_json: safeJson(item.factors),
    shared_state_count: item.shared_state_count,
    external_deps_count: item.external_deps_count,
    complexity_score: item.complexity_score,
    propagation_score: item.propagation_score,
    is_removed: 0,
    assessed_at: isoNow,
    updated_at: isoNow
  }));

  repo.saveTableRows('risk_assessments',
    ['file_path', 'risk_score', 'risk_level', 'factors_json', 'shared_state_count', 'external_deps_count', 'complexity_score', 'propagation_score', 'is_removed', 'assessed_at', 'updated_at'],
    riskRows,
    'file_path'
  );
}

export async function loadRiskAssessments(db) {
  const repo = new BaseSqlRepository(db, 'RiskHandler');
  const rows = repo.loadTableRows('risk_assessments', '(is_removed IS NULL OR is_removed = 0)');
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
