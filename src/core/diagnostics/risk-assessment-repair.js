import { rehydrateRiskAssessmentsFromAtoms } from '#layer-c/storage/repository/adapters/helpers/system-map/handlers/risk-handler.js';

export function repairRiskAssessmentsIfEmpty(db, logger = null) {
  const activeCount = db.prepare(`
    SELECT COUNT(*) as total
    FROM risk_assessments
    WHERE (is_removed IS NULL OR is_removed = 0)
  `).get()?.total || 0;

  if (activeCount > 0) {
    return {
      repaired: false,
      persisted: 0,
      activeCount
    };
  }

  const repairResult = rehydrateRiskAssessmentsFromAtoms(db, Date.now());
  const persisted = Number(repairResult?.persisted || 0);

  if (persisted > 0) {
    logger?.warn(`[RUNTIME TABLE HEALTH] rehydrated risk_assessments from live atoms (${persisted} rows).`);
  }

  return {
    repaired: persisted > 0,
    persisted,
    activeCount: persisted
  };
}
