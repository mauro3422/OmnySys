/**
 * @fileoverview Direct SQLite-backed runtime/compiler counts.
 *
 * @module shared/compiler/compiler-runtime-metrics-db
 */

export function getAtomCountSummary(db) {
  if (!db) {
    return {
      totalAtoms: 0,
      byType: {},
      callable: { functions: 0, methods: 0, arrows: 0 },
      display: {
        inventory: 'classes=0, functions=0, variables=0',
        callable: 'functions=0, methods=0, arrows=0'
      }
    };
  }

  const rows = db.prepare(`
    SELECT atom_type, COUNT(*) as count
    FROM atoms
    WHERE (is_removed = 0 OR is_removed IS NULL)
    GROUP BY atom_type
  `).all();

  const byType = rows.reduce((acc, row) => {
    acc[row.atom_type] = row.count;
    return acc;
  }, {});

  return {
    totalAtoms: rows.reduce((sum, row) => sum + row.count, 0),
    byType,
    callable: {
      functions: byType.function || 0,
      methods: byType.method || 0,
      arrows: byType.arrow || 0
    },
    display: {
      inventory: [
        `classes=${byType.class || 0}`,
        `functions=${byType.function || 0}`,
        `variables=${byType.variable || 0}`
      ].join(', '),
      callable: [
        `functions=${byType.function || 0}`,
        `methods=${byType.method || 0}`,
        `arrows=${byType.arrow || 0}`
      ].join(', ')
    }
  };
}

export function getPhase2PendingFiles(db) {
  if (!db) {
    return 0;
  }

  return db.prepare('SELECT COUNT(DISTINCT file_path) as n FROM atoms WHERE is_phase2_complete = 0').get()?.n || 0;
}

export function getPhase2FileCounts(db) {
  if (!db) {
    return {
      pendingFiles: 0,
      completedFiles: 0,
      liveFileCount: 0
    };
  }

  return {
    pendingFiles: getPhase2PendingFiles(db),
    completedFiles: db.prepare('SELECT COUNT(DISTINCT file_path) as n FROM atoms WHERE is_phase2_complete = 1').get()?.n || 0,
    liveFileCount: db.prepare('SELECT COUNT(DISTINCT file_path) as n FROM atoms WHERE is_removed IS NULL OR is_removed = 0').get()?.n || 0
  };
}
