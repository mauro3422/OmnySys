/**
 * @fileoverview Internal graph/runtime coverage computations.
 *
 * @module shared/compiler/compiler-runtime-metrics-graph
 */

export function computeGraphCoverageMetrics(db) {
  if (!db) {
    return {
      callLinks: 0,
      semanticLinks: 0,
      surfaces: {
        callLinks: 'atoms.called_by_json',
        semanticLinks: 'atom_relations'
      },
      validation: {
        equivalentTotals: false,
        semanticLayerIsHighLevel: true,
        reconciled: true
      }
    };
  }

  const calledByRows = db.prepare(`
    SELECT called_by_json
    FROM atoms
    WHERE (is_removed = 0 OR is_removed IS NULL)
      AND called_by_json IS NOT NULL
      AND called_by_json != '[]'
  `).all();

  const callLinks = calledByRows.reduce((sum, row) => {
    try {
      return sum + (JSON.parse(row.called_by_json)?.length || 0);
    } catch {
      return sum;
    }
  }, 0);
  const semanticLinks = db.prepare(`
    SELECT COUNT(*) as n
    FROM atom_relations
    WHERE (is_removed = 0 OR is_removed IS NULL)
      AND relation_type IN ('shares_state', 'emits', 'listens')
  `).get()?.n || 0;

  return {
    callLinks,
    semanticLinks,
    surfaces: {
      callLinks: 'atoms.called_by_json',
      semanticLinks: 'atom_relations'
    },
    validation: {
      equivalentTotals: false,
      semanticLayerIsHighLevel: true,
      reconciled: semanticLinks <= callLinks
    }
  };
}
