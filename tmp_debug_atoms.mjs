import Database from 'better-sqlite3';

const db = new Database('C:/Dev/OmnySystem/.omnysysdata/omnysys.db', { readonly: true });
const stmt = db.prepare('SELECT * FROM atoms LIMIT 50000 OFFSET 0');
const rows = stmt.all();

console.log('Total rows:', rows.length);

// Simulate rowToAtom manually (without importing the module)
let nullAtoms = 0, removedAtoms = 0, deadAtoms = 0, aliveAtoms = 0;

for (const row of rows) {
    // rowToAtom returns an object — check if it would be null/undefined
    if (!row) { nullAtoms++; continue; }

    // lineage comes from lineage_json
    let lineage = null;
    try {
        if (row.lineage_json && row.lineage_json !== 'null') {
            lineage = JSON.parse(row.lineage_json);
        }
    } catch (e) { }

    const isDeadCode = Boolean(row.is_dead_code); // rowToAtom maps is_dead_code → isDeadCode

    if (lineage?.status === 'removed') { removedAtoms++; continue; }
    if (isDeadCode) { deadAtoms++; continue; }

    aliveAtoms++;
}

console.log('null atoms:', nullAtoms);
console.log('removed (lineage.status=removed):', removedAtoms);
console.log('dead code (isDeadCode=true):', deadAtoms);
console.log('ALIVE (should reach suggest_refactoring):', aliveAtoms);

// Sample lineage_json values
const sample = rows.slice(0, 5).map(r => ({
    name: r.name,
    lineage_json: r.lineage_json ? r.lineage_json.substring(0, 80) : null,
    is_dead_code: r.is_dead_code,
    lines_of_code: r.lines_of_code,
    complexity: r.complexity
}));
console.log('\nSample atoms:', JSON.stringify(sample, null, 2));

db.close();
