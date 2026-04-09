import Database from 'better-sqlite3';

const db = new Database('C:/Dev/OmnySystem/.omnysysdata/omnysys.db');

console.log('Before:', db.prepare('SELECT COUNT(*) as c FROM atom_events').get().c);

db.exec('PRAGMA journal_mode=WAL');
db.exec('BEGIN');

// Save data
db.exec('CREATE TABLE atom_events_new AS SELECT * FROM atom_events');
const beforeCount = db.prepare('SELECT COUNT(*) as c FROM atom_events_new').get().c;
console.log('Saved rows:', beforeCount);

// Recreate with UNIQUE constraint
db.exec('DROP TABLE atom_events');
db.exec(`CREATE TABLE atom_events (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    atom_id TEXT NOT NULL,
    event_type TEXT NOT NULL,
    changed_fields TEXT,
    before_state TEXT,
    after_state TEXT,
    impact_score REAL,
    timestamp TEXT NOT NULL,
    source TEXT DEFAULT 'extractor',
    UNIQUE(atom_id, event_type, source)
)`);

// Re-insert (deduped by UNIQUE)
db.exec('INSERT OR IGNORE INTO atom_events SELECT * FROM atom_events_new');
db.exec('DROP TABLE atom_events_new');

db.exec('CREATE INDEX IF NOT EXISTS idx_events_atom ON atom_events(atom_id)');
db.exec('CREATE INDEX IF NOT EXISTS idx_events_type ON atom_events(event_type)');
db.exec('CREATE INDEX IF NOT EXISTS idx_events_timestamp ON atom_events(timestamp)');

db.exec('COMMIT');

const after = db.prepare('SELECT COUNT(*) as c FROM atom_events').get();
console.log('After:', after.c);
console.log('Removed:', beforeCount - after.c);

const created = db.prepare("SELECT COUNT(*) as c FROM atom_events WHERE event_type='created'").get();
const updated = db.prepare("SELECT COUNT(*) as c FROM atom_events WHERE event_type='updated'").get();
console.log('Created events:', created.c);
console.log('Updated events:', updated.c);

db.close();
console.log('Done!');
