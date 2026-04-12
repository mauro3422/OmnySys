/**
 * @fileoverview societies-surface.js
 * Canonical surface for functional cohesion clusters (societies).
 *
 * Source of truth: societies table (1,828 rows)
 * Control plane field: Societies
 *
 * Societies are groups of atoms that work together functionally,
 * detected by Layer B through cohesion analysis.
 */

/**
 * Loads societies summary.
 * @param {object} db - SQLite database connection
 * @returns {object} Societies summary
 */
export function loadSocieties(db) {
  // Overall stats
  const stats = db.prepare(`
    SELECT
      COUNT(*) as total_societies,
      COUNT(DISTINCT society_id) as unique_society_ids,
      SUM(atom_count) as total_atoms_in_societies,
      MIN(created_at) as first_detected,
      MAX(updated_at) as last_updated
    FROM societies
  `).get();

  // Top societies by atom count
  const topSocieties = db.prepare(`
    SELECT society_id, society_name, atom_count, cohesion_score,
           society_type, primary_domain, file_path, created_at
    FROM societies
    ORDER BY atom_count DESC
    LIMIT 20
  `).all();

  // By type
  const byType = db.prepare(`
    SELECT society_type, COUNT(*) as count, AVG(atom_count) as avg_atoms
    FROM societies
    GROUP BY society_type
    ORDER BY count DESC
  `).all();

  // By domain
  const byDomain = db.prepare(`
    SELECT primary_domain, COUNT(*) as count, SUM(atom_count) as total_atoms
    FROM societies
    WHERE primary_domain IS NOT NULL
    GROUP BY primary_domain
    ORDER BY total_atoms DESC
    LIMIT 15
  `).all();

  return {
    state: 'canonical',
    sourceTable: 'societies',
    rowCount: stats?.total_societies || 0,
    stats: stats || {},
    topSocieties: topSocieties || [],
    byType: byType || [],
    byDomain: byDomain || [],
    summary: buildSocietiesSummary(stats, byType)
  };
}

function buildSocietiesSummary(stats, byType) {
  if (!stats || stats.total_societies === 0) return 'societies=none';
  const typeSummary = (byType || []).map(t => `${t.society_type}=${t.count}`).join(', ');
  return `societies=${stats.total_societies}clusters/${stats.total_atoms_in_societies}atoms | ${typeSummary}`;
}

/**
 * Gets societies control plane status.
 * @param {object} db - SQLite database connection
 * @returns {object} Control plane societies status
 */
export function getSocietiesControlPlaneStatus(db) {
  const societies = loadSocieties(db);

  if (societies.rowCount === 0) {
    return {
      state: 'missing',
      reason: 'No societies detected',
      recommendation: 'Societies are generated during Layer B cohesion analysis.'
    };
  }

  return {
    state: societies.rowCount > 100 ? 'ready' : 'watching',
    totalSocieties: societies.rowCount,
    totalAtomsInSocieties: societies.stats?.total_atoms_in_societies || 0,
    topType: societies.byType?.[0]?.society_type || null,
    lastUpdated: societies.stats?.last_updated || null,
    summary: societies.summary
  };
}

export default { loadSocieties, getSocietiesControlPlaneStatus };
