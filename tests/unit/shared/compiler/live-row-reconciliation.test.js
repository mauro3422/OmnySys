import Database from 'better-sqlite3';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { afterEach, describe, expect, it } from 'vitest';

import {
  buildLiveRowReconciliationPlan,
  executeLiveRowCleanup
} from '../../../../src/shared/compiler/live-row-reconciliation-plan.js';

const tempRoots = [];

function createSchema(db) {
  db.exec(`
    CREATE TABLE compiler_scanned_files (
      path TEXT PRIMARY KEY
    );
    CREATE TABLE files (
      path TEXT PRIMARY KEY,
      atom_count INTEGER DEFAULT 0,
      last_analyzed TEXT,
      hash TEXT,
      is_removed INTEGER DEFAULT 0,
      updated_at TEXT
    );
    CREATE TABLE atoms (
      id INTEGER PRIMARY KEY,
      name TEXT,
      file_path TEXT,
      purpose_type TEXT,
      is_phase2_complete INTEGER DEFAULT 0,
      updated_at TEXT,
      is_removed INTEGER DEFAULT 0
    );
    CREATE TABLE risk_assessments (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      file_path TEXT,
      risk_score REAL,
      risk_level TEXT,
      assessed_at TEXT,
      is_removed INTEGER DEFAULT 0,
      lifecycle_status TEXT,
      updated_at TEXT
    );
    CREATE TABLE atom_relations (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      source_id INTEGER,
      target_id INTEGER,
      relation_type TEXT,
      is_removed INTEGER DEFAULT 0,
      lifecycle_status TEXT,
      updated_at TEXT
    );
    CREATE TABLE semantic_issues (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      file_path TEXT,
      is_removed INTEGER DEFAULT 0,
      updated_at TEXT,
      lifecycle_status TEXT
    );
    CREATE TABLE semantic_connections (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      source_path TEXT,
      target_path TEXT,
      is_removed INTEGER DEFAULT 0,
      updated_at TEXT,
      lifecycle_status TEXT
    );
  `);
}

function seedDrift(db) {
  db.prepare('INSERT INTO compiler_scanned_files(path) VALUES (?)').run('src/live.js');
  db.prepare('INSERT INTO files(path, atom_count, last_analyzed, hash, is_removed, updated_at) VALUES (?, ?, ?, ?, 0, datetime(\'now\'))')
    .run('src/live.js', 1, '2026-01-01T00:00:00.000Z', 'live');
  db.prepare('INSERT INTO files(path, atom_count, last_analyzed, hash, is_removed, updated_at) VALUES (?, ?, ?, ?, 0, datetime(\'now\'))')
    .run('src/stale.js', 1, '2026-01-01T00:00:00.000Z', 'stale');
  db.prepare('INSERT INTO atoms(id, name, file_path, purpose_type, updated_at, is_removed) VALUES (?, ?, ?, ?, datetime(\'now\'), 0)')
    .run(1, 'liveAtom', 'src/live.js', 'function');
  db.prepare('INSERT INTO atoms(id, name, file_path, purpose_type, updated_at, is_removed) VALUES (?, ?, ?, ?, datetime(\'now\'), 0)')
    .run(2, 'staleAtom', 'src/stale.js', 'function');
  db.prepare('INSERT INTO risk_assessments(file_path, risk_score, risk_level, assessed_at, is_removed, lifecycle_status, updated_at) VALUES (?, ?, ?, ?, 0, ?, datetime(\'now\'))')
    .run('src/stale.js', 9.5, 'high', '2026-01-01T00:00:00.000Z', 'active');
  db.prepare('INSERT INTO semantic_issues(file_path, is_removed, updated_at, lifecycle_status) VALUES (?, 0, datetime(\'now\'), ?)')
    .run('src/stale.js', 'active');
  db.prepare('INSERT INTO semantic_connections(source_path, target_path, is_removed, updated_at, lifecycle_status) VALUES (?, ?, 0, datetime(\'now\'), ?)')
    .run('src/stale.js', 'src/live.js', 'active');
}

afterEach(() => {
  while (tempRoots.length > 0) {
    rmSync(tempRoots.pop(), { recursive: true, force: true });
  }
});

describe('live-row reconciliation', () => {
  it('reconciles files before atoms so stale atom rows do not survive cleanup', () => {
    const rootDir = mkdtempSync(join(tmpdir(), 'omnysys-live-row-'));
    tempRoots.push(rootDir);

    const db = new Database(join(rootDir, 'omnysys.db'));
    try {
      createSchema(db);
      seedDrift(db);

      const before = buildLiveRowReconciliationPlan(db, { sampleLimit: 5 });
      expect(before.summary.staleFileRows).toBeGreaterThan(0);
      expect(before.summary.staleAtomRows).toBe(0);

      const cleanup = executeLiveRowCleanup(db, { dryRun: false, sampleLimit: 5, allowDuringPhase2: true });
      expect(cleanup.deleted.files).toBeGreaterThan(0);
      expect(cleanup.deleted.atoms).toBeGreaterThan(0);

      const after = buildLiveRowReconciliationPlan(db, { sampleLimit: 5 });
      expect(after.summary.staleAtomRows).toBe(0);
      expect(after.summary.staleFileRows).toBe(0);
      expect(after.summary.staleRiskRows).toBe(0);
    } finally {
      db.close();
    }
  });
});
