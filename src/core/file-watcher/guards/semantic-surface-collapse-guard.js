/**
 * @fileoverview semantic-surface-collapse-guard.js
 * Detects when semantic_connections or other semantic surfaces drop significantly
 * after a reindex, indicating a bug in the merge/fallback logic.
 *
 * Pattern: If semantic_connections count drops >50% after restart/reindex,
 * it means the fallback path was discarded in favor of an incomplete derived path.
 * (See: semantic-handler.js saveSemanticData bug fix, 2026-04-12)
 */

const THRESHOLD_DROP_PCT = 50;
const MIN_ABS_CONNECTIONS = 200;

/**
 * Detects semantic surface collapse by comparing current counts with historical baselines.
 * @param {object} ctx - Guard context with db, changedFiles, and metadata
 * @returns {Promise<Array>} Array of findings/issues
 */
export async function detectSemanticSurfaceCollapse(ctx) {
  const db = ctx?.db;
  if (!db) return [];

  const findings = [];

  try {
    // Check semantic_connections count
    const currentCount = db.prepare(`
      SELECT COUNT(*) as cnt FROM semantic_connections 
      WHERE is_removed = 0 OR is_removed IS NULL
    `).get()?.cnt || 0;

    // Check atoms count (should be stable)
    const atomsCount = db.prepare(`
      SELECT COUNT(*) as cnt FROM atoms 
      WHERE is_removed = 0 OR is_removed IS NULL
    `).get()?.cnt || 0;

    // Check atom_relations count
    const relationsCount = db.prepare(`
      SELECT COUNT(*) as cnt FROM atom_relations 
      WHERE is_removed = 0 OR is_removed IS NULL
    `).get()?.cnt || 0;

    // Query historical baseline from health snapshots
    const lastSnapshot = db.prepare(`
      SELECT health_score_json 
      FROM compiler_metrics_snapshots 
      ORDER BY captured_at DESC 
      LIMIT 1
    `).get();

    const baselineConnections = lastSnapshot
      ? JSON.parse(lastSnapshot.health_score_json || '{}')?.semanticConnectionCount || 0
      : 0;

    // Rule 1: Absolute count too low
    if (currentCount > 0 && currentCount < MIN_ABS_CONNECTIONS) {
      findings.push({
        type: 'semantic_surface_collapse',
        severity: 'critical',
        description: `semantic_connections count critically low: ${currentCount} (minimum: ${MIN_ABS_CONNECTIONS}). Possible derivedRows/fallback merge bug in saveSemanticData().`,
        filePath: 'src/layer-c-memory/storage/repository/adapters/helpers/system-map/handlers/semantic-handler.js',
        symbol: 'saveSemanticData',
        context_json: JSON.stringify({
          currentCount,
          baselineConnections,
          atomsCount,
          relationsCount,
          threshold: MIN_ABS_CONNECTIONS,
          checkType: 'absolute_minimum'
        }),
        suggestion: `Verify that saveSemanticData() merges both derivedRows AND fallbackRows (union with dedup). Do NOT replace fallback with derived rows.`
      });
    }

    // Rule 2: Drop > 50% from baseline
    if (baselineConnections > 0 && currentCount > 0) {
      const dropPct = ((baselineConnections - currentCount) / baselineConnections) * 100;
      if (dropPct >= THRESHOLD_DROP_PCT) {
        findings.push({
          type: 'semantic_surface_collapse',
          severity: 'critical',
          description: `semantic_connections dropped ${dropPct.toFixed(0)}% from baseline (${baselineConnections} → ${currentCount}). This indicates a reindex bug where atom-derived surface replaces fallback connections instead of merging them.`,
          filePath: 'src/layer-c-memory/storage/repository/adapters/helpers/system-map/handlers/semantic-handler.js',
          symbol: 'saveSemanticData',
          context_json: JSON.stringify({
            baselineConnections,
            currentCount,
            dropPct: dropPct.toFixed(1),
            atomsCount,
            relationsCount,
            threshold: THRESHOLD_DROP_PCT,
            checkType: 'baseline_drop'
          }),
          suggestion: `Ensure saveSemanticData() performs union of derivedRows + fallbackRows with deduplication. Pattern: const connRows = [...derivedRows, ...fallbackRows].filter(unique).`
        });
      }
    }

    // Rule 3: Relations-to-connections ratio anomaly (normal ratio ~7:1)
    if (relationsCount > 0 && currentCount > 0) {
      const ratio = relationsCount / currentCount;
      // Normal ratio is around 6-7:1. If it jumps to 50+:1, connections are missing
      if (ratio > 20) {
        findings.push({
          type: 'semantic_surface_anomaly',
          severity: 'high',
          description: `Abnormal atom_relations/semantic_connections ratio: ${ratio.toFixed(1)}:1 (expected ~7:1). ${relationsCount} relations but only ${currentCount} semantic connections. Connections surface may be incomplete.`,
          filePath: 'src/layer-c-memory/storage/repository/adapters/helpers/system-map/handlers/semantic-handler.js',
          symbol: 'saveSemanticData',
          context_json: JSON.stringify({
            relationsCount,
            currentCount,
            ratio: ratio.toFixed(1),
            expectedRatio: '~7:1',
            checkType: 'ratio_anomaly'
          }),
          suggestion: `Check that both atom-derived and text-based semantic detection paths contribute to semantic_connections.`
        });
      }
    }

  } catch (err) {
    // Guard should never throw — return empty on error
  }

  return findings;
}

export default detectSemanticSurfaceCollapse;
